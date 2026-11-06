-- Run whole file AFTER migration 202611070004. Metadata-only test: no real files uploaded.
begin;
do $$
declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); c uuid:=gen_random_uuid(); ac text; bc text; entry jsonb; ident uuid; path text; denied boolean; n bigint;
begin
 insert into auth.users(id,email,aud,role,email_confirmed_at,created_at,updated_at) values
 (a,a::text||'@example.invalid','authenticated','authenticated',now(),now(),now()),
 (b,b::text||'@example.invalid','authenticated','authenticated',now(),now(),now()),
 (c,c::text||'@example.invalid','authenticated','authenticated',now(),now(),now());
 if (select public from storage.buckets where id='chat-media') then raise exception 'FAIL: bucket is public'; end if;
 execute 'set local role authenticated';
 perform set_config('request.jwt.claim.sub',a::text,true);ac:=public.yn_social_home()->'profile'->>'code';
 perform set_config('request.jwt.claim.sub',b::text,true);bc:=public.yn_social_home()->'profile'->>'code';
 perform set_config('request.jwt.claim.sub',a::text,true);denied:=false;
 begin perform public.yn_media_prepare(bc,'photo','image/jpeg',10,null);exception when raise_exception then denied:=true;end;
 if not denied then raise exception 'FAIL: media to non-friend';end if;
 perform public.yn_social_request(bc);
 perform set_config('request.jwt.claim.sub',b::text,true);perform public.yn_social_action(ac,'accept');
 perform set_config('request.jwt.claim.sub',a::text,true);denied:=false;
 begin perform public.yn_media_prepare(bc,'photo','image/svg+xml',10,null);exception when raise_exception then denied:=true;end;
 if not denied then raise exception 'FAIL: SVG accepted';end if;
 entry:=public.yn_media_prepare(bc,'photo','image/jpeg',10,null);ident:=(entry->>'id')::uuid;path:=entry->>'path';
 if not public.yn_media_access(path,'upload') then raise exception 'FAIL: sender upload denied';end if;
 denied:=false;begin perform public.yn_social_send_media(ident,'');exception when raise_exception then denied:=true;end;
 if not denied then raise exception 'FAIL: missing file accepted';end if;
 perform set_config('request.jwt.claim.sub',b::text,true);
 if public.yn_media_access(path,'read') or public.yn_media_access(path,'upload') then raise exception 'FAIL: recipient reads pending or uploads';end if;
 perform set_config('request.jwt.claim.sub',a::text,true);
 insert into storage.objects(bucket_id,name,metadata) values('chat-media',path,'{"size":10,"mimetype":"image/jpeg"}');
 perform public.yn_social_send_media(ident,'');perform public.yn_social_send_media(ident,'');
 select jsonb_array_length(public.yn_social_chat(bc)) into n;if n<>1 then raise exception 'FAIL: duplicate media message';end if;
 perform set_config('request.jwt.claim.sub',b::text,true);
 if not public.yn_media_access(path,'read') then raise exception 'FAIL: accepted recipient cannot read';end if;
 delete from storage.objects where bucket_id='chat-media' and name=path;get diagnostics n=row_count;
 if n<>0 then raise exception 'FAIL: recipient deleted sent media';end if;
 perform set_config('request.jwt.claim.sub',c::text,true);
 select count(*) into n from storage.objects where bucket_id='chat-media' and name=path;if n<>0 then raise exception 'FAIL: third-party storage read';end if;
 perform set_config('request.jwt.claim.sub',b::text,true);perform public.yn_social_action(ac,'block');
 if public.yn_media_access(path,'read') then raise exception 'FAIL: storage read after block';end if;
 raise notice 'PASS: friendship, pending media, metadata verification, idempotency and storage isolation';
end $$;
reset role;
rollback;
