-- Requires friends/chat (001) and notification read positions (005).
-- Only accepted friends can read their own conversation's peer read boundary.
begin;
create or replace function public.yn_chat_receipts(p_code text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare me uuid:=auth.uid(); target uuid; boundary bigint;
begin
 if me is null or not yndsi_private.member_allowed() then raise exception 'Требуется вход'; end if;
 select user_id into target from yndsi_private.social_profiles where code=upper(btrim(p_code));
 if target is null or not exists(select 1 from yndsi_private.social_links where a=least(me,target) and b=greatest(me,target) and status='accepted') then raise exception 'Чат недоступен'; end if;
 select last_id into boundary from yndsi_private.social_read_positions where user_id=target and peer=me;
 return jsonb_build_object('last_read_id',coalesce(boundary,0)::text);
end $$;
revoke all on function public.yn_chat_receipts(text) from public,anon;
grant execute on function public.yn_chat_receipts(text) to authenticated;
commit;
