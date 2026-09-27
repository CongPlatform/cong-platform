begin;

-- =========================================================
-- CONG - Comunidade V2.8
-- Busca, bloqueios, denúncias e moderação.
-- =========================================================

-- =========================================================
-- BLOQUEIO ENTRE USUÁRIOS
-- =========================================================
-- Registra relações de bloqueio entre usuários da Comunidade.
-- Um usuário pode bloquear outro sem que a relação precise
-- ser recíproca.
create table if not exists public.community_user_blocks (
  -- Usuário que realizou o bloqueio.
  blocker_user_id uuid not null
    references public.users(id)
    on delete cascade,

  -- Usuário que foi bloqueado.
  blocked_user_id uuid not null
    references public.users(id)
    on delete cascade,

  created_at timestamptz not null default now(),

  -- Impede que o mesmo usuário bloqueie outro usuário
  -- mais de uma vez.
  primary key (blocker_user_id, blocked_user_id),

  -- Impede que um usuário bloqueie a si próprio.
  constraint community_user_blocks_no_self
    check (blocker_user_id <> blocked_user_id)
);

-- Facilita a consulta de usuários que possuem determinado
-- usuário entre seus bloqueadores.
create index if not exists idx_community_user_blocks_blocked
  on public.community_user_blocks(blocked_user_id, created_at desc);

-- =========================================================
-- DENÚNCIAS
-- =========================================================
-- Registra denúncias feitas por usuários sobre publicações,
-- comentários ou outros usuários.
create table if not exists public.community_reports (
  id uuid primary key default gen_random_uuid(),

  -- Usuário que realizou a denúncia.
  reporter_user_id uuid not null
    references public.users(id)
    on delete cascade,

  -- Possíveis alvos da denúncia.
  -- Apenas um deles pode ser preenchido por registro.
  post_id uuid
    references public.community_posts(id)
    on delete cascade,

  comment_id uuid
    references public.community_post_comments(id)
    on delete cascade,

  reported_user_id uuid
    references public.users(id)
    on delete cascade,

  -- Categoria escolhida para justificar a denúncia.
  reason text not null,

  -- Informações adicionais fornecidas pelo denunciante.
  details text not null default '',

  -- Estado atual da análise da denúncia.
  status text not null default 'pending',

  created_at timestamptz not null default now(),

  -- Momento em que a denúncia foi analisada.
  reviewed_at timestamptz,

  -- Moderador responsável pela análise.
  reviewed_by_user_id uuid
    references public.users(id)
    on delete set null,

  -- Garante que cada denúncia tenha exatamente um alvo:
  -- publicação, comentário ou usuário.
  constraint community_reports_target_check check (
    ((post_id is not null)::int
      + (comment_id is not null)::int
      + (reported_user_id is not null)::int) = 1
  ),

  -- Categorias de denúncia disponíveis.
  constraint community_reports_reason_check check (
    reason in (
      'spam',
      'harassment',
      'hate',
      'misinformation',
      'privacy',
      'scam',
      'other'
    )
  ),

  -- Estados possíveis durante o ciclo de análise.
  constraint community_reports_status_check check (
    status in (
      'pending',
      'reviewed',
      'actioned',
      'dismissed'
    )
  ),

  -- Limita o tamanho das informações adicionais da denúncia.
  constraint community_reports_details_length
    check (char_length(details) <= 1200)
);

-- Impede que o mesmo usuário denuncie a mesma publicação
-- mais de uma vez.
create unique index if not exists uq_community_reports_reporter_post
  on public.community_reports(reporter_user_id, post_id)
  where post_id is not null;

-- Impede denúncias duplicadas do mesmo usuário para o mesmo comentário.
create unique index if not exists uq_community_reports_reporter_comment
  on public.community_reports(reporter_user_id, comment_id)
  where comment_id is not null;

-- Impede denúncias duplicadas do mesmo usuário contra o mesmo usuário.
create unique index if not exists uq_community_reports_reporter_user
  on public.community_reports(reporter_user_id, reported_user_id)
  where reported_user_id is not null;

-- Facilita a fila de moderação, priorizando denúncias
-- pelo estado e pelas mais recentes.
create index if not exists idx_community_reports_status_created
  on public.community_reports(status, created_at desc);

