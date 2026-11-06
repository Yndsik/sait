-- Run after the owner workspace migration. No existing workspace policies are changed.
begin;
create schema if not exists yndsi_private;
revoke all on schema yndsi_private from public;
create table if not exists yndsi_private.social_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 code text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),
 name text not null default 'Игрок' check(length(btrim(name)) between 1 and 32),
 bio text not null default '' check(length(bio)<=160),
 avatar text not null default '' check(length(avatar)<=180000 and (avatar='' or avatar ~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$')),
 check(code ~ '^[A-F0-9]{12}$')
);
create table if not exists yndsi_private.social_links (
 a uuid not null references yndsi_private.social_profiles(user_id) on delete cascade,
 b uuid not null references yndsi_private.social_profiles(user_id) on delete cascade,
 requested_by uuid not null,
 status text not null check(status in ('pending','accepted','blocked')),
 created_at timestamptz not null default now(),
 primary key(a,b),check(a<b),check(requested_by=a or requested_by=b)
);
create table if not exists yndsi_private.social_messages (
 id bigint generated always as identity primary key,
 sender uuid not null references yndsi_private.social_profiles(user_id) on delete cascade,
 recipient uuid not null references yndsi_private.social_profiles(user_id) on delete cascade,
 body text not null check(length(btrim(body)) between 1 and 2000),
 created_at timestamptz not null default now(),check(sender<>recipient)
);
create index if not exists social_messages_pair on yndsi_private.social_messages(least(sender,recipient),greatest(sender,recipient),id desc);
create index if not exists social_messages_sender on yndsi_private.social_messages(sender,created_at desc);
alter table yndsi_private.social_profiles enable row level security;
alter table yndsi_private.social_links enable row level security;
alter table yndsi_private.social_messages enable row level security;
revoke all on all tables in schema yndsi_private from anon,authenticated;
revoke all on all sequences in schema yndsi_private from anon,authenticated;
-- Only the owner and accounts invited by an administrator may use social RPCs.
create or replace function yndsi_private.social_allowed() returns boolean
language sql stable security definer set search_path='' as $fn$
 select auth.uid() is not null and (
  exists(select 1 from yndsi_private.owner where user_id=auth.uid())
  or exists(select 1 from auth.users where id=auth.uid() and invited_at is not null)
 );
$fn$;
revoke all on function yndsi_private.social_allowed() from public;
-- Tables have no direct client access. Narrow RPCs below enforce membership using auth.uid().
create or replace function public.yn_social_home() returns jsonb
language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); result jsonb;
begin
 if me is null or not yndsi_private.social_allowed() then raise exception 'Доступ только по приглашению владельца'; end if;
 insert into yndsi_private.social_profiles(user_id) values(me) on conflict(user_id) do nothing;
 select jsonb_build_object('profile',to_jsonb(p)-'user_id','links',coalesce((
  select jsonb_agg(jsonb_build_object('code',peer.code,'name',peer.name,'bio',peer.bio,'avatar',peer.avatar,'status',l.status,'incoming',l.requested_by<>me,'blockedByMe',l.status='blocked' and l.requested_by=me) order by peer.name)
  from yndsi_private.social_links l join yndsi_private.social_profiles peer on peer.user_id=case when l.a=me then l.b else l.a end
  where (l.a=me or l.b=me) and (l.status<>'blocked' or l.requested_by=me)
 ),'[]'::jsonb)) into result from yndsi_private.social_profiles p where p.user_id=me;
 return result;
end $$;
create or replace function public.yn_social_profile(p_name text,p_bio text,p_avatar text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not yndsi_private.social_allowed() then raise exception 'Доступ только по приглашению владельца'; end if;
 insert into yndsi_private.social_profiles(user_id,name,bio,avatar) values(auth.uid(),btrim(p_name),btrim(p_bio),p_avatar)
 on conflict(user_id) do update set name=excluded.name,bio=excluded.bio,avatar=excluded.avatar;
end $$;
create or replace function public.yn_social_find(p_code text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); result jsonb;
begin
 if me is null or not yndsi_private.social_allowed() then raise exception 'Доступ только по приглашению владельца'; end if;
 if upper(btrim(p_code)) !~ '^[A-F0-9]{12}$' then raise exception 'ID состоит из 12 букв A–F и цифр'; end if;
 select jsonb_build_object('code',p.code,'name',p.name,'bio',p.bio,'avatar',p.avatar) into result
 from yndsi_private.social_profiles p where p.code=upper(btrim(p_code)) and p.user_id<>me
 and not exists(select 1 from yndsi_private.social_links l where l.a=least(me,p.user_id) and l.b=greatest(me,p.user_id) and l.status='blocked');
 return result;
end $$;
create or replace function public.yn_social_request(p_code text) returns void
language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); peer uuid; old yndsi_private.social_links%rowtype;
begin
 if me is null or not yndsi_private.social_allowed() then raise exception 'Доступ только по приглашению владельца'; end if;
 perform public.yn_social_home();
 select user_id into peer from yndsi_private.social_profiles where code=upper(btrim(p_code));
 if peer is null or peer=me then raise exception 'Профиль недоступен'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(least(me,peer)::text||greatest(me,peer)::text,0));
 select * into old from yndsi_private.social_links where a=least(me,peer) and b=greatest(me,peer);
 if found then raise exception 'Заявка уже существует или профиль недоступен'; end if;
 if (select count(*) from yndsi_private.social_links where requested_by=me and created_at>now()-interval '1 hour')>=30 then raise exception 'Слишком много заявок. Попробуй позже'; end if;
 insert into yndsi_private.social_links(a,b,requested_by,status) values(least(me,peer),greatest(me,peer),me,'pending');
