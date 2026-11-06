-- Run WHOLE file in SQL Editor after migration 202611070003. Test data is rolled back.
begin;
do $$
declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); c uuid:=gen_random_uuid(); denied boolean; n bigint; original_code text;
begin
 insert into auth.users(id,email,aud,role,email_confirmed_at,created_at,updated_at,raw_user_meta_data) values
 (a,a::text||'@example.invalid','authenticated','authenticated',now(),now(),now(),'{"nickname":"Member A"}'),
 (b,b::text||'@example.invalid','authenticated','authenticated',now(),now(),now(),'{"nickname":"Member B"}'),
 (c,c::text||'@example.invalid','authenticated','authenticated',null,now(),now(),'{"nickname":"Pending C"}');
 if not exists(select 1 from yndsi_private.social_profiles where user_id=c) then raise exception 'FAIL: signup did not assign ID'; end if;
 execute 'set local role authenticated';
 perform set_config('request.jwt.claim.sub',a::text,true);
 if not (public.yndsi_session_access()->>'allowed')::boolean then raise exception 'FAIL: confirmed member denied'; end if;
 if public.yn_social_home()->'profile'->>'name'<>'Member A' then raise exception 'FAIL: nickname metadata'; end if;
 original_code:=public.yn_social_home()->'profile'->>'code';
 perform public.yn_social_profile('New nick','','');
 if public.yn_social_home()->'profile'->>'code'<>original_code then raise exception 'FAIL: ID changed'; end if;
 insert into public.user_workspaces(user_id,data,updated_at) values(a,'{"games":[{"title":"A private"}],"streams":[],"notes":[],"tasks":[]}',now());
 perform set_config('request.jwt.claim.sub',b::text,true);
 select count(*) into n from public.user_workspaces where user_id=a;
 if n<>0 then raise exception 'FAIL: B read A workspace'; end if;
 update public.user_workspaces set data='{}' where user_id=a;get diagnostics n=row_count;
 if n<>0 then raise exception 'FAIL: B updated A workspace'; end if;
 denied:=false;
 begin insert into public.user_workspaces(user_id,data,updated_at) values(a,'{}',now()) on conflict(user_id) do update set data=excluded.data;
 exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'FAIL: B upserted A workspace'; end if;
 insert into public.user_workspaces(user_id,data,updated_at) values(b,'{"games":[],"streams":[],"notes":[{"title":"B private"}],"tasks":[]}',now());
 select count(*) into n from public.user_workspaces where user_id=b;
 if n<>1 then raise exception 'FAIL: B cannot use own workspace'; end if;
 perform set_config('request.jwt.claim.sub',c::text,true);
 if (public.yndsi_session_access()->>'allowed')::boolean then raise exception 'FAIL: unconfirmed member allowed'; end if;
 denied:=false;
 begin insert into public.user_workspaces(user_id,data,updated_at) values(c,'{}',now()); exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'FAIL: unconfirmed write'; end if;
 perform set_config('request.jwt.claim.sub',a::text,true);
 select count(*) into n from public.user_workspaces where user_id=a and data->'games'->0->>'title'='A private';
 if n<>1 then raise exception 'FAIL: A data damaged'; end if;
 raise notice 'PASS: separate member workspaces, RLS isolation, confirmation and stable ID';
end $$;
reset role;
rollback;
