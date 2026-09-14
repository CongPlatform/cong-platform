begin;

-- =========================================================
-- CONG - Comunidade Social V2
-- =========================================================
-- Reconciliamos o enum lógico de tipos de publicação com o
-- backend atual e adicionamos as interações sociais da comunidade.

alter table public.community_posts
  drop constraint if exists community_posts_post_type_check;

-- Compatibilidade com publicações criadas durante a primeira prova da V1.
update public.community_posts
set post_type = case post_type
  when 'standard' then 'general'
  when 'showcase' then 'update'
  else post_type
end
where post_type in ('standard', 'showcase');

-- Garante detalhes mínimos para publicações legadas convertidas acima.
insert into public.community_post_general (post_id, general_type, tags)
select id, 'comment', '{}'::text[]
from public.community_posts
where post_type = 'general'
on conflict (post_id) do nothing;

insert into public.community_post_updates (post_id, entity_type, entity_label)
select id, 'other', title
from public.community_posts
where post_type = 'update'
on conflict (post_id) do nothing;

alter table public.community_posts
  add constraint community_posts_post_type_check
  check (
    post_type in (
      'general',
      'question',
      'request',
      'research',
      'update',
      'resource',
      'announcement'
    )
  );

-- Atualizações de projeto podem exibir um roteiro real, sem inventar etapas no front-end.
alter table public.community_post_updates
  add column if not exists milestones text[] not null default '{}'::text[],
  add column if not exists completed_milestones smallint not null default 0;

alter table public.community_post_updates
  drop constraint if exists community_post_update_completed_milestones_check;

alter table public.community_post_updates
  add constraint community_post_update_completed_milestones_check
  check (
    completed_milestones between 0 and 12
    and completed_milestones <= cardinality(milestones)
  );

create table if not exists public.community_post_likes (
  post_id uuid not null
    references public.community_posts(id)
    on delete cascade,
  user_id uuid not null
    references public.users(id)
    on delete cascade,
  created_at timestamptz not null default now(),

  primary key (post_id, user_id)
);

create index if not exists idx_community_post_likes_user
  on public.community_post_likes(user_id, created_at desc);

create table if not exists public.community_post_bookmarks (
  post_id uuid not null
    references public.community_posts(id)
    on delete cascade,
  user_id uuid not null
    references public.users(id)
    on delete cascade,
  created_at timestamptz not null default now(),

  primary key (post_id, user_id)
);

create index if not exists idx_community_post_bookmarks_user
  on public.community_post_bookmarks(user_id, created_at desc);

create table if not exists public.community_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null
    references public.community_posts(id)
    on delete cascade,
  author_user_id uuid not null
    references public.users(id)
    on delete cascade,
  parent_comment_id uuid
    references public.community_post_comments(id)
    on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint community_post_comments_content_length
    check (char_length(content) between 1 and 2000)
);

create index if not exists idx_community_post_comments_post
  on public.community_post_comments(post_id, created_at asc);

create index if not exists idx_community_post_comments_parent
  on public.community_post_comments(parent_comment_id, created_at asc)
  where parent_comment_id is not null;

create index if not exists idx_community_post_comments_author
  on public.community_post_comments(author_user_id, created_at desc);

-- A função já faz parte do schema base da CONG e é usada em outras tabelas.
drop trigger if exists set_community_post_comments_updated_at
  on public.community_post_comments;

create trigger set_community_post_comments_updated_at
before update on public.community_post_comments
for each row execute function public.set_updated_at();

-- A aplicação acessa essas tabelas exclusivamente pelo backend.
alter table public.community_post_likes enable row level security;
alter table public.community_post_bookmarks enable row level security;
alter table public.community_post_comments enable row level security;

revoke all on table public.community_post_likes from anon, authenticated;
revoke all on table public.community_post_bookmarks from anon, authenticated;
revoke all on table public.community_post_comments from anon, authenticated;

commit;
