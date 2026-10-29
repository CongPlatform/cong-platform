-- CONG IA: sessões/filas persistentes somente via backend autorizado.
-- Executar no Supabase SQL Editor antes de ativar CONG_AI_ENABLED.
create table if not exists public.ai_sessions (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 created_by_auth_user_id uuid not null,
 goal text not null check (goal in ('system','site','both')),
 status text not null default 'pending' check (status in ('pending','processing','clarify','propose','failed','cancelled')),
 round integer not null default 0 check (round between 0 and 4),
 asked integer not null default 0 check (asked between 0 and 4),
 revision_count integer not null default 0,
 retries integer not null default 0,
 turns jsonb not null default '[]'::jsonb,
 memory jsonb not null default '{"summary":"","facts":[],"assumptions":[]}'::jsonb,
 plan jsonb,
 last_job_id uuid,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists ai_sessions_actor_idx on public.ai_sessions (organization_id,created_by_auth_user_id,updated_at desc);
create table if not exists public.ai_jobs (
 id uuid primary key default gen_random_uuid(),
 session_id uuid not null references public.ai_sessions(id) on delete cascade,
 organization_id uuid not null references public.organizations(id) on delete cascade,
 goal text not null check (goal in ('system','site','both')),
 status text not null default 'pending' check (status in ('pending','processing','completed','failed','cancelled')),
 system_prompt text not null,
 history text not null,
 round integer not null default 0,
 asked integer not null default 0,
 memory jsonb not null default '{}'::jsonb,
 attempts integer not null default 0,
 worker_id text,
 lease_token_hash text,
 lease_expires_at timestamptz,
 proposal jsonb,
 metrics jsonb,
 error_code text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint ai_job_tenant_fk foreign key (session_id) references public.ai_sessions(id) on delete cascade
);
create index if not exists ai_jobs_pending_idx on public.ai_jobs (created_at) where status='pending';
create index if not exists ai_jobs_session_idx on public.ai_jobs (session_id,created_at desc);
create table if not exists public.ai_workers (
 worker_id text primary key,
 last_seen_at timestamptz not null default now(),
 model text not null default '',
 busy boolean not null default false
);
-- Nenhum navegador usa Supabase Data API para estas tabelas.
alter table public.ai_sessions enable row level security;
alter table public.ai_jobs enable row level security;
alter table public.ai_workers enable row level security;
revoke all on public.ai_sessions, public.ai_jobs, public.ai_workers from anon, authenticated;
-- O backend usa DATABASE_URL com privilégios próprios, e valida tenant/ator nas rotas.;
