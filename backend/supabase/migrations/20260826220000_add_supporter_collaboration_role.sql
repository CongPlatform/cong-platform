begin;

-- =========================================================
-- CONG - Collaboration profile roles
-- =========================================================
-- Atualiza os tipos de perfis pessoais permitidos na tabela
-- collaboration_profiles.
--
-- A role "supporter" volta a fazer parte dos perfis de
-- participação pessoal na comunidade.
-- =========================================================


-- =========================================================
-- ROLE VALIDATION
-- =========================================================
-- Remove a restrição anterior antes de aplicar a nova lista
-- de perfis permitidos.
--
-- O IF EXISTS evita erro caso a restrição não esteja presente.
-- =========================================================

alter table public.collaboration_profiles

  drop constraint if exists collaboration_profiles_role_check;


-- Define os tipos de participação pessoal aceitos atualmente.
--
-- developer  -> participação como desenvolvedor;
-- designer   -> participação como designer;
-- translator -> participação como tradutor;
-- volunteer  -> participação como voluntário;
-- supporter  -> participação como apoiador da comunidade.
alter table public.collaboration_profiles

  add constraint collaboration_profiles_role_check

  check (
    role in (
      'developer',
      'designer',
      'translator',
      'volunteer',
      'supporter'
    )
  );


-- Finaliza a transação após atualizar a regra de validação.
commit;
