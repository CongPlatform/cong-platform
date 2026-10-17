-- CONG chat v2. DESTRUCTIVE ONLY FOR MESSAGE DATA. Apply only after backing up the database.
-- All legacy conversations are test data and are intentionally discarded, as authorized.
begin;

-- Remove legacy realtime access policies before retiring their SECURITY DEFINER helpers.
drop policy if exists cong_conversation_realtime_read on realtime.messages;
drop policy if exists cong_conversation_realtime_write on realtime.messages;

-- Message-only tables. Accounts, organizations and their memberships are untouched.
-- Also retire V9 experiments if they were applied in this environment.
drop table if exists public.message_device_history cascade;
drop table if exists public.message_recovery_entries cascade;
drop table if exists public.message_recovery_settings cascade;
drop table if exists public.message_devices cascade;
drop table if exists public.message_hidden_entries cascade;
drop table if exists public.message_attachments cascade;
drop table if exists public.message_entries cascade;
drop table if exists public.message_conversation_participants cascade;
drop table if exists public.message_conversations cascade;
drop table if exists public.message_identity_keys cascade;
-- Legacy message settings are retained, including each organization's enabled flag.

-- Retire unused legacy trigger functions and E2EE-only realtime authorization helper.
drop function if exists public.prune_message_device_history() cascade;
drop function if exists public.prune_message_recovery_entries() cascade;
drop function if exists public.notify_message_participants() cascade;
drop function if exists public.notify_conversation_participant() cascade;
drop function if exists public.notify_message_conversation_change() cascade;
drop function if exists public.notify_message_deleted() cascade;
drop function if exists public.notify_message_delivery_changed() cascade;
drop function if exists public.notify_message_receipt_changed() cascade;
drop function if exists public.can_access_message_realtime_topic(text) cascade;

create table public.message_conversations (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('global','organization')),
  organization_id uuid references public.organizations(id) on delete cascade,
  kind text not null check (kind in ('direct','group')),
  title varchar(100),
  direct_pair_key text,
  created_by uuid references public.users(id) on delete set null,
  contact_status text not null default 'accepted' check (contact_status in ('pending','accepted','rejected')),
  contact_decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((scope = 'global' and organization_id is null) or (scope = 'organization' and organization_id is not null)),
  check ((kind = 'direct' and direct_pair_key is not null and title is null) or
         (kind = 'group' and direct_pair_key is null and title is not null and contact_status = 'accepted'))
);
create unique index message_direct_pair_unique on public.message_conversations(scope, coalesce(organization_id::text,''), direct_pair_key) where kind = 'direct';
create index message_conversations_scope_idx on public.message_conversations(scope, organization_id, updated_at desc);
create trigger set_message_conversations_updated_at before update on public.message_conversations
  for each row execute function public.set_updated_at();

create table public.message_conversation_participants (
  conversation_id uuid not null references public.message_conversations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','member')),
  joined_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  last_delivered_at timestamptz,
  primary key(conversation_id, user_id)
);
create index message_participants_user_idx on public.message_conversation_participants(user_id, conversation_id);

create table public.message_entries (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.message_conversations(id) on delete cascade,
  sender_user_id uuid not null references public.users(id) on delete cascade,
  client_message_id uuid not null,
  body text not null default '' check (char_length(body) <= 4000),
  attachment_id uuid,
  reply_to_id uuid references public.message_entries(id) on delete set null,
  created_at timestamptz not null default now(),
  deleted_for_all_at timestamptz,
  unique(sender_user_id, client_message_id),
  check (body <> '' or attachment_id is not null or deleted_for_all_at is not null)
);
create index message_entries_recent_idx on public.message_entries(conversation_id, created_at desc, id desc);

create table public.message_hidden_entries (
  message_id uuid not null references public.message_entries(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  hidden_at timestamptz not null default now(),
  primary key(message_id,user_id)
);
create table public.message_reactions (
  message_id uuid not null references public.message_entries(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  emoji varchar(16) not null check (emoji in ('❤️','👍','😂','😮','😢','🙏')),
  created_at timestamptz not null default now(),
  primary key(message_id,user_id,emoji)
);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('cong-chat-files','cong-chat-files',false,26000000,null)
on conflict(id) do update set public = false, file_size_limit=26000000, allowed_mime_types=null;

create table public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.message_conversations(id) on delete cascade,
  owner_id uuid not null references public.users(id) on delete cascade,
  linked_message_id uuid unique references public.message_entries(id) on delete set null,
  storage_path text not null unique,
  file_name varchar(255) not null,
  mime_type varchar(128) not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 25000000),
  created_at timestamptz not null default now()
);
alter table public.message_entries add constraint message_entry_attachment_fk foreign key(attachment_id) references public.message_attachments(id) on delete set null;
create index message_attachments_conversation_idx on public.message_attachments(conversation_id);

