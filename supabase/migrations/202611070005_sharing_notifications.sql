-- Public schedule is opt-in; notifications expose only the recipient's accepted conversations.
begin;
create table if not exists yndsi_private.published_schedules (
 user_id uuid primary key references auth.users(id) on delete cascade,
 token uuid not null unique default gen_random_uuid(),
 enabled boolean not null default false,
 selected_ids text[] not null default '{}',
 entries jsonb not null default '[]',
 updated_at timestamptz not null default now(),check(cardinality(selected_ids)<=100)
);
alter table yndsi_private.published_schedules enable row level security;
revoke all on yndsi_private.published_schedules from public,anon,authenticated;
create or replace function yndsi_private.schedule_projection(p_data jsonb,p_ids text[]) returns jsonb
language plpgsql stable set search_path='' as $$
declare item jsonb; result jsonb:='[]'; start_time timestamptz; game_name text;
begin
 for item in select value from jsonb_array_elements(case when jsonb_typeof(p_data->'streams')='array' then p_data->'streams' else '[]'::jsonb end)
 where value->>'id'=any(p_ids) and value->>'status'='Запланирован' limit 100 loop
  begin
   if coalesce(item->>'startsAt','')<>'' then start_time:=(item->>'startsAt')::timestamptz;
   else start_time:=((item->>'date')||' '||(item->>'time'))::timestamp at time zone 'Asia/Atyrau'; end if;
  exception when others then continue; end;
  if start_time is null or not isfinite(start_time) then continue; end if;
  select value->>'title' into game_name from jsonb_array_elements(case when jsonb_typeof(p_data->'games')='array' then p_data->'games' else '[]'::jsonb end) where value->>'id'=item->>'gameId' limit 1;
  result:=result||jsonb_build_array(jsonb_build_object('title',left(coalesce(item->>'title','Стрим'),200),'game',left(coalesce(game_name,item->>'game',''),120),'startsAt',start_time));
 end loop;
 return coalesce((select jsonb_agg(value order by (value->>'startsAt')::timestamptz,value->>'title',value->>'game') from jsonb_array_elements(result)),'[]'::jsonb);
end $$;
revoke all on function yndsi_private.schedule_projection(jsonb,text[]) from public;
create or replace function public.yn_schedule_config() returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not yndsi_private.member_allowed() then raise exception 'Требуется вход'; end if;
 select jsonb_build_object('enabled',enabled,'token',token,'selected_ids',selected_ids,'entries',entries) into result from yndsi_private.published_schedules where user_id=auth.uid();
 return coalesce(result,'{"enabled":false,"selected_ids":[],"entries":[]}'::jsonb);
end $$;
create or replace function public.yn_schedule_publish(p_enabled boolean,p_ids text[] default '{}',p_rotate boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); workspace jsonb; projected jsonb;
begin
 if not yndsi_private.member_allowed() then raise exception 'Требуется вход'; end if;
 if p_enabled is null or p_ids is null or cardinality(p_ids)>100 then raise exception 'Выбери не больше 100 эфиров'; end if;
 select data into workspace from public.user_workspaces where user_id=me for update;
 if workspace is null then raise exception 'Сначала сохрани своё пространство'; end if;
 projected:=yndsi_private.schedule_projection(workspace,p_ids);
 if p_enabled and jsonb_array_length(projected)=0 then raise exception 'Выбери хотя бы один запланированный эфир с корректным временем'; end if;
 insert into yndsi_private.published_schedules(user_id,enabled,selected_ids,entries)
 values(me,p_enabled,p_ids,case when p_enabled then projected else '[]'::jsonb end)
 on conflict(user_id) do update set enabled=excluded.enabled,selected_ids=excluded.selected_ids,entries=excluded.entries,
 token=case when not excluded.enabled or p_rotate then gen_random_uuid() else published_schedules.token end,updated_at=now();
 return public.yn_schedule_config();
end $$;
create or replace function yndsi_private.refresh_published_schedule() returns trigger
language plpgsql security definer set search_path='' as $$
declare ids text[]; projected jsonb;
begin
 select selected_ids into ids from yndsi_private.published_schedules where user_id=new.user_id and enabled for update;
 if found then projected:=yndsi_private.schedule_projection(new.data,ids);
  update yndsi_private.published_schedules set entries=projected,updated_at=now() where user_id=new.user_id and entries is distinct from projected;
 end if;
 return new;
