begin;

-- =========================================================
-- CONG - Collaboration profiles
-- =========================================================
-- Cria a estrutura de perfis de colaboração da plataforma.
--
-- Um usuário pode possuir diferentes perfis de atuação,
-- como desenvolvedor, voluntário ou apoiador, e pode
-- alternar entre eles conforme sua necessidade.
-- =========================================================
create table
  public.collaboration_profiles (
    id uuid primary key default gen_random_uuid (),
    -- Usuário ao qual o perfil pertence.
    --
    -- A exclusão do usuário também remove automaticamente
    -- seus perfis de colaboração.
    user_id uuid not null references public.users (id) on delete cascade,
    -- Tipo de atuação do usuário na comunidade.
    role text not null,
    -- Indica se este é o perfil atualmente ativo do usuário.
    -- Por padrão, novos perfis começam desativados.
    is_active boolean not null default false,
    created_at timestamptz not null default now (),
    updated_at timestamptz not null default now (),
    -- Restringe os perfis aos tipos de atuação definidos
    -- oficialmente pela plataforma.
    constraint collaboration_profiles_role_check check (
      role in (
        'organization',
        'developer',
        'designer',
        'translator',
        'volunteer',
        'supporter'
      )
    ),
    -- Impede que o mesmo usuário possua duas vezes
    -- o mesmo tipo de perfil.
    --
    -- Exemplo:
    -- o usuário pode ter um perfil de developer e um de
    -- designer, mas não pode ter dois perfis de developer.
    constraint collaboration_profiles_user_role_unique unique (user_id, role)
  );

-- =========================================================
-- ACTIVE PROFILE
-- =========================================================
-- Garante que cada usuário possa ter no máximo um perfil
-- de colaboração ativo simultaneamente.
--
-- Como o índice é parcial, somente os registros em que
-- is_active = true participam da regra de unicidade.
--
-- Assim, um usuário pode possuir vários perfis cadastrados,
-- mas apenas um deles pode estar ativo por vez.
-- =========================================================
create unique index idx_collaboration_profiles_one_active_per_user on public.collaboration_profiles (user_id)
where
  is_active = true;

-- =========================================================
-- INDEXES
-- =========================================================
-- Acelera consultas que buscam os perfis pertencentes
-- a um determinado usuário.
-- =========================================================
create index idx_collaboration_profiles_user_id on public.collaboration_profiles (user_id);

-- Finaliza a transação após a criação da estrutura.
commit;