-- API-only. No browser access to the message tables or the private storage bucket.
do $$ declare t text; begin
  foreach t in array array['message_conversations','message_conversation_participants','message_entries',
     'message_hidden_entries','message_reactions','message_attachments'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon, authenticated',t);
  end loop;
end $$;

-- Realtime broadcasts contain *only IDs*, never content or attachment URLs.
create or replace function public.cong_chat_notify_entry()
returns trigger language plpgsql security definer set search_path = '' as $$
declare aid uuid;
begin
  for aid in
    select u.auth_user_id from public.message_conversation_participants p
    join public.users u on u.id=p.user_id
    where p.conversation_id=new.conversation_id and u.active
  loop
    perform realtime.send(jsonb_build_object('conversationId',new.conversation_id),
      'message_changed','cong:message-user:'||aid::text,true);
  end loop;
  return new;
end; $$;
create trigger cong_chat_entry_inserted after insert on public.message_entries
  for each row execute function public.cong_chat_notify_entry();
create trigger cong_chat_entry_updated after update of deleted_for_all_at on public.message_entries
  for each row when (old.deleted_for_all_at is distinct from new.deleted_for_all_at)
  execute function public.cong_chat_notify_entry();

create or replace function public.cong_chat_notify_conversation_update()
returns trigger language plpgsql security definer set search_path = '' as $$
declare aid uuid;
begin
  for aid in select u.auth_user_id from public.message_conversation_participants p
     join public.users u on u.id=p.user_id where p.conversation_id=new.id and u.active
  loop
    perform realtime.send(jsonb_build_object('conversationId',new.id),
      'message_changed','cong:message-user:'||aid::text,true);
  end loop;
  return new;
end; $$;
create trigger cong_chat_conversation_updated after update of contact_status,title,updated_at on public.message_conversations
  for each row execute function public.cong_chat_notify_conversation_update();

create or replace function public.cong_chat_notify_participant()
returns trigger language plpgsql security definer set search_path = '' as $$
declare aid uuid;
begin
  select auth_user_id into aid from public.users where id=new.user_id and active;
  if aid is not null then
    perform realtime.send(jsonb_build_object('conversationId',new.conversation_id),
      'message_changed','cong:message-user:'||aid::text,true);
  end if;
  return new;
end; $$;
create trigger cong_chat_participant_inserted after insert on public.message_conversation_participants
  for each row execute function public.cong_chat_notify_participant();

-- Status, reactions and read receipts notify every participant to refresh.
create or replace function public.cong_chat_notify_conversation()
returns trigger language plpgsql security definer set search_path = '' as $$
declare aid uuid; cid uuid;
begin
  if TG_TABLE_NAME = 'message_reactions' then
    select conversation_id into cid from public.message_entries
      where id = case when TG_OP = 'DELETE' then old.message_id else new.message_id end;
  else
    cid := new.conversation_id;
  end if;
  if cid is null then
    if TG_OP = 'DELETE' then return old; end if;
    return new;
  end if;
  for aid in
    select u.auth_user_id from public.message_conversation_participants p
    join public.users u on u.id=p.user_id where p.conversation_id=cid and u.active
  loop
    perform realtime.send(jsonb_build_object('conversationId',cid),
      'message_changed','cong:message-user:'||aid::text,true);
  end loop;
  if TG_OP = 'DELETE' then return old; end if;
  return new;
end; $$;
create trigger cong_chat_reaction_inserted after insert on public.message_reactions
  for each row execute function public.cong_chat_notify_conversation();
create trigger cong_chat_reaction_removed after delete on public.message_reactions
  for each row execute function public.cong_chat_notify_conversation();
create trigger cong_chat_read_changed after update of last_read_at on public.message_conversation_participants
  for each row when (old.last_read_at is distinct from new.last_read_at)
  execute function public.cong_chat_notify_conversation();
create trigger cong_chat_delivery_changed after update of last_delivered_at on public.message_conversation_participants
  for each row when (old.last_delivered_at is distinct from new.last_delivered_at)
  execute function public.cong_chat_notify_conversation();

-- Private presence/typing channels: authenticated, active group members only.
create or replace function public.can_access_message_realtime_topic(channel_topic text)
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(
  select 1 from public.message_conversations c
  join public.message_conversation_participants p on p.conversation_id=c.id
  join public.users u on u.id=p.user_id
  where channel_topic='cong:conversation:'||c.id::text
    and u.auth_user_id=(select auth.uid()) and u.active
    and c.contact_status='accepted'
    and (c.scope='global' or exists(
      select 1 from public.organization_users ou where ou.user_id=u.id
      and ou.organization_id=c.organization_id and ou.status='active'))
 );
$$;
revoke all on function public.can_access_message_realtime_topic(text) from public;
grant execute on function public.can_access_message_realtime_topic(text) to authenticated;
create policy cong_conversation_realtime_read on realtime.messages for select to authenticated
 using (realtime.messages.extension in ('presence','broadcast') and
   public.can_access_message_realtime_topic((select realtime.topic())));
create policy cong_conversation_realtime_write on realtime.messages for insert to authenticated
 with check (realtime.messages.extension in ('presence','broadcast') and
   public.can_access_message_realtime_topic((select realtime.topic())));
-- Keep private user channel policies from original migration.
-- No anonymous/unauthenticated access to messages or storage objects is granted.
commit;
