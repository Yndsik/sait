-- Before running: replace REPLACE_WITH_OWNER_UUID with Authentication > Users > User UID.
-- The transaction aborts without changes if the UUID or existing table is invalid.
begin;
create schema if not exists yndsi_private;
revoke all on schema yndsi_private from public;
create table if not exists yndsi_private.owner (singleton boolean primary key default true check(singleton), user_id uuid not null references auth.users(id));
insert into yndsi_private.owner(singleton,user_id) values(true,'REPLACE_WITH_OWNER_UUID'::uuid)
on conflict(singleton) do update set user_id=excluded.user_id;
create or replace function public.yndsi_is_owner() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists(select 1 from yndsi_private.owner where user_id=auth.uid()) $$;
revoke all on function public.yndsi_is_owner() from public;
grant execute on function public.yndsi_is_owner() to authenticated;
-- Retain the existing JSON workspace and all existing data.
alter table public.user_workspaces enable row level security;
alter table public.user_workspaces force row level security;
do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='user_workspaces' loop
    execute format('drop policy %I on public.user_workspaces',p.policyname);
  end loop;
end $$;
revoke all on public.user_workspaces from anon;
grant select,insert,update,delete on public.user_workspaces to authenticated;
create policy owner_workspace on public.user_workspaces for all to authenticated
using (user_id=auth.uid() and public.yndsi_is_owner())
with check (user_id=auth.uid() and public.yndsi_is_owner());
commit;
