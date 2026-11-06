-- Run after migrations 006 and 007. Test data is rolled back.
begin;
do $$
declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();ac text;original_code text;result jsonb;denied boolean:=false;token uuid;
begin
 insert into auth.users(id,email,aud,role,email_confirmed_at,created_at,updated_at) values
 (a,a::text||'@example.invalid','authenticated','authenticated',now(),now(),now()),
 (b,b::text||'@example.invalid','authenticated','authenticated',now(),now(),now());
 execute 'set local role authenticated';perform set_config('request.jwt.claim.sub',a::text,true);
 ac:=public.yn_social_home()->'profile'->>'code';original_code:=ac;
 if public.yn_profile_timezone('Asia/Tokyo')<>'Asia/Tokyo' then raise exception 'FAIL: initial zone';end if;
 if public.yn_profile_timezone('Europe/London')<>'Asia/Tokyo' then raise exception 'FAIL: device replaced stored choice';end if;
 perform public.yn_social_profile('Alice','','','America/New_York');
 perform public.yn_social_profile('Alice updated','','');
 result:=public.yn_social_home()->'profile';
 if result->>'time_zone'<>'America/New_York' or result->>'code'<>original_code then raise exception 'FAIL: profile compatibility or stable ID';end if;
 begin perform public.yn_social_profile('Alice','','','Invalid/Zone');exception when others then denied:=true;end;
 if not denied then raise exception 'FAIL: invalid zone accepted';end if;
 insert into public.user_workspaces(user_id,data,updated_at) values(a,'{"streams":[{"id":"pub","title":"Visible","status":"Запланирован","date":"2030-01-01","time":"20:00","timeZone":"Asia/Tokyo","plan":"PRIVATE PLAN"},{"id":"private","title":"PRIVATE STREAM","status":"Запланирован","startsAt":"2030-01-02T00:00:00Z"}]}',now());
 token:=(public.yn_schedule_publish(true,array['pub'])->>'token')::uuid;
 result:=public.yn_public_schedule(token);
 if result ? 'timeZone' or result ? 'time_zone' or result::text like '%America/New_York%' or result::text like '%Asia/Tokyo%' then raise exception 'FAIL: author timezone exposed in public RPC';end if;
 perform set_config('request.jwt.claim.sub',b::text,true);perform public.yn_social_home();
 result:=public.yn_schedule_profile(ac);
 if result ? 'timeZone' or result ? 'time_zone' or (public.yn_social_find(ac)) ? 'time_zone' then raise exception 'FAIL: author timezone exposed to another user';end if;
 if jsonb_array_length(result->'entries')<>1 or result::text like '%PRIVATE%' or (result->'entries'->0->>'startsAt')::timestamptz<>'2030-01-01T11:00:00Z'::timestamptz then raise exception 'FAIL: profile projection or timezone';end if;
 perform set_config('request.jwt.claim.sub',a::text,true);perform public.yn_schedule_publish(false,array['pub']);
 perform set_config('request.jwt.claim.sub',b::text,true);
 if public.yn_schedule_profile(ac) is not null then raise exception 'FAIL: revoked profile schedule';end if;
 raise notice 'PASS: private author timezone, timezone persistence, validation, stable ID, legacy calls, profile projection and revoke';
end $$;
reset role;
rollback;
