begin;

-- =========================================================
-- CONG - Comunidade V2.3
-- Feedback/antiduplicacao de resultados, notificacoes e eventos reais.
-- =========================================================
-- Esta migration adiciona três estruturas principais à Comunidade:
-- - vínculo entre pesquisas e suas publicações de resultados;
-- - notificações para eventos sociais e interações;
-- - eventos e participação de usuários.
--
-- As estruturas continuam seguindo o modelo de acesso centralizado
-- pelo backend da CONG.

-- =========================================================
-- RESULTADOS PUBLICADOS DE PESQUISAS
-- =========================================================
-- Relaciona uma pesquisa a uma publicação da Comunidade utilizada
-- para divulgar seus resultados.
--
-- `on delete set null` preserva a pesquisa caso a publicação
-- relacionada seja excluída.
alter table public.community_surveys
  add column if not exists published_results_post_id uuid
    references public.community_posts(id)
    on delete set null;

-- Garante que uma mesma publicação de resultados não seja
-- associada a várias pesquisas.
--
-- O índice é parcial porque pesquisas que ainda não possuem
-- publicação de resultados permanecem fora da restrição.
create unique index if not exists idx_community_surveys_published_results_post
  on public.community_surveys(published_results_post_id)
  where published_results_post_id is not null;

-- =========================================================
-- NOTIFICAÇÕES
-- =========================================================
-- Armazena notificações geradas por interações e eventos
-- relacionados à Comunidade.
create table if not exists public.community_notifications (
  id uuid primary key default gen_random_uuid(),

  -- Usuário que receberá a notificação.
  user_id uuid not null
    references public.users(id)
    on delete cascade,

  -- Usuário responsável pela ação que originou a notificação.
  -- Pode ser nulo quando a ação não possui um ator disponível.
  actor_user_id uuid
    references public.users(id)
    on delete set null,

  -- Identifica o evento que gerou a notificação.
  notification_type text not null,

  -- Chave utilizada para impedir a criação de notificações
  -- duplicadas para o mesmo evento lógico.
  dedupe_key text not null unique,

  -- Referências opcionais às entidades relacionadas à notificação.
  post_id uuid
    references public.community_posts(id)
    on delete cascade,

  comment_id uuid
    references public.community_post_comments(id)
    on delete cascade,

  survey_id uuid
    references public.community_surveys(id)
    on delete cascade,

  -- Identificador do evento relacionado.
  -- A chave estrangeira é adicionada posteriormente, após
  -- a criação da tabela `community_events`.
  event_id uuid,

  -- Indica se o usuário já visualizou a notificação.
  is_read boolean not null default false,

  created_at timestamptz not null default now(),

  -- Momento em que a notificação foi marcada como lida.
  read_at timestamptz,

  -- Tipos de notificações suportados pela Comunidade.
  constraint community_notifications_type_check check (
    notification_type in (
      'post_like',
      'post_comment',
      'comment_reply',
      'user_follow',
      'survey_response',
      'survey_results_published',
      'event_update'
    )
  )
);

-- Facilita a recuperação das notificações não lidas de um usuário,
-- mantendo as mais recentes primeiro.
create index if not exists idx_community_notifications_user_unread
  on public.community_notifications(user_id, is_read, created_at desc);

-- Facilita a recuperação do histórico geral de notificações
-- de um usuário em ordem cronológica inversa.
create index if not exists idx_community_notifications_created
  on public.community_notifications(user_id, created_at desc);

-- =========================================================
-- EVENTOS
-- =========================================================
-- Representa eventos publicados na Comunidade, incluindo
-- informações de horário, formato, local e capacidade.
create table if not exists public.community_events (
  id uuid primary key default gen_random_uuid(),

  -- Usuário responsável pela organização do evento.
  organizer_user_id uuid not null
    references public.users(id)
    on delete cascade,

  title text not null,
  description text not null default '',

  -- Data e horário de início do evento.
  starts_at timestamptz not null,

  -- Data e horário de término, quando informado.
  ends_at timestamptz,

  -- Define se o evento é online, presencial ou híbrido.
  event_mode text not null default 'online',

  -- Local utilizado para eventos presenciais ou híbridos.
  location text,

  -- Link utilizado para participação em eventos online ou híbridos.
  meeting_url text,

  -- Quantidade máxima de participantes, quando houver limite.
  capacity integer,

  -- Estado atual do evento.
  status text not null default 'published',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Limita o tamanho do título.
  constraint community_events_title_length
    check (char_length(title) between 3 and 160),

  -- Limita o tamanho da descrição.
  constraint community_events_description_length
    check (char_length(description) <= 3000),

  -- Formatos de evento suportados.
  constraint community_events_mode_check
    check (event_mode in ('online', 'in_person', 'hybrid')),

  -- Estados de evento suportados.
  constraint community_events_status_check
    check (status in ('published', 'cancelled')),

  -- Quando informada, a capacidade precisa estar entre
  -- 1 e 100.000 participantes.
  constraint community_events_capacity_check
    check (
      capacity is null
      or capacity between 1 and 100000
    ),

  -- Quando houver horário de término, ele precisa ocorrer
  -- depois do horário de início.
  constraint community_events_dates_check
    check (
      ends_at is null
      or ends_at > starts_at
    )
);

-- =========================================================
-- RELAÇÃO ENTRE NOTIFICAÇÕES E EVENTOS
-- =========================================================
-- A tabela de notificações foi criada antes dos eventos, portanto
-- `event_id` inicialmente foi criado sem uma chave estrangeira.
--
-- Agora que `community_events` existe, a relação é adicionada.
alter table public.community_notifications
  drop constraint if exists community_notifications_event_id_fkey;

alter table public.community_notifications
  add constraint community_notifications_event_id_fkey
  foreign key (event_id)
  references public.community_events(id)
  on delete cascade;

-- =========================================================
-- PARTICIPANTES DOS EVENTOS
-- =========================================================
-- Registra quais usuários participam de cada evento.
--
-- A chave primária composta impede que o mesmo usuário seja
-- registrado mais de uma vez no mesmo evento.
create table if not exists public.community_event_participants (
  event_id uuid not null
    references public.community_events(id)
    on delete cascade,

  user_id uuid not null
    references public.users(id)
    on delete cascade,

  -- Momento em que o usuário entrou como participante.
  joined_at timestamptz not null default now(),

  primary key (event_id, user_id)
);

-- Facilita consultas de eventos futuros, organizando-os
-- pelo status e pelo horário de início.
create index if not exists idx_community_events_upcoming
  on public.community_events(status, starts_at asc);

-- Facilita a consulta do histórico de participação de
-- determinado usuário, priorizando os registros mais recentes.
create index if not exists idx_community_event_participants_user
  on public.community_event_participants(user_id, joined_at desc);

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================
-- Habilita RLS nas novas estruturas sociais para que o acesso
-- possa ser controlado no nível do banco de dados.
alter table public.community_notifications enable row level security;

alter table public.community_events enable row level security;

alter table public.community_event_participants enable row level security;

-- Remove o acesso direto dos papéis `anon` e `authenticated`.
-- As operações continuam centralizadas no backend da CONG.
revoke all on table public.community_notifications from anon, authenticated;

revoke all on table public.community_events from anon, authenticated;

revoke all on table public.community_event_participants from anon, authenticated;

commit;