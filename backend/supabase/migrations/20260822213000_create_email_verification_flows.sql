create table public.email_verification_flows (
  id uuid primary key default gen_random_uuid(),

  auth_user_id uuid not null
    references auth.users(id)
    on delete cascade,

  token_hash text not null unique,

  expires_at timestamptz not null,

  confirmed_at timestamptz null,

  created_at timestamptz not null default now()
);

create index email_verification_flows_auth_user_id_idx
  on public.email_verification_flows(auth_user_id);

create index email_verification_flows_expires_at_idx
  on public.email_verification_flows(expires_at);

alter table public.email_verification_flows
  enable row level security;