-- =========================================================
-- ESTADO DE MODERAÇÃO DO CONTEÚDO
-- =========================================================
-- Mantém o estado atual de moderação de publicações e comentários.
--
-- A chave composta permite utilizar a mesma estrutura para
-- diferentes tipos de conteúdo sem misturar seus identificadores.
create table if not exists public.community_content_moderation (
  -- Tipo do conteúdo moderado.
  target_type text not null,

  -- ID da publicação ou comentário.
  target_id uuid not null,

  -- Estado atual de visibilidade do conteúdo.
  state text not null default 'visible',

  -- Motivo associado à alteração de moderação, quando informado.
  reason text,

  -- Origem da decisão de moderação.
  source text not null default 'manual',

  -- Moderador responsável pela última alteração.
  updated_by_user_id uuid
    references public.users(id)
    on delete set null,

  updated_at timestamptz not null default now(),

  -- Um único estado de moderação por conteúdo.
  primary key (target_type, target_id),

  -- Somente publicações e comentários podem ser moderados
  -- por esta estrutura.
  constraint community_content_moderation_target_type_check
    check (target_type in ('post', 'comment')),

  -- Estados de visibilidade suportados.
  constraint community_content_moderation_state_check
    check (state in ('visible', 'hidden')),

  -- Identifica se a alteração foi feita manualmente
  -- ou originada por um limite de denúncias.
  constraint community_content_moderation_source_check
    check (source in ('manual', 'report_threshold'))
);

-- =========================================================
-- AÇÕES DE MODERAÇÃO
-- =========================================================
-- Registra o histórico das ações realizadas por moderadores
-- durante a análise de uma denúncia.
create table if not exists public.community_moderation_actions (
  id uuid primary key default gen_random_uuid(),

  -- Denúncia que originou a ação.
  report_id uuid not null
    references public.community_reports(id)
    on delete cascade,

  -- Moderador que realizou a ação.
  moderator_user_id uuid not null
    references public.users(id)
    on delete cascade,

  -- Tipo da ação executada.
  action text not null,

  -- Observação opcional sobre a decisão.
  note text not null default '',

  created_at timestamptz not null default now(),

  -- Ações disponíveis no histórico de moderação.
  constraint community_moderation_actions_action_check check (
    action in (
      'review',
      'dismiss',
      'hide_content',
      'restore_content'
    )
  ),

  -- Limita o tamanho da observação do moderador.
  constraint community_moderation_actions_note_length
    check (char_length(note) <= 1200)
);

-- =========================================================
-- PERMISSÃO DE MODERAÇÃO
-- =========================================================
-- Cria a permissão específica necessária para acessar
-- as funções administrativas de moderação da Comunidade.
insert into public.permissions (code, name, description)
values (
  'community.moderate',
  'Moderar comunidade',
  'Permite revisar denúncias e moderar conteúdos da comunidade.'
)
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  updated_at = now();

-- Cria o papel de moderador da Comunidade como uma função
-- de escopo da plataforma.
--
-- `where not exists` evita a criação duplicada caso a migration
-- seja executada novamente.
insert into public.roles (
  code,
  name,
  description,
  scope,
  is_system
)
select
  'community_moderator',
  'Moderador da Comunidade',
  'Papel interno para moderação da Comunidade CONG.',
  'platform',
  true
where not exists (
  select 1
  from public.roles
  where code = 'community_moderator'
);

-- Vincula a permissão de moderação ao papel de moderador.
insert into public.role_permissions (role_id, permission_id)
select
  r.id,
  p.id
from public.roles r
cross join public.permissions p
where r.code = 'community_moderator'
  and p.code = 'community.moderate'
on conflict do nothing;

-- =========================================================
-- SEGURANÇA
-- =========================================================
-- Habilita Row Level Security nas novas estruturas.
alter table public.community_user_blocks
  enable row level security;

alter table public.community_reports
  enable row level security;

alter table public.community_content_moderation
  enable row level security;

alter table public.community_moderation_actions
  enable row level security;

-- Remove o acesso direto dos papéis `anon` e `authenticated`.
-- As operações ficam centralizadas no backend da CONG,
-- que controla as regras de bloqueio e moderação.
revoke all on table public.community_user_blocks
  from anon, authenticated;

revoke all on table public.community_reports
  from anon, authenticated;

revoke all on table public.community_content_moderation
  from anon, authenticated;

revoke all on table public.community_moderation_actions
  from anon, authenticated;

commit;
