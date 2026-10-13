begin;

-- =========================================================
-- CONG - Comunidade V2.4
-- Ciclo de vida do feed: arquivamento, reimpulso controlado
-- e ordenação estável para carregamento progressivo.
-- =========================================================

-- =========================================================
-- CONTROLE DE REIMPULSO DAS PUBLICAÇÕES
-- =========================================================
-- Registra quando uma publicação recebeu seu último reimpulso
-- e quantas vezes esse recurso já foi utilizado.
--
-- `boosted_at` permite considerar o momento do reimpulso
-- na ordenação do feed.
--
-- `boost_count` mantém a quantidade de reimpulsos realizados
-- pela publicação.
alter table public.community_posts
  add column if not exists boosted_at timestamptz,
  add column if not exists boost_count integer not null default 0;

-- Remove uma versão anterior da validação para permitir que
-- a regra abaixo seja aplicada de forma explícita.
alter table public.community_posts
  drop constraint if exists community_posts_boost_count_check;

-- Limita cada publicação a no máximo 3 reimpulsos.
-- O valor também não pode ser negativo.
alter table public.community_posts
  add constraint community_posts_boost_count_check
  check (boost_count between 0 and 3);

-- =========================================================
-- ORDENAÇÃO DO FEED
-- =========================================================
-- Índice utilizado para facilitar a ordenação das publicações
-- no feed.
--
-- A posição considera primeiro:
-- 1. status da publicação;
-- 2. momento do reimpulso, quando existir, ou publicação original;
-- 3. momento de criação como critério adicional de desempate.
--
-- O `coalesce` faz com que publicações sem reimpulso utilizem
-- `published_at` como referência de ordenação.
create index if not exists idx_community_posts_feed_rank
  on public.community_posts (
    status,
    (coalesce(boosted_at, published_at)) desc,
    created_at desc
  );

-- Facilita consultas das publicações de um determinado autor,
-- agrupando por status e priorizando as que foram atualizadas
-- mais recentemente.
create index if not exists idx_community_posts_author_status
  on public.community_posts (author_user_id, status, updated_at desc);

-- Índice parcial para localizar rapidamente publicações de um
-- autor que já receberam algum reimpulso.
--
-- Publicações sem `boosted_at` não ocupam espaço neste índice.
create index if not exists idx_community_posts_author_boosted
  on public.community_posts (author_user_id, boosted_at desc)
  where boosted_at is not null;

commit;