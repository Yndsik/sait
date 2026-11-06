-- Optional transactional integration test in Supabase SQL Editor AFTER the migration.
-- Creates four temporary Auth users inside a transaction and rolls everything back.
-- Run the WHOLE file, never replace the final ROLLBACK with COMMIT.
begin;
do $$
declare
 a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); c uuid:=gen_random_uuid(); d uuid:=gen_random_uuid();
 ac text; bc text; cc text; denied boolean; history jsonb; visible bigint;
begin
 insert into auth.users(id,email,aud,role,created_at,updated_at,invited_at) values
 (a,a::text||'@example.invalid','authenticated','authenticated',now(),now(),now()),
 (b,b::text||'@example.invalid','authenticated','authenticated',now(),now(),now()),
 (c,c::text||'@example.invalid','authenticated','authenticated',now(),now(),now()),
 (d,d::text||'@example.invalid','authenticated','authenticated',now(),now(),null);
 if not exists(select 1 from yndsi_private.social_profiles where user_id=a) then raise exception 'FAIL: ID not assigned at invitation'; end if;
 denied:=false;
 begin update yndsi_private.social_profiles set code='000000000000' where user_id=a; exception when raise_exception then denied:=true; end;
 if not denied then raise exception 'FAIL: ID changed'; end if;
 execute 'set local role authenticated';
 perform set_config('request.jwt.claim.sub',d::text,true); denied:=false;
 begin perform public.yn_social_home(); exception when raise_exception then denied:=true; end;
 if not denied then raise exception 'FAIL: uninvited account admitted'; end if;
 perform set_config('request.jwt.claim.sub',a::text,true); ac:=public.yn_social_home()->'profile'->>'code';
 perform public.yn_social_profile('TestNickname','','');
 if public.yn_social_home()->'profile'->>'code'<>ac then raise exception 'FAIL: ID changed on profile save'; end if;
 if not (public.yn_social_home()->'profile'->>'profile_completed')::boolean then raise exception 'FAIL: onboarding not completed'; end if;
 perform set_config('request.jwt.claim.sub',b::text,true); bc:=public.yn_social_home()->'profile'->>'code';
 perform set_config('request.jwt.claim.sub',c::text,true); cc:=public.yn_social_home()->'profile'->>'code';
 -- A cannot access raw social tables or owner workspaces.
 perform set_config('request.jwt.claim.sub',a::text,true);
 denied:=false;
 begin perform 1 from yndsi_private.social_messages limit 1; exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'FAIL: direct table access'; end if;
 select count(*) into visible from public.user_workspaces;
 if visible<>0 then raise exception 'FAIL: owner workspace visible to friend'; end if;
 -- No messages before accepting; sender cannot accept their own request.
 perform public.yn_social_request(bc);
 denied:=false;
 begin perform public.yn_social_send(bc,'before acceptance'); exception when raise_exception then denied:=true; end;
 if not denied then raise exception 'FAIL: message before acceptance'; end if;
 denied:=false;
 begin perform public.yn_social_action(bc,'accept'); exception when raise_exception then denied:=true; end;
 if not denied then raise exception 'FAIL: self acceptance'; end if;
 -- B accepts; A sends a message; B reads it.
 perform set_config('request.jwt.claim.sub',b::text,true); perform public.yn_social_action(ac,'accept');
 perform set_config('request.jwt.claim.sub',a::text,true); perform public.yn_social_send(bc,'hello');
 perform set_config('request.jwt.claim.sub',b::text,true); history:=public.yn_social_chat(ac);
 if jsonb_array_length(history)<>1 or history->0->>'body'<>'hello' or (history->0->>'mine')::boolean then raise exception 'FAIL: chat history'; end if;
 -- C is not a participant and cannot read the conversation.
 perform set_config('request.jwt.claim.sub',c::text,true); denied:=false;
 begin perform public.yn_social_chat(ac); exception when raise_exception then denied:=true; end;
 if not denied then raise exception 'FAIL: third party read'; end if;
 -- Block stops both sends and reads; only the blocker can unblock.
 perform set_config('request.jwt.claim.sub',b::text,true); perform public.yn_social_action(ac,'block');
 perform set_config('request.jwt.claim.sub',a::text,true); denied:=false;
 begin perform public.yn_social_send(bc,'after block'); exception when raise_exception then denied:=true; end;
 if not denied then raise exception 'FAIL: message after block'; end if;
 denied:=false;
 begin perform public.yn_social_chat(bc); exception when raise_exception then denied:=true; end;
 if not denied then raise exception 'FAIL: history after block'; end if;
 denied:=false;
 begin perform public.yn_social_action(bc,'unblock'); exception when raise_exception then denied:=true; end;
 if not denied then raise exception 'FAIL: unblocked another user block'; end if;
 perform set_config('request.jwt.claim.sub',b::text,true); perform public.yn_social_action(ac,'unblock');
 raise notice 'PASS: friend requests, chat membership, blocking and owner workspace isolation';
end $$;
reset role;
rollback;
