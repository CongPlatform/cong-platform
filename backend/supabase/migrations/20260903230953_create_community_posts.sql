begin;

-- =========================================================
-- CONG - Community posts
-- =========================================================
create table
    public.community_posts (
        id uuid primary key default gen_random_uuid (),
        -- Usuário real responsável pela publicação.
        author_user_id uuid not null references public.users (id) on delete cascade,
        -- Opcional: usuário publicou usando um perfil de colaboração.
        author_collaboration_profile_id uuid references public.collaboration_profiles (id) on delete restrict,
        -- Opcional: usuário publicou representando uma organização.
        author_organization_id uuid references public.organizations (id) on delete restrict,
        area text not null,
        post_type text not null,
        title text not null,
        description text not null,
        content text not null,
        status text not null default 'published',
        published_at timestamptz not null default now (),
        created_at timestamptz not null default now (),
        updated_at timestamptz not null default now (),
        
        constraint community_posts_single_author_context check (
            not (
                author_collaboration_profile_id is not null
                and author_organization_id is not null
            )
        ),
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
        constraint community_posts_status_check check (status in ('published', 'archived')),
        constraint community_posts_post_type_length check (char_length(post_type) between 1 and 60),
        constraint community_posts_title_length check (char_length(title) between 1 and 160),
        constraint community_posts_description_length check (char_length(description) between 1 and 500),
        constraint community_posts_content_length check (char_length(content) between 1 and 5000)
    );

-- =========================================================
-- INDEXES
-- =========================================================
create index idx_community_posts_author_user_id on public.community_posts (author_user_id);

create index idx_community_posts_author_collaboration_profile_id on public.community_posts (author_collaboration_profile_id)
where
    author_collaboration_profile_id is not null;

create index idx_community_posts_author_organization_id on public.community_posts (author_organization_id)
where
    author_organization_id is not null;

create index idx_community_posts_feed on public.community_posts (status, created_at desc);

create index idx_community_posts_area_feed on public.community_posts (area, status, created_at desc);

-- =========================================================
-- UPDATED_AT
-- =========================================================
create trigger set_community_posts_updated_at before
update on public.community_posts for each row execute function public.set_updated_at ();

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================
alter table public.community_posts enable row level security;

revoke all on table public.community_posts
from
    anon,
    authenticated;

commit;