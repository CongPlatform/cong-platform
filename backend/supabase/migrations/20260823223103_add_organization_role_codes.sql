begin;

alter table public.roles
  add column if not exists code text;

create unique index if not exists uq_roles_system_code
  on public.roles(code)
  where is_system = true
    and code is not null;

insert into public.roles (
  code,
  name,
  description,
  scope,
  is_system
)
select
  'organization_admin',
  'Administrador',
  'Administrador principal de uma organização.',
  'organization',
  true
where not exists (
  select 1
  from public.roles
  where code = 'organization_admin'
);

insert into public.roles (
  code,
  name,
  description,
  scope,
  is_system
)
select
  'organization_representative',
  'Representante',
  'Pessoa vinculada oficialmente a uma organização.',
  'organization',
  true
where not exists (
  select 1
  from public.roles
  where code = 'organization_representative'
);

commit;