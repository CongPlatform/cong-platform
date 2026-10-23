begin;

create table public.operational_site_portals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  site_id uuid not null references public.institutional_sites(id) on delete cascade,
  system_id uuid not null,
  enabled boolean not null default false,
  intake_module_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, site_id),
  foreign key (organization_id, system_id) references public.operational_systems(organization_id,id) on delete cascade,
  foreign key (organization_id, system_id, intake_module_id) references public.operational_modules(organization_id,system_id,id) on delete set null (intake_module_id)
);
create index operational_site_portals_system_idx on public.operational_site_portals (organization_id,system_id);
create trigger operational_site_portals_updated before update on public.operational_site_portals
for each row execute function public.set_updated_at();

create table public.operational_portal_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  portal_id uuid not null,
  user_id uuid not null references public.users(id) on delete cascade,
  access_role text not null check (access_role in ('volunteer','beneficiary')),
  granted_by_auth_user_id uuid not null,
  created_at timestamptz not null default now(),
  unique(portal_id,user_id),
  foreign key (organization_id,portal_id) references public.operational_site_portals(organization_id,id) on delete cascade
);
create index operational_portal_members_user_idx on public.operational_portal_members (user_id,portal_id);

create table public.operational_portal_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  portal_id uuid not null,
  module_id uuid not null,
  user_id uuid not null references public.users(id) on delete restrict,
  data jsonb not null check (jsonb_typeof(data)='object'),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  record_id uuid references public.operational_records(id) on delete set null,
  reviewed_by_auth_user_id uuid,
  reviewed_at timestamptz,
  consented_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  foreign key (organization_id,portal_id) references public.operational_site_portals(organization_id,id) on delete cascade
);
create index operational_portal_requests_member_idx on public.operational_portal_requests (portal_id,user_id,created_at desc);
create index operational_portal_requests_admin_idx on public.operational_portal_requests (portal_id,status,created_at desc);

alter table public.operational_site_portals enable row level security;
alter table public.operational_portal_members enable row level security;
alter table public.operational_portal_requests enable row level security;
revoke all on public.operational_site_portals, public.operational_portal_members, public.operational_portal_requests from anon,authenticated;
commit;
