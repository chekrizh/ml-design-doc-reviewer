-- Quotas for a public deployment (D36). A Free project has 500 MB of database: one user may hold at most
-- 50 designs of up to 2 MB of JSON (~100 MB). Checks are NOT VALID: they guard every new write without
-- failing the migration on rows stored before it (expand/contract, D35).

alter table public.designs
  add constraint designs_data_size check (octet_length(data::text) <= 2000000) not valid,
  add constraint designs_title_length check (char_length(title) <= 200) not valid;

-- Snapshots are designs without diagram files, written by the review function.
alter table public.review_runs
  add constraint review_runs_snapshot_size check (octet_length(design_snapshot::text) <= 2000000) not valid;

create function public.designs_quota() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- One insert at a time per user, so two parallel inserts cannot both pass the count.
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));
  if (select count(*) from public.designs where user_id = new.user_id) >= 50 then
    raise exception 'quota_exceeded' using errcode = 'P0001', detail = 'designs';
  end if;
  return new;
end $$;

revoke execute on function public.designs_quota() from public, anon, authenticated;

create trigger designs_quota before insert on public.designs
for each row execute function public.designs_quota();
