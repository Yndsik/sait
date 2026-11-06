-- User timezone does not change account IDs or the UTC instant of existing streams.
begin;
alter table yndsi_private.social_profiles add column if not exists time_zone text;
create or replace function public.yn_profile_timezone(p_zone text) returns text
language plpgsql security definer set search_path='' as $$
declare result text;
begin
 if not yndsi_private.member_allowed() then raise exception 'Требуется вход';end if;
 if not exists(select 1 from pg_catalog.pg_timezone_names where name=p_zone) then raise exception 'Неизвестный часовой пояс';end if;
 update yndsi_private.social_profiles set time_zone=p_zone where user_id=auth.uid() and time_zone is null;
 select time_zone into result from yndsi_private.social_profiles where user_id=auth.uid();return result;
end $$;
revoke all on function public.yn_profile_timezone(text) from public;
grant execute on function public.yn_profile_timezone(text) to authenticated;
-- Optional fourth argument keeps older clients compatible while they update name/avatar.
drop function if exists public.yn_social_profile(text,text,text);
create or replace function public.yn_social_profile(p_name text,p_bio text,p_avatar text,p_time_zone text default null) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not yndsi_private.member_allowed() then raise exception 'Требуется вход'; end if;
 if p_time_zone is not null and not exists(select 1 from pg_catalog.pg_timezone_names where name=p_time_zone) then raise exception 'Неизвестный часовой пояс';end if;
 insert into yndsi_private.social_profiles(user_id,name,bio,avatar,profile_completed,time_zone) values(auth.uid(),btrim(p_name),btrim(p_bio),p_avatar,true,p_time_zone)
 on conflict(user_id) do update set name=excluded.name,bio=excluded.bio,avatar=excluded.avatar,profile_completed=true,time_zone=coalesce(excluded.time_zone,social_profiles.time_zone);
end $$;
revoke all on function public.yn_social_profile(text,text,text,text) from public;
grant execute on function public.yn_social_profile(text,text,text,text) to authenticated;
create or replace function yndsi_private.schedule_projection(p_data jsonb,p_ids text[]) returns jsonb
language plpgsql stable set search_path='' as $$
declare item jsonb; result jsonb:='[]'; start_time timestamptz; game_name text;
begin
 for item in select value from jsonb_array_elements(case when jsonb_typeof(p_data->'streams')='array' then p_data->'streams' else '[]'::jsonb end)
 where value->>'id'=any(p_ids) and value->>'status'='Запланирован' limit 100 loop
  begin
   if coalesce(item->>'startsAt','')<>'' then start_time:=(item->>'startsAt')::timestamptz;
   else start_time:=((item->>'date')||' '||(item->>'time'))::timestamp at time zone coalesce(nullif(item->>'timeZone',''),'Asia/Atyrau'); end if;
  exception when others then continue; end;
  if start_time is null or not isfinite(start_time) then continue; end if;
  select value->>'title' into game_name from jsonb_array_elements(case when jsonb_typeof(p_data->'games')='array' then p_data->'games' else '[]'::jsonb end) where value->>'id'=item->>'gameId' limit 1;
  result:=result||jsonb_build_array(jsonb_build_object('title',left(coalesce(item->>'title','Стрим'),200),'game',left(coalesce(game_name,item->>'game',''),120),'startsAt',start_time));
 end loop;
 return coalesce((select jsonb_agg(value order by (value->>'startsAt')::timestamptz,value->>'title',value->>'game') from jsonb_array_elements(result)),'[]'::jsonb);
end $$;
revoke all on function yndsi_private.schedule_projection(jsonb,text[]) from public;
create or replace function public.yn_public_schedule(p_token uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('name',p.name,'avatar',p.avatar,'timeZone',coalesce(p.time_zone,'Asia/Atyrau'),'entries',s.entries,'updated_at',s.updated_at)
 from yndsi_private.published_schedules s join yndsi_private.social_profiles p on p.user_id=s.user_id where s.token=p_token and s.enabled;
$$;
create or replace function public.yn_schedule_profile(p_code text) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('token',s.token,'count',jsonb_array_length(s.entries),'entries',s.entries,'timeZone',coalesce(p.time_zone,'Asia/Atyrau'))
 from yndsi_private.social_profiles p join yndsi_private.published_schedules s on s.user_id=p.user_id and s.enabled
 where yndsi_private.member_allowed() and p.code=upper(btrim(p_code))
 and not exists(select 1 from yndsi_private.social_links l where l.a=least(auth.uid(),p.user_id) and l.b=greatest(auth.uid(),p.user_id) and l.status='blocked');
$$;
revoke all on function public.yn_public_schedule(uuid),public.yn_schedule_profile(text) from public;
grant execute on function public.yn_public_schedule(uuid) to anon,authenticated;
grant execute on function public.yn_schedule_profile(text) to authenticated;
-- Recompute only already opted-in publications using each legacy event's own timezone.
update yndsi_private.published_schedules p set entries=yndsi_private.schedule_projection(w.data,p.selected_ids)
from public.user_workspaces w where w.user_id=p.user_id and p.enabled;
commit;
