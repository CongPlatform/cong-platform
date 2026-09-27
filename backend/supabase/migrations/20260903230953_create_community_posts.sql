begin;

-- =========================================================
-- CONG - Community posts
-- =========================================================
-- Tabela principal das publicações da Comunidade.
--
-- Cada registro representa uma publicação e concentra os
-- dados comuns a todos os tipos de conteúdo. Informações
-- específicas de determinados tipos podem ser armazenadas
-- em tabelas de detalhe relacionadas pelo `post_id`.

create table
    public.community_posts (
        id uuid primary key default gen_random_uuid (),

        -- Usuário real responsável pela publicação.
        -- A exclusão do usuário também remove suas publicações.
        author_user_id uuid not null
            references public.users (id)
            on delete cascade,

        -- Opcional: identifica o perfil de colaboração utilizado
        -- pelo usuário ao realizar a publicação.
        author_collaboration_profile_id uuid
            references public.collaboration_profiles (id)
            on delete restrict,

        -- Opcional: identifica a organização representada pelo
        -- usuário durante a publicação.
        author_organization_id uuid
            references public.organizations (id)
            on delete restrict,

        -- Área temática principal da publicação.
        area text not null,

        -- Identifica a categoria estrutural da publicação.
        -- Os tipos aceitos são definidos posteriormente ou em
        -- migrations específicas da estrutura de tipos.
        post_type text not null,

        -- Título exibido na publicação.
        title text not null,

        -- Descrição resumida da publicação.
        description text not null,

        -- Conteúdo principal da publicação.
        content text not null,

        -- Estado atual da publicação.
        -- `published` representa uma publicação disponível;
        -- `archived` representa uma publicação arquivada.
        status text not null default 'published',

        -- Momento em que a publicação foi disponibilizada.
        published_at timestamptz not null default now (),

        -- Momento de criação do registro.
        created_at timestamptz not null default now (),

        -- Momento da última alteração do registro.
        -- É atualizado automaticamente pelo trigger definido abaixo.
        updated_at timestamptz not null default now (),

        -- Garante que a publicação não seja criada simultaneamente
        -- em nome de um perfil de colaboração e de uma organização.
        --
        -- A publicação pode ter:
        --   - nenhum dos dois contextos;
        --   - um perfil de colaboração;
        --   - uma organização.
        constraint community_posts_single_author_context check (
            not (
                author_collaboration_profile_id is not null
                and author_organization_id is not null
            )
        ),

        -- Restringe as áreas disponíveis na Comunidade.
        constraint community_posts_area_check check (
            area in (
                'desenvolvimento',
                'design',
                'pesquisa',
                'documentacao',
                'voluntariado',
                'ongs'
            )
        ),

        -- Define os estados aceitos para uma publicação.
        constraint community_posts_status_check
            check (status in ('published', 'archived')),

        -- Limita o tamanho do identificador do tipo de publicação.
        constraint community_posts_post_type_length
            check (char_length(post_type) between 1 and 60),

        -- Limita o tamanho do título.
        constraint community_posts_title_length
            check (char_length(title) between 1 and 160),

        -- Limita o tamanho da descrição.
        constraint community_posts_description_length
            check (char_length(description) between 1 and 500),

        -- Limita o tamanho do conteúdo principal.
        constraint community_posts_content_length
            check (char_length(content) between 1 and 5000)
    );

-- =========================================================
-- INDEXES
-- =========================================================
-- Índice para localizar publicações de um usuário específico.
create index idx_community_posts_author_user_id
    on public.community_posts (author_user_id);

-- Índice parcial para consultas por perfil de colaboração.
-- Registros sem perfil de colaboração não são incluídos.
create index idx_community_posts_author_collaboration_profile_id
    on public.community_posts (author_collaboration_profile_id)
where
    author_collaboration_profile_id is not null;

-- Índice parcial para consultas por organização representada.
-- Registros sem organização associada não são incluídos.
create index idx_community_posts_author_organization_id
    on public.community_posts (author_organization_id)
where
    author_organization_id is not null;

-- Índice utilizado para consultas do feed geral.
-- Organiza os resultados primeiro pelo status e depois pelos
-- registros mais recentes.
create index idx_community_posts_feed
    on public.community_posts (status, created_at desc);

-- Índice para consultas do feed filtradas por área e status,
-- mantendo as publicações mais recentes primeiro.
create index idx_community_posts_area_feed
    on public.community_posts (area, status, created_at desc);

-- =========================================================
-- UPDATED_AT
-- =========================================================
-- Reutiliza a função `set_updated_at` para atualizar
-- automaticamente `updated_at` sempre que uma publicação
-- existente for modificada.
create trigger set_community_posts_updated_at
before update on public.community_posts
for each row
execute function public.set_updated_at ();

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================
-- Habilita RLS para que as regras de acesso da tabela possam
-- ser controladas por políticas do PostgreSQL.
alter table public.community_posts enable row level security;

-- Remove o acesso direto dos papéis utilizados pelos clientes
-- Supabase.
--
-- O acesso à tabela permanece controlado pela camada autorizada
-- do backend, seguindo a política adotada para as estruturas
-- internas da aplicação.
revoke all on table public.community_posts
from
    anon,
    authenticated;

commit;