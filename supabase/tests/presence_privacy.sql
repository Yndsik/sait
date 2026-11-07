-- After 009. Synthetic records and presence are rolled back.
begin;
do $$
declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();c uuid:=gen_random_uuid();ac text;bc text;result jsonb;denied boolean;
begin
 insert into auth.users(id,email,aud,role,email_confirmed_at,created_at,updated_at) values
 (a,a::text||'@example.invalid','authenticated','authenticated',now(),now(),now()),
 (b,b::text||'@example.invalid','authenticated','authenticated',now(),now(),now()),
 (c,c::text||'@example.invalid','authenticated','authenticated',now(),now(),now());
 execute 'set local role authenticated';perform set_config('request.jwt.claim.sub',a::text,true);ac:=public.yn_social_home()->'profile'->>'code';
 perform set_config('request.jwt.claim.sub',b::text,true);bc:=public.yn_social_home()->'profile'->>'code';
 perform set_config('request.jwt.claim.sub',a::text,true);perform public.yn_social_request(bc);
 perform set_config('request.jwt.claim.sub',b::text,true);perform public.yn_social_action(ac,'accept');
 perform set_config('request.jwt.claim.sub',a::text,true);perform public.yn_presence_update(true,bc,true);
 perform set_config('request.jwt.claim.sub',b::text,true);result:=public.yn_presence_home();
 if jsonb_array_length(result->'peers')<>1 or not (result->'peers'->0->>'online')::boolean or not (result->'peers'->0->>'typing')::boolean then raise exception 'FAIL: friend online/typing';end if;
 if result::text like '%time_zone%' or result::text like '%typing_to%' then raise exception 'FAIL: private internals exposed';end if;
 perform set_config('request.jwt.claim.sub',c::text,true);if jsonb_array_length(public.yn_presence_home()->'peers')<>0 then raise exception 'FAIL: stranger sees presence';end if;
 perform set_config('request.jwt.claim.sub',a::text,true);perform public.yn_presence_update(true,null,false);
 perform set_config('request.jwt.claim.sub',b::text,true);if jsonb_array_length(public.yn_presence_home()->'peers')<>0 then raise exception 'FAIL: hidden presence visible';end if;
 execute 'reset role';update yndsi_private.social_presence set visible=true,online_until=now()-interval '1 minute',typing_until=now()+interval '1 minute' where user_id=a;
 execute 'set local role authenticated';perform set_config('request.jwt.claim.sub',b::text,true);result:=public.yn_presence_home();
 if (result->'peers'->0->>'online')::boolean or (result->'peers'->0->>'typing')::boolean then raise exception 'FAIL: expired lease shown active';end if;
 perform public.yn_social_action(ac,'block');if jsonb_array_length(public.yn_presence_home()->'peers')<>0 then raise exception 'FAIL: blocked presence visible';end if;
 denied:=false;begin perform 1 from yndsi_private.social_presence;exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'FAIL: direct table access';end if;
 raise notice 'PASS: friends-only presence, privacy toggle, typing expiry and blocked/stranger isolation';
end $$;
reset role;
rollback;
