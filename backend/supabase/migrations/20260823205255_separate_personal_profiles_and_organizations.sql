begin;

-- =========================================================
-- ORGANIZAÇÕES
--
-- ONG e empresa passam a ser tipos de instituição.
-- Elas NÃO são mais perfis pessoais do usuário.
-- =========================================================

alter table public.organizations
  add column if not exists organization_type text
  not null
  default 'ngo';

alter table public.organizations
  drop constraint if exists organizations_type_check;

alter table public.organizations
  add constraint organizations_type_check
  check (
    organization_type in (
      'ngo',
      'company'
    )
  );

-- =========================================================
-- PERFIS DE COLABORAÇÃO
--
-- Agora collaboration_profiles representa SOMENTE
-- formas pessoais de participação na comunidade.
-- =========================================================

alter table public.collaboration_profiles
  drop constraint if exists collaboration_profiles_role_check;

alter table public.collaboration_profiles
  add constraint collaboration_profiles_role_check
  check (
    role in (
      'developer',
      'designer',
      'translator',
      'volunteer'
    )
  );

commit;