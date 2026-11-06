-- Requires multiuser/social migrations. No client-accessible quota tables.
begin;
create table if not exists yndsi_private.request_limits(
 user_id uuid not null references auth.users(id) on delete cascade,
 action text not null,
 window_start bigint not null,
 requests integer not null,
 primary key(user_id,action)
);
alter table yndsi_private.request_limits enable row level security;
revoke all on yndsi_private.request_limits from public,anon,authenticated;
create or replace function yndsi_private.take_quota(p_user uuid,p_action text,p_limit integer,p_seconds integer) returns boolean
language plpgsql security definer set search_path='' as $$
declare slot bigint:=floor(extract(epoch from clock_timestamp())/p_seconds)::bigint;used integer;
begin
 insert into yndsi_private.request_limits as lim(user_id,action,window_start,requests) values(p_user,p_action,slot,1)
 on conflict(user_id,action) do update set window_start=excluded.window_start,requests=case when lim.window_start=excluded.window_start then lim.requests+1 else 1 end
 where lim.window_start<>excluded.window_start or lim.requests<p_limit returning requests into used;
 return used is not null;
end $$;
revoke all on function yndsi_private.take_quota(uuid,text,integer,integer) from public,anon,authenticated;
create or replace function public.yn_steam_quota() returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if not yndsi_private.member_allowed() then raise exception 'Требуется подтверждённый аккаунт';end if;
 return yndsi_private.take_quota(auth.uid(),'steam',30,60);
end $$;
revoke all on function public.yn_steam_quota() from public,anon;
grant execute on function public.yn_steam_quota() to authenticated;
create or replace function yndsi_private.guard_social_write() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='social_links' then
  if new.status='pending' and not yndsi_private.take_quota(new.requested_by,'friend_requests',20,60) then raise exception 'Слишком много заявок. Подожди минуту';end if;
 else
  if not yndsi_private.take_quota(new.sender,'messages',60,60) then raise exception 'Слишком много сообщений. Подожди минуту';end if;
 end if;
 return new;
end $$;
revoke all on function yndsi_private.guard_social_write() from public,anon,authenticated;
drop trigger if exists yndsi_friend_write_limit on yndsi_private.social_links;
create trigger yndsi_friend_write_limit before insert on yndsi_private.social_links for each row execute function yndsi_private.guard_social_write();
drop trigger if exists yndsi_message_write_limit on yndsi_private.social_messages;
create trigger yndsi_message_write_limit before insert on yndsi_private.social_messages for each row execute function yndsi_private.guard_social_write();
commit;