end $$;
revoke all on function yndsi_private.refresh_published_schedule() from public;
drop trigger if exists refresh_published_schedule on public.user_workspaces;
create trigger refresh_published_schedule after insert or update of data on public.user_workspaces for each row execute function yndsi_private.refresh_published_schedule();
create or replace function public.yn_public_schedule(p_token uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('name',p.name,'avatar',p.avatar,'timeZone','Asia/Atyrau','entries',s.entries,'updated_at',s.updated_at)
 from yndsi_private.published_schedules s join yndsi_private.social_profiles p on p.user_id=s.user_id where s.token=p_token and s.enabled;
$$;
create or replace function public.yn_schedule_profile(p_code text) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('token',s.token,'count',jsonb_array_length(s.entries)) from yndsi_private.social_profiles p
 join yndsi_private.published_schedules s on s.user_id=p.user_id and s.enabled
 where yndsi_private.member_allowed() and p.code=upper(btrim(p_code))
 and not exists(select 1 from yndsi_private.social_links l where l.a=least(auth.uid(),p.user_id) and l.b=greatest(auth.uid(),p.user_id) and l.status='blocked');
$$;
create table if not exists yndsi_private.social_read_positions (
 user_id uuid not null references auth.users(id) on delete cascade,
 peer uuid not null references auth.users(id) on delete cascade,
 last_id bigint not null default 0,primary key(user_id,peer),check(user_id<>peer)
);
alter table yndsi_private.social_read_positions enable row level security;
revoke all on yndsi_private.social_read_positions from public,anon,authenticated;
create index if not exists social_messages_recipient_id on yndsi_private.social_messages(recipient,id);
create or replace function public.yn_chat_mark_read(p_code text,p_through bigint) returns void
language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); target uuid; latest bigint;
begin
 if not yndsi_private.member_allowed() then raise exception 'Требуется вход'; end if;
 select user_id into target from yndsi_private.social_profiles where code=upper(btrim(p_code));
 if target is null or not exists(select 1 from yndsi_private.social_links where a=least(me,target) and b=greatest(me,target) and status='accepted') then raise exception 'Чат недоступен'; end if;
 select max(id) into latest from yndsi_private.social_messages where sender=target and recipient=me and id<=p_through;
 if latest is not null then insert into yndsi_private.social_read_positions(user_id,peer,last_id) values(me,target,latest)
 on conflict(user_id,peer) do update set last_id=greatest(social_read_positions.last_id,excluded.last_id); end if;
end $$;
create or replace function public.yn_notifications() returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not yndsi_private.member_allowed() then raise exception 'Требуется вход'; end if;
 with unread as (
  select p.code,p.name,count(*) as count,max(m.id) as last_id from yndsi_private.social_messages m
  join yndsi_private.social_profiles p on p.user_id=m.sender
  join yndsi_private.social_links l on l.a=least(m.sender,m.recipient) and l.b=greatest(m.sender,m.recipient) and l.status='accepted'
  left join yndsi_private.social_read_positions r on r.user_id=m.recipient and r.peer=m.sender
  where m.recipient=auth.uid() and m.id>coalesce(r.last_id,0) group by p.code,p.name
 ) select jsonb_build_object('total',coalesce((select sum(count) from unread),0),'conversations',coalesce((
  select jsonb_agg(jsonb_build_object('code',code,'name',name,'count',count,'last_id',last_id::text) order by last_id desc)
  from (select * from unread order by last_id desc limit 40) summary_rows
 ),'[]'::jsonb)) into result;
 return result;
end $$;
revoke all on function public.yn_schedule_config(),public.yn_schedule_publish(boolean,text[],boolean),public.yn_public_schedule(uuid),public.yn_schedule_profile(text),public.yn_chat_mark_read(text,bigint),public.yn_notifications() from public;
grant execute on function public.yn_schedule_config(),public.yn_schedule_publish(boolean,text[],boolean),public.yn_schedule_profile(text),public.yn_chat_mark_read(text,bigint),public.yn_notifications() to authenticated;
grant execute on function public.yn_public_schedule(uuid) to anon,authenticated;
commit;
