-- Remove author timezone from public and other-user RPC responses.
-- Compatible with schedule sharing (005), before or after timezone migration (006).
begin;
create or replace function public.yn_public_schedule(p_token uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('name',p.name,'avatar',p.avatar,'entries',s.entries,'updated_at',s.updated_at)
 from yndsi_private.published_schedules s join yndsi_private.social_profiles p on p.user_id=s.user_id where s.token=p_token and s.enabled;
$$;
create or replace function public.yn_schedule_profile(p_code text) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('token',s.token,'count',jsonb_array_length(s.entries),'entries',s.entries)
 from yndsi_private.social_profiles p join yndsi_private.published_schedules s on s.user_id=p.user_id and s.enabled
 where yndsi_private.member_allowed() and p.code=upper(btrim(p_code))
 and not exists(select 1 from yndsi_private.social_links l where l.a=least(auth.uid(),p.user_id) and l.b=greatest(auth.uid(),p.user_id) and l.status='blocked');
$$;
revoke all on function public.yn_public_schedule(uuid),public.yn_schedule_profile(text) from public;
grant execute on function public.yn_public_schedule(uuid) to anon,authenticated;
grant execute on function public.yn_schedule_profile(text) to authenticated;
commit;
