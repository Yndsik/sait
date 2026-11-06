-- Requires the earlier identity/social migrations. Does not copy or delete any workspace.
begin;
create or replace function yndsi_private.member_allowed() returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (
  exists(select 1 from yndsi_private.owner where user_id=auth.uid())
  or exists(select 1 from auth.users where id=auth.uid() and (email_confirmed_at is not null or invited_at is not null))
 );
$$;
revoke all on function yndsi_private.member_allowed() from public;
create or replace function public.yndsi_session_access() returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('allowed',yndsi_private.member_allowed(),'owner',exists(select 1 from yndsi_private.owner where user_id=auth.uid()));
$$;
revoke all on function public.yndsi_session_access() from public;
grant execute on function public.yndsi_session_access() to authenticated;
create or replace function yndsi_private.social_allowed() returns boolean
language sql stable security definer set search_path='' as $$ select yndsi_private.member_allowed(); $$;
revoke all on function yndsi_private.social_allowed() from public;
alter table public.user_workspaces enable row level security;
alter table public.user_workspaces force row level security;
do $$ declare p record; begin
 for p in select policyname from pg_policies where schemaname='public' and tablename='user_workspaces' loop
  execute format('drop policy %I on public.user_workspaces',p.policyname);
 end loop;
end $$;
revoke all on public.user_workspaces from anon;
grant select,insert,update,delete on public.user_workspaces to authenticated;
create policy own_workspace on public.user_workspaces for all to authenticated
using(user_id=auth.uid() and (public.yndsi_session_access()->>'allowed')::boolean)
with check(user_id=auth.uid() and (public.yndsi_session_access()->>'allowed')::boolean);
-- Registration assigns a stable ID even before email confirmation; access still requires confirmation.
create or replace function yndsi_private.create_invited_profile() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into yndsi_private.social_profiles(user_id,name)
 values(new.id,coalesce(nullif(left(btrim(new.raw_user_meta_data->>'nickname'),32),''),'Игрок'))
 on conflict(user_id) do nothing;
 return new;
end $$;
revoke all on function yndsi_private.create_invited_profile() from public;
drop trigger if exists yndsi_invited_profile on auth.users;
create trigger yndsi_invited_profile after insert or update of invited_at,email_confirmed_at on auth.users
for each row execute function yndsi_private.create_invited_profile();
insert into yndsi_private.social_profiles(user_id,name)
select id,coalesce(nullif(left(btrim(raw_user_meta_data->>'nickname'),32),''),'Игрок') from auth.users
on conflict(user_id) do nothing;
commit;
