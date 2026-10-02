-- Quotas for a public deployment (D36): design size, title length, designs per user, snapshot size.
begin;
create extension if not exists pgtap with schema extensions;
select public.test_reset();
select plan(7);

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-a000-00000000000a';

-- 2 MB of JSON per design.
select lives_ok(
  $$insert into public.designs (origin, title, data, summary) values ('blank', 'big', jsonb_build_object('pad', repeat('x', 1999000)), '{}')$$,
  'a design just under 2 MB is stored');
select throws_ok(
  $$insert into public.designs (origin, data, summary) values ('blank', jsonb_build_object('pad', repeat('x', 2000001)), '{}')$$,
  '23514', null, 'a design over 2 MB is refused on insert');
select throws_ok(
  $$update public.designs set data = jsonb_build_object('pad', repeat('x', 2000001)) where title = 'big'$$,
  '23514', null, 'a design over 2 MB is refused on update (autosave)');
select throws_ok(
  $$insert into public.designs (origin, title, data, summary) values ('blank', repeat('t', 201), '{}', '{}')$$,
  '23514', null, 'a title over 200 characters is refused');

-- 50 designs per user: the 51st insert fails with quota_exceeded; another user is not affected.
insert into public.designs (origin, data, summary) select 'blank', '{}', '{}' from generate_series(2, 50);
select throws_ok(
  $$insert into public.designs (origin, data, summary) values ('blank', '{}', '{}')$$,
  'P0001', 'quota_exceeded', 'the 51st design is refused');

set local request.jwt.claim.sub = '00000000-0000-4000-a000-00000000000b';
select lives_ok($$insert into public.designs (origin, data, summary) values ('blank', '{}', '{}')$$, 'B is not limited by A''s designs');

-- Review snapshots are capped like designs (written by the service role from the review function).
reset role;
select throws_ok(
  $$insert into public.review_runs (id, design_id, user_id, scope, model, design_version, design_snapshot)
    select gen_random_uuid(), id, user_id, 'design', 'm', 1, jsonb_build_object('pad', repeat('x', 2000001)) from public.designs where title = 'big'$$,
  '23514', null, 'a review snapshot over 2 MB is refused');

select * from finish();
rollback;
