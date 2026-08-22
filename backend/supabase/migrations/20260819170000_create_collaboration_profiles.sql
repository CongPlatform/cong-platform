begin;

-- =========================================================
-- CONG - Collaboration profiles
-- =========================================================

create table public.collaboration_profiles (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references public.users(id)
    on delete cascade,

  role text not null,

  is_active boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint collaboration_profiles_role_check
    check (
      role in (
        'organization',
        'developer',
        'designer',
        'translator',
        'volunteer',
        'supporter'
      )
    ),

  constraint collaboration_profiles_user_role_unique
    unique (user_id, role)
);

-- Um usuário pode possuir vários perfis,
-- mas apenas um deles pode estar ativo.
create unique index idx_collaboration_profiles_one_active_per_user
  on public.collaboration_profiles (user_id)
  where is_active = true;

create index idx_collaboration_profiles_user_id
  on public.collaboration_profiles (user_id);

commit;