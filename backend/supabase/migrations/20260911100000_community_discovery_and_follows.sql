begin;

-- =========================================================
-- CONG - Comunidade V2.2
-- Descoberta social real: seguir pessoas, feed "Seguindo",
-- sugestões e tópicos/estatísticas calculados a partir de dados reais.
-- =========================================================

create table if not exists public.community_user_follows (
  follower_user_id uuid not null
    references public.users(id)
    on delete cascade,
  followed_user_id uuid not null
    references public.users(id)
    on delete cascade,
  created_at timestamptz not null default now(),

  primary key (follower_user_id, followed_user_id),

  constraint community_user_follows_no_self_follow
    check (follower_user_id <> followed_user_id)
);

create index if not exists idx_community_user_follows_followed
  on public.community_user_follows(followed_user_id, created_at desc);

create index if not exists idx_community_user_follows_follower
  on public.community_user_follows(follower_user_id, created_at desc);

-- O acesso continua centralizado no backend da CONG, como nas outras
-- tabelas sociais da comunidade.
alter table public.community_user_follows enable row level security;
revoke all on table public.community_user_follows from anon, authenticated;

commit;
