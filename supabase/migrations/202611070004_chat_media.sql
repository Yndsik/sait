-- Private attachments. Requires social and multiuser migrations.
begin;
create table if not exists yndsi_private.social_attachments (
 id uuid primary key default gen_random_uuid(),
 sender uuid not null references auth.users(id) on delete cascade,
 recipient uuid not null references auth.users(id) on delete cascade,
 path text not null unique,
 kind text not null check(kind in ('photo','voice','video')),
 mime text not null,
 bytes bigint not null check(bytes>0 and bytes<=20971520),
 duration numeric,
 state text not null default 'pending' check(state in ('pending','sent')),
 created_at timestamptz not null default now(),check(sender<>recipient)
);
alter table yndsi_private.social_attachments enable row level security;
revoke all on yndsi_private.social_attachments from public,anon,authenticated;
alter table yndsi_private.social_messages add column if not exists attachment_id uuid unique references yndsi_private.social_attachments(id) on delete cascade;
alter table yndsi_private.social_messages drop constraint if exists social_messages_body_check;
alter table yndsi_private.social_messages drop constraint if exists social_message_content;
alter table yndsi_private.social_messages add constraint social_message_content
 check(length(btrim(body)) between 1 and 2000 or (attachment_id is not null and body=''));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('chat-media','chat-media',false,20971520,array['image/jpeg','image/png','image/webp','audio/webm','audio/mp4','audio/ogg','video/mp4','video/webm'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
-- Predicates expose only a boolean, not the private attachment table.
create or replace function public.yn_media_access(p_path text,p_mode text) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and yndsi_private.member_allowed() and exists(
 select 1 from yndsi_private.social_attachments a where a.path=p_path and (
  (p_mode='delete' and a.sender=auth.uid() and a.state='pending')
  or (p_mode='upload' and a.sender=auth.uid() and a.state='pending' and a.created_at>now()-interval '1 hour'
      and exists(select 1 from yndsi_private.social_links l where l.a=least(a.sender,a.recipient) and l.b=greatest(a.sender,a.recipient) and l.status='accepted'))
  or (p_mode='read' and a.sender=auth.uid() and a.state='pending')
  or (p_mode='read' and a.state='sent' and auth.uid() in(a.sender,a.recipient)
      and exists(select 1 from yndsi_private.social_links l where l.a=least(a.sender,a.recipient) and l.b=greatest(a.sender,a.recipient) and l.status='accepted'))
 ));
$$;
revoke all on function public.yn_media_access(text,text) from public;
grant execute on function public.yn_media_access(text,text) to authenticated,anon;
drop policy if exists chat_media_upload on storage.objects;
drop policy if exists chat_media_read on storage.objects;
drop policy if exists chat_media_delete on storage.objects;
create policy chat_media_upload on storage.objects for insert to authenticated
with check(bucket_id='chat-media' and public.yn_media_access(name,'upload'));
create policy chat_media_read on storage.objects for select to authenticated
using(bucket_id='chat-media' and public.yn_media_access(name,'read'));
create policy chat_media_delete on storage.objects for delete to authenticated
using(bucket_id='chat-media' and public.yn_media_access(name,'delete'));
-- Restrictive guards also apply if this project has broad policies for other buckets.
drop policy if exists chat_media_guard_read on storage.objects;
drop policy if exists chat_media_guard_insert on storage.objects;
drop policy if exists chat_media_guard_delete on storage.objects;
drop policy if exists chat_media_guard_update on storage.objects;
create policy chat_media_guard_read on storage.objects as restrictive for select to public
using(bucket_id<>'chat-media' or public.yn_media_access(name,'read'));
create policy chat_media_guard_insert on storage.objects as restrictive for insert to public
with check(bucket_id<>'chat-media' or public.yn_media_access(name,'upload'));
create policy chat_media_guard_delete on storage.objects as restrictive for delete to public
using(bucket_id<>'chat-media' or public.yn_media_access(name,'delete'));
create policy chat_media_guard_update on storage.objects as restrictive for update to public
using(bucket_id<>'chat-media') with check(bucket_id<>'chat-media');
create or replace function public.yn_media_prepare(p_code text,p_kind text,p_mime text,p_bytes bigint,p_duration numeric default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); peer uuid; ident uuid:=gen_random_uuid(); object_path text; ext text;
begin
 if not yndsi_private.member_allowed() then raise exception 'Подтверди почту и войди'; end if;
 select user_id into peer from yndsi_private.social_profiles where code=upper(btrim(p_code));
 if peer is null or not exists(select 1 from yndsi_private.social_links where a=least(me,peer) and b=greatest(me,peer) and status='accepted') then raise exception 'Вложения доступны только друзьям'; end if;
 if p_bytes is null or p_bytes<=0 or p_kind is null or p_mime is null then raise exception 'Некорректное вложение'; end if;
 if p_kind='photo' and p_mime in ('image/jpeg','image/png','image/webp') and p_bytes<=8388608 and p_duration is null then
  ext:=case p_mime when 'image/jpeg' then 'jpg' when 'image/png' then 'png' else 'webp' end;
 elsif p_kind='voice' and p_mime in ('audio/webm','audio/mp4','audio/ogg') and p_bytes<=10485760 and p_duration>0 and p_duration<=120 then
  ext:=case p_mime when 'audio/mp4' then 'm4a' when 'audio/ogg' then 'ogg' else 'webm' end;
 elsif p_kind='video' and p_mime in ('video/mp4','video/webm') and p_bytes<=20971520 and p_duration>0 and p_duration<=30 then
  ext:=case p_mime when 'video/mp4' then 'mp4' else 'webm' end;
 else raise exception 'Тип, размер или длительность вложения не поддерживаются'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(me::text,2));
 if (select count(*) from yndsi_private.social_attachments where sender=me and created_at>now()-interval '1 hour')>=60 then raise exception 'Лимит вложений: попробуй позже'; end if;
 object_path:=me::text||'/'||ident::text||'.'||ext;
 insert into yndsi_private.social_attachments(id,sender,recipient,path,kind,mime,bytes,duration) values(ident,me,peer,object_path,p_kind,p_mime,p_bytes,p_duration);
 return jsonb_build_object('id',ident,'path',object_path);
end $$;
create or replace function public.yn_social_send_media(p_attachment uuid,p_body text default '') returns void
language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); item yndsi_private.social_attachments%rowtype; meta jsonb;
begin
 if not yndsi_private.member_allowed() then raise exception 'Требуется вход'; end if;
 select * into item from yndsi_private.social_attachments where id=p_attachment and sender=me for update;
 if not found then raise exception 'Вложение недоступно'; end if;
 if item.state='sent' then return; end if;
 if p_body is null or length(btrim(p_body))>2000 then raise exception 'Подпись слишком длинная'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(least(me,item.recipient)::text||greatest(me,item.recipient)::text,0));
 if not exists(select 1 from yndsi_private.social_links where a=least(me,item.recipient) and b=greatest(me,item.recipient) and status='accepted') then raise exception 'Чат недоступен'; end if;
 if item.created_at<now()-interval '1 hour' then raise exception 'Загрузка устарела'; end if;
 select metadata into meta from storage.objects where bucket_id='chat-media' and name=item.path;
 if meta is null or (meta->>'size')::bigint is distinct from item.bytes or meta->>'mimetype' is distinct from item.mime then raise exception 'Файл не загружен или параметры не совпадают'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(me::text,1));
 if exists(select 1 from yndsi_private.social_messages where sender=me and created_at>clock_timestamp()-interval '1 second') then raise exception 'Подожди секунду перед отправкой'; end if;
 update yndsi_private.social_attachments set state='sent' where id=item.id;
 insert into yndsi_private.social_messages(sender,recipient,body,attachment_id) values(me,item.recipient,btrim(p_body),item.id);
