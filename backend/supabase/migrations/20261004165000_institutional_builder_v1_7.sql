begin;

create table if not exists public.institutional_design_palettes (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 100),
  description text not null default '' check (char_length(description) <= 400),
  colors jsonb not null check (jsonb_typeof(colors) = 'array'),
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists institutional_design_palettes_catalog_idx
  on public.institutional_design_palettes(status, visibility, updated_at desc);
create index if not exists institutional_design_palettes_owner_idx
  on public.institutional_design_palettes(owner_user_id, updated_at desc);

create table if not exists public.institutional_image_frames (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 100),
  description text not null default '' check (char_length(description) <= 400),
  clip_path text not null check (char_length(clip_path) <= 500),
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists institutional_image_frames_catalog_idx
  on public.institutional_image_frames(status, visibility, updated_at desc);
create index if not exists institutional_image_frames_owner_idx
  on public.institutional_image_frames(owner_user_id, updated_at desc);

create trigger set_institutional_design_palettes_updated_at
before update on public.institutional_design_palettes
for each row execute function public.set_updated_at();

create trigger set_institutional_image_frames_updated_at
before update on public.institutional_image_frames
for each row execute function public.set_updated_at();

alter table public.institutional_design_palettes enable row level security;
alter table public.institutional_image_frames enable row level security;

revoke all on table public.institutional_design_palettes from anon, authenticated;
revoke all on table public.institutional_image_frames from anon, authenticated;

commit;
