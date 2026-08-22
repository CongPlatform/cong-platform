begin;

-- =========================================================
-- CONG - Core database structure
-- =========================================================


-- =========================================================
-- ORGANIZATIONS
-- =========================================================

create table public.organizations (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  legal_name text,
  cnpj text unique,
  email text,
  phone text,
  description text,
  logo_path text,
  address jsonb,

  settings jsonb not null default '{}'::jsonb,

  active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- =========================================================
-- ROLES
-- =========================================================

create table public.roles (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid
    references public.organizations(id)
    on delete cascade,

  name text not null,
  description text,

  scope text not null
    check (scope in ('platform', 'organization')),

  is_system boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint valid_role_scope
    check (
      (
        scope = 'platform'
        and organization_id is null
        and is_system = true
      )
      or
      (
        scope = 'organization'
        and is_system = true
        and organization_id is null
      )
      or
      (
        scope = 'organization'
        and is_system = false
        and organization_id is not null
      )
    )
);


-- =========================================================
-- USERS
-- =========================================================

create table public.users (
  id uuid primary key default gen_random_uuid(),

  auth_user_id uuid not null unique
    references auth.users(id)
    on delete cascade,

  platform_role_id uuid
    references public.roles(id)
    on delete set null,

  name text not null,

  active boolean not null default true,

  last_access_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- =========================================================
-- PERMISSIONS
-- =========================================================

create table public.permissions (
  id uuid primary key default gen_random_uuid(),

  code text not null unique,
  name text not null,
  description text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- =========================================================
-- ROLE PERMISSIONS
-- =========================================================

create table public.role_permissions (
  role_id uuid not null
    references public.roles(id)
    on delete cascade,

  permission_id uuid not null
    references public.permissions(id)
    on delete cascade,

  created_at timestamptz not null default now(),

  primary key (role_id, permission_id)
);


-- =========================================================
-- ORGANIZATION USERS
-- =========================================================

create table public.organization_users (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  user_id uuid not null
    references public.users(id)
    on delete cascade,

  role_id uuid not null
    references public.roles(id)
    on delete restrict,

  status text not null default 'active'
    check (status in ('pending', 'active', 'suspended')),

  joined_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (organization_id, user_id)
);


-- =========================================================
-- INDEXES
-- =========================================================

create index idx_roles_organization_id
  on public.roles(organization_id);

create index idx_users_auth_user_id
  on public.users(auth_user_id);

create index idx_organization_users_organization_id
  on public.organization_users(organization_id);

create index idx_organization_users_user_id
  on public.organization_users(user_id);

create index idx_organization_users_role_id
  on public.organization_users(role_id);


-- =========================================================
-- UPDATED_AT FUNCTION
-- =========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- =========================================================
-- UPDATED_AT TRIGGERS
-- =========================================================

create trigger set_organizations_updated_at
before update on public.organizations
for each row
execute function public.set_updated_at();

create trigger set_roles_updated_at
before update on public.roles
for each row
execute function public.set_updated_at();

create trigger set_users_updated_at
before update on public.users
for each row
execute function public.set_updated_at();

create trigger set_permissions_updated_at
before update on public.permissions
for each row
execute function public.set_updated_at();

create trigger set_organization_users_updated_at
before update on public.organization_users
for each row
execute function public.set_updated_at();


-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================

alter table public.organizations enable row level security;
alter table public.roles enable row level security;
alter table public.users enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.organization_users enable row level security;


-- =========================================================
-- REMOVE DIRECT CLIENT ACCESS
-- =========================================================

revoke all on table public.organizations from anon, authenticated;
revoke all on table public.roles from anon, authenticated;
revoke all on table public.users from anon, authenticated;
revoke all on table public.permissions from anon, authenticated;
revoke all on table public.role_permissions from anon, authenticated;
revoke all on table public.organization_users from anon, authenticated;

commit;