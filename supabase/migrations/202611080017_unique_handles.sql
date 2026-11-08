-- Unique public handles are separate from permanent routing IDs and display names.
begin;
do $$ begin if to_regclass('yndsi_private.social_profiles') is null or to_regclass('yndsi_private.creator_verifications') is null or to_regprocedure('yndsi_private.take_quota(uuid,text,integer,integer)') is null then raise exception 'Сначала выполните миграции профилей, безопасности (008) и стримеров (012)';end if;end $$;
alter table yndsi_private.social_profiles add column if not exists handle text;
alter table yndsi_private.social_profiles add column if not exists handle_discoverable boolean not null default false;
do $$ begin if not exists(select 1 from pg_constraint where conname='social_profile_handle_format' and conrelid='yndsi_private.social_profiles'::regclass) then alter table yndsi_private.social_profiles add constraint social_profile_handle_format check(handle is null or handle ~ '^[a-z][a-z0-9_]{2,23}$');end if;end $$;
create unique index if not exists social_profile_handle_unique on yndsi_private.social_profiles(lower(handle)) where handle is not null;
create or replace function public.yn_handle_settings() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not yndsi_private.member_allowed() then raise exception 'Требуется вход';end if;
 return (select jsonb_build_object('handle',p.handle,'discoverable',p.handle_discoverable) from yndsi_private.social_profiles p where p.user_id=auth.uid());
end $$;
create or replace function public.yn_handle_save(p_handle text,p_discoverable boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare h text:=lower(btrim(coalesce(p_handle,'')));
begin
 if not yndsi_private.member_allowed() then raise exception 'Требуется вход';end if;
 if h !~ '^[a-z][a-z0-9_]{2,23}$' or h=any(array['admin','administrator','rivlo','yndsi','support','help','settings','profile','privacy','developer','official','moderator','system','login','signup','api','null','undefined']) or p_discoverable is null then raise exception 'HANDLE_INVALID';end if;
 if not yndsi_private.take_quota(auth.uid(),'handle_save',10,60) then raise exception 'HANDLE_RATE';end if;
 update yndsi_private.social_profiles set handle=h,handle_discoverable=p_discoverable where user_id=auth.uid();
 if not found then raise exception 'HANDLE_PROFILE_REQUIRED';end if;
 return public.yn_handle_settings();
exception when unique_violation then raise exception 'HANDLE_TAKEN';
end $$;
create or replace function public.yn_handle_lookup(p_handle text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare h text:=lower(btrim(coalesce(p_handle,'')));p yndsi_private.social_profiles;v boolean;subs bigint;ps jsonb;cover jsonb;style text;image text;
begin
 if h !~ '^[a-z][a-z0-9_]{2,23}$' then return null;end if;
 select * into p from yndsi_private.social_profiles where handle=h and (handle_discoverable or user_id=auth.uid());
 if not found then return null;end if;
 if auth.uid() is not null and exists(select 1 from yndsi_private.social_links l where l.a=least(auth.uid(),p.user_id) and l.b=greatest(auth.uid(),p.user_id) and l.status='blocked') then return null;end if;
 select coalesce(c.verified,false) into v from yndsi_private.creator_verifications c where c.user_id=p.user_id;
 select count(*) into subs from yndsi_private.creator_subscriptions s where s.creator=p.user_id and not exists(select 1 from yndsi_private.social_links l where l.a=least(s.subscriber,p.user_id) and l.b=greatest(s.subscriber,p.user_id) and l.status='blocked');
 select jsonb_build_object('token',s.token,'entries',s.entries) into ps from yndsi_private.published_schedules s where s.user_id=p.user_id and s.enabled;
 select w.data->'profile' into cover from public.user_workspaces w where w.user_id=p.user_id;
 style:=cover->>'cover';image:=cover->>'coverImage';
 if style is null or style not in ('auto','aurora','ocean','sunset','forest','ember','cosmos','ice','orchid') then style:='auto';end if;
 if image is null or length(image)>360000 or image !~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$' then image:='';end if;
 return jsonb_build_object('cover',style,'coverImage',image,'code',p.code,'handle',p.handle,'name',p.name,'bio',p.bio,'avatar',p.avatar,'verified',coalesce(v,false),'followers',subs,'schedule',ps);
end $$;
revoke all on function public.yn_handle_settings(),public.yn_handle_save(text,boolean) from public,anon;
grant execute on function public.yn_handle_settings(),public.yn_handle_save(text,boolean) to authenticated;
revoke all on function public.yn_handle_lookup(text) from public;
grant execute on function public.yn_handle_lookup(text) to anon,authenticated;
commit;
