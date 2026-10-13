begin;

-- =========================================================
-- CONG - Collaboration profile data
-- =========================================================
-- Adiciona um campo flexível para armazenar informações
-- específicas de cada perfil de colaboração.
--
-- O conteúdo é armazenado em JSONB para permitir que
-- diferentes tipos de perfil tenham estruturas próprias
-- sem a necessidade de criar novas colunas para cada campo.
-- =========================================================

alter table public.collaboration_profiles

  -- Dados complementares específicos do perfil.
  --
  -- O campo é obrigatório, mas começa com um objeto JSON
  -- vazio quando nenhuma informação adicional é fornecida.
  add column profile_data jsonb not null default '{}'::jsonb;


-- =========================================================
-- PROFILE DATA VALIDATION
-- =========================================================
-- Garante que profile_data contenha sempre um objeto JSON.
--
-- Isso impede valores como arrays, strings, números ou
-- valores booleanos, mantendo uma estrutura consistente
-- para os dados dos perfis.
-- =========================================================

alter table public.collaboration_profiles

  add constraint collaboration_profiles_profile_data_object

    check (jsonb_typeof(profile_data) = 'object');


-- Finaliza a transação após a aplicação da alteração.
commit;