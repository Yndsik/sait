-- Requires presence migration 009. Counts only accounts that allow visible presence.
begin;
create index if not exists presence_visible_online on yndsi_private.social_presence(online_until) where visible;
create or replace function public.yn_public_online_count() returns bigint
language sql stable security definer set search_path='' as $$
 select count(*) from yndsi_private.social_presence where visible and online_until>now();
$$;
revoke all on function public.yn_public_online_count() from public;
grant execute on function public.yn_public_online_count() to anon,authenticated;
commit;
