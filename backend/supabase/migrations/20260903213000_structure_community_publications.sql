begin;

-- =========================================================
-- CONG - Publicações estruturadas da Comunidade
-- =========================================================
-- `community_posts` continua sendo o registro principal da
-- publicação, funcionando como o envelope social comum.
--
-- Os dados específicos de cada tipo de publicação ficam em
-- tabelas próprias, relacionadas pelo `post_id`.
--
-- Essa separação permite tratar cada intenção de publicação
-- com campos, validações, filtros e notificações específicos,
-- sem transformar todos os tipos em um único conjunto genérico
-- de campos.

alter table public.community_posts
  drop constraint if exists community_posts_post_type_check;

-- Compatibilidade com os primeiros testes da V1.
-- Converte os tipos utilizados inicialmente para os nomes
-- adotados pela estrutura atual:
-- `standard`  -> `general`
-- `showcase`  -> `update`
update public.community_posts
set post_type = case post_type
  when 'standard' then 'general'
  when 'showcase' then 'update'
  else post_type
end
where post_type in ('standard', 'showcase');

-- Define os perfis aos quais a publicação é direcionada.
-- O valor padrão `all` indica que não há restrição por perfil.
alter table public.community_posts
  add column if not exists target_roles text[] not null
    default array['all']::text[];

-- Restringe os tipos de publicação aceitos pela tabela principal.
-- Os detalhes específicos de cada tipo são armazenados nas
-- tabelas correspondentes abaixo.
alter table public.community_posts
  add constraint community_posts_post_type_check
  check (
    post_type in (
      'general',
      'question',
      'request',
      'research',
      'update',
      'resource',
      'announcement'
    )
  );

-- Remove uma eventual versão anterior da validação dos
-- perfis de destino antes de aplicar a regra atual.
alter table public.community_posts
  drop constraint if exists community_posts_target_roles_check;

-- Valida os perfis que podem ser definidos como público-alvo.
--
-- `cardinality(target_roles) between 1 and 7`
-- garante pelo menos um perfil e limita a quantidade ao total
-- de opções disponíveis.
--
-- `<@` garante que todos os valores informados pertençam à
-- lista permitida.
--
-- Quando `all` é utilizado, ele precisa ser o único valor,
-- evitando combinações como `['all', 'developer']`.
alter table public.community_posts
  add constraint community_posts_target_roles_check
  check (
    cardinality(target_roles) between 1 and 7
    and target_roles <@ array[
      'all',
      'organization',
      'developer',
      'designer',
      'translator',
      'volunteer',
      'supporter'
    ]::text[]
    and (
      not ('all' = any(target_roles))
      or cardinality(target_roles) = 1
    )
  );

-- =========================================================
-- PUBLICAÇÃO GERAL
-- =========================================================
-- Armazena os dados específicos de publicações gerais.
--
-- Cada registro corresponde a exatamente uma publicação,
-- utilizando `post_id` como chave primária e também como
-- referência para `community_posts`.
create table if not exists public.community_post_general (
  post_id uuid primary key
    references public.community_posts(id)
    on delete cascade,

  general_type text not null,
  tags text[] not null default '{}'::text[],

  -- Define a finalidade da publicação geral.
  constraint community_post_general_type_check
    check (general_type in ('comment', 'idea', 'experience'))
);

-- =========================================================
-- PERGUNTA
-- =========================================================
-- Armazena os dados específicos de uma publicação destinada
-- à formulação de uma pergunta na comunidade.
create table if not exists public.community_post_questions (
  post_id uuid primary key
    references public.community_posts(id)
    on delete cascade,

  topic text not null,
  resolved boolean not null default false,

  -- Limita o tamanho do tópico para manter o campo adequado
  -- ao uso como identificação resumida da pergunta.
  constraint community_post_question_topic_length
    check (char_length(topic) between 1 and 120)
);

