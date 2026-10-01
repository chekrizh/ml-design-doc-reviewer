-- designs: RLS, grants and the version trigger (docs/backend-spec.md §3.1, §4).
begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

-- Seed users: A = ...0a, B = ...0b.
insert into public.designs (id, user_id, origin, title, data, summary) values
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-a000-00000000000a', 'blank', 'A1', '{"title":"A1"}', '{}'),
  ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-a000-00000000000b', 'blank', 'B1', '{"title":"B1"}', '{}');

-- anon has no grant at all.
set local role anon;
select throws_ok($$select * from public.designs$$, '42501', null, 'anon cannot read designs');
select throws_ok($$insert into public.designs (origin, data, summary) values ('blank', '{}', '{}')$$, '42501', null, 'anon cannot insert designs');

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-a000-00000000000a';

select results_eq($$select title from public.designs$$, array['A1'], 'A reads only their own designs');
select is_empty($$update public.designs set title = 'hacked' where id = '00000000-0000-4000-8000-0000000000b1' returning id$$, 'A cannot update B''s design');
select is_empty($$delete from public.designs where id = '00000000-0000-4000-8000-0000000000b1' returning id$$, 'A cannot delete B''s design');
select throws_ok(
  $$insert into public.designs (user_id, origin, data, summary) values ('00000000-0000-4000-a000-00000000000b', 'blank', '{}', '{}')$$,
  '42501', null, 'A cannot insert a design for B');
select throws_ok(
  $$update public.designs set user_id = '00000000-0000-4000-a000-00000000000b' where id = '00000000-0000-4000-8000-0000000000a1'$$,
  '42501', null, 'A cannot hand a design to B (no grant on user_id)');
select throws_ok(
  $$update public.designs set version = 99 where id = '00000000-0000-4000-8000-0000000000a1'$$,
  '42501', null, 'version belongs to the server');

-- Insert stores and returns the same JSON; user_id defaults to the caller.
select results_eq(
  $$insert into public.designs (origin, source_id, title, data, summary)
    values ('example', 'retail-demand-forecasting', 'Mine', '{"title":"Mine","sections":[{"id":"problem-space","keyProperties":[{"key":"Domain","value":"Retail"}]}]}', '{"filledSections":["problem-space"],"tradeoffs":0,"mlTask":null}')
    returning data, summary, version, user_id$$,
  $$values ('{"title":"Mine","sections":[{"id":"problem-space","keyProperties":[{"key":"Domain","value":"Retail"}]}]}'::jsonb,
            '{"filledSections":["problem-space"],"tradeoffs":0,"mlTask":null}'::jsonb, 1, '00000000-0000-4000-a000-00000000000a'::uuid)$$,
  'insert returns the JSON as sent, version 1, owner = caller');

-- Version trigger: data/title bump, last_export alone does not.
select results_eq($$update public.designs set data = '{"title":"A1","v":2}' where id = '00000000-0000-4000-8000-0000000000a1' and version = 1 returning version, data$$,
  $$values (2, '{"title":"A1","v":2}'::jsonb)$$, 'a data change bumps version and returns the data as sent');
select results_eq($$update public.designs set title = 'A1 renamed' where id = '00000000-0000-4000-8000-0000000000a1' returning version$$, array[3], 'a title change bumps version');
select results_eq($$update public.designs set last_export = '{"url":"https://docs.google.com/x","at":"2026-10-01T00:00:00Z"}' where id = '00000000-0000-4000-8000-0000000000a1' returning version$$,
  array[3], 'last_export alone keeps the version');
select results_eq($$update public.designs set summary = '{"filledSections":[],"tradeoffs":0,"mlTask":null}' where id = '00000000-0000-4000-8000-0000000000a1' returning version$$,
  array[3], 'summary alone keeps the version');
select is_empty($$update public.designs set data = '{"stale":true}' where id = '00000000-0000-4000-8000-0000000000a1' and version = 1 returning id$$,
  'a save with a stale version updates nothing (conflict)');
select results_eq($$select data from public.designs where id = '00000000-0000-4000-8000-0000000000a1'$$, $$values ('{"title":"A1","v":2}'::jsonb)$$, 'the stale save left the data intact');

-- client_id makes the guest move idempotent.
select lives_ok($$insert into public.designs (client_id, origin, data, summary) values ('00000000-0000-4000-8000-00000000c11e', 'blank', '{}', '{}') on conflict (user_id, client_id) do nothing$$, 'first move inserts');
select lives_ok($$insert into public.designs (client_id, origin, data, summary) values ('00000000-0000-4000-8000-00000000c11e', 'blank', '{}', '{}') on conflict (user_id, client_id) do nothing$$, 'a repeated move does nothing');
select results_eq($$select count(*) from public.designs where client_id = '00000000-0000-4000-8000-00000000c11e'$$, array[1::bigint], 'no duplicate after a repeated move');

-- B still sees their design untouched and cannot see A's.
set local request.jwt.claim.sub = '00000000-0000-4000-a000-00000000000b';
select results_eq($$select title, version from public.designs$$, $$values ('B1', 1)$$, 'B reads only B1, unchanged');
select is_empty($$delete from public.designs where id = '00000000-0000-4000-8000-0000000000a1' returning id$$, 'B cannot delete A''s design');
set local request.jwt.claim.sub = '00000000-0000-4000-a000-00000000000a';
select results_eq($$delete from public.designs where id = '00000000-0000-4000-8000-0000000000a1' returning title$$, array['A1 renamed'], 'A deletes their own design');

select * from finish();
rollback;
