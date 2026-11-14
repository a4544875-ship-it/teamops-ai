begin;
-- Prevent old cached pages from writing to the legacy JSON after the cutover.
lock table public.teamops_workspaces in share row exclusive mode;
do $$ begin
 if exists(select 1 from public.teamops_workspaces old left join public.teamops_v2_workspaces v on v.owner_id=old.owner_id where v.owner_id is null or not v.initialized or v.legacy_archive is distinct from old.data or v.events_archive is distinct from old.data->'events') then
  raise exception 'Legacy backup and v2 copy differ; cutover refused';
 end if;
end $$;
revoke insert,update,delete on public.teamops_workspaces from authenticated;
comment on table public.teamops_workspaces is 'Pre-2.0 read-only recovery copy. Do not drop; restore write grants only during an approved rollback.';
commit;
