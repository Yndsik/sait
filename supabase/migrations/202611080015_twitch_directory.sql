-- After 012/014. Directory is opt-in; OAuth identities are read only from Supabase Auth.
begin;
do $$ begin if to_regclass('yndsi_private.creator_verifications') is null then raise exception 'Сначала выполните SQL 012 и 014';end if;end $$;
alter table yndsi_private.creator_verifications add column if not exists discoverable boolean not null default false;
create or replace function yndsi_private.twitch_identity(p_user uuid) returns text
language sql stable set search_path='' as $$
 select lower(coalesce(i.identity_data->>'name',i.identity_data->>'full_name'))
 from auth.identities i where i.user_id=p_user and i.provider='twitch'
 and i.provider_id ~ '^[0-9]{1,24}$'
 and lower(coalesce(i.identity_data->>'name',i.identity_data->>'full_name')) ~ '^[a-z0-9_]{1,25}$'
 order by i.created_at desc limit 1;
$$;
revoke all on function yndsi_private.twitch_identity(uuid) from public,anon,authenticated;
create or replace function public.yn_streamer_settings() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare login text;v yndsi_private.creator_verifications;
begin
 if not yndsi_private.member_allowed() then raise exception 'Требуется вход';end if;
 login:=yndsi_private.twitch_identity(auth.uid());select * into v from yndsi_private.creator_verifications where user_id=auth.uid();
 return jsonb_build_object('linked',login is not null,'login',login,'channel',case when login is not null then 'https://www.twitch.tv/'||login else v.channel end,'verified',coalesce(v.verified,false),'discoverable',coalesce(v.discoverable,false),'eligible',login is not null or (v.verified and v.channel ~ '^https://(www\.)?twitch\.tv/[A-Za-z0-9_]{4,25}$'));
end $$;
create or replace function public.yn_streamer_visibility(p_enabled boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare login text;v yndsi_private.creator_verifications;
begin
 if not yndsi_private.member_allowed() then raise exception 'Требуется вход';end if;
 if p_enabled is null or not yndsi_private.take_quota(auth.uid(),'streamer_visibility',20,60) then raise exception 'Попробуй позже';end if;
 login:=yndsi_private.twitch_identity(auth.uid());select * into v from yndsi_private.creator_verifications where user_id=auth.uid();
 if p_enabled and login is null and not coalesce(v.verified and v.channel ~ '^https://(www\.)?twitch\.tv/[A-Za-z0-9_]{4,25}$',false) then raise exception 'Подключи Twitch или подтверди владение Twitch-каналом';end if;
 if login is not null and v.user_id is null then insert into yndsi_private.creator_verifications(user_id,channel,discoverable) values(auth.uid(),'https://www.twitch.tv/'||login,p_enabled);
 else update yndsi_private.creator_verifications set discoverable=p_enabled where user_id=auth.uid();end if;
 return public.yn_streamer_settings();
end $$;
create or replace function yndsi_private.streamer_projection() returns table(code text,name text,avatar text,bio text,twitch_login text,twitch_url text,verified boolean,followers bigint,schedule jsonb)
language sql stable set search_path='' as $$
 select p.code,p.name,p.avatar,p.bio,h.login,'https://www.twitch.tv/'||h.login,v.verified,
 (select count(*) from yndsi_private.creator_subscriptions s where s.creator=p.user_id and not exists(select 1 from yndsi_private.social_links l where l.a=least(s.subscriber,p.user_id) and l.b=greatest(s.subscriber,p.user_id) and l.status='blocked')),
 case when ps.enabled then jsonb_build_object('token',ps.token,'entries',ps.entries) else null end
 from yndsi_private.social_profiles p join yndsi_private.creator_verifications v on v.user_id=p.user_id and v.discoverable
 left join yndsi_private.published_schedules ps on ps.user_id=p.user_id
 cross join lateral (select coalesce(yndsi_private.twitch_identity(p.user_id),case when v.verified then lower(substring(v.channel from '^https://(?:www\.)?twitch\.tv/([A-Za-z0-9_]{4,25})$')) end) as login) h
 where h.login is not null and (auth.uid() is null or not exists(select 1 from yndsi_private.social_links l where l.a=least(auth.uid(),p.user_id) and l.b=greatest(auth.uid(),p.user_id) and l.status='blocked'));
$$;
revoke all on function yndsi_private.streamer_projection() from public,anon,authenticated;
create or replace function public.yn_streamer_search(p_query text default '',p_offset integer default 0) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare q text:=lower(btrim(coalesce(p_query,'')));rows jsonb;
begin
 if length(q)>80 or p_offset is null or p_offset<0 or p_offset>240 then raise exception 'Некорректный поиск';end if;
 select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) into rows from (select s.code,s.name,s.avatar,s.bio,s.twitch_login,s.twitch_url,s.verified,s.followers,(s.schedule is not null) as has_schedule from yndsi_private.streamer_projection() s
 where q='' or position(q in lower(s.name))>0 or position(q in s.twitch_login)>0
 order by case when s.twitch_login=q then 0 else 1 end,s.followers desc,s.code limit 13 offset p_offset) r;
 return jsonb_build_object('items',(select coalesce(jsonb_agg(value),'[]'::jsonb) from jsonb_array_elements(rows) with ordinality x(value,n) where n<=12),'has_more',jsonb_array_length(rows)>12);
end $$;
create or replace function public.yn_streamer_public_profile(p_code text) returns jsonb
language sql stable security definer set search_path='' as $$
 select to_jsonb(s) from yndsi_private.streamer_projection() s where s.code=upper(btrim(p_code)) limit 1;
$$;
revoke all on function public.yn_streamer_settings(),public.yn_streamer_visibility(boolean) from public,anon;
grant execute on function public.yn_streamer_settings(),public.yn_streamer_visibility(boolean) to authenticated;
revoke all on function public.yn_streamer_search(text,integer),public.yn_streamer_public_profile(text) from public;
grant execute on function public.yn_streamer_search(text,integer),public.yn_streamer_public_profile(text) to anon,authenticated;
commit;