end $$;
create or replace function public.yn_media_cancel(p_attachment uuid) returns void
language plpgsql security definer set search_path='' as $$
declare item yndsi_private.social_attachments%rowtype;
begin
 select * into item from yndsi_private.social_attachments where id=p_attachment and sender=auth.uid() for update;
 if not found or item.state='sent' then return; end if;
 if exists(select 1 from storage.objects where bucket_id='chat-media' and name=item.path) then raise exception 'Сначала удали незавершённую загрузку'; end if;
 delete from yndsi_private.social_attachments where id=item.id;
end $$;
create or replace function public.yn_social_chat(p_code text,p_before bigint default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); peer uuid; result jsonb;
begin
 if not yndsi_private.member_allowed() then raise exception 'Требуется вход'; end if;
 select user_id into peer from yndsi_private.social_profiles where code=upper(btrim(p_code));
 if peer is null or not exists(select 1 from yndsi_private.social_links where a=least(me,peer) and b=greatest(me,peer) and status='accepted') then raise exception 'Чат доступен только друзьям'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',m.id::text,'mine',m.sender=me,'body',m.body,'created_at',m.created_at,'attachment',case when a.id is null then null else jsonb_build_object('id',a.id,'path',a.path,'kind',a.kind,'mime',a.mime,'bytes',a.bytes,'duration',a.duration) end) order by m.id),'[]'::jsonb) into result
 from (select * from yndsi_private.social_messages where least(sender,recipient)=least(me,peer) and greatest(sender,recipient)=greatest(me,peer) and (p_before is null or id<p_before) order by id desc limit 40) m
 left join yndsi_private.social_attachments a on a.id=m.attachment_id and a.state='sent';
 return result;
end $$;
revoke all on function public.yn_media_prepare(text,text,text,bigint,numeric),public.yn_social_send_media(uuid,text),public.yn_media_cancel(uuid),public.yn_social_chat(text,bigint) from public;
grant execute on function public.yn_media_prepare(text,text,text,bigint,numeric),public.yn_social_send_media(uuid,text),public.yn_media_cancel(uuid),public.yn_social_chat(text,bigint) to authenticated;
commit;
