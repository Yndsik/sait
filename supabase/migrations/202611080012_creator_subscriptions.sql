-- Requires migrations 001–009. Apply as database owner in Supabase SQL Editor.
begin;
create table if not exists yndsi_private.creator_verifications(
 user_id uuid primary key references yndsi_private.social_profiles(user_id) on delete cascade,
 channel text not null check(length(channel)<=300),
 proof text not null default 'YNDSI-'||replace(gen_random_uuid()::text,'-',''),
 verified boolean not null default false,
 requested_at timestamptz not null default now(),reviewed_at timestamptz
);
create unique index if not exists creator_verified_channel on yndsi_private.creator_verifications(channel) where verified;
create table if not exists yndsi_private.creator_subscriptions(
 subscriber uuid references yndsi_private.social_profiles(user_id) on delete cascade,
 creator uuid references yndsi_private.social_profiles(user_id) on delete cascade,
 primary key(subscriber,creator),check(subscriber<>creator)
);
alter table yndsi_private.creator_verifications enable row level security;
alter table yndsi_private.creator_subscriptions enable row level security;
revoke all on yndsi_private.creator_verifications,yndsi_private.creator_subscriptions from public,anon,authenticated;
create or replace function public.yn_creator_request(p_channel text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare channel text:=rtrim(btrim(p_channel),'/');r yndsi_private.creator_verifications;
begin
 if not yndsi_private.member_allowed() then raise exception 'Требуется вход';end if;
 if not yndsi_private.take_quota(auth.uid(),'creator_request',10,3600) then raise exception 'Попробуй позже';end if;
 if channel is null or length(channel)>300 or channel !~ '^https://(www\.)?(twitch\.tv/[A-Za-z0-9_]{4,25}|youtube\.com/(@[A-Za-z0-9_.-]{3,100}|channel/UC[A-Za-z0-9_-]{22}))$' then raise exception 'Укажи прямую ссылку Twitch или YouTube без параметров';end if;
 insert into yndsi_private.creator_verifications as v(user_id,channel) values(auth.uid(),channel)
 on conflict(user_id) do update set channel=excluded.channel,proof=case when v.channel=excluded.channel then v.proof else 'YNDSI-'||replace(gen_random_uuid()::text,'-','') end,verified=case when v.channel=excluded.channel then v.verified else false end,reviewed_at=case when v.channel=excluded.channel then v.reviewed_at end,requested_at=now() returning * into r;
 return jsonb_build_object('channel',r.channel,'proof',r.proof,'verified',r.verified);
end $$;
create or replace function public.yn_creator_profile(p_code text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare target uuid;
begin
 if not yndsi_private.member_allowed() then raise exception 'Требуется вход';end if;
 select user_id into target from yndsi_private.social_profiles where code=upper(btrim(p_code));
 if target is null or exists(select 1 from yndsi_private.social_links where a=least(auth.uid(),target) and b=greatest(auth.uid(),target) and status='blocked') then return null;end if;
 return jsonb_build_object('verified',exists(select 1 from yndsi_private.creator_verifications where user_id=target and verified),'published',exists(select 1 from yndsi_private.published_schedules where user_id=target and enabled),'subscribed',exists(select 1 from yndsi_private.creator_subscriptions where subscriber=auth.uid() and creator=target));
end $$;
create or replace function public.yn_creator_subscribe(p_code text,p_enabled boolean) returns void
language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 if not yndsi_private.member_allowed() then raise exception 'Требуется вход';end if;
 if p_enabled is null or not yndsi_private.take_quota(auth.uid(),'creator_subscription',30,60) then raise exception 'Попробуй позже';end if;
 select user_id into target from yndsi_private.social_profiles where code=upper(btrim(p_code));
 if target is null or target=auth.uid() then raise exception 'Профиль недоступен';end if;
 if not p_enabled then delete from yndsi_private.creator_subscriptions where subscriber=auth.uid() and creator=target;return;end if;
 if exists(select 1 from yndsi_private.social_links where a=least(auth.uid(),target) and b=greatest(auth.uid(),target) and status='blocked') or not exists(select 1 from yndsi_private.published_schedules where user_id=target and enabled) then raise exception 'Расписание недоступно';end if;
 if (select count(*) from yndsi_private.creator_subscriptions where subscriber=auth.uid())>=200 and not exists(select 1 from yndsi_private.creator_subscriptions where subscriber=auth.uid() and creator=target) then raise exception 'Можно подписаться не более чем на 200 расписаний';end if;
 insert into yndsi_private.creator_subscriptions values(auth.uid(),target) on conflict do nothing;
end $$;
create or replace function public.yn_creator_reminders() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not yndsi_private.member_allowed() then raise exception 'Требуется вход';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('code',code,'name',name,'title',entry->>'title','startsAt',entry->>'startsAt','key',md5(creator::text||entry::text))) from (
 select s.creator,p.code,p.name,e.entry from yndsi_private.creator_subscriptions s
 join yndsi_private.social_profiles p on p.user_id=s.creator
 join yndsi_private.published_schedules ps on ps.user_id=s.creator and ps.enabled
 cross join lateral jsonb_array_elements(ps.entries) e(entry)
 where s.subscriber=auth.uid() and (e.entry->>'startsAt')::timestamptz between now()-interval '1 hour' and now()+interval '26 hours'
 and not exists(select 1 from yndsi_private.social_links l where l.a=least(auth.uid(),s.creator) and l.b=greatest(auth.uid(),s.creator) and l.status='blocked')
 order by (e.entry->>'startsAt')::timestamptz limit 100) reminders),'[]'::jsonb);
end $$;
revoke all on function public.yn_creator_request(text),public.yn_creator_profile(text),public.yn_creator_subscribe(text,boolean),public.yn_creator_reminders() from public,anon;
grant execute on function public.yn_creator_request(text),public.yn_creator_profile(text),public.yn_creator_subscribe(text,boolean),public.yn_creator_reminders() to authenticated;
commit;
