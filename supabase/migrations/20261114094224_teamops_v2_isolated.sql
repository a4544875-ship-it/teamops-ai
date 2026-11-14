-- Preview upgrade: apply ONLY to an isolated test project first.
-- Does not read, update, drop, or migrate public.teamops_workspaces.
begin;
create schema if not exists teamops_private;
revoke all on schema teamops_private from public, anon;
grant usage on schema teamops_private to authenticated;

create table public.teamops_v2_workspaces (
 owner_id uuid primary key references auth.users(id),
 revision bigint not null default 0 check(revision>=0),
 metadata jsonb not null default '{}' check(jsonb_typeof(metadata)='object'),
 events_archive jsonb not null default '[]' check(jsonb_typeof(events_archive)='array'),
 legacy_archive jsonb,
 initialized boolean not null default false,
 updated_at timestamptz not null default now()
);

-- Typed keys, generated searchable fields, and composite owner FKs prevent
-- cross-account associations; data retains unknown legacy fields losslessly.
create table public.teamops_v2_members (
 owner_id uuid not null references public.teamops_v2_workspaces(owner_id),
 id uuid not null, data jsonb not null check(jsonb_typeof(data)='object'),
 name text generated always as (data->>'name') stored not null,
 deleted_at timestamptz,
 primary key(owner_id,id)
);
create table public.teamops_v2_clients (
 owner_id uuid not null references public.teamops_v2_workspaces(owner_id),
 id uuid not null, data jsonb not null check(jsonb_typeof(data)='object'),
 name text generated always as (data->>'name') stored not null,
 deleted_at timestamptz, primary key(owner_id,id)
);
create table public.teamops_v2_work_items (
 owner_id uuid not null references public.teamops_v2_workspaces(owner_id),
 id uuid not null, client_id uuid,
 data jsonb not null check(jsonb_typeof(data)='object'),
 title text generated always as (data->>'title') stored not null,
 type text generated always as (data->>'type') stored not null check(type in ('專案','維修','臨時支援','日常工作')),
 status text generated always as (data->>'status') stored not null check(status in ('待確認','待安排','進行中','等待回覆','待驗收','已完成','已暫停')),
 deleted_at timestamptz, primary key(owner_id,id),
 foreign key(owner_id,client_id) references public.teamops_v2_clients(owner_id,id)
);
create table public.teamops_v2_tasks (
 owner_id uuid not null references public.teamops_v2_workspaces(owner_id),
 id uuid not null, work_id uuid,
 data jsonb not null check(jsonb_typeof(data)='object'),
 title text generated always as (data->>'title') stored not null,
 status text generated always as (data->>'status') stored not null check(status in ('待處理','進行中','等待回覆','已完成','已取消')),
 deleted_at timestamptz, primary key(owner_id,id),
 foreign key(owner_id,work_id) references public.teamops_v2_work_items(owner_id,id)
);
create table public.teamops_v2_notes (
 owner_id uuid not null references public.teamops_v2_workspaces(owner_id),
 id uuid not null, work_id uuid, data jsonb not null check(jsonb_typeof(data)='object'),
 deleted_at timestamptz, primary key(owner_id,id),
 foreign key(owner_id,work_id) references public.teamops_v2_work_items(owner_id,id)
);
create table public.teamops_v2_work_logs (
 owner_id uuid not null references public.teamops_v2_workspaces(owner_id),
 id uuid not null, work_id uuid not null,
 data jsonb not null check(jsonb_typeof(data)='object'),
 deleted_at timestamptz, primary key(owner_id,id),
 foreign key(owner_id,work_id) references public.teamops_v2_work_items(owner_id,id)
);
create table public.teamops_v2_member_skills (
 owner_id uuid not null, member_id uuid not null, position integer not null,
 data jsonb not null, primary key(owner_id,member_id,position),
 foreign key(owner_id,member_id) references public.teamops_v2_members(owner_id,id) on delete cascade
);
create table public.teamops_v2_work_assignments (
 owner_id uuid not null, work_id uuid not null, member_id uuid not null,
 role text not null check(role in ('primary','assisting')),
 primary key(owner_id,work_id,member_id),
 foreign key(owner_id,work_id) references public.teamops_v2_work_items(owner_id,id) on delete cascade,
 foreign key(owner_id,member_id) references public.teamops_v2_members(owner_id,id)
);
create table public.teamops_v2_task_members (
 owner_id uuid not null, task_id uuid not null, member_id uuid not null,
 primary key(owner_id,task_id,member_id),
 foreign key(owner_id,task_id) references public.teamops_v2_tasks(owner_id,id) on delete cascade,
 foreign key(owner_id,member_id) references public.teamops_v2_members(owner_id,id)
);
create table public.teamops_v2_audit_logs (
 owner_id uuid not null references public.teamops_v2_workspaces(owner_id),
 revision bigint not null, saved_at timestamptz not null default now(),
 counts jsonb not null, primary key(owner_id,revision)
);
create index on public.teamops_v2_work_items(owner_id,client_id);
create index on public.teamops_v2_tasks(owner_id,work_id);
create index on public.teamops_v2_notes(owner_id,work_id);
create index on public.teamops_v2_work_logs(owner_id,work_id);
create index on public.teamops_v2_work_assignments(owner_id,member_id);
create index on public.teamops_v2_task_members(owner_id,member_id);

