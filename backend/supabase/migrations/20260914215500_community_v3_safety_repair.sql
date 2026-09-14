begin;

-- V3.0 repair: garante que a infraestrutura criada na V2.8 exista mesmo
-- quando a migration anterior foi aplicada parcialmente ou não foi copiada.

create table if not exists public.community_user_blocks (
  blocker_user_id uuid not null references public.users(id) on delete cascade,
  blocked_user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_user_id, blocked_user_id)
);

create table if not exists public.community_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references public.users(id) on delete cascade,
  post_id uuid references public.community_posts(id) on delete cascade,
  comment_id uuid references public.community_post_comments(id) on delete cascade,
  reported_user_id uuid references public.users(id) on delete cascade,
  reason text not null,
  details text not null default '',
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by_user_id uuid references public.users(id) on delete set null
);

alter table public.community_reports add column if not exists details text not null default '';
alter table public.community_reports add column if not exists status text not null default 'pending';
alter table public.community_reports add column if not exists created_at timestamptz not null default now();
alter table public.community_reports add column if not exists reviewed_at timestamptz;
alter table public.community_reports add column if not exists reviewed_by_user_id uuid references public.users(id) on delete set null;

create unique index if not exists uq_community_reports_reporter_post
  on public.community_reports(reporter_user_id, post_id)
  where post_id is not null;
create unique index if not exists uq_community_reports_reporter_comment
  on public.community_reports(reporter_user_id, comment_id)
  where comment_id is not null;
create unique index if not exists uq_community_reports_reporter_user
  on public.community_reports(reporter_user_id, reported_user_id)
  where reported_user_id is not null;
create index if not exists idx_community_reports_status_created
  on public.community_reports(status, created_at desc);

create table if not exists public.community_content_moderation (
  target_type text not null,
  target_id uuid not null,
  state text not null default 'visible',
  reason text,
  source text not null default 'manual',
  updated_by_user_id uuid references public.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (target_type, target_id)
);

alter table public.community_content_moderation add column if not exists reason text;
alter table public.community_content_moderation add column if not exists source text not null default 'manual';
alter table public.community_content_moderation add column if not exists updated_by_user_id uuid references public.users(id) on delete set null;
alter table public.community_content_moderation add column if not exists updated_at timestamptz not null default now();

create table if not exists public.community_moderation_actions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.community_reports(id) on delete cascade,
  moderator_user_id uuid not null references public.users(id) on delete cascade,
  action text not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

alter table public.community_moderation_actions add column if not exists note text not null default '';
alter table public.community_moderation_actions add column if not exists created_at timestamptz not null default now();

insert into public.permissions (code, name, description)
values ('community.moderate', 'Moderar comunidade', 'Permite revisar denúncias e moderar conteúdos da comunidade.')
on conflict (code) do update
set name = excluded.name,
    description = excluded.description,
    updated_at = now();

insert into public.roles (code, name, description, scope, is_system)
select 'community_moderator', 'Moderador da Comunidade', 'Papel interno para moderação da Comunidade CONG.', 'platform', true
where not exists (select 1 from public.roles where code = 'community_moderator');

insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles role
cross join public.permissions permission
where role.code = 'community_moderator'
  and permission.code = 'community.moderate'
on conflict do nothing;

alter table public.community_user_blocks enable row level security;
alter table public.community_reports enable row level security;
alter table public.community_content_moderation enable row level security;
alter table public.community_moderation_actions enable row level security;

revoke all on table public.community_user_blocks from anon, authenticated;
revoke all on table public.community_reports from anon, authenticated;
revoke all on table public.community_content_moderation from anon, authenticated;
revoke all on table public.community_moderation_actions from anon, authenticated;

commit;
