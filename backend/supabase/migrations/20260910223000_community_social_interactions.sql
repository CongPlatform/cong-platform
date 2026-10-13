begin;

-- =========================================================
-- CONG - Comunidade Social V2
-- =========================================================
-- Atualiza a estrutura da Comunidade para a V2.
--
-- A migration reconcilia os tipos de publicação utilizados
-- anteriormente com o modelo estruturado atual e adiciona
-- recursos de interação social, como curtidas, favoritos
-- e comentários.

-- Remove temporariamente a validação anterior para permitir
-- a conversão dos tipos utilizados nas primeiras versões.
alter table public.community_posts
  drop constraint if exists community_posts_post_type_check;

-- Compatibilidade com publicações criadas durante a primeira
-- prova da V1.
--
-- Os tipos antigos são convertidos para os tipos estruturados:
-- `standard`  -> `general`
-- `showcase`  -> `update`
--
-- Os demais valores permanecem inalterados.
update public.community_posts
set post_type = case post_type
  when 'standard' then 'general'
  when 'showcase' then 'update'
  else post_type
end
where post_type in ('standard', 'showcase');

-- Garante que as publicações convertidas acima possuam o
-- registro de detalhe correspondente.
--
-- Publicações gerais recebem o subtipo padrão `comment`.
insert into public.community_post_general (post_id, general_type, tags)
select id, 'comment', '{}'::text[]
from public.community_posts
where post_type = 'general'
on conflict (post_id) do nothing;

-- Publicações de atualização recebem uma entidade genérica,
-- preservando o título existente como identificação.
insert into public.community_post_updates (post_id, entity_type, entity_label)
select id, 'other', title
from public.community_posts
where post_type = 'update'
on conflict (post_id) do nothing;

-- Reaplica a validação com o conjunto atual de tipos
-- estruturados de publicação.
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

-- =========================================================
-- ATUALIZAÇÕES DE PROJETO
-- =========================================================
-- Permite que uma publicação de atualização registre um
-- roteiro real de etapas do projeto.
--
-- `milestones` armazena as etapas definidas para a atualização.
-- `completed_milestones` registra quantas dessas etapas já
-- foram concluídas.

alter table public.community_post_updates
  add column if not exists milestones text[] not null default '{}'::text[],
  add column if not exists completed_milestones smallint not null default 0;

-- Remove uma eventual versão anterior da validação para
-- garantir que a regra atual seja aplicada.
alter table public.community_post_updates
  drop constraint if exists community_post_update_completed_milestones_check;

-- Garante que:
-- 1. o número de etapas concluídas esteja entre 0 e 12;
-- 2. não seja possível marcar mais etapas como concluídas
--    do que a quantidade existente em `milestones`.
alter table public.community_post_updates
  add constraint community_post_update_completed_milestones_check
  check (
    completed_milestones between 0 and 12
    and completed_milestones <= cardinality(milestones)
  );

-- =========================================================
-- CURTIDAS
-- =========================================================
-- Registra uma curtida de um usuário em uma publicação.
--
-- A chave primária composta impede que o mesmo usuário
-- registre mais de uma curtida na mesma publicação.
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

-- Facilita consultas das curtidas realizadas por um usuário,
-- especialmente para listagens ordenadas pelas mais recentes.
create index if not exists idx_community_post_likes_user
  on public.community_post_likes(user_id, created_at desc);

-- =========================================================
-- FAVORITOS
-- =========================================================
-- Registra publicações salvas por usuários para consulta
-- posterior.
--
-- Assim como nas curtidas, a chave primária composta impede
-- duplicação da relação entre usuário e publicação.
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

-- Facilita consultas dos favoritos de um usuário,
-- priorizando os registros mais recentes.
create index if not exists idx_community_post_bookmarks_user
  on public.community_post_bookmarks(user_id, created_at desc);

-- =========================================================
-- COMENTÁRIOS
-- =========================================================
-- Armazena os comentários realizados nas publicações.
--
-- `parent_comment_id` permite criar respostas a outros
-- comentários, formando uma estrutura hierárquica.
create table if not exists public.community_post_comments (
  id uuid primary key default gen_random_uuid(),

  -- Publicação à qual o comentário pertence.
  post_id uuid not null
    references public.community_posts(id)
    on delete cascade,

  -- Usuário responsável pelo comentário.
  author_user_id uuid not null
    references public.users(id)
    on delete cascade,

  -- Opcionalmente referencia outro comentário, permitindo
  -- respostas e conversas encadeadas.
  parent_comment_id uuid
    references public.community_post_comments(id)
    on delete cascade,

  content text not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Limita o tamanho do conteúdo de cada comentário.
  constraint community_post_comments_content_length
    check (char_length(content) between 1 and 2000)
);

-- Facilita a recuperação dos comentários de uma publicação
-- em ordem cronológica.
create index if not exists idx_community_post_comments_post
  on public.community_post_comments(post_id, created_at asc);

-- Facilita a recuperação das respostas de um comentário.
-- O índice é parcial porque comentários de nível superior
-- não possuem `parent_comment_id`.
create index if not exists idx_community_post_comments_parent
  on public.community_post_comments(parent_comment_id, created_at asc)
  where parent_comment_id is not null;

-- Facilita consultas dos comentários realizados por um
-- determinado usuário.
create index if not exists idx_community_post_comments_author
  on public.community_post_comments(author_user_id, created_at desc);

-- A função já faz parte do schema base da CONG e é usada
-- em outras tabelas.
--
-- Remove apenas o trigger anterior, caso exista, para evitar
-- conflito ao recriá-lo com a configuração atual.
drop trigger if exists set_community_post_comments_updated_at
  on public.community_post_comments;

-- Atualiza automaticamente `updated_at` sempre que um
-- comentário existente for alterado.
create trigger set_community_post_comments_updated_at
before update on public.community_post_comments
for each row execute function public.set_updated_at();

-- =========================================================
-- SEGURANÇA
-- =========================================================
-- A aplicação acessa essas tabelas exclusivamente pelo backend.
--
-- RLS é habilitado como camada adicional de proteção.
alter table public.community_post_likes enable row level security;

alter table public.community_post_bookmarks enable row level security;

alter table public.community_post_comments enable row level security;

-- Remove o acesso direto dos papéis utilizados pelos clientes
-- Supabase.
--
-- As operações sobre curtidas, favoritos e comentários ficam
-- sob responsabilidade da camada autorizada do backend.
revoke all on table public.community_post_likes from anon, auth