-- =========================================================
-- SOLICITAÇÃO DE AJUDA
-- =========================================================
-- Estrutura publicações utilizadas para solicitar colaboração
-- em atividades específicas.
create table if not exists public.community_post_requests (
  post_id uuid primary key
    references public.community_posts(id)
    on delete cascade,

  request_type text not null,
  deadline date,
  engagement_mode text not null default 'flexible',
  people_needed smallint,
  skills text[] not null default '{}'::text[],

  -- Armazena informações adicionais específicas da solicitação.
  -- O conteúdo é estruturado e validado pelo backend de acordo
  -- com o subtipo da solicitação.
  --
  -- Exemplo:
  -- tradução pode armazenar idiomas e volume;
  -- módulo pode armazenar problema, usuários e funcionalidades
  -- essenciais.
  request_data jsonb not null default '{}'::jsonb,

  -- Define as categorias de solicitação suportadas.
  constraint community_post_request_type_check
    check (
      request_type in (
        'module',
        'development',
        'design',
        'marketing',
        'translation',
        'documentation',
        'research_support',
        'volunteering',
        'other'
      )
    ),

  -- Define como a colaboração poderá ser realizada.
  constraint community_post_request_engagement_check
    check (
      engagement_mode in (
        'remote',
        'in_person',
        'hybrid',
        'flexible'
      )
    ),

  -- Quando informado, limita a quantidade de pessoas
  -- necessárias para a solicitação.
  constraint community_post_request_people_check
    check (
      people_needed is null
      or people_needed between 1 and 50
    )
);

-- Facilita consultas filtradas pelo tipo de solicitação.
create index if not exists idx_community_post_requests_type
  on public.community_post_requests(request_type);

-- Facilita consultas por prazo, ignorando registros que
-- não possuem uma data definida.
create index if not exists idx_community_post_requests_deadline
  on public.community_post_requests(deadline)
  where deadline is not null;

-- =========================================================
-- PESQUISA
-- =========================================================
-- Estrutura publicações utilizadas para divulgar pesquisas,
-- questionários, entrevistas e outras atividades de coleta
-- ou validação de informações.
create table if not exists public.community_post_research (
  post_id uuid primary key
    references public.community_posts(id)
    on delete cascade,

  research_type text not null,
  estimated_minutes smallint,
  deadline date,
  response_url text,
  criteria text,

  -- Define os formatos de pesquisa suportados.
  constraint community_post_research_type_check
    check (
      research_type in (
        'questionnaire',
        'interview',
        'usability_test',
        'validation',
        'field_research'
      )
    ),

  -- Quando informado, limita a duração estimada da atividade
  -- entre 1 e 240 minutos.
  constraint community_post_research_minutes_check
    check (
      estimated_minutes is null
      or estimated_minutes between 1 and 240
    )
);

-- Facilita consultas de pesquisas por prazo.
create index if not exists idx_community_post_research_deadline
  on public.community_post_research(deadline)
  where deadline is not null;

-- =========================================================
-- ATUALIZAÇÃO
-- =========================================================
-- Estrutura publicações destinadas a comunicar atualizações
-- sobre projetos, módulos, organizações ou outros itens.
create table if not exists public.community_post_updates (
  post_id uuid primary key
    references public.community_posts(id)
    on delete cascade,

  entity_type text not null,
  entity_label text not null,
  version text,
  progress smallint,
  reference_url text,

  -- Define o tipo de entidade relacionada à atualização.
  constraint community_post_update_entity_type_check
    check (
      entity_type in (
        'project',
        'module',
        'organization',
        'other'
      )
    ),

  -- Quando informado, representa o progresso em percentual.
  constraint community_post_update_progress_check
    check (
      progress is null
      or progress between 0 and 100
    ),

  -- Limita o tamanho do nome utilizado para identificar
  -- a entidade relacionada à atualização.
  constraint community_post_update_label_length
    check (char_length(entity_label) between 1 and 160)
);

-- =========================================================
-- RECURSO
-- =========================================================
-- Estrutura publicações destinadas ao compartilhamento de
-- materiais ou recursos úteis para a comunidade.
create table if not exists public.community_post_resources (
  post_id uuid primary key
    references public.community_posts(id)
    on delete cascade,

  resource_type text not null,
  resource_url text,
  version text,
  license text,
  tags text[] not null default '{}'::text[],

  -- Define as categorias de recurso disponíveis.
  constraint community_post_resource_type_check
    check (
      resource_type in (
        'template',
        'guide',
        'document',
        'toolkit',
        'code',
        'link',
        'other'
      )
    )
);

