begin;

-- =========================================================
-- CONG - Comunidade V2.2
-- Descoberta social real: seguir pessoas, feed "Seguindo",
-- sugestões e tópicos/estatísticas calculados a partir de dados reais.
-- =========================================================
-- Registra relações de seguimento entre usuários da Comunidade.
--
-- A tabela permite construir recursos sociais baseados em dados
-- reais, como o feed de pessoas seguidas e consultas relacionadas
-- às conexões de cada usuário.

create table if not exists public.community_user_follows (
  -- Usuário que iniciou o seguimento.
  follower_user_id uuid not null
    references public.users(id)
    on delete cascade,

  -- Usuário que está sendo seguido.
  followed_user_id uuid not null
    references public.users(id)
    on delete cascade,

  -- Momento em que a relação de seguimento foi criada.
  created_at timestamptz not null default now(),

  -- Impede que o mesmo usuário siga a mesma pessoa mais de uma vez.
  primary key (follower_user_id, followed_user_id),

  -- Impede que um usuário siga a si próprio.
  constraint community_user_follows_no_self_follow
    check (follower_user_id <> followed_user_id)
);

-- Facilita consultas que buscam os usuários que seguem
-- uma determinada pessoa, priorizando relações mais recentes.
create index if not exists idx_community_user_follows_followed
  on public.community_user_follows(followed_user_id, created_at desc);

-- Facilita consultas que buscam as pessoas seguidas
-- por um determinado usuário, priorizando relações mais recentes.
create index if not exists idx_community_user_follows_follower
  on public.community_user_follows(follower_user_id, created_at desc);

-- =========================================================
-- SEGURANÇA
-- =========================================================
-- O acesso continua centralizado no backend da CONG, seguindo
-- a mesma política adotada nas demais tabelas sociais da Comunidade.
--
-- RLS adiciona uma camada de proteção no banco de dados.
alter table public.community_user_follows enable row level security;

-- Remove o acesso direto dos papéis utilizados pelos clientes
-- Supabase. As operações sobre os relacionamentos de seguimento
-- são realizadas pela camada autorizada do backend.
revoke all on table public.community_user_follows from anon, authenticated;

commit;
