-- Read only the intentionally shared cover fields, never the rest of a workspace.
-- Run after the multiuser workspace and social migrations. No table policy is broadened.
begin;
create or replace function public.yn_profile_cover(p_code text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare visible jsonb; profile jsonb; style text; image text;
begin
 if auth.uid() is null or not yndsi_private.member_allowed() then raise exception 'Требуется вход'; end if;
 if upper(btrim(p_code)) !~ '^[A-F0-9]{12}$' then return null; end if;
 visible:=public.yn_social_find(p_code);
 if visible is null then return null; end if;
 select w.data->'profile' into profile from public.user_workspaces w
 join yndsi_private.social_profiles p on p.user_id=w.user_id
 where p.code=upper(btrim(p_code));
 style:=profile->>'cover'; image:=profile->>'coverImage';
 if style is null or style not in ('auto','aurora','ocean','sunset','forest','ember','cosmos','ice','orchid') then style:='auto'; end if;
 if image is null or length(image)>360000 or image !~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$' then image:=''; end if;
 return jsonb_build_object('cover',style,'coverImage',image);
end $$;
revoke all on function public.yn_profile_cover(text) from public,anon;
grant execute on function public.yn_profile_cover(text) to authenticated;
comment on function public.yn_profile_cover(text) is 'Only profile cover fields, with the same visibility/block rules as social profile lookup';
commit;
