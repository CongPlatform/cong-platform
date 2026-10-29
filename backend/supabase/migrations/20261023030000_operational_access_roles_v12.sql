begin;
insert into public.roles(code,name,description,scope,is_system)
select 'organization_member','Integrante','Integrante aprovado da organização sem acesso administrativo automático.','organization',true
where not exists (select 1 from public.roles where code='organization_member' and scope='organization');
insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r cross join public.permissions p
where r.code='organization_member' and r.scope='organization' and p.code='organization.read'
on conflict do nothing;
create table if not exists public.operational_access_roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  system_id uuid not null,
  name varchar(80) not null,
  can_read boolean not null default true,
  can_write boolean not null default false,
  can_configure boolean not null default false,
  preset_code varchar(20),
  created_at timestamptz not null default now(),
  unique(organization_id,system_id,id),
  unique(organization_id,system_id,name),
  unique(organization_id,system_id,preset_code),
  foreign key (organization_id,system_id) references public.operational_systems(organization_id,id) on delete cascade,
  check (preset_code is null or preset_code in ('administrator','editor','viewer')),
  check (not can_configure or (can_read and can_write)),
  check (not can_write or can_read)
);
create table if not exists public.operational_system_grants (
  organization_id uuid not null,
  system_id uuid not null,
  user_id uuid not null references public.users(id) on delete cascade,
  role_id uuid not null,
  granted_by_auth_user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (organization_id,system_id,user_id),
  foreign key (organization_id,system_id) references public.operational_systems(organization_id,id) on delete cascade,
  foreign key (organization_id,system_id,role_id) references public.operational_access_roles(organization_id,system_id,id) on delete restrict
);
create table if not exists public.operational_module_grants (
  organization_id uuid not null,
  system_id uuid not null,
  module_id uuid not null,
  user_id uuid not null,
  access_level varchar(10) not null check(access_level in ('none','read','write')),
  primary key (organization_id,system_id,module_id,user_id),
  foreign key (organization_id,system_id,module_id) references public.operational_modules(organization_id,system_id,id) on delete cascade,
  foreign key (organization_id,system_id,user_id) references public.operational_system_grants(organization_id,system_id,user_id) on delete cascade
);
create table if not exists public.operational_membership_decisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  applicant_user_id uuid not null references public.users(id) on delete cascade,
  request_id uuid not null,
  approved boolean not null,
  decided_by_auth_user_id uuid not null,
  decided_at timestamptz not null default now()
);
create index if not exists operational_membership_decisions_org_idx on public.operational_membership_decisions(organization_id,decided_at desc);
create index if not exists operational_system_grants_user_idx on public.operational_system_grants(organization_id,user_id,system_id);
insert into public.operational_access_roles(organization_id,system_id,name,can_read,can_write,can_configure,preset_code)
select s.organization_id,s.id,p.name,p.can_read,p.can_write,p.can_configure,p.code
from public.operational_systems s
cross join (values
  ('administrator','Administrador',true,true,true),
  ('editor','Editor',true,true,false),
  ('viewer','Leitor',true,false,false)
) p(code,name,can_read,can_write,can_configure)
on conflict (organization_id,system_id,preset_code) do nothing;
alter table public.operational_access_roles enable row level security;
alter table public.operational_system_grants enable row level security;
alter table public.operational_module_grants enable row level security;
alter table public.operational_membership_decisions enable row level security;
revoke all on public.operational_access_roles,public.operational_system_grants,public.operational_module_grants,public.operational_membership_decisions from anon, authenticated;
commit;
