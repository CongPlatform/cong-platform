begin;



create table if not exists public.operational_delivery_demands (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  system_id uuid not null,
  service_day date not null,
  recipient_label text not null check (char_length(recipient_label) between 2 and 100),
  address text not null check (char_length(address) between 5 and 300),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  status text not null default 'pending' check (status in ('pending','assigned','delivered','cancelled')),
  task_id uuid references public.operational_tasks(id) on delete set null,
  revision integer not null default 1 check (revision > 0),
  created_by_auth_user_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id,system_id) references public.operational_systems(organization_id,id) on delete cascade
);
create index if not exists operational_delivery_demands_day_idx on public.operational_delivery_demands(organization_id,system_id,service_day,status);
do $$ begin
  if not exists(select 1 from pg_trigger where tgrelid='public.operational_delivery_demands'::regclass and tgname='operational_delivery_demands_updated') then
    create trigger operational_delivery_demands_updated before update on public.operational_delivery_demands for each row execute function public.set_updated_at();
  end if;
end $$;

create table if not exists public.operational_delivery_availability (
  organization_id uuid not null,
  system_id uuid not null,
  service_day date not null,
  member_user_id uuid not null references public.users(id) on delete cascade,
  capacity integer not null check (capacity between 0 and 12),
  start_latitude double precision not null check (start_latitude between -90 and 90),
  start_longitude double precision not null check (start_longitude between -180 and 180),
  updated_by_auth_user_id uuid not null,
  updated_at timestamptz not null default now(),
  primary key (organization_id,system_id,service_day,member_user_id),
  foreign key (organization_id,system_id) references public.operational_systems(organization_id,id) on delete cascade
);

create table if not exists public.operational_delivery_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  system_id uuid not null,
  service_day date not null,
  snapshot_hash text not null check (char_length(snapshot_hash)=64),
  route_data jsonb not null check (jsonb_typeof(route_data)='array'),
  created_by_auth_user_id uuid not null,
  created_at timestamptz not null default now(),
  foreign key (organization_id,system_id) references public.operational_systems(organization_id,id) on delete cascade
);
create index if not exists operational_delivery_plans_day_idx on public.operational_delivery_plans(organization_id,system_id,service_day,created_at desc);

alter table public.operational_delivery_demands enable row level security;
alter table public.operational_delivery_availability enable row level security;
alter table public.operational_delivery_plans enable row level security;
revoke all on public.operational_delivery_demands, public.operational_delivery_availability, public.operational_delivery_plans from anon,authenticated;
do $$ begin
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='operational_delivery_demands' and column_name='source_module_id') then
    if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='operational_delivery_demands' and column_name='service_day') then
      raise exception 'The delivery demand table is missing service_day; manual schema review required.';
    end if;
  end if;
end $$;
commit;
