-- review_runs, findings, design_open_findings and the run service functions (docs/backend-spec.md §3.2–3.5, §4, §4.1).
begin;
create extension if not exists pgtap with schema extensions;
-- Start from no app data (e2e runs leave rows behind); rolled back at the end.
select public.test_reset();
select plan(28);

-- As postgres (service side): A's design, a first full run with three findings.
insert into public.designs (id, user_id, origin, title, data, summary) values
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-a000-00000000000a', 'example', 'A1', '{}', '{}');
insert into public.review_runs (id, design_id, user_id, scope, model, design_version, design_snapshot) values
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-a000-00000000000a', 'design', 'm', 1, '{}');

select is(public.svc_complete_review_run('00000000-0000-4000-9000-000000000001', $$[
  {"severity":"critical","dimension":"Metrics, loss & measurement","section":"evaluation-online","anchor_kind":"key_property","anchor_id":"k7","anchor_label":"Key Metric","anchor_value":"Average check","title":"F1","evidence":"e","why":"w","fix":"f"},
  {"severity":"major","dimension":"Cost of mistakes & risk","section":null,"anchor_kind":"design","anchor_id":null,"anchor_label":"Design","anchor_value":"","title":"F2","evidence":"e","why":"w","fix":"f"},
  {"severity":"minor","dimension":"Problem framing, goals & antigoals","section":"problem-space","anchor_kind":"rationale","anchor_id":null,"anchor_label":"Rationale","anchor_value":"","title":"F3","evidence":"e","why":"w","fix":"f"}
]$$::jsonb), 'succeeded', 'completing a running run succeeds');
select results_eq($$select title, position, section from public.findings where replaced_by_run_id is null order by position$$,
  $$values ('F1', 0, 'evaluation-online'), ('F2', 1, null), ('F3', 2, 'problem-space')$$, 'findings are stored in answer order');
select results_eq($$select status, finished_at is not null from public.review_runs where id = '00000000-0000-4000-9000-000000000001'$$,
  $$values ('succeeded', true)$$, 'the run is succeeded with finished_at');

-- A section run replaces only that section's current findings.
insert into public.review_runs (id, design_id, user_id, scope, model, design_version, design_snapshot) values
  ('00000000-0000-4000-9000-000000000002', '00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-a000-00000000000a', 'evaluation-online', 'm', 1, '{}');
select is(public.svc_complete_review_run('00000000-0000-4000-9000-000000000002', $$[
  {"severity":"major","dimension":"Metrics, loss & measurement","section":"evaluation-online","anchor_kind":"key_property","anchor_id":"k7","anchor_label":"Key Metric","anchor_value":"Average check","title":"G1","evidence":"e","why":"w","fix":"f"}
]$$::jsonb), 'succeeded', 'a section run succeeds');
select results_eq($$select title from public.findings where replaced_by_run_id is null order by title$$,
  array['F2', 'F3', 'G1'], 'only the section''s findings are replaced; whole-design and other sections stay');
select results_eq($$select title, replaced_by_run_id from public.findings where replaced_by_run_id is not null$$,
  $$values ('F1', '00000000-0000-4000-9000-000000000002'::uuid)$$, 'the replaced finding is kept and points at the run that replaced it');

-- A canceled run changes nothing.
insert into public.review_runs (id, design_id, user_id, scope, model, design_version, design_snapshot, status) values
  ('00000000-0000-4000-9000-000000000003', '00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-a000-00000000000a', 'design', 'm', 1, '{}', 'canceled');
select is(public.svc_complete_review_run('00000000-0000-4000-9000-000000000003', '[{"severity":"minor","dimension":"d","section":null,"anchor_kind":"design","anchor_label":"Design","title":"X","evidence":"e","why":"w","fix":"f"}]'),
  'canceled', 'completing a canceled run returns canceled');
select results_eq($$select count(*) from public.findings where replaced_by_run_id is null$$, array[3::bigint], 'a canceled run neither replaces nor inserts findings');

