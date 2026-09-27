begin;

-- =========================================================
-- CONG - Comunidade V3.0
-- Repair da infraestrutura de moderação da Comunidade.
-- =========================================================
-- Garante que as estruturas introduzidas na V2.8 existam
-- mesmo quando a migration anterior foi aplicada parcialmente
-- ou não estava presente no ambiente.
--
-- A migration utiliza `if not exists` e `add column if not exists`
-- para recuperar estruturas sem recriá-las quando já estiverem
-- disponíveis.

-- =========================================================
-- BLOQUEIO ENTRE USUÁRIOS
-- =========================================================
-- Recria a tabela de bloqueios somente quando ela ainda não existe.
-- A chave primária composta impede registros duplicados para
-- a mesma relação de bloqueio.
create table if not exists public.community_user_blocks (
  blocker_user_id uuid not null
    references public.users(id)
    on delete cascade,

  blocked_user_id uuid not null
    references public.users(id)
    on delete cascade,

  created_at timestamptz not null default now(),

  primary key (blocker_user_id, blocked_user_id)
);

-- =========================================================
-- DENÚNCIAS
-- =========================================================
-- Garante a existência da estrutura principal de denúncias.
create table if not exists public.community_reports (
  id uuid primary key default gen_random_uuid(),

  -- Usuário que realizou a denúncia.
  reporter_user_id uuid not null
    references public.users(id)
    on delete cascade,

  -- Possíveis alvos da denúncia.
  post_id uuid
    references public.community_posts(id)
    on delete cascade,

  comment_id uuid
    references public.community_post_comments(id)
    on delete cascade,

  reported_user_id uuid
    references public.users(id)
    on delete cascade,

  reason text not null,

  -- Informações adicionais da denúncia.
  details text not null default '',

  -- Estado atual da análise.
  status text not null default 'pending',

  created_at timestamptz not null default now(),

  -- Informações preenchidas após a revisão.
  reviewed_at timestamptz,

  reviewed_by_user_id uuid
    references public.users(id)
    on delete set null
);

-- Recupera individualmente as colunas que podem estar ausentes
-- caso a tabela já existisse em uma versão incompleta.
alter table public.community_reports
  add column if not exists details text not null default '';

alter table public.community_reports
  add column if not exists status text not null default 'pending';

alter table public.community_reports
  add column if not exists created_at timestamptz not null default now();

alter table public.community_reports
  add column if not exists reviewed_at timestamptz;

alter table public.community_reports
  add column if not exists reviewed_by_user_id uuid
    references public.users(id)
    on delete set null;

-- Impede que um mesmo usuário registre mais de uma denúncia
-- para a mesma publicação.
create unique index if not exists uq_community_reports_reporter_post
  on public.community_reports(reporter_user_id, post_id)
  where post_id is not null;

-- Impede denúncias duplicadas para o mesmo comentário.
create unique index if not exists uq_community_reports_reporter_comment
  on public.community_reports(reporter_user_id, comment_id)
  where comment_id is not null;

-- Impede que um usuário denuncie outro usuário mais de uma vez.
create unique index if not exists uq_community_reports_reporter_user
  on public.community_reports(reporter_user_id, reported_user_id)
  where reported_user_id is not null;

-- Facilita a consulta da fila de denúncias por estado e data.
create index if not exists idx_community_reports_status_created
  on public.community_reports(status, created_at desc);

-- =========================================================
-- ESTADO DE MODERAÇÃO
-- =========================================================
-- Garante a existência da tabela que mantém o estado atual
-- de moderação de cada publicação ou comentário.
create table if not exists public.community_content_moderation (
  target_type text not null,
  target_id uuid not null,

  -- Estado padrão de visibilidade do conteúdo.
  state text not null default 'visible',

  reason text,

  -- Origem da alteração de moderação.
  source text not null default 'manual',

  -- Usuário responsável pela última alteração.
  updated_by_user_id uuid
    references public.users(id)
    on delete set null,

  updated_at timestamptz not null default now(),

  primary key (target_type, target_id)
);

-- Recupera colunas que podem não existir em uma versão
-- anteriormente criada da tabela.
alter table public.community_content_moderation
  add column if not exists reason text;

alter table public.community_content_moderation
  add column if not exists source text not null default 'manual';

alter table public.community_content_moderation
  add column if not exists updated_by_user_id uuid
    references public.users(id)
    on delete set null;

alter table public.community_content_moderation
  add column if not exists updated_at timestamptz not null default now();

-- =========================================================
-- AÇÕES DE MODERAÇÃO
-- =========================================================
-- Garante a existência do histórico das ações realizadas
-- pelos moderadores sobre denúncias.
create table if not exists public.community_moderation_actions (
  id uuid primary key default gen_random_uuid(),

  -- Denúncia relacionada à ação.
  report_id uuid not null
    references public.community_reports(id)
    on delete cascade,

  -- Moderador responsável pela ação.
  moderator_user_id uuid not null
    references public.users(id)
    on delete cascade,

  -- Tipo da ação executada.
  action text not null,

  note text not null default '',

  created_at timestamptz not null default now()
);

-- Recupera campos adicionais caso a tabela já exista
-- em uma versão incompleta.
alter table public.community_moderation_actions
  add column if not exists note text not null default '';

alter table public.community_moderation_actions
  add column if not exists created_at timestamptz not null default now();

-- =========================================================
-- PERMISSÃO DE MODERAÇÃO
-- =========================================================
-- Garante que a permissão necessária para a moderação
-- exista e atualiza seus dados caso ela já esteja cadastrada.
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

-- Garante a existência do papel de moderador da Comunidade.
-- A consulta evita a criação duplicada do papel.
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

-- Garante a associação entre o papel de moderador
-- e a permissão de moderação.
insert into public.role_permissions (role_id, permission_id)
select
  role.id,
  permission.id
from public.roles role
cross join public.permissions permission
where role.code = 'community_moderator'
  and permission.code = 'community.moderate'
on conflict do nothing;

-- =========================================================
-- SEGURANÇA
-- =========================================================
-- Habilita RLS nas estruturas recuperadas ou criadas
-- pela migration de reparo.
alter table public.community_user_blocks
  enable row level security;

alter table public.community_reports
  enable row level security;

alter table public.community_content_moderation
  enable row level security;

alter table public.community_moderation_actions
  enable row level security;

-- Remove o acesso direto dos papéis `anon` e `authenticated`.
-- As operações permanecem centralizadas no backend da CONG.
revoke all on table public.community_user_blocks
  from anon, authenticated;

revoke all on table public.community_reports
  from anon, authenticated;

revoke all on table public.community_content_moderation
  from anon, authenticated;

revoke all on table public.community_moderation_actions
  from anon, authenticated;

commit;