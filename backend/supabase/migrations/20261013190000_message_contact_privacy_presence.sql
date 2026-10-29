begin;
-- A direct conversation starts as a contact request. Existing chats remain active.
alter table public.message_conversations
  add column contact_status text not null default 'accepted'
    check (contact_status in ('pending','accepted','rejected')),
  add column contact_decided_at timestamptz;
-- Used to distinguish persisted / received by a client / read.
alter table public.message_conversation_participants
  add column last_delivered_at timestamptz;
-- Soft deletion destroys the server-side ciphertext. A tombstone preserves the chronology.
alter table public.message_entries
  alter column encrypted_payload drop not null,
  add column deleted_for_all_at timestamptz;
create table public.message_hidden_entries (
  message_id uuid not null references public.message_entries(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  hidden_at timestamptz not null default now(),
  primary key(message_id, user_id)
);
alter table public.message_hidden_entries enable row level security;
revoke all on public.message_hidden_entries from anon, authenticated;
-- Private encrypted attachments. The API handles all access checks; no public storage URL.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cong-message-attachments', 'cong-message-attachments', false, 1100000, array['application/octet-stream'])
on conflict (id) do nothing;
create table public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.message_conversations(id) on delete cascade,
  owner_id uuid not null references public.users(id) on delete cascade,
  linked_message_id uuid unique references public.message_entries(id) on delete set null,
  storage_path text not null unique,
  created_at timestamptz not null default now()
);
create index message_attachments_conversation_idx on public.message_attachments(conversation_id);
alter table public.message_attachments enable row level security;
revoke all on public.message_attachments from anon, authenticated;
-- Allow realtime presence/typing only to authenticated members of the active conversation.
-- Security definer is required because message tables are intentionally API-only.
create or replace function public.can_access_message_realtime_topic(channel_topic text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
      from public.message_conversations c
      join public.message_conversation_participants p on p.conversation_id = c.id
      join public.users u on u.id = p.user_id
     where channel_topic = 'cong:conversation:' || c.id::text
       and u.auth_user_id = (select auth.uid())
       and u.active = true
       and c.contact_status = 'accepted'
       and (c.scope = 'global' or exists (
         select 1 from public.organization_users ou
          where ou.user_id = u.id and ou.organization_id = c.organization_id
            and ou.status = 'active'
       ))
  );
$$;
revoke all on function public.can_access_message_realtime_topic(text) from public;
grant execute on function public.can_access_message_realtime_topic(text) to authenticated;
create policy "cong_conversation_realtime_read"
  on realtime.messages for select to authenticated
  using (
    realtime.messages.extension in ('presence','broadcast')
    and public.can_access_message_realtime_topic((select realtime.topic()))
  );
create policy "cong_conversation_realtime_write"
  on realtime.messages for insert to authenticated
  with check (
    realtime.messages.extension in ('presence','broadcast')
    and public.can_access_message_realtime_topic((select realtime.topic()))
  );
create or replace function public.notify_message_conversation_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare auth_id uuid;
begin
  for auth_id in
    select u.auth_user_id from public.message_conversation_participants p
    join public.users u on u.id = p.user_id
    where p.conversation_id = new.id and u.active = true
  loop
    perform realtime.send(
      jsonb_build_object('conversationId', new.id, 'kind', 'contact_status'),
      'message_changed', 'cong:message-user:' || auth_id::text, true
    );
  end loop;
  return new;
end;
$$;
create trigger cong_conversation_status_changed after update of contact_status
  on public.message_conversations for each row
  when (old.contact_status is distinct from new.contact_status)
  execute function public.notify_message_conversation_change();
create or replace function public.notify_message_deleted()
returns trigger language plpgsql security definer set search_path = '' as $$
declare auth_id uuid;
begin
  if new.deleted_for_all_at is not null and old.deleted_for_all_at is null then
    for auth_id in
      select u.auth_user_id from public.message_conversation_participants p
      join public.users u on u.id = p.user_id
      where p.conversation_id = new.conversation_id and u.active = true
    loop
      perform realtime.send(
        jsonb_build_object('conversationId', new.conversation_id, 'kind', 'deleted'),
        'message_changed', 'cong:message-user:' || auth_id::text, true
      );
    end loop;
  end if;
  return new;
end;
$$;
create trigger cong_message_deleted after update of deleted_for_all_at
  on public.message_entries for each row
  execute function public.notify_message_deleted();
create or replace function public.notify_message_delivery_changed()
returns trigger language plpgsql security definer set search_path = '' as $$
declare auth_id uuid;
begin
  if new.last_delivered_at is distinct from old.last_delivered_at then
    for auth_id in
      select u.auth_user_id from public.message_conversation_participants p
      join public.users u on u.id = p.user_id
      where p.conversation_id = new.conversation_id and u.active = true
    loop
      perform realtime.send(
        jsonb_build_object('conversationId', new.conversation_id, 'kind', 'receipt'),
        'message_changed', 'cong:message-user:' || auth_id::text, true
      );
    end loop;
  end if;
  return new;
end;
$$;
create trigger cong_message_delivered after update of last_delivered_at
  on public.message_conversation_participants for each row
  when (new.last_delivered_at is distinct from old.last_delivered_at)
  execute function public.notify_message_delivery_changed();
commit;
