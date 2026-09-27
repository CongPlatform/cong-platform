begin;

-- =========================================================
-- PERMISSÕES BÁSICAS DO NÚCLEO ORGANIZACIONAL
-- =========================================================
-- Registra as permissões fundamentais relacionadas ao
-- gerenciamento de uma organização.
--
-- A tabela `permissions` representa o que pode ser feito
-- dentro da plataforma, enquanto as funções/roles determinam
-- quais usuários receberão essas permissões.
--
-- `on conflict (code) do update` permite executar a migração
-- novamente sem criar permissões duplicadas. Caso a permissão
-- já exista, seus dados descritivos são atualizados.

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
    )
on conflict (code) do
update
set
    name = excluded.name,
    description = excluded.description,
    updated_at = now();

-- =========================================================
-- ADMINISTRADOR
-- =========================================================
-- Associa ao papel `organization_admin` as duas permissões
-- básicas do núcleo organizacional:
--
-- `organization.read`   → permite visualizar a organização.
-- `organization.manage` → permite gerenciar suas configurações.
--
-- O `cross join` combina os registros do papel com as
-- permissões selecionadas para gerar as associações.
--
-- `on conflict do nothing` evita inserir novamente uma
-- associação que já exista na tabela `role_permissions`.

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
    and p.code in ('organization.read', 'organization.manage')
on conflict do nothing;

-- =========================================================
-- REPRESENTANTE
-- =========================================================
-- Associa ao papel `organization_representative` somente a
-- permissão de visualização da organização.
--
-- O representante pode consultar as informações básicas da
-- organização, mas esta migração não concede a ele a
-- permissão `organization.manage`.
--
-- `on conflict do nothing` evita duplicar uma associação
-- que já tenha sido criada anteriormente.

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
    and p.code = 'organization.read'
on conflict do nothing;

commit;
