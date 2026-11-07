-- Requires social/member migrations and security_limits (008).
begin;
create table if not exists yndsi_private.social_presence(
 user_id uuid primary key references auth.users(id) on delete cascade,
 visible boolean not null default true,
 last_seen timestamptz,
 online_until timestamptz,
 typing_to uuid references auth.users(id) on delete set null,
 typing_until timestamptz
);
alter table yndsi_private.social_presence enable row level security;
revoke all on yndsi_private.social_presence from public,anon,authenticated;
create or replace function public.yn_presence_update(p_online boolean default true,p_typing_code text default null,p_visible boolean default null) returns void
language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid();peer uuid;stamp timestamptz:=clock_timestamp();
begin
 if not yndsi_private.member_allowed() then raise exception 'Требуется вход';end if;
 if p_visible is distinct from false and not yndsi_private.take_quota(me,'presence',60,60) then raise exception 'Подожди перед обновлением статуса';end if;
 if p_typing_code is not null then
  select user_id into peer from yndsi_private.social_profiles where code=upper(btrim(p_typing_code));
  if peer is null or not exists(select 1 from yndsi_private.social_links where a=least(me,peer) and b=greatest(me,peer) and status='accepted') then raise exception 'Переписка недоступна';end if;
 end if;
 insert into yndsi_private.social_presence as existing(user_id,visible,last_seen,online_until,typing_to,typing_until)
 values(me,coalesce(p_visible,true),case when p_online then stamp end,case when p_online then stamp+interval '35 seconds' end,case when p_online then peer end,case when p_online and peer is not null then stamp+interval '6 seconds' end)
 on conflict(user_id) do update set visible=coalesce(p_visible,existing.visible),last_seen=case when p_online then stamp else existing.last_seen end,online_until=case when p_online then stamp+interval '35 seconds' end,typing_to=case when p_online then peer end,typing_until=case when p_online and peer is not null then stamp+interval '6 seconds' end;
end $$;
create or replace function public.yn_presence_home() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare me uuid:=auth.uid();result jsonb;
begin
 if not yndsi_private.member_allowed() then raise exception 'Требуется вход';end if;
 select jsonb_build_object('visible',coalesce((select visible from yndsi_private.social_presence where user_id=me),true),'peers',coalesce((
 select jsonb_agg(jsonb_build_object('code',peer.code,'online',coalesce(p.online_until>now(),false),'last_seen',p.last_seen,'typing',coalesce(p.online_until>now() and p.typing_to=me and p.typing_until>now(),false)))
 from (select case when a=me then b else a end as id from yndsi_private.social_links where (a=me or b=me) and status='accepted' order by a,b limit 200) friends
 join yndsi_private.social_profiles peer on peer.user_id=friends.id
 join yndsi_private.social_presence p on p.user_id=peer.user_id and p.visible
 ),'[]'::jsonb)) into result;
 return result;
end $$;
revoke all on function public.yn_presence_update(boolean,text,boolean),public.yn_presence_home() from public,anon;
grant execute on function public.yn_presence_update(boolean,text,boolean),public.yn_presence_home() to authenticated;
commit;