-- svc_fail_review_run only fails running runs.
insert into public.review_runs (id, design_id, user_id, scope, model, design_version, design_snapshot) values
  ('00000000-0000-4000-9000-000000000004', '00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-a000-00000000000a', 'design', 'm', 1, '{}');
select lives_ok($$select public.svc_fail_review_run('00000000-0000-4000-9000-000000000004', 'no_credits')$$, 'failing a running run');
select results_eq($$select status, error_code from public.review_runs where id = '00000000-0000-4000-9000-000000000004'$$, $$values ('failed', 'no_credits')$$, 'the run is failed with its code');
select lives_ok($$select public.svc_fail_review_run('00000000-0000-4000-9000-000000000001', 'timeout')$$, 'failing a finished run is a no-op');
select results_eq($$select status from public.review_runs where id = '00000000-0000-4000-9000-000000000001'$$, array['succeeded'], 'a succeeded run stays succeeded');

-- A running run for the cancel tests.
insert into public.review_runs (id, design_id, user_id, scope, model, design_version, design_snapshot) values
  ('00000000-0000-4000-9000-000000000005', '00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-a000-00000000000a', 'design', 'm', 1, '{}');

-- anon: nothing.
set local role anon;
select throws_ok($$select id from public.review_runs$$, '42501', null, 'anon cannot read runs');
select throws_ok($$select id from public.findings$$, '42501', null, 'anon cannot read findings');

-- authenticated A.
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-a000-00000000000a';
select throws_ok($$select public.svc_complete_review_run('00000000-0000-4000-9000-000000000005', '[]')$$, '42501', null, 'authenticated cannot complete runs');
select throws_ok($$select public.svc_fail_review_run('00000000-0000-4000-9000-000000000005', 'x')$$, '42501', null, 'authenticated cannot fail runs');
select throws_ok($$insert into public.review_runs (id, design_id, user_id, scope, model, design_version, design_snapshot)
  values (gen_random_uuid(), '00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-a000-00000000000a', 'design', 'm', 1, '{}')$$, '42501', null, 'authenticated cannot insert runs');
select throws_ok($$insert into public.findings (run_id, design_id, user_id, position, dimension, anchor_label, title, evidence, why, fix)
  values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-a000-00000000000a', 9, 'd', 'l', 't', 'e', 'w', 'f')$$, '42501', null, 'authenticated cannot insert findings');
select throws_ok($$update public.findings set replaced_by_run_id = null$$, '42501', null, 'authenticated cannot touch replaced_by_run_id');
select throws_ok($$update public.findings set title = 'x'$$, '42501', null, 'authenticated cannot edit finding text');
select throws_ok($$update public.review_runs set error_code = 'x'$$, '42501', null, 'authenticated can update only run status');
select throws_ok($$update public.review_runs set status = 'succeeded' where id = '00000000-0000-4000-9000-000000000005'$$, '42501', null, 'the client can only set canceled');
select results_eq($$update public.review_runs set status = 'canceled' where id = '00000000-0000-4000-9000-000000000005' returning status$$, array['canceled'], 'A cancels their running run');
select is_empty($$update public.review_runs set status = 'canceled' where id = '00000000-0000-4000-9000-000000000001' returning id$$, 'a finished run cannot be canceled');
select results_eq($$update public.findings set status = 'resolved', status_changed_at = now() where title = 'G1' returning status$$, array['resolved'], 'A changes a finding status');
select results_eq($$select severity, count from public.design_open_findings order by severity$$,
  $$values ('major', 1::bigint), ('minor', 1::bigint)$$, 'the view counts current open findings by severity');

-- authenticated B sees nothing of A.
set local request.jwt.claim.sub = '00000000-0000-4000-a000-00000000000b';
select is_empty($$select id from public.findings$$, 'B reads none of A''s findings');
select is_empty($$update public.findings set status = 'dismissed' returning id$$, 'B cannot change A''s finding status');

select * from finish();
rollback;
