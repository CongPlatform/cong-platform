begin;

-- =========================================================
-- CONG - Comunidade V2.4
-- Ciclo de vida do feed: arquivamento, reimpulso controlado
-- e ordenação estável para carregamento progressivo.
-- =========================================================

alter table public.community_posts
  add column if not exists boosted_at timestamptz,
  add column if not exists boost_count integer not null default 0;

alter table public.community_posts
  drop constraint if exists community_posts_boost_count_check;

alter table public.community_posts
  add constraint community_posts_boost_count_check
  check (boost_count between 0 and 3);

create index if not exists idx_community_posts_feed_rank
  on public.community_posts (
    status,
    (coalesce(boosted_at, published_at)) desc,
    created_at desc
  );

create index if not exists idx_community_posts_author_status
  on public.community_posts (author_user_id, status, updated_at desc);

create index if not exists idx_community_posts_author_boosted
  on public.community_posts (author_user_id, boosted_at desc)
  where boosted_at is not null;

commit;
