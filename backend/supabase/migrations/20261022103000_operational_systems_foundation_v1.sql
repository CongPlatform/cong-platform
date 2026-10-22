begin;

-- Motor operacional isolado da área institucional. Nenhum dado de uma ONG é público.
insert into public.permissions (code, name, description) values
  ('operational.read', 'Consultar sistemas operacionais', 'Consultar sistemas e registros da organização.'),
  ('operational.configure', 'Configurar sistemas operacionais', 'Criar sistemas, instalar módulos e configurar seus campos.'),
  ('operational.write', 'Cadastrar registros operacionais', 'Cadastrar, editar e arquivar registros dos módulos.'),
  ('operational.publish', 'Ativar sistemas operacionais', 'Publicar ou retornar um sistema ao modo de configuração.')
on conflict (code) do update set name = excluded.name, description = excluded.description, updated_at = now();

-- Primeira etapa: acesso somente a representantes e administradores. Grants mais finos virão depois.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.scope = 'organization' and r.code in ('organization_admin', 'organization_representative')
  and p.code like 'operational.%'
on conflict do nothing;

create table public.operational_systems (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 100),
  description text not null default '' check (char_length(description) <= 800),
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  version integer not null default 1 check (version >= 1),
  created_by_auth_user_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id)
);
create index operational_systems_org_idx on public.operational_systems (organization_id, updated_at desc);
create trigger operational_systems_updated before update on public.operational_systems
for each row execute function public.set_updated_at();

create table public.operational_modules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  system_id uuid not null,
  blueprint_key text not null check (blueprint_key ~ '^[a-z][a-z0-9_]{1,39}$'),
  name text not null check (char_length(name) between 2 and 100),
  description text not null default '' check (char_length(description) <= 800),
  schema_fields jsonb not null default '[]'::jsonb check (jsonb_typeof(schema_fields) = 'array'),
  schema_version integer not null default 1 check (schema_version >= 1),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, system_id) references public.operational_systems(organization_id,id) on delete cascade,
  unique (organization_id, system_id, id)
);
create index operational_modules_system_idx on public.operational_modules (organization_id, system_id, position);
create trigger operational_modules_updated before update on public.operational_modules
for each row execute function public.set_updated_at();

create table public.operational_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  system_id uuid not null,
  module_id uuid not null,
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  revision integer not null default 1 check (revision >= 1),
  archived_at timestamptz,
  created_by_auth_user_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, system_id, module_id) references public.operational_modules(organization_id, system_id, id) on delete cascade
);
create index operational_records_list_idx on public.operational_records (organization_id, system_id, module_id, created_at desc, id desc) where archived_at is null;
create trigger operational_records_updated before update on public.operational_records
for each row execute function public.set_updated_at();

-- Histórico estrutural imutável; registra definições, nunca valores de pessoas atendidas.
create table public.operational_schema_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  system_id uuid not null,
  module_id uuid not null,
  version integer not null,
  fields jsonb not null check (jsonb_typeof(fields) = 'array'),
  changed_by_auth_user_id uuid not null,
  created_at timestamptz not null default now(),
  foreign key (organization_id, system_id, module_id) references public.operational_modules(organization_id, system_id, id) on delete cascade,
  unique (module_id, version)
);

create table public.operational_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  system_id uuid not null,
  module_id uuid,
  record_id uuid,
  action text not null check (action in ('system.created', 'system.updated', 'system.published', 'module.installed', 'module.schema_updated', 'record.created', 'record.updated', 'record.archived')),
  actor_auth_user_id uuid not null,
  created_at timestamptz not null default now(),
  foreign key (organization_id, system_id) references public.operational_systems(organization_id,id) on delete cascade
);
create index operational_events_audit_idx on public.operational_events (organization_id, system_id, created_at desc);

-- Bloqueio explícito para clientes Supabase: operações passam apenas pela API com autenticação e RBAC.
alter table public.operational_systems enable row level security;
alter table public.operational_modules enable row level security;
alter table public.operational_records enable row level security;
alter table public.operational_schema_history enable row level security;
alter table public.operational_events enable row level security;
revoke all on public.operational_systems, public.operational_modules, public.operational_records, public.operational_schema_history, public.operational_events from anon, authenticated;

commit;
