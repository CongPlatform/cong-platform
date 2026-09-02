begin;

-- =========================================================
-- PERMISSÕES BÁSICAS DO NÚCLEO ORGANIZACIONAL
-- =========================================================
insert into
    public.permissions (code, name, description)
values
    (
        'organization.read',
        'Visualizar organização',
        'Permite acessar informações básicas da organização.'
    ),
    (
        'organization.manage',
        'Gerenciar organização',
        'Permite alterar configurações administrativas da organização.'
    ) on conflict (code) do
update
set
    name = excluded.name,
    description = excluded.description,
    updated_at = now ();

-- =========================================================
-- ADMINISTRADOR
-- =========================================================
insert into
    public.role_permissions (role_id, permission_id)
select
    r.id,
    p.id
from
    public.roles r
    cross join public.permissions p
where
    r.code = 'organization_admin'
    and r.is_system = true
    and p.code in ('organization.read', 'organization.manage') on conflict do nothing;

-- =========================================================
-- REPRESENTANTE
-- =========================================================
insert into
    public.role_permissions (role_id, permission_id)
select
    r.id,
    p.id
from
    public.roles r
    cross join public.permissions p
where
    r.code = 'organization_representative'
    and r.is_system = true
    and p.code = 'organization.read' on conflict do nothing;

commit;