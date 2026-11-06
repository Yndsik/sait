-- Run whole file after 202611070005. Synthetic accounts and data are rolled back.
begin;
do $$
declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();c uuid:=gen_random_uuid();ac text;bc text; config jsonb;token uuid;result jsonb;feed jsonb;latest bigint;denied boolean;
begin
 insert into auth.users(id,email,aud,role,email_confirmed_at,created_at,updated_at) values
 (a,a::text||'@example.invalid','authenticated','authenticated',now(),now(),now()),
 (b,b::text||'@example.invalid','authenticated','authenticated',now(),now(),now()),
 (c,c::text||'@example.invalid','authenticated','authenticated',now(),now(),now());
 execute 'set local role authenticated';perform set_config('request.jwt.claim.sub',a::text,true);
 ac:=public.yn_social_home()->'profile'->>'code';
 insert into public.user_workspaces(user_id,data,updated_at) values(a,'{"games":[{"id":"g","title":"Visible game"}],"notes":[{"body":"PRIVATE NOTE"}],"tasks":[],"streams":[{"id":"pub","status":"Запланирован","title":"Visible stream","gameId":"g","startsAt":"2030-01-01T15:00:00Z","description":"PRIVATE DESCRIPTION","plan":"PRIVATE PLAN"},{"id":"private","status":"Запланирован","title":"PRIVATE STREAM","startsAt":"2030-01-02T15:00:00Z"}]}',now());
 if (public.yn_schedule_config()->>'enabled')::boolean then raise exception 'FAIL: public by default';end if;
 config:=public.yn_schedule_publish(true,array['pub']);token:=(config->>'token')::uuid;
 -- A visitor uses the anonymous role and never receives the private workspace.
 perform set_config('request.jwt.claim.sub','',true);execute 'set local role anon';
 result:=public.yn_public_schedule(token);
 if jsonb_array_length(result->'entries')<>1 or result->'entries'->0->>'title'<>'Visible stream' or result::text like '%PRIVATE%' or result ? 'user_id' then raise exception 'FAIL: public projection leaked private data';end if;
 denied:=false;begin perform 1 from public.user_workspaces limit 1;exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'FAIL: anonymous workspace read';end if;
 denied:=false;begin perform public.yn_schedule_publish(false,'{}');exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'FAIL: anonymous publication write';end if;
 execute 'set local role authenticated';perform set_config('request.jwt.claim.sub',b::text,true);
 bc:=public.yn_social_home()->'profile'->>'code';
 if (public.yn_schedule_config()->>'enabled')::boolean then raise exception 'FAIL: B inherited A publication';end if;
 perform set_config('request.jwt.claim.sub',a::text,true);
 update public.user_workspaces set data=jsonb_set(data,'{streams,0,title}','"Changed stream"') where user_id=a;
 if public.yn_public_schedule(token)->'entries'->0->>'title'<>'Changed stream' then raise exception 'FAIL: selected stream did not refresh';end if;
 update public.user_workspaces set data=jsonb_set(data,'{streams,0,status}','"Отменён"') where user_id=a;
 if jsonb_array_length(public.yn_public_schedule(token)->'entries')<>0 then raise exception 'FAIL: cancelled stream remains public';end if;
 perform public.yn_schedule_publish(false,array['pub']);if public.yn_public_schedule(token) is not null then raise exception 'FAIL: revoked link still returns data';end if;
 -- Incoming notifications reveal only conversation metadata, not bodies or another user's inbox.
 perform public.yn_social_request(bc);perform set_config('request.jwt.claim.sub',b::text,true);perform public.yn_social_action(ac,'accept');
 perform set_config('request.jwt.claim.sub',a::text,true);perform public.yn_social_send(bc,'PRIVATE MESSAGE BODY');
 if (public.yn_notifications()->>'total')::bigint<>0 then raise exception 'FAIL: sender sees recipient inbox';end if;
 perform set_config('request.jwt.claim.sub',b::text,true);feed:=public.yn_notifications();
 if (feed->>'total')::bigint<>1 or feed::text like '%PRIVATE MESSAGE BODY%' then raise exception 'FAIL: unread count or preview privacy';end if;
 latest:=(feed->'conversations'->0->>'last_id')::bigint;perform public.yn_chat_mark_read(ac,latest);
 if (public.yn_notifications()->>'total')::bigint<>0 then raise exception 'FAIL: mark read';end if;
 perform set_config('request.jwt.claim.sub',c::text,true);if (public.yn_notifications()->>'total')::bigint<>0 then raise exception 'FAIL: third-party inbox';end if;
 raise notice 'PASS: opt-in projection, anonymous isolation, revocation, live updates and private notifications';
end $$;
reset role;
rollback;
