-- Run after 202611070001_friends_chat.sql. Existing IDs and relationships stay intact.
begin;
alter table yndsi_private.social_profiles add column if not exists profile_completed boolean not null default false;
update yndsi_private.social_profiles set profile_completed=true
where not profile_completed and (name<>'Игрок' or avatar<>'' or bio<>'');
create or replace function yndsi_private.keep_social_id() returns trigger
language plpgsql set search_path='' as $$
begin
 if new.code is distinct from old.code or new.user_id is distinct from old.user_id then
  raise exception 'ID закреплён за аккаунтом и не может быть изменён';
 end if;
 return new;
end $$;
revoke all on function yndsi_private.keep_social_id() from public;
drop trigger if exists keep_social_id on yndsi_private.social_profiles;
create trigger keep_social_id before update on yndsi_private.social_profiles
for each row execute function yndsi_private.keep_social_id();
-- Assign the ID as soon as an invited account is created (or marked invited).
create or replace function yndsi_private.create_invited_profile() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.invited_at is not null or exists(select 1 from yndsi_private.owner where user_id=new.id) then
  insert into yndsi_private.social_profiles(user_id) values(new.id) on conflict(user_id) do nothing;
 end if;
 return new;
end $$;
revoke all on function yndsi_private.create_invited_profile() from public;
drop trigger if exists yndsi_invited_profile on auth.users;
create trigger yndsi_invited_profile after insert or update of invited_at on auth.users
for each row execute function yndsi_private.create_invited_profile();
insert into yndsi_private.social_profiles(user_id)
select u.id from auth.users u where u.invited_at is not null or exists(select 1 from yndsi_private.owner o where o.user_id=u.id)
on conflict(user_id) do nothing;
create or replace function public.yn_social_profile(p_name text,p_bio text,p_avatar text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not yndsi_private.social_allowed() then raise exception 'Доступ только по приглашению владельца'; end if;
 insert into yndsi_private.social_profiles(user_id,name,bio,avatar,profile_completed)
 values(auth.uid(),btrim(p_name),btrim(p_bio),p_avatar,true)
 on conflict(user_id) do update set name=excluded.name,bio=excluded.bio,avatar=excluded.avatar,profile_completed=true;
end $$;
revoke all on function public.yn_social_profile(text,text,text) from public;
grant execute on function public.yn_social_profile(text,text,text) to authenticated;
commit;
