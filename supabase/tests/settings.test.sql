-- user_settings and the OpenRouter key in Vault (docs/backend-spec.md §3.4, §4, §4.1; D16).
begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

-- Service side (the edge functions run these as service_role).
set local role service_role;
select is(public.svc_set_openrouter_key('00000000-0000-4000-a000-00000000000a', 'sk-or-v1-test-valid-0000a3f9'), 'a3f9', 'saving returns the last 4 characters');
select is(public.svc_get_openrouter_key('00000000-0000-4000-a000-00000000000a'), 'sk-or-v1-test-valid-0000a3f9', 'the key reads back from Vault');
reset role;
select results_eq($$select count(*) from vault.secrets s join public.user_settings u on u.key_secret_id = s.id where u.user_id = '00000000-0000-4000-a000-00000000000a'$$,
  array[1::bigint], 'the key is a Vault secret referenced by user_settings');
select is_empty($$select 1 from public.user_settings where key_secret_id::text like 'sk-or%' or key_last4 <> 'a3f9'$$, 'user_settings holds no key text, only last4 and the secret id');
set local role service_role;
select is(public.svc_set_openrouter_key('00000000-0000-4000-a000-00000000000a', 'sk-or-v1-replaced-key-1234'), '1234', 'replacing the key');
select is(public.svc_get_openrouter_key('00000000-0000-4000-a000-00000000000a'), 'sk-or-v1-replaced-key-1234', 'the replaced key reads back');
reset role;
select results_eq($$select count(*) from vault.secrets where name = 'openrouter:00000000-0000-4000-a000-00000000000a'$$, array[1::bigint], 'replacing updates the same secret');
set local role service_role;
select is(public.svc_get_openrouter_key('00000000-0000-4000-a000-00000000000b'), null, 'no key → null');

-- anon: nothing.
set local role anon;
select throws_ok($$select model from public.user_settings$$, '42501', null, 'anon cannot read settings');

-- authenticated A.
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-a000-00000000000a';
select results_eq($$select user_id, key_last4 from public.user_settings$$,
  $$values ('00000000-0000-4000-a000-00000000000a'::uuid, '1234')$$, 'A reads their user_id and key_last4');
select throws_ok($$select key_secret_id from public.user_settings$$, '42501', null, 'A cannot select key_secret_id');
select throws_ok($$select * from public.user_settings$$, '42501', null, 'select * fails: the client lists columns');
select throws_ok($$update public.user_settings set key_last4 = 'xxxx'$$, '42501', null, 'A cannot write key columns');
select results_eq($$update public.user_settings set model = 'openai/gpt-4o-mini' returning model$$, array['openai/gpt-4o-mini'], 'A sets their model');
select throws_ok($$select public.svc_get_openrouter_key('00000000-0000-4000-a000-00000000000a')$$, '42501', null, 'authenticated cannot execute svc_get_openrouter_key');
select throws_ok($$select public.svc_set_openrouter_key('00000000-0000-4000-a000-00000000000a', 'sk-or-v1-x')$$, '42501', null, 'authenticated cannot execute svc_set_openrouter_key');
select throws_ok($$select public.svc_delete_openrouter_key('00000000-0000-4000-a000-00000000000a')$$, '42501', null, 'authenticated cannot execute svc_delete_openrouter_key');
select throws_ok($$select decrypted_secret from vault.decrypted_secrets$$, '42501', null, 'authenticated cannot read Vault');

-- authenticated B: own row only.
set local request.jwt.claim.sub = '00000000-0000-4000-a000-00000000000b';
select is_empty($$select user_id from public.user_settings$$, 'B reads none of A''s settings');
select lives_ok($$insert into public.user_settings (user_id, model) values ('00000000-0000-4000-a000-00000000000b', 'google/gemini-2.5-flash')$$, 'B creates their own settings row');

-- Delete removes the secret and the key columns.
set local role service_role;
select lives_ok($$select public.svc_delete_openrouter_key('00000000-0000-4000-a000-00000000000a')$$, 'deleting the key');
reset role;
select results_eq($$select (select count(*) from vault.secrets where name = 'openrouter:00000000-0000-4000-a000-00000000000a'), key_secret_id, key_last4, key_added_at from public.user_settings where user_id = '00000000-0000-4000-a000-00000000000a'$$,
  $$values (0::bigint, null::uuid, null::text, null::timestamptz)$$, 'the secret is gone and the key columns are null');

select * from finish();
rollback;
