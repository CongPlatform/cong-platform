begin;

-- =========================================================
-- ORGANIZAÇÕES
-- =========================================================
-- Define o tipo da instituição cadastrada na plataforma.
--
-- ONG e empresa são instituições, e não formas de
-- participação pessoal do usuário.
--
-- Por isso, essa informação pertence à tabela organizations
-- e não à tabela collaboration_profiles.
-- =========================================================

alter table public.organizations

  -- Define o tipo da organização.
  --
  -- O valor padrão "ngo" mantém as organizações existentes
  -- compatíveis com o modelo anterior.
  add column if not exists organization_type text
  not null
  default 'ngo';


-- =========================================================
-- ORGANIZATION TYPE VALIDATION
-- =========================================================
-- Remove uma possível versão anterior da restrição antes
-- de criar a regra atualizada.
--
-- O IF EXISTS permite que a migration continue mesmo caso
-- a restrição anterior ainda não exista.
-- =========================================================

alter table public.organizations

  drop constraint if exists organizations_type_check;


-- Permite somente os tipos de instituição definidos pela
-- plataforma:
-- - ngo: organização não governamental;
-- - company: empresa.
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
-- =========================================================
-- A tabela collaboration_profiles passa a representar
-- exclusivamente formas pessoais de participação do usuário
-- na comunidade.
--
-- "organization" e "company" não pertencem mais a essa lista,
-- pois representam instituições e agora são tratados por
-- organizations.organization_type.
-- =========================================================

alter table public.collaboration_profiles

  -- Remove a regra anterior que permitia "organization",
  -- "developer", "designer", "translator", "volunteer"
  -- e "supporter".
  drop constraint if exists collaboration_profiles_role_check;


-- Define os tipos de participação pessoal atualmente aceitos.
--
-- developer  -> participação como desenvolvedor;
-- designer   -> participação como designer;
-- translator -> participação como tradutor;
-- volunteer  -> participação como voluntário.
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


-- Finaliza a transação após atualizar as regras de
-- classificação de organizações e perfis pessoais.
commit;