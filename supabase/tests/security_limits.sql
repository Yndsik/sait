-- After migration 008. Synthetic test records are rolled back.
begin;
do $$
declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();c uuid:=gen_random_uuid();ac text;bc text;cc text;denied boolean;i integer;
begin
 insert into auth.users(id,email,aud,role,email_confirmed_at,created_at,updated_at) values
 (a,a::text||'@example.invalid','authenticated','authenticated',now(),now(),now()),
 (b,b::text||'@example.invalid','authenticated','authenticated',now(),now(),now()),
 (c,c::text||'@example.invalid','authenticated','authenticated',now(),now(),now());
 select code into cc from yndsi_private.social_profiles where user_id=c;
 execute 'set local role authenticated';perform set_config('request.jwt.claim.sub',a::text,true);
 ac:=public.yn_social_home()->'profile'->>'code';
 perform set_config('request.jwt.claim.sub',b::text,true);bc:=public.yn_social_home()->'profile'->>'code';
 perform set_config('request.jwt.claim.sub',a::text,true);perform public.yn_social_request(bc);
 perform set_config('request.jwt.claim.sub',b::text,true);perform public.yn_social_action(ac,'accept');
 perform set_config('request.jwt.claim.sub',a::text,true);
 for i in 1..30 loop if not public.yn_steam_quota() then raise exception 'FAIL: premature Steam throttle';end if;end loop;
 if public.yn_steam_quota() then raise exception 'FAIL: quota bypass';end if;
 perform set_config('request.jwt.claim.sub',b::text,true);if not public.yn_steam_quota() then raise exception 'FAIL: shared user quota';end if;
 denied:=false;begin perform 1 from yndsi_private.request_limits;exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'FAIL: client can read counters';end if;
 execute 'reset role';
 for i in 1..60 loop perform yndsi_private.take_quota(a,'messages',60,60);end loop;
 for i in 1..20 loop perform yndsi_private.take_quota(a,'friend_requests',20,60);end loop;
 execute 'set local role authenticated';perform set_config('request.jwt.claim.sub',a::text,true);
 denied:=false;begin perform public.yn_social_send(bc,'Blocked by quota');exception when others then if sqlerrm like '%Слишком много сообщений%' then denied:=true;else raise;end if;end;
 if not denied then raise exception 'FAIL: message trigger bypass';end if;
 denied:=false;begin perform public.yn_social_request(cc);exception when others then if sqlerrm like '%Слишком много заявок%' then denied:=true;else raise;end if;end;
 if not denied then raise exception 'FAIL: friend request trigger bypass';end if;
 execute 'set local role anon';perform set_config('request.jwt.claim.sub','',true);
 denied:=false;begin perform public.yn_steam_quota();exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'FAIL: anonymous quota RPC';end if;
 raise notice 'PASS: per-user atomic quota, no client counter access, social write triggers, anonymous denial';
end $$;
reset role;
rollback;
