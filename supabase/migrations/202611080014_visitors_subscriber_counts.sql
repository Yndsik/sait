-- Run after 012 (creator subscriptions). Does NOT require social_presence or 013.
begin;
do $$ begin
 if to_regclass('yndsi_private.creator_subscriptions') is null then
  raise exception 'Сначала выполните SQL 202611080012_creator_subscriptions.sql (подписки на расписание)';
 end if;
end $$;
create table if not exists yndsi_private.site_visitors(
 visitor uuid primary key,
 seen_at timestamptz not null default now()
);
create index if not exists site_visitors_seen on yndsi_private.site_visitors(seen_at);
alter table yndsi_private.site_visitors enable row level security;
revoke all on yndsi_private.site_visitors from public,anon,authenticated;
create or replace function public.yn_site_visit(p_visitor uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if p_visitor is null then raise exception 'Visitor token required';end if;
 insert into yndsi_private.site_visitors as v(visitor,seen_at) values(p_visitor,now())
 on conflict(visitor) do update set seen_at=excluded.seen_at where v.seen_at<now()-interval '20 seconds';
 -- Expired anonymous tokens are removed in bounded batches; no user ID, IP or location is stored.
 delete from yndsi_private.site_visitors where visitor in
 (select visitor from yndsi_private.site_visitors where seen_at<now()-interval '2 minutes' order by seen_at limit 200);
end $$;
create or replace function public.yn_site_online_count() returns bigint
language sql stable security definer set search_path='' as $$
 select count(*) from yndsi_private.site_visitors where seen_at>now()-interval '90 seconds';
$$;
revoke all on function public.yn_site_visit(uuid),public.yn_site_online_count() from public;
grant execute on function public.yn_site_visit(uuid),public.yn_site_online_count() to anon,authenticated;
create index if not exists creator_subscriptions_creator on yndsi_private.creator_subscriptions(creator);
create or replace function public.yn_creator_profile(p_code text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare target uuid;
begin
 if not yndsi_private.member_allowed() then raise exception 'Требуется вход';end if;
 select user_id into target from yndsi_private.social_profiles where code=upper(btrim(p_code));
 if target is null or exists(select 1 from yndsi_private.social_links where a=least(auth.uid(),target) and b=greatest(auth.uid(),target) and status='blocked') then return null;end if;
 return jsonb_build_object(
 'verified',exists(select 1 from yndsi_private.creator_verifications where user_id=target and verified),
 'published',exists(select 1 from yndsi_private.published_schedules where user_id=target and enabled),
 'subscribed',exists(select 1 from yndsi_private.creator_subscriptions where subscriber=auth.uid() and creator=target),
 'subscribers',(select count(*) from yndsi_private.creator_subscriptions s where s.creator=target
 and not exists(select 1 from yndsi_private.social_links l where l.a=least(s.subscriber,target) and l.b=greatest(s.subscriber,target) and l.status='blocked')));
end $$;
revoke all on function public.yn_creator_profile(text) from public,anon;
grant execute on function public.yn_creator_profile(text) to authenticated;

create table if not exists yndsi_private.release_reads(
 user_id uuid not null references auth.users(id) on delete cascade,
 version text not null check(length(version)<=16),
 seen_at timestamptz not null default now(),primary key(user_id,version)
);
alter table yndsi_private.release_reads enable row level security;
revoke all on yndsi_private.release_reads from public,anon,authenticated;
create or replace function public.yn_release_claim(p_version text) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if not yndsi_private.member_allowed() then raise exception 'Требуется вход';end if;
 if p_version is null or p_version !~ '^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$' then raise exception 'Некорректная версия';end if;
 if not yndsi_private.take_quota(auth.uid(),'release_claim',8,60) then return false;end if;
 insert into yndsi_private.release_reads(user_id,version) values(auth.uid(),p_version) on conflict do nothing;
 return found;
end $$;
revoke all on function public.yn_release_claim(text) from public,anon;
grant execute on function public.yn_release_claim(text) to authenticated;

commit;
