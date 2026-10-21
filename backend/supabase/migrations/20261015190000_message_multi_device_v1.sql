begin;

-- A device has a distinct ECDH key. Legacy identity remains the primary device.
-- Pending devices cannot receive future messages until proof-of-key approval.
create table public.message_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  public_key jsonb not null check (jsonb_typeof(public_key) = 'object'),
  label text not null check (char_length(label) between 1 and 80),
  status text not null default 'pending' check (status in ('pending','active','revoked')),
  challenge_proof bytea,
  challenge_expires_at timestamptz,
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  revoked_at timestamptz
);
create index message_devices_user_status_idx on public.message_devices(user_id, status);
create unique index message_devices_key_unique on public.message_devices(user_id, (public_key::text)) where status <> 'revoked';
alter table public.message_devices enable row level security;
revoke all on public.message_devices from anon, authenticated;

-- Migrated historical content is independently re-encrypted in the original browser.
-- Never store decrypted text or user private keys on the server.
create table public.message_device_history (
  device_id uuid not null references public.message_devices(id) on delete cascade,
  message_id uuid not null references public.message_entries(id) on delete cascade,
  encrypted_payload jsonb not null check (jsonb_typeof(encrypted_payload) = 'object' and pg_column_size(encrypted_payload) < 65536),
  primary key(device_id, message_id)
);
create index message_device_history_message_idx on public.message_device_history(message_id);
alter table public.message_device_history enable row level security;
revoke all on public.message_device_history from anon, authenticated;

create or replace function public.prune_message_device_history()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.deleted_for_all_at is not null and old.deleted_for_all_at is null then
    delete from public.message_device_history where message_id = new.id;
  end if;
  return new;
end; $$;
create trigger cong_message_device_history_prune after update of deleted_for_all_at
  on public.message_entries for each row
  when (new.deleted_for_all_at is distinct from old.deleted_for_all_at)
  execute function public.prune_message_device_history();

commit;
