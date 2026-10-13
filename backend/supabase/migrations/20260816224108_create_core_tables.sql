begin;

-- =========================================================
-- CONG - Core database structure
-- Estrutura central do banco de dados da plataforma CONG.
--
-- Esta migration define:
-- - organizações;
-- - usuários e autenticação;
-- - papéis (roles);
-- - permissões;
-- - vínculo entre usuários e organizações;
-- - índices;
-- - atualização automática de updated_at;
-- - Row Level Security (RLS);
-- - bloqueio de acesso direto pelo cliente.
-- =========================================================


-- =========================================================
-- ORGANIZATIONS
-- =========================================================
-- Representa uma organização cadastrada na plataforma.
--
-- Uma organização possui seus próprios dados, configurações
-- e usuários, permitindo que a CONG opere como uma plataforma
-- multi-tenant.
-- =========================================================

create table public.organizations (
  id uuid primary key default gen_random_uuid(),

  -- Nome utilizado para identificação da organização.
  name text not null,

  -- Razão social, quando aplicável.
  legal_name text,

  -- CNPJ da organização. O UNIQUE impede duplicidade.
  cnpj text unique,

  -- Dados de contato.
  email text,
  phone text,

  -- Descrição institucional da organização.
  description text,

  -- Caminho/referência do arquivo de logo armazenado.
  logo_path text,

  -- Endereço armazenado como JSON para permitir uma estrutura
  -- flexível de campos de endereço.
  address jsonb,

  -- Configurações específicas da organização.
  -- Começa como um objeto JSON vazio.
  settings jsonb not null default '{}'::jsonb,

  -- Permite ativar ou desativar a organização.
  active boolean not null default true,

  -- Datas de criação e última atualização do registro.
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- =========================================================
-- ROLES
-- =========================================================
-- Define os papéis utilizados pelo sistema de autorização.
--
-- Existem dois escopos:
-- - platform: papel relacionado à plataforma CONG;
-- - organization: papel relacionado ao contexto de uma ONG.
--
-- Roles de organização podem ser:
-- - system: papéis predefinidos pela plataforma;
-- - custom: papéis específicos criados pela organização.
-- =========================================================

create table public.roles (
  id uuid primary key default gen_random_uuid(),

  -- Organização à qual o papel pertence.
  -- Pode ser NULL para roles de sistema.
  organization_id uuid
    references public.organizations(id)
    on delete cascade,

  -- Nome e descrição do papel.
  name text not null,
  description text,

  -- Define o escopo de atuação do papel.
  scope text not null
    check (scope in ('platform', 'organization')),

  -- Indica se o papel é controlado pelo sistema.
  is_system boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Garante que a combinação entre scope, organization_id
  -- e is_system siga as regras de modelagem da plataforma.
  constraint valid_role_scope
    check (
      (
        -- Role de plataforma:
        -- não pertence a uma organização e obrigatoriamente
        -- é um papel de sistema.
        scope = 'platform'
        and organization_id is null
        and is_system = true
      )
      or
      (
        -- Role de organização definida pelo sistema:
        -- possui escopo de organização, mas não pertence
        -- diretamente a uma organização específica.
        scope = 'organization'
        and is_system = true
        and organization_id is null
      )
      or
      (
        -- Role personalizada:
        -- pertence obrigatoriamente a uma organização
        -- e não é um papel global do sistema.
        scope = 'organization'
        and is_system = false
        and organization_id is not null
      )
    )
);


-- =========================================================
-- USERS
-- =========================================================
-- Representa o usuário da aplicação.
--
-- A autenticação é gerenciada pelo Supabase Auth.
-- Esta tabela armazena os dados complementares utilizados
-- pela aplicação e mantém a relação com auth.users.
-- =========================================================

create table public.users (
  id uuid primary key default gen_random_uuid(),

  -- Identificador do usuário no Supabase Auth.
  -- Um usuário da aplicação corresponde a uma conta autenticada.
  auth_user_id uuid not null unique
    references auth.users(id)
    on delete cascade,

  -- Papel global do usuário na plataforma.
  platform_role_id uuid
    references public.roles(id)
    on delete set null,

  -- Nome exibido na aplicação.
  name text not null,

  -- Permite desativar o usuário sem excluir seus dados.
  active boolean not null default true,

  -- Registra o último acesso conhecido do usuário.
  last_access_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- =========================================================
-- PERMISSIONS
-- =========================================================
-- Catálogo das permissões disponíveis no sistema.
--
-- Cada permissão possui um código único que pode ser associado
-- a diferentes roles por meio da tabela role_permissions.
-- =========================================================

create table public.permissions (
  id uuid primary key default gen_random_uuid(),

  -- Identificador lógico da permissão.
  -- Exemplo conceitual: "projects.create".
  code text not null unique,

  -- Nome legível da permissão.
  name text not null,

  -- Explicação da finalidade da permissão.
  description text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- =========================================================
-- ROLE PERMISSIONS
-- =========================================================
-- Tabela de associação entre roles e permissões.
--
-- Permite que um role possua várias permissões e que uma
-- mesma permissão seja utilizada por vários roles.
--
-- A chave primária composta impede a associação duplicada
-- entre o mesmo role e a mesma permissão.
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
-- Representa a participação de um usuário dentro de uma
-- organização.
--
-- Essa tabela permite que o mesmo usuário participe de
-- diferentes organizações, podendo possuir um papel diferente
-- em cada uma delas.
-- =========================================================

create table public.organization_users (
  id uuid primary key default gen_random_uuid(),

  -- Organização da qual o usuário participa.
  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  -- Usuário associado à organização.
  user_id uuid not null
    references public.users(id)
    on delete cascade,

  -- Papel exercido pelo usuário dentro da organização.
  role_id uuid not null
    references public.roles(id)
    on delete restrict,

  -- Estado da participação do usuário.
  status text not null default 'active'
    check (status in ('pending', 'active', 'suspended')),

  -- Momento em que o usuário entrou na organização.
  joined_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Impede que o mesmo usuário seja associado duas vezes
  -- à mesma organização.
  unique (organization_id, user_id)
);


-- =========================================================
-- INDEXES
-- =========================================================
-- Índices utilizados para acelerar consultas frequentes
-- envolvendo relacionamentos e chaves estrangeiras.
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
-- Função reutilizável para atualizar automaticamente
-- o campo updated_at sempre que um registro for alterado.
-- =========================================================

create or replace function public.set_updated_at()

returns trigger

language plpgsql

as $$
begin

  -- Substitui o valor de updated_at pelo momento da alteração.
  new.updated_at = now();

  -- Retorna o registro modificado para que o UPDATE continue.
  return new;

end;
$$;


-- =========================================================
-- UPDATED_AT TRIGGERS
-- =========================================================
-- Os triggers executam a função set_updated_at antes de cada
-- alteração nas tabelas principais.
--
-- Dessa forma, a aplicação não precisa atualizar manualmente
-- updated_at em cada UPDATE.
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
-- Ativa o Row Level Security (RLS) nas tabelas.
--
-- Com o RLS habilitado, as operações realizadas por usuários
-- autenticados ou anônimos precisam obedecer às policies
-- definidas posteriormente.
--
-- Neste schema, as policies não são criadas aqui porque
-- o acesso será controlado por uma camada de backend/API.
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
-- Remove todas as permissões de acesso direto às tabelas
-- para os papéis anon e authenticated do Supabase.
--
-- Isso impede que o cliente acesse essas tabelas diretamente
-- utilizando a API automática do Supabase.
--
-- O acesso aos dados deve ocorrer pela camada autorizada
-- da aplicação, respeitando as regras de autenticação,
-- autorização e isolamento entre organizações.
-- =========================================================

revoke all on table public.organizations from anon, authenticated;

revoke all on table public.roles from anon, authenticated;

revoke all on table public.users from anon, authenticated;

revoke all on table public.permissions from anon, authenticated;

revoke all on table public.role_permissions from anon, authenticated;

revoke all on table public.organization_users from anon, authenticated;


-- Finaliza a transação somente após todas as estruturas
-- terem sido criadas com sucesso.
commit;
