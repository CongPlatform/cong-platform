begin;

create table public.community_media (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users(id) on delete cascade,
  post_id uuid references public.community_posts(id) on delete set null,
  storage_path text not null unique,
  name text not null,
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp','application/pdf')),
  size_bytes integer not null check (size_bytes between 1 and 4194304),
  created_at timestamptz not null default now()
);
create index community_media_post_idx on public.community_media(post_id);
create index community_media_owner_idx on public.community_media(owner_user_id, created_at);
alter table public.community_media enable row level security;
revoke all on public.community_media from anon, authenticated;

create table public.community_link_previews (
  id uuid primary key default gen_random_uuid(),
  url text not null unique,
  title text not null,
  description text not null default '',
  hostname text not null,
  fetched_at timestamptz not null default now()
);
alter table public.community_link_previews enable row level security;
revoke all on public.community_link_previews from anon, authenticated;

alter table public.community_posts
  add column link_preview_id uuid references public.community_link_previews(id) on delete set null,
  add column mentions jsonb not null default '[]'::jsonb,
  add column searchable_tags text[] not null default '{}';
create index community_posts_tags_idx on public.community_posts using gin(searchable_tags);

-- Existing tag chips remain discoverable immediately after the migration.
update public.community_posts p set searchable_tags = array(
  select distinct lower(trim(regexp_replace(t, '^#', '')))
  from (
    select unnest(g.tags) t from public.community_post_general g where g.post_id=p.id
    union all
    select unnest(r.tags) t from public.community_post_resources r where r.post_id=p.id
    union all
    select unnest(r.skills) t from public.community_post_requests r where r.post_id=p.id
    union all
    select q.topic t from public.community_post_questions q where q.post_id=p.id
    union all
    select m[1] t from regexp_matches(concat_ws(' ',p.title,p.description,p.content), '(?:^|[^[:alnum:]_])#([[:alnum:]_-]{1,80})','g') m
  ) tags where trim(t) <> ''
);

alter table public.community_notifications drop constraint community_notifications_type_check;
alter table public.community_notifications add constraint community_notifications_type_check
  check (notification_type in ('post_like','post_comment','comment_reply','user_follow',
    'survey_response','survey_results_published','event_update','post_mention'));

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('community-media','community-media',false,4194304,
  array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public=false, file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

commit;
