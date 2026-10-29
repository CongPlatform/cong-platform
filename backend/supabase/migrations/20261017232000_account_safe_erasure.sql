-- CONG: Exclusão de conta com preservação de referências institucionais.
-- PRE-REQUISITO: 20261017195500_account_self_lifecycle.sql.
-- O registro público de usuário passa a ser uma referência anônima quando
-- necessário para manter histórico de sites/organizações; a identidade Auth
-- é removida pelo backend, e o FK não apaga conteúdo institucional em cascata.
begin;
alter table public.users add column if not exists deleted_at timestamptz;
alter table public.users alter column auth_user_id drop not null;
do $$
declare fk_name text;
begin
  for fk_name in
    select c.conname from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
    where c.conrelid = 'public.users'::regclass and c.contype = 'f'
      and c.confrelid = 'auth.users'::regclass and a.attname = 'auth_user_id'
  loop
    execute format('alter table public.users drop constraint %I', fk_name);
  end loop;
end $$;
alter table public.users add constraint users_auth_user_id_fkey foreign key (auth_user_id)
  references auth.users(id) on delete set null;
create table if not exists public.account_deletion_jobs (
  user_id uuid primary key references public.users(id) on delete cascade,
  auth_user_id uuid,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  attempt_count integer not null default 0,
  last_failure_at timestamptz
);
alter table public.account_deletion_jobs enable row level security;
revoke all on public.account_deletion_jobs from anon, authenticated;
create index if not exists idx_users_deleted_at on public.users(deleted_at)
  where deleted_at is not null;
commit;
