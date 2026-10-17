-- Moderação efetiva de contas, notificações com motivo e auditoria.
-- Não altera outras organizações, contas ou conteúdos.
create table if not exists public.community_user_sanctions (
  user_id uuid primary key references public.users(id) on delete cascade,
  status text not null check (status in ('suspended', 'banned')),
  suspended_until timestamptz,
  reason text not null check (char_length(reason) between 5 and 1200),
  updated_by_user_id uuid references public.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint community_user_sanctions_duration_check check (
    (status = 'banned' and suspended_until is null) or
    (status = 'suspended' and suspended_until is not null)
  )
);
create index if not exists idx_community_user_sanctions_status
  on public.community_user_sanctions(status, suspended_until);
alter table public.community_user_sanctions enable row level security;
revoke all on public.community_user_sanctions from anon, authenticated;

alter table public.community_moderation_actions
  drop constraint if exists community_moderation_actions_action_check;
alter table public.community_moderation_actions
  add constraint community_moderation_actions_action_check check (
    action in ('review','dismiss','hide_content','restore_content',
      'warn_user','suspend_24h','suspend_7d','ban_user','lift_restriction')
  );
alter table public.community_notifications
  add column if not exists moderation_message text;
