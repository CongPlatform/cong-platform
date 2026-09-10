begin;

-- =========================================================
-- TIPOS OFICIAIS DE PUBLICAÇÃO
-- =========================================================
alter table public.community_posts
drop constraint if exists community_posts_post_type_length;

alter table public.community_posts
drop constraint if exists community_posts_post_type_check;

alter table public.community_posts add constraint community_posts_post_type_check check (
    post_type in (
        'standard',
        'question',
        'announcement',
        'showcase',
        'resource'
    )
);

-- =========================================================
-- PERFIL DE COLABORAÇÃO
--
-- Um usuário pode apagar um perfil de colaboração no sistema.
-- Um post antigo não deve impedir essa exclusão.
-- =========================================================

alter table public.community_posts
drop constraint if exists community_posts_author_collaboration_profile_id_fkey;

alter table public.community_posts add constraint community_posts_author_collaboration_profile_id_fkey foreign key (author_collaboration_profile_id) references public.collaboration_profiles (id) on delete set null;

commit;