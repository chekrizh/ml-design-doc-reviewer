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

-- §3.2 review_runs: every run, with the design it checked ------------------------

create table public.review_runs (
  id uuid primary key,
  design_id uuid not null references public.designs on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  scope text not null,
  model text not null,
  status text not null default 'running' check (status in ('running', 'succeeded', 'failed', 'canceled')),
  error_code text,
  design_version int not null,
  design_snapshot jsonb not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index review_runs_user_started on public.review_runs (user_id, started_at desc);
create index review_runs_design_started on public.review_runs (design_id, started_at desc);

alter table public.review_runs enable row level security;

revoke all on public.review_runs from anon, authenticated;
grant select on public.review_runs to authenticated;
grant update (status) on public.review_runs to authenticated;

create policy review_runs_select on public.review_runs for select to authenticated using (user_id = (select auth.uid()));
-- The only client write: cancel an own running run.
create policy review_runs_cancel on public.review_runs for update to authenticated
  using (user_id = (select auth.uid()) and status = 'running') with check (status = 'canceled');

-- §3.3 findings: replaced ones stay as history -----------------------------------

create table public.findings (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.review_runs on delete cascade,
  design_id uuid not null references public.designs on delete cascade,
  user_id uuid not null,
  position int not null,
  severity text check (severity in ('critical', 'major', 'minor')),
  dimension text not null,
  section text,
  anchor_kind text check (anchor_kind in ('key_property', 'rationale', 'tradeoff_option', 'design')),
  anchor_id text,
  anchor_label text not null,
  anchor_value text not null default '',
  title text not null,
  evidence text not null,
  why text not null,
  fix text not null,
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  status_changed_at timestamptz,
  replaced_by_run_id uuid references public.review_runs on delete set null,
  created_at timestamptz not null default now()
);

create index findings_design_current on public.findings (design_id) where replaced_by_run_id is null;

alter table public.findings enable row level security;

revoke all on public.findings from anon, authenticated;
grant select on public.findings to authenticated;
grant update (status, status_changed_at) on public.findings to authenticated;

create policy findings_select on public.findings for select to authenticated using (user_id = (select auth.uid()));
create policy findings_update on public.findings for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- §3.5 open findings per design and severity, for the 'Your designs' counters ----

create view public.design_open_findings with (security_invoker = true) as
  select design_id, severity, count(*) from public.findings
  where replaced_by_run_id is null and status = 'open'
  group by 1, 2;

revoke all on public.design_open_findings from anon, authenticated;
grant select on public.design_open_findings to authenticated;

-- §4.1 service functions for runs (service role only) ----------------------------

-- Replaces the current findings in the run's scope with p_findings, atomically.
-- A run that is no longer running (canceled, failed) changes nothing; its status is returned.
create function public.svc_complete_review_run(p_run uuid, p_findings jsonb) returns text
language plpgsql security definer set search_path = '' as $$
declare
  r public.review_runs;
begin
  select * into r from public.review_runs where id = p_run for update;
  if not found then raise exception 'review run % not found', p_run; end if;
  if r.status <> 'running' then return r.status; end if;

  -- Scope 'design' replaces all current findings; a section scope only that section's
  -- (findings on the whole design, section is null, are replaced only by a 'design' run).
  update public.findings set replaced_by_run_id = p_run
  where design_id = r.design_id and replaced_by_run_id is null
    and (r.scope = 'design' or section = r.scope);

  insert into public.findings (run_id, design_id, user_id, position, severity, dimension, section,
    anchor_kind, anchor_id, anchor_label, anchor_value, title, evidence, why, fix)
  select p_run, r.design_id, r.user_id, f.ord::int - 1, f.v->>'severity', f.v->>'dimension', f.v->>'section',
    f.v->>'anchor_kind', f.v->>'anchor_id', f.v->>'anchor_label', coalesce(f.v->>'anchor_value', ''),
    f.v->>'title', f.v->>'evidence', f.v->>'why', f.v->>'fix'
  from jsonb_array_elements(p_findings) with ordinality as f(v, ord);

  update public.review_runs set status = 'succeeded', finished_at = now() where id = p_run;
  return 'succeeded';
end $$;

create function public.svc_fail_review_run(p_run uuid, p_code text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.review_runs set status = 'failed', error_code = p_code, finished_at = now()
  where id = p_run and status = 'running';
end $$;

revoke execute on function public.svc_complete_review_run(uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.svc_fail_review_run(uuid, text) from public, anon, authenticated;
grant execute on function public.svc_complete_review_run(uuid, jsonb) to service_role;
grant execute on function public.svc_fail_review_run(uuid, text) to service_role;
