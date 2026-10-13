begin;

-- CONG Messages v1: direct conversations and encryption performed ONLY on clients.
-- No server-side plaintext or user private keys. All tables only via Express API.
create table public.message_module_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  enabled boolean not null default false,
  direct_messages_enabled boolean not null default true,
  read_receipts_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
create trigger set_message_module_settings_updated_at before update on public.message_module_settings
  for each row execute function public.set_updated_at();

-- One ECDH public key per account, one device at a time in v1.
-- Changing it requires a signed-in explicit reset; old ciphertext remains inaccessible.
create table public.message_identity_keys (
  user_id uuid primary key references public.users(id) on delete cascade,
  public_key jsonb not null,
  key_version integer not null default 1 check (key_version > 0),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(public_key) = 'object')
);

create table public.message_conversations (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('global', 'organization')),
  organization_id uuid references public.organizations(id) on delete cascade,
  kind text not null default 'direct' check (kind = 'direct'),
  direct_pair_key text not null,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint message_scope_organization_consistent check (
    (scope = 'global' and organization_id is null) or
    (scope = 'organization' and organization_id is not null)
  )
);
create unique index message_conversations_direct_unique
  on public.message_conversations (scope, coalesce(organization_id::text, ''), direct_pair_key);
create index message_conversations_organization_idx
  on public.message_conversations (organization_id, updated_at desc);
create trigger set_message_conversations_updated_at before update on public.message_conversations
  for each row execute function public.set_updated_at();

create table public.message_conversation_participants (
  conversation_id uuid not null references public.message_conversations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index message_participants_user_idx
  on public.message_conversation_participants (user_id, conversation_id);

-- Ciphertext-only message records. A unique client nonce supports safe retry.
create table public.message_entries (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.message_conversations(id) on delete cascade,
  sender_user_id uuid not null references public.users(id) on delete cascade,
  client_message_id uuid not null,
  encrypted_payload jsonb not null check (
    jsonb_typeof(encrypted_payload) = 'object' and
    pg_column_size(encrypted_payload) < 65536
  ),
  created_at timestamptz not null default now(),
  unique (sender_user_id, client_message_id)
);
create index message_entries_history_idx
  on public.message_entries (conversation_id, created_at desc, id desc);

-- API authentication and authorization are mandatory; JWT consumers cannot query tables directly.
alter table public.message_module_settings enable row level security;
alter table public.message_identity_keys enable row level security;
alter table public.message_conversations enable row level security;
alter table public.message_conversation_participants enable row level security;
alter table public.message_entries enable row level security;
revoke all on public.message_module_settings from anon, authenticated;
revoke all on public.message_identity_keys from anon, authenticated;
revoke all on public.message_conversations from anon, authenticated;
revoke all on public.message_conversation_participants from anon, authenticated;
revoke all on public.message_entries from anon, authenticated;

-- Realtime only broadcasts event metadata to the signed-in user's private channel.
-- Never broadcast ciphertext or private keys. RLS restricts channels to the JWT subject.
create policy "cong_private_message_notifications"
  on realtime.messages for select to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and (select realtime.topic()) = 'cong:message-user:' || (select auth.uid())::text
  );

create or replace function public.notify_message_participants()
returns trigger language plpgsql security definer set search_path = '' as $$
declare user_auth_id uuid;
begin
  for user_auth_id in
    select u.auth_user_id from public.message_conversation_participants p
    join public.users u on u.id = p.user_id
    where p.conversation_id = new.conversation_id and u.active = true
  loop
    perform realtime.send(
      jsonb_build_object('conversationId', new.conversation_id, 'entryId', new.id),
      'message_changed', 'cong:message-user:' || user_auth_id::text, true
    );
  end loop;
  return new;
end; $$;
create trigger cong_message_created after insert on public.message_entries
  for each row execute function public.notify_message_participants();

-- Realtime also alerts recipients of newly created (still empty) conversations.
create or replace function public.notify_conversation_participant()
returns trigger language plpgsql security definer set search_path = '' as $$
declare user_auth_id uuid;
begin
  select u.auth_user_id into user_auth_id from public.users u where u.id = new.user_id and u.active = true;
  if user_auth_id is not null then
    perform realtime.send(
      jsonb_build_object('conversationId', new.conversation_id),
      'message_changed', 'cong:message-user:' || user_auth_id::text, true
    );
  end if;
  return new;
end; $$;
create trigger cong_conversation_participant_created
  after insert on public.message_conversation_participants
  for each row execute function public.notify_conversation_participant();

commit;
