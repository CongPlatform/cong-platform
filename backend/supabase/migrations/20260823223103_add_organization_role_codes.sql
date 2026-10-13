begin;

-- =========================================================
-- CONG - Organization roles
-- =========================================================
-- Adiciona um código interno às roles para permitir que a
-- aplicação identifique papéis de forma estável.
--
-- O "code" é utilizado como identificador técnico, enquanto
-- "name" representa o nome exibido para o usuário.
-- =========================================================

alter table public.roles

  -- Código interno da role.
  --
  -- O campo é opcional para manter compatibilidade com
  -- registros de roles criados antes desta migration.
  add column if not exists code text;


-- =========================================================
-- SYSTEM ROLE CODE
-- =========================================================
-- Garante que cada role de sistema possua um código único.
--
-- O índice é parcial porque a regra de unicidade é aplicada
-- somente às roles marcadas como is_system = true e que
-- possuem um código definido.
-- =========================================================

create unique index if not exists uq_roles_system_code

  on public.roles(code)

  where is_system = true
    and code is not null;


-- =========================================================
-- ORGANIZATION ADMIN
-- =========================================================
-- Cria a role de administrador principal de uma organização.
--
-- A role é marcada como system porque faz parte do conjunto
-- padrão de papéis disponibilizados pela plataforma.
--
-- O INSERT só acontece caso essa role ainda não exista,
-- tornando a migration segura para ser executada sem criar
-- registros duplicados.
-- =========================================================

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


-- =========================================================
-- ORGANIZATION REPRESENTATIVE
-- =========================================================
-- Cria a role de representante de uma organização.
--
-- Representa uma pessoa oficialmente vinculada à instituição,
-- mas que não necessariamente possui as atribuições de um
-- administrador.
-- =========================================================

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


-- Finaliza a transação após adicionar o sistema de códigos
-- e garantir a existência das roles padrão.
commit;