-- =========================================================
-- COMUNICADO
-- =========================================================
-- Estrutura publicações utilizadas para comunicados da
-- comunidade.
create table if not exists public.community_post_announcements (
  post_id uuid primary key
    references public.community_posts(id)
    on delete cascade,

  priority text not null default 'normal',

  -- Define o nível de prioridade visual/funcional do comunicado.
  constraint community_post_announcement_priority_check
    check (priority in ('normal', 'important'))
);

-- =========================================================
-- BACKFILL DOS POSTS CRIADOS DURANTE A PRIMEIRA PROVA DA API
-- =========================================================
-- Converte registros antigos da tabela principal para as
-- respectivas tabelas de detalhe.
--
-- `on conflict (post_id) do nothing` permite executar o
-- preenchimento novamente sem duplicar os registros já criados.

-- Publicações gerais.
insert into public.community_post_general (post_id, general_type, tags)
select id, 'comment', '{}'::text[]
from public.community_posts
where post_type = 'general'
on conflict (post_id) do nothing;

-- Perguntas.
-- O título existente é utilizado como tópico, limitado a
-- 120 caracteres para atender à restrição da tabela.
insert into public.community_post_questions (post_id, topic)
select id, left(title, 120)
from public.community_posts
where post_type = 'question'
on conflict (post_id) do nothing;

-- Atualizações.
-- Como os registros antigos não possuem uma entidade estruturada,
-- eles são associados ao tipo genérico `other`.
insert into public.community_post_updates (
  post_id, entity_type, entity_label
)
select id, 'other', title
from public.community_posts
where post_type = 'update'
on conflict (post_id) do nothing;

-- Recursos.
-- Registros antigos recebem o tipo genérico `other`.
insert into public.community_post_resources (post_id, resource_type)
select id, 'other'
from public.community_posts
where post_type = 'resource'
on conflict (post_id) do nothing;

-- Comunicados.
-- Registros existentes recebem a prioridade padrão `normal`.
insert into public.community_post_announcements (post_id, priority)
select id, 'normal'
from public.community_posts
where post_type = 'announcement'
on conflict (post_id) do nothing;

-- =========================================================
-- ÍNDICE PARA FUTUROS FILTROS/NOTIFICAÇÕES POR PERFIL
-- =========================================================
-- Índice GIN adequado para consultas sobre valores contidos
-- no array `target_roles`.
--
-- Ele permite localizar publicações destinadas a determinados
-- perfis sem precisar percorrer todos os registros.
create index if not exists idx_community_posts_target_roles
  on public.community_posts using gin(target_roles);

-- As tabelas de detalhe são acessadas exclusivamente pelo
-- backend, seguindo a mesma política adotada para a tabela
-- principal.
--
-- RLS é habilitado como camada adicional de proteção e os
-- privilégios diretos dos papéis `anon` e `authenticated`
-- são removidos abaixo.

alter table public.community_post_general enable row level security;

alter table public.community_post_questions enable row level security;

alter table public.community_post_requests enable row level security;

alter table public.community_post_research enable row level security;

alter table public.community_post_updates enable row level security;

alter table public.community_post_resources enable row level security;

alter table public.community_post_announcements enable row level security;

-- Impede acesso direto às tabelas de detalhe pelos papéis
-- utilizados pelos clientes Supabase.
--
-- O backend permanece responsável pelo acesso autorizado
-- a essas estruturas.

revoke all on table public.community_post_general from anon, authenticated;

revoke all on table public.community_post_questions from anon, authenticated;

revoke all on table public.community_post_requests from anon, authenticated;

revoke all on table public.community_post_research from anon, authenticated;

revoke all on table public.community_post_updates from anon, authenticated;

revoke all on table public.community_post_resources from anon, authenticated;

revoke all on table public.community_post_announcements from anon, authenticated;

commit;