end $$;
create or replace function public.yn_social_action(p_code text,p_action text) returns void
language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); peer uuid; link yndsi_private.social_links%rowtype;
begin
 if me is null or not yndsi_private.social_allowed() then raise exception 'Доступ только по приглашению владельца'; end if;
 select user_id into peer from yndsi_private.social_profiles where code=upper(btrim(p_code));
 if peer is null or peer=me then raise exception 'Профиль недоступен'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(least(me,peer)::text||greatest(me,peer)::text,0));
 select * into link from yndsi_private.social_links where a=least(me,peer) and b=greatest(me,peer) for update;
 if not found then raise exception 'Связь не найдена'; end if;
 if p_action='accept' and link.status='pending' and link.requested_by<>me then
  update yndsi_private.social_links set status='accepted' where a=link.a and b=link.b;
 elsif p_action='remove' and link.status in ('pending','accepted') then
  delete from yndsi_private.social_links where a=link.a and b=link.b;
 elsif p_action='block' and link.status<>'blocked' then
  update yndsi_private.social_links set status='blocked',requested_by=me where a=link.a and b=link.b;
 elsif p_action='unblock' and link.status='blocked' and link.requested_by=me then
  delete from yndsi_private.social_links where a=link.a and b=link.b;
 else raise exception 'Действие недоступно'; end if;
end $$;
create or replace function public.yn_social_chat(p_code text,p_before bigint default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); peer uuid; result jsonb;
begin
 if me is null or not yndsi_private.social_allowed() then raise exception 'Доступ только по приглашению владельца'; end if;
 select user_id into peer from yndsi_private.social_profiles where code=upper(btrim(p_code));
 if peer is null or not exists(select 1 from yndsi_private.social_links where a=least(me,peer) and b=greatest(me,peer) and status='accepted') then raise exception 'Чат доступен только друзьям'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',m.id::text,'mine',m.sender=me,'body',m.body,'created_at',m.created_at) order by m.id),'[]'::jsonb) into result
 from (select * from yndsi_private.social_messages where least(sender,recipient)=least(me,peer) and greatest(sender,recipient)=greatest(me,peer) and (p_before is null or id<p_before) order by id desc limit 40) m;
 return result;
end $$;
create or replace function public.yn_social_send(p_code text,p_body text) returns void
language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); peer uuid;
begin
 if me is null or not yndsi_private.social_allowed() then raise exception 'Доступ только по приглашению владельца'; end if;
 if length(btrim(p_body)) not between 1 and 2000 or p_body is null then raise exception 'Сообщение должно содержать от 1 до 2000 символов'; end if;
 select user_id into peer from yndsi_private.social_profiles where code=upper(btrim(p_code));
 if peer is null then raise exception 'Профиль недоступен'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(least(me,peer)::text||greatest(me,peer)::text,0));
 if not exists(select 1 from yndsi_private.social_links where a=least(me,peer) and b=greatest(me,peer) and status='accepted') then raise exception 'Чат доступен только друзьям'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(me::text,1));
 if exists(select 1 from yndsi_private.social_messages where sender=me and created_at>clock_timestamp()-interval '1 second') then raise exception 'Отправляешь слишком быстро. Подожди секунду'; end if;
 insert into yndsi_private.social_messages(sender,recipient,body) values(me,peer,btrim(p_body));
end $$;
revoke all on function public.yn_social_home() from public;
revoke all on function public.yn_social_profile(text,text,text) from public;
revoke all on function public.yn_social_find(text) from public;
revoke all on function public.yn_social_request(text) from public;
revoke all on function public.yn_social_action(text,text) from public;
revoke all on function public.yn_social_chat(text,bigint) from public;
revoke all on function public.yn_social_send(text,text) from public;
grant execute on function public.yn_social_home(), public.yn_social_profile(text,text,text), public.yn_social_find(text), public.yn_social_request(text), public.yn_social_action(text,text), public.yn_social_chat(text,bigint), public.yn_social_send(text,text) to authenticated;
commit;
