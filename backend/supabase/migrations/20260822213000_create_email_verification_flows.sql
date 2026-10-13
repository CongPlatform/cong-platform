-- =========================================================
-- CONG - Email verification flows
-- =========================================================
-- Armazena os fluxos utilizados para verificar o endereço
-- de e-mail associado a uma conta.
--
-- O token de verificação não é armazenado diretamente.
-- Apenas seu hash é persistido no banco, permitindo que
-- o token original permaneça disponível somente durante
-- o fluxo de verificação.
-- =========================================================
create table
  public.email_verification_flows (
    id uuid primary key default gen_random_uuid (),
    -- Usuário autenticado ao qual o fluxo de verificação
    -- pertence.
    --
    -- A relação utiliza o usuário do Supabase Auth.
    -- Se a conta for excluída, seus fluxos de verificação
    -- também serão removidos automaticamente.
    auth_user_id uuid not null references auth.users (id) on delete cascade,
    -- Hash do token utilizado para identificar o fluxo.
    --
    -- O token original não é armazenado no banco.
    -- O UNIQUE impede a existência de dois fluxos com
    -- o mesmo hash.
    token_hash text not null unique,
    -- Data e hora limite para utilização do fluxo.
    expires_at timestamptz not null,
    -- Momento em que a verificação foi concluída.
    --
    -- Permanece NULL enquanto o fluxo ainda não foi confirmado.
    confirmed_at timestamptz null,
    -- Momento em que o fluxo foi criado.
    created_at timestamptz not null default now ()
  );

-- =========================================================
-- INDEXES
-- =========================================================
-- Índices utilizados para acelerar as consultas mais
-- frequentes relacionadas aos fluxos de verificação.
-- =========================================================
-- Permite localizar rapidamente os fluxos de um usuário.
create index email_verification_flows_auth_user_id_idx on public.email_verification_flows (auth_user_id);

-- Permite localizar rapidamente fluxos próximos ou além
-- do prazo de expiração.
create index email_verification_flows_expires_at_idx on public.email_verification_flows (expires_at);

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================
-- Ativa o Row Level Security (RLS) para impedir que o acesso
-- à tabela seja permitido automaticamente apenas pela
-- exposição padrão da API do Supabase.
--
-- As regras de acesso efetivas devem ser definidas por
-- policies ou pela camada autorizada responsável pelo fluxo.
-- =========================================================
alter table public.email_verification_flows enable row level security;