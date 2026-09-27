begin;

-- =========================================================
-- TIPOS OFICIAIS DE PUBLICAÇÃO
-- =========================================================
-- Substitui a validação anterior de `post_type` pela lista
-- oficial de tipos de publicação utilizada nesta versão da
-- Comunidade.
--
-- A restrição anterior de tamanho deixa de ser necessária,
-- pois os valores aceitos passam a ser definidos diretamente
-- pela constraint abaixo.

alter table public.community_posts
drop constraint if exists community_posts_post_type_length;

-- Remove a validação anterior antes de registrar a nova lista
-- oficial de tipos.
alter table public.community_posts
drop constraint if exists community_posts_post_type_check;

-- Define os únicos tipos de publicação aceitos pela estrutura
-- atual da Comunidade.
alter table public.community_posts
add constraint community_posts_post_type_check
check (
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
-- Remove a chave estrangeira anterior para substituir sua
-- política de exclusão.
alter table public.community_posts
drop constraint if exists community_posts_author_collaboration_profile_id_fkey;

-- Ao excluir um perfil de colaboração, o vínculo existente
-- na publicação é removido (`set null`), mas a publicação
-- permanece armazenada.
--
-- Isso preserva o histórico da Comunidade sem impedir que
-- perfis de colaboração sejam excluídos.
alter table public.community_posts
add constraint community_posts_author_collaboration_profile_id_fkey
foreign key (author_collaboration_profile_id)
references public.collaboration_profiles (id)
on delete set null;

commit;