do $$ declare t text; begin
 foreach t in array array['workspaces','members','clients','work_items','tasks','notes','work_logs','member_skills','work_assignments','task_members','audit_logs'] loop
 execute format('alter table public.teamops_v2_%I enable row level security',t);
 execute format('revoke all on public.teamops_v2_%I from public,anon,authenticated',t);
 execute format('grant select on public.teamops_v2_%I to authenticated',t);
 execute format('create policy owner_read on public.teamops_v2_%I for select to authenticated using ((select auth.uid()) = owner_id)',t);
 end loop;
end $$;

-- The only writer lives in a non-exposed schema. No owner_id is accepted.
-- auth.uid() is checked before any operation, every statement scopes its owner,
-- and the fixed empty search_path prevents object-name substitution.
create function teamops_private.save_snapshot(expected_revision bigint, snapshot jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare who uuid:=auth.uid(); rev bigint; initialized boolean; old_events jsonb;
 old_legacy jsonb; key text; tab text; r jsonb; mid text; pos integer; old_deleted timestamptz; row_found boolean; counts jsonb:='{}';
begin
 if who is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if snapshot->>'version' is distinct from '2' then raise exception 'Invalid schema version'; end if;
 if jsonb_typeof(snapshot->'rules') is distinct from 'array' or jsonb_typeof(snapshot->'reminderActions') is distinct from 'object' then raise exception 'Invalid reminders'; end if;
 foreach key in array array['projects','members','clients','tasks','notes','logs','events'] loop
  if jsonb_typeof(snapshot->key) is distinct from 'array' then raise exception 'Invalid array: %',key; end if;
  if key<>'events' and exists(select 1 from jsonb_array_elements(snapshot->key) e group by e->>'id' having count(*)>1) then raise exception 'Duplicate IDs'; end if;
  counts:=counts||jsonb_build_object(key,jsonb_array_length(snapshot->key));
 end loop;
 insert into public.teamops_v2_workspaces(owner_id) values(who) on conflict do nothing;
 select w.revision,w.initialized,w.events_archive,w.legacy_archive into rev,initialized,old_events,old_legacy
 from public.teamops_v2_workspaces w where w.owner_id=who for update;
 if rev<>expected_revision then raise exception 'Version conflict' using errcode='40001'; end if;
 if initialized and (old_events is distinct from snapshot->'events' or old_legacy is distinct from snapshot->'legacyArchive') then
  raise exception 'Historical calendar and legacy archive are immutable';
 end if;
 -- Never interpret an omitted row as a deletion before the recovery deadline.
 foreach key in array array['members','clients','projects','tasks','notes','logs'] loop
  tab:=case key when 'projects' then 'work_items' when 'logs' then 'work_logs' else key end;
  if exists(select 1 from jsonb_array_elements(snapshot->key) e where coalesce(e->>'id','')='') then raise exception 'Missing ID'; end if;
  execute format('select exists(select 1 from public.teamops_v2_%I t where owner_id=$1 and not exists(select 1 from jsonb_array_elements($2) e where (e->>''id'')::uuid=t.id) and (t.deleted_at is null or t.deleted_at>now()-interval ''30 days'') %s)',tab,
   case when key='logs' then 'and not exists(select 1 from public.teamops_v2_work_items p where p.owner_id=t.owner_id and p.id=t.work_id and p.deleted_at<=now()-interval ''30 days'' and not exists(select 1 from jsonb_array_elements($3->''projects'') e where (e->>''id'')::uuid=p.id))' else '' end)
   into initialized using who,snapshot->key,snapshot;
  if initialized then raise exception 'Unexpired records cannot be removed'; end if;
 end loop;
 -- Insert / update all parents, then children. All changes are one transaction.
 foreach key in array array['members','clients','projects','tasks','notes','logs'] loop
  tab:=case key when 'projects' then 'work_items' when 'logs' then 'work_logs' else key end;
  for r in select value from jsonb_array_elements(snapshot->key) loop
   execute format('select deleted_at,true from public.teamops_v2_%I where owner_id=$1 and id=$2',tab) into old_deleted,row_found using who,(r->>'id')::uuid;
   if old_deleted is not null then
    if r->>'deletedAt' is null and old_deleted<=now()-interval '30 days' then raise exception 'Restore deadline expired'; end if;
    if r->>'deletedAt' is not null then r:=jsonb_set(r,'{deletedAt}',to_jsonb(old_deleted)); end if;
   elsif r->>'deletedAt' is not null then
    r:=jsonb_set(r,'{deletedAt}',to_jsonb(now()));
   end if;
   if key in ('members','clients') then
    execute format('insert into public.teamops_v2_%I(owner_id,id,data,deleted_at) values($1,$2,$3,$4) on conflict(owner_id,id) do update set data=excluded.data,deleted_at=excluded.deleted_at',tab)
     using who,(r->>'id')::uuid,r,(r->>'deletedAt')::timestamptz;
   else
    execute format('insert into public.teamops_v2_%I(owner_id,id,%I,data,deleted_at) values($1,$2,$3,$4,$5) on conflict(owner_id,id) do update set %I=excluded.%I,data=excluded.data,deleted_at=excluded.deleted_at',tab,case when key='projects' then 'client_id' else 'work_id' end,case when key='projects' then 'client_id' else 'work_id' end,case when key='projects' then 'client_id' else 'work_id' end)
     using who,(r->>'id')::uuid,nullif(r->>case when key='projects' then 'clientId' else 'projectId' end,'')::uuid,r,(r->>'deletedAt')::timestamptz;
   end if;
  end loop;
 end loop;
 delete from public.teamops_v2_work_assignments where owner_id=who;
 delete from public.teamops_v2_task_members where owner_id=who;
 delete from public.teamops_v2_member_skills where owner_id=who;
 for r in select value from jsonb_array_elements(snapshot->'members') loop
  pos:=0;for key in select value::text from jsonb_array_elements(coalesce(r->'skills','[]')) loop
   insert into public.teamops_v2_member_skills values(who,(r->>'id')::uuid,pos,key::jsonb);pos:=pos+1;
  end loop;
 end loop;
 for r in select value from jsonb_array_elements(snapshot->'projects') loop
  pos:=0;for mid in select value from jsonb_array_elements_text(r->'memberIds') loop
   insert into public.teamops_v2_work_assignments values(who,(r->>'id')::uuid,mid::uuid,case when pos=0 then 'primary' else 'assisting' end);pos:=pos+1;
  end loop;
 end loop;
 for r in select value from jsonb_array_elements(snapshot->'tasks') loop
  for mid in select value from jsonb_array_elements_text(r->'memberIds') loop
   insert into public.teamops_v2_task_members values(who,(r->>'id')::uuid,mid::uuid);
  end loop;
 end loop;
 -- Expired-only cleanup, child-first. Any unsafe reference fails the whole save.
 foreach key in array array['logs','notes','tasks','projects','members','clients'] loop
  tab:=case key when 'projects' then 'work_items' when 'logs' then 'work_logs' else key end;
  execute format('delete from public.teamops_v2_%I t where owner_id=$1 and (deleted_at<=now()-interval ''30 days'' %s) and not exists(select 1 from jsonb_array_elements($2) e where (e->>''id'')::uuid=t.id)',tab,
   case when key='logs' then 'or exists(select 1 from public.teamops_v2_work_items p where p.owner_id=t.owner_id and p.id=t.work_id and p.deleted_at<=now()-interval ''30 days'' and not exists(select 1 from jsonb_array_elements($3->''projects'') e where (e->>''id'')::uuid=p.id))' else '' end)
    using who,snapshot->key,snapshot;
 end loop;
 update public.teamops_v2_workspaces set revision=rev+1,initialized=true,updated_at=now(),
  metadata=snapshot-array['projects','members','clients','tasks','notes','logs','events','legacyArchive'],
  events_archive=snapshot->'events',legacy_archive=snapshot->'legacyArchive' where owner_id=who;
 insert into public.teamops_v2_audit_logs(owner_id,revision,counts) values(who,rev+1,counts);
 return jsonb_build_object('revision',rev+1);
end $$;
revoke all on function teamops_private.save_snapshot(bigint,jsonb) from public,anon,authenticated;
grant execute on function teamops_private.save_snapshot(bigint,jsonb) to authenticated;
create function public.teamops_v2_save(expected_revision bigint,snapshot jsonb)
returns jsonb language sql security invoker set search_path=''
as $$ select teamops_private.save_snapshot(expected_revision,snapshot) $$;
revoke all on function public.teamops_v2_save(bigint,jsonb) from public,anon;
grant execute on function public.teamops_v2_save(bigint,jsonb) to authenticated;

create function public.teamops_v2_read() returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare who uuid:=auth.uid(); result jsonb; rev bigint; key text; tab text; rows jsonb;
begin
 if who is null then raise exception 'Authentication required' using errcode='42501';end if;
 select w.metadata||jsonb_build_object('events',w.events_archive)||case when w.legacy_archive is null then '{}'::jsonb else jsonb_build_object('legacyArchive',w.legacy_archive) end,w.revision into result,rev
 from public.teamops_v2_workspaces w where w.owner_id=who;
 if rev is null then
  return jsonb_build_object('revision',0,'snapshot',jsonb_build_object('version',2,'revision',0,'theme','cream','projects','[]'::jsonb,'members','[]'::jsonb,'tasks','[]'::jsonb,'clients','[]'::jsonb,'notes','[]'::jsonb,'logs','[]'::jsonb,'events','[]'::jsonb,'rules','[]'::jsonb,'reminderActions','{}'::jsonb));
 end if;
 foreach key in array array['projects','members','clients','tasks','notes','logs'] loop
  tab:=case key when 'projects' then 'work_items' when 'logs' then 'work_logs' else key end;
  execute format('select coalesce(jsonb_agg(data order by id),''[]''::jsonb) from public.teamops_v2_%I where owner_id=$1',tab) into rows using who;
  result:=result||jsonb_build_object(key,rows);
 end loop;
 return jsonb_build_object('revision',rev,'snapshot',result);
end $$;
revoke all on function public.teamops_v2_read() from public,anon;
grant execute on function public.teamops_v2_read() to authenticated;
commit;
