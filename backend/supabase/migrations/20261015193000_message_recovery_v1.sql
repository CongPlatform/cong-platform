begin;

-- Only the client knows the recovery secret. Server stores its verifier and AES-GCM ciphertext.
-- The verifier is derived from a 256-bit random code, never from a human password.
create table public.message_recovery_settings (
  user_id uuid primary key references public.users(id) on delete cascade,
  verifier char(64) not null check (verifier ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  last_backup_at timestamptz
);
create table public.message_recovery_entries (
  user_id uuid not null references public.users(id) on delete cascade,
  message_id uuid not null references public.message_entries(id) on delete cascade,
  iv text not null check (char_length(iv) between 16 and 40),
  ciphertext text not null check (char_length(ciphertext) between 20 and 64000),
  updated_at timestamptz not null default now(),
  primary key (user_id, message_id)
);
create index message_recovery_entries_message_idx on public.message_recovery_entries(message_id);
alter table public.message_recovery_settings enable row level security;
alter table public.message_recovery_entries enable row level security;
revoke all on public.message_recovery_settings from anon, authenticated;
revoke all on public.message_recovery_entries from anon, authenticated;

-- Deletions for everyone must invalidate all recovery copies as well.
create or replace function public.prune_message_recovery_entries()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.deleted_for_all_at is not null and old.deleted_for_all_at is null then
    delete from public.message_recovery_entries where message_id = new.id;
  end if;
  return new;
end; $$;
create trigger cong_message_recovery_prune after update of deleted_for_all_at
  on public.message_entries for each row
  when (new.deleted_for_all_at is distinct from old.deleted_for_all_at)
  execute function public.prune_message_recovery_entries();
commit;
