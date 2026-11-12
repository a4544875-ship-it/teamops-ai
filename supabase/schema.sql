-- TeamOps AI Cloud Storage (draft, not applied)
-- Secure single-owner JSON workspace. The GitHub Pages front end may only use
-- Supabase publishable key after Auth is configured, NEVER a service-role key.
create table if not exists public.teamops_workspaces (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  revision bigint not null default 1,
  updated_at timestamptz not null default now(),
  constraint teamops_workspace_object check (jsonb_typeof(data) = 'object')
);
alter table public.teamops_workspaces enable row level security;
revoke all on public.teamops_workspaces from anon;
grant select, insert, update, delete on public.teamops_workspaces to authenticated;
drop policy if exists "owner can read workspace" on public.teamops_workspaces;
drop policy if exists "owner can create workspace" on public.teamops_workspaces;
drop policy if exists "owner can change workspace" on public.teamops_workspaces;
drop policy if exists "owner can delete workspace" on public.teamops_workspaces;
create policy "owner can read workspace" on public.teamops_workspaces
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "owner can create workspace" on public.teamops_workspaces
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "owner can change workspace" on public.teamops_workspaces
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
create policy "owner can delete workspace" on public.teamops_workspaces
  for delete to authenticated using ((select auth.uid()) = owner_id);

-- For multi-device conflict protection, updates should use an RPC that
-- atomically checks the prior revision before replacing data.
-- Backups and export/import should remain available in the UI.
