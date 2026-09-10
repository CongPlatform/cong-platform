begin;

-- =========================================================
-- CONG - Publicações estruturadas da Comunidade
-- =========================================================
-- community_posts continua sendo o envelope social comum.
-- Cada intenção possui dados próprios em uma tabela de detalhe.
-- Isso permite templates, filtros e notificações específicas sem
-- transformar toda publicação em um bloco de texto genérico.

alter table public.community_posts
  drop constraint if exists community_posts_post_type_check;

-- Compatibilidade com os primeiros testes da V1.
update public.community_posts
set post_type = case post_type
  when 'standard' then 'general'
  when 'showcase' then 'update'
  else post_type
end
where post_type in ('standard', 'showcase');

alter table public.community_posts
  add column if not exists target_roles text[] not null
    default array['all']::text[];

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

alter table public.community_posts
  drop constraint if exists community_posts_target_roles_check;

alter table public.community_posts
  add constraint community_posts_target_roles_check
  check (
    cardinality(target_roles) between 1 and 7
    and target_roles <@ array[
      'all',
      'organization',
      'developer',
      'designer',
      'translator',
      'volunteer',
      'supporter'
    ]::text[]
    and (
      not ('all' = any(target_roles))
      or cardinality(target_roles) = 1
    )
  );

-- =========================================================
-- PUBLICAÇÃO GERAL
-- =========================================================

create table if not exists public.community_post_general (
  post_id uuid primary key
    references public.community_posts(id)
    on delete cascade,

  general_type text not null,
  tags text[] not null default '{}'::text[],

  constraint community_post_general_type_check
    check (general_type in ('comment', 'idea', 'experience'))
);

-- =========================================================
-- PERGUNTA
-- =========================================================

create table if not exists public.community_post_questions (
  post_id uuid primary key
    references public.community_posts(id)
    on delete cascade,

  topic text not null,
  resolved boolean not null default false,

  constraint community_post_question_topic_length
    check (char_length(topic) between 1 and 120)
);

-- =========================================================
-- SOLICITAÇÃO DE AJUDA
-- =========================================================

create table if not exists public.community_post_requests (
  post_id uuid primary key
    references public.community_posts(id)
    on delete cascade,

  request_type text not null,
  deadline date,
  engagement_mode text not null default 'flexible',
  people_needed smallint,
  skills text[] not null default '{}'::text[],

  -- Payload é estruturado e validado por subtipo no backend.
  -- Ex.: tradução possui idiomas e volume; módulo possui problema,
  -- usuários e funcionalidades essenciais.
  request_data jsonb not null default '{}'::jsonb,

  constraint community_post_request_type_check
    check (
      request_type in (
        'module',
        'development',
        'design',
        'marketing',
        'translation',
        'documentation',
        'research_support',
        'volunteering',
        'other'
      )
    ),

  constraint community_post_request_engagement_check
    check (
      engagement_mode in (
        'remote',
        'in_person',
        'hybrid',
        'flexible'
      )
    ),

  constraint community_post_request_people_check
    check (
      people_needed is null
      or people_needed between 1 and 50
    )
);

create index if not exists idx_community_post_requests_type
  on public.community_post_requests(request_type);

create index if not exists idx_community_post_requests_deadline
  on public.community_post_requests(deadline)
  where deadline is not null;

-- =========================================================
-- PESQUISA
-- =========================================================

create table if not exists public.community_post_research (
  post_id uuid primary key
    references public.community_posts(id)
    on delete cascade,

  research_type text not null,
  estimated_minutes smallint,
  deadline date,
  response_url text,
  criteria text,

  constraint community_post_research_type_check
    check (
      research_type in (
        'questionnaire',
        'interview',
        'usability_test',
        'validation',
        'field_research'
      )
    ),

  constraint community_post_research_minutes_check
    check (
      estimated_minutes is null
      or estimated_minutes between 1 and 240
    )
);

create index if not exists idx_community_post_research_deadline
  on public.community_post_research(deadline)
  where deadline is not null;

-- =========================================================
-- ATUALIZAÇÃO
-- =========================================================

create table if not exists public.community_post_updates (
  post_id uuid primary key
    references public.community_posts(id)
    on delete cascade,

  entity_type text not null,
  entity_label text not null,
  version text,
  progress smallint,
  reference_url text,

  constraint community_post_update_entity_type_check
    check (
      entity_type in (
        'project',
        'module',
        'organization',
        'other'
      )
    ),

  constraint community_post_update_progress_check
    check (
      progress is null
      or progress between 0 and 100
    ),

  constraint community_post_update_label_length
    check (char_length(entity_label) between 1 and 160)
);

-- =========================================================
-- RECURSO
-- =========================================================

create table if not exists public.community_post_resources (
  post_id uuid primary key
    references public.community_posts(id)
    on delete cascade,

  resource_type text not null,
  resource_url text,
  version text,
  license text,
  tags text[] not null default '{}'::text[],

  constraint community_post_resource_type_check
    check (
      resource_type in (
        'template',
        'guide',
        'document',
        'toolkit',
        'code',
        'link',
        'other'
      )
    )
);

-- =========================================================
-- COMUNICADO
-- =========================================================

create table if not exists public.community_post_announcements (
  post_id uuid primary key
    references public.community_posts(id)
    on delete cascade,

  priority text not null default 'normal',

  constraint community_post_announcement_priority_check
    check (priority in ('normal', 'important'))
);

-- =========================================================
-- BACKFILL DOS POSTS CRIADOS DURANTE A PRIMEIRA PROVA DA API
-- =========================================================

insert into public.community_post_general (post_id, general_type, tags)
select id, 'comment', '{}'::text[]
from public.community_posts
where post_type = 'general'
on conflict (post_id) do nothing;

insert into public.community_post_questions (post_id, topic)
select id, left(title, 120)
from public.community_posts
where post_type = 'question'
on conflict (post_id) do nothing;

insert into public.community_post_updates (
  post_id, entity_type, entity_label
)
select id, 'other', title
from public.community_posts
where post_type = 'update'
on conflict (post_id) do nothing;

insert into public.community_post_resources (post_id, resource_type)
select id, 'other'
from public.community_posts
where post_type = 'resource'
on conflict (post_id) do nothing;

insert into public.community_post_announcements (post_id, priority)
select id, 'normal'
from public.community_posts
where post_type = 'announcement'
on conflict (post_id) do nothing;

-- =========================================================
-- ÍNDICE PARA FUTUROS FILTROS/NOTIFICAÇÕES POR PERFIL
-- =========================================================

create index if not exists idx_community_posts_target_roles
  on public.community_posts using gin(target_roles);

-- Backend-only, seguindo a mesma política da tabela principal.
alter table public.community_post_general enable row level security;
alter table public.community_post_questions enable row level security;
alter table public.community_post_requests enable row level security;
alter table public.community_post_research enable row level security;
alter table public.community_post_updates enable row level security;
alter table public.community_post_resources enable row level security;
alter table public.community_post_announcements enable row level security;

revoke all on table public.community_post_general from anon, authenticated;
revoke all on table public.community_post_questions from anon, authenticated;
revoke all on table public.community_post_requests from anon, authenticated;
revoke all on table public.community_post_research from anon, authenticated;
revoke all on table public.community_post_updates from anon, authenticated;
revoke all on table public.community_post_resources from anon, authenticated;
revoke all on table public.community_post_announcements from anon, authenticated;

commit;
