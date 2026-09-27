begin;

-- =========================================================
-- CONG - Onboarding state
-- =========================================================
-- Adiciona à tabela de usuários os dados necessários para
-- controlar o processo de onboarding da plataforma.
--
-- O onboarding é dividido em etapas, permitindo que o usuário
-- avance progressivamente no preenchimento do seu perfil.
-- =========================================================

alter table public.users

  -- Nome que será exibido publicamente na plataforma.
  add column display_name text,

  -- Pronomes informados pelo usuário, quando aplicável.
  add column pronouns text,

  -- Etapa atual do processo de onboarding.
  -- Novos usuários começam na etapa de identidade.
  add column onboarding_step text not null default 'identity',

  -- Lista dos papéis de colaboração escolhidos durante
  -- o onboarding.
  add column onboarding_roles text[] not null default '{}'::text[];


-- =========================================================
-- ONBOARDING VALIDATION
-- =========================================================
-- Define os limites e valores permitidos para os dados
-- coletados durante o onboarding.
-- =========================================================

alter table public.users

  -- O nome de exibição é opcional, mas quando informado
  -- deve possuir entre 1 e 60 caracteres.
  add constraint users_display_name_length
    check (
      display_name is null
      or char_length(display_name) between 1 and 60
    ),

  -- Os pronomes são opcionais e, quando informados,
  -- devem possuir entre 1 e 60 caracteres.
  add constraint users_pronouns_length
    check (
      pronouns is null
      or char_length(pronouns) between 1 and 60
    ),

  -- Restringe o estado do onboarding às etapas oficialmente
  -- reconhecidas pela plataforma.
  --
  -- identity  -> identificação básica;
  -- roles     -> escolha dos papéis;
  -- profiles  -> configuração dos perfis;
  -- completed -> onboarding concluído.
  add constraint users_onboarding_step_check
    check (
      onboarding_step in (
        'identity',
        'roles',
        'profiles',
        'completed'
      )
    ),

  -- Garante que os papéis selecionados durante o onboarding
  -- pertençam à lista de perfis de colaboração suportados.
  --
  -- O operador <@ verifica se todos os elementos do array
  -- armazenado estão presentes no conjunto permitido.
  add constraint users_onboarding_roles_check
    check (
      onboarding_roles <@ array[
        'organization',
        'developer',
        'designer',
        'translator',
        'volunteer',
        'supporter'
      ]::text[]
    );


-- =========================================================
-- MIGRATION OF EXISTING USERS
-- =========================================================
-- Usuários que já existiam antes da criação do onboarding
-- precisam ser adaptados ao novo modelo.
--
-- Para preservar a experiência dessas contas:
-- - display_name recebe o nome já cadastrado;
-- - os papéis existentes são recuperados dos
--   collaboration_profiles;
-- - usuários que já possuem pelo menos um perfil são
--   considerados com o onboarding concluído;
-- - usuários sem perfil permanecem no início do fluxo.
-- =========================================================

update public.users as users
set

  -- Mantém o nome atual como nome de exibição inicial.
  display_name = users.name,

  -- Recupera os papéis dos perfis de colaboração já existentes.
  --
  -- O COALESCE garante que usuários sem perfis recebam
  -- um array vazio em vez de NULL.
  --
  -- Os papéis são ordenados pela data de criação do perfil
  -- para manter uma ordem consistente.
  onboarding_roles = coalesce(
    (
      select array_agg(profile.role order by profile.created_at)
      from public.collaboration_profiles as profile
      where profile.user_id = users.id
    ),
    '{}'::text[]
  ),

  -- Define a etapa inicial com base na existência de perfis.
  --
  -- Se o usuário já possui pelo menos um perfil de colaboração,
  -- ele é considerado configurado e recebe "completed".
  --
  -- Caso contrário, permanece na etapa "identity".
  onboarding_step = case
    when exists (
      select 1
      from public.collaboration_profiles as profile
      where profile.user_id = users.id
    ) then 'completed'
    else 'identity'
  end;


-- Finaliza a transação após adicionar os campos, regras
-- de validação e migrar os dados existentes.
commit;