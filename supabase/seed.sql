-- Local only: seed.sql never runs in production (docs/backend-spec.md §7, §9).

-- Test users for the local-only password sign-in. Password: test-password.
-- avatar_url stands in for the Google photo (a data URI: tests make no external requests).
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
  extensions.crypt('test-password', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', u.name, 'avatar_url', u.avatar), now(), now(),
  '', '', '', ''
from (values
  ('00000000-0000-4000-a000-00000000000a'::uuid, 'test-a@example.test', 'Test A', 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 32 32%22%3E%3Crect width=%2232%22 height=%2232%22 fill=%22%234f46e5%22/%3E%3C/svg%3E'),
  ('00000000-0000-4000-a000-00000000000b'::uuid, 'test-b@example.test', 'Test B', 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 32 32%22%3E%3Crect width=%2232%22 height=%2232%22 fill=%22%23059669%22/%3E%3C/svg%3E')
) as u(id, email, name, avatar);

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), id, id::text, jsonb_build_object('sub', id::text, 'email', email), 'email', now(), now(), now()
from auth.users where email like '%@example.test';

-- Resets the app data of the test users before each M2 e2e test (called by e2e with the service key).
-- plpgsql so that it can be created before the tables exist.
create or replace function public.test_reset() returns void
language plpgsql security definer set search_path = '' as $$
declare
  t text;
begin
  foreach t in array array['findings', 'review_runs', 'designs', 'user_settings'] loop
    if to_regclass('public.' || t) is not null then
      execute format('delete from public.%I where user_id in (select id from auth.users where email like %L)', t, '%@example.test');
    end if;
  end loop;
  delete from vault.secrets where name like 'openrouter:%';
end $$;
revoke execute on function public.test_reset() from public, anon, authenticated;
grant execute on function public.test_reset() to service_role;
