-- After SQL 015. Match by immutable OAuth provider ID, never by typed nickname/URL.
begin;
do $$ begin if to_regprocedure('yndsi_private.streamer_projection()') is null then raise exception 'Сначала выполните SQL 015';end if;end $$;
create or replace function public.yn_streamer_matches(p_ids text[]) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if p_ids is null or cardinality(p_ids)>24 or exists(select 1 from unnest(p_ids) id where id is null or id !~ '^[0-9]{1,24}$') then raise exception 'Некорректные каналы';end if;
 return (select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from (
  select distinct s.code,s.name,s.avatar,s.bio,s.twitch_login,s.twitch_url,s.verified,s.followers,(s.schedule is not null) as has_schedule,i.provider_id as twitch_id
  from yndsi_private.streamer_projection() s
  join yndsi_private.social_profiles p on p.code=s.code
  join auth.identities i on i.user_id=p.user_id and i.provider='twitch' and i.provider_id=any(p_ids)
  where yndsi_private.twitch_identity(p.user_id) is not null
 ) r);
end $$;
revoke all on function public.yn_streamer_matches(text[]) from public;
grant execute on function public.yn_streamer_matches(text[]) to anon,authenticated;
commit;
