begin;

-- =========================================================
-- CONG - Comunidade V2.3
-- Feedback/antiduplicacao de resultados, notificacoes e eventos reais.
-- =========================================================

alter table public.community_surveys
  add column if not exists published_results_post_id uuid
    references public.community_posts(id)
    on delete set null;

create unique index if not exists idx_community_surveys_published_results_post
  on public.community_surveys(published_results_post_id)
  where published_results_post_id is not null;

create table if not exists public.community_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  actor_user_id uuid references public.users(id) on delete set null,
  notification_type text not null,
  dedupe_key text not null unique,
  post_id uuid references public.community_posts(id) on delete cascade,
  comment_id uuid references public.community_post_comments(id) on delete cascade,
  survey_id uuid references public.community_surveys(id) on delete cascade,
  event_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz,

  constraint community_notifications_type_check check (
    notification_type in (
      'post_like',
      'post_comment',
      'comment_reply',
      'user_follow',
      'survey_response',
      'survey_results_published',
      'event_update'
    )
  )
);

create index if not exists idx_community_notifications_user_unread
  on public.community_notifications(user_id, is_read, created_at desc);
create index if not exists idx_community_notifications_created
  on public.community_notifications(user_id, created_at desc);

create table if not exists public.community_events (
  id uuid primary key default gen_random_uuid(),
  organizer_user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz,
  event_mode text not null default 'online',
  location text,
  meeting_url text,
  capacity integer,
  status text not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint community_events_title_length check (char_length(title) between 3 and 160),
  constraint community_events_description_length check (char_length(description) <= 3000),
  constraint community_events_mode_check check (event_mode in ('online', 'in_person', 'hybrid')),
  constraint community_events_status_check check (status in ('published', 'cancelled')),
  constraint community_events_capacity_check check (capacity is null or capacity between 1 and 100000),
  constraint community_events_dates_check check (ends_at is null or ends_at > starts_at)
);

alter table public.community_notifications
  drop constraint if exists community_notifications_event_id_fkey;
alter table public.community_notifications
  add constraint community_notifications_event_id_fkey
  foreign key (event_id) references public.community_events(id) on delete cascade;

create table if not exists public.community_event_participants (
  event_id uuid not null references public.community_events(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create index if not exists idx_community_events_upcoming
  on public.community_events(status, starts_at asc);
create index if not exists idx_community_event_participants_user
  on public.community_event_participants(user_id, joined_at desc);

alter table public.community_notifications enable row level security;
alter table public.community_events enable row level security;
alter table public.community_event_participants enable row level security;

revoke all on table public.community_notifications from anon, authenticated;
revoke all on table public.community_events from anon, authenticated;
revoke all on table public.community_event_participants from anon, authenticated;

commit;
