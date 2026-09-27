begin;

-- =========================================================
-- CONG - Onboarding representations
-- =========================================================
-- Adiciona ao usuário as representações institucionais
-- selecionadas durante o onboarding.
--
-- Diferentemente dos collaboration_profiles, que representam
-- formas pessoais de participação, estas informações indicam
-- quais tipos de instituição o usuário pretende representar.
--
-- Os valores possíveis correspondem aos tipos definidos em
-- organizations.organization_type.
-- =========================================================

alter table public.users

  -- Lista dos tipos de instituição que o usuário selecionou
  -- para representar.
  --
  -- O campo é obrigatório e começa como um array vazio
  -- quando nenhuma representação foi selecionada.
  add column if not exists onboarding_representations text[]
  not null
  default '{}';


-- =========================================================
-- ONBOARDING REPRESENTATIONS VALIDATION
-- =========================================================
-- Garante que todos os valores armazenados no array sejam
-- tipos de instituição reconhecidos pela plataforma.
--
-- O operador <@ verifica se todos os elementos de
-- onboarding_representations estão presentes no array
-- de valores permitidos.
-- =========================================================

alter table public.users

  add constraint users_onboarding_representations_check

  check (
    onboarding_representations <@ array[
      'ngo',
      'company'
    ]::text[]
  );


-- Finaliza a transação após adicionar o campo e sua
-- respectiva validação.
commit;