-- M2 schema (docs/backend-spec.md §3, §4). One migration for the whole milestone.

-- §3.1 designs ---------------------------------------------------------------

create table public.designs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  client_id uuid,
  origin text not null check (origin in ('blank', 'task', 'example')),
  source_id text,
  title text not null default '',
  data jsonb not null,
  data_schema int not null default 1,
  summary jsonb not null,
  last_export jsonb,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, client_id)
);

create index designs_user_updated on public.designs (user_id, updated_at desc);

-- Only a change of data or title is a new version; last_export alone is not (else export would break autosave).
create function public.designs_bump_version() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.data is distinct from old.data or new.title is distinct from old.title then
    new.version := old.version + 1;
    new.updated_at := now();
  else
    new.version := old.version;
    new.updated_at := old.updated_at;
  end if;
  return new;
end $$;

create trigger designs_bump_version before update on public.designs
for each row execute function public.designs_bump_version();

alter table public.designs enable row level security;

revoke all on public.designs from anon, authenticated;
grant select, delete on public.designs to authenticated;
-- version, created_at and updated_at belong to the server (the trigger and defaults).
grant insert (user_id, client_id, origin, source_id, title, data, data_schema, summary, last_export) on public.designs to authenticated;
grant update (title, data, data_schema, summary, last_export) on public.designs to authenticated;

create policy designs_select on public.designs for select to authenticated using (user_id = (select auth.uid()));
create policy designs_insert on public.designs for insert to authenticated with check (user_id = (select auth.uid()));
create policy designs_update on public.designs for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy designs_delete on public.designs for delete to authenticated using (user_id = (select auth.uid()));
