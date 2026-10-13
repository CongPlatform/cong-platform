begin;

-- =========================================================
-- CONG - Community Social V2.1
-- Pesquisas internas, respostas e publicação de resultados.
-- =========================================================
-- Esta migration amplia a estrutura de pesquisas da Comunidade
-- para permitir pesquisas internas entre usuários da plataforma.
--
-- A publicação de pesquisa continua sendo representada por
-- `community_post_research`. Quando a pesquisa possui participação
-- interna, suas perguntas e respostas são armazenadas nas tabelas
-- estruturadas abaixo.

-- =========================================================
-- DADOS DA PESQUISA
-- =========================================================
-- Define se a pesquisa aceita participação externa ou apenas
-- usuários da própria Comunidade.
--
-- `phase` representa o estágio atual da pesquisa:
-- `collecting` -> respostas ainda estão sendo coletadas.
-- `results`    -> a pesquisa está na etapa de resultados.
--
-- `results_source_post_id` permite relacionar a pesquisa a uma
-- publicação da Comunidade utilizada para divulgar seus resultados.
--
-- `results_snapshot` permite armazenar uma versão dos resultados
-- publicados, preservando os dados apresentados naquele momento.

alter table public.community_post_research
  add column if not exists participation_mode text not null default 'external',

  add column if not exists phase text not null default 'collecting',

  add column if not exists results_source_post_id uuid
    references public.community_posts(id)
    on delete set null,

  add column if not exists results_snapshot jsonb;

-- Valida os modos de participação disponíveis.
alter table public.community_post_research
  drop constraint if exists community_post_research_participation_mode_check;

alter table public.community_post_research
  add constraint community_post_research_participation_mode_check
  check (participation_mode in ('external', 'internal'));

-- Valida as fases disponíveis para uma pesquisa.
alter table public.community_post_research
  drop constraint if exists community_post_research_phase_check;

alter table public.community_post_research
  add constraint community_post_research_phase_check
  check (phase in ('collecting', 'results'));

-- =========================================================
-- PESQUISA
-- =========================================================
-- Representa o questionário associado a uma publicação de
-- pesquisa.
--
-- `post_id` é único para garantir que uma publicação possua
-- no máximo um questionário estruturado.
create table if not exists public.community_surveys (
  id uuid primary key default gen_random_uuid(),

  post_id uuid not null unique
    references public.community_posts(id)
    on delete cascade,

  -- Controla se o questionário ainda aceita respostas.
  status text not null default 'open',

  -- Define se as respostas devem ser tratadas como anônimas.
  anonymous boolean not null default true,

  created_at timestamptz not null default now(),

  -- Preenchido quando o questionário é encerrado.
  closed_at timestamptz,

  constraint community_surveys_status_check
    check (status in ('open', 'closed'))
);

-- =========================================================
-- PERGUNTAS
-- =========================================================
-- Armazena as perguntas que compõem cada questionário.
create table if not exists public.community_survey_questions (
  id uuid primary key default gen_random_uuid(),

  survey_id uuid not null
    references public.community_surveys(id)
    on delete cascade,

  -- Define a ordem em que a pergunta aparece no questionário.
  position smallint not null,

  -- Define o formato da resposta esperada.
  question_type text not null,

  -- Texto apresentado ao participante.
  prompt text not null,

  -- Indica se a pergunta precisa ser respondida.
  required boolean not null default true,

  -- Limites utilizados exclusivamente para perguntas do tipo
  -- `scale`.
  scale_min smallint,
  scale_max smallint,

  created_at timestamptz not null default now(),

  -- Tipos de pergunta suportados pelo questionário.
  constraint community_survey_questions_type_check
    check (
      question_type in (
        'short_text',
        'long_text',
        'single_choice',
        'multiple_choice',
        'scale'
      )
    ),

  -- Limita o tamanho do enunciado.
  constraint community_survey_questions_prompt_length
    check (char_length(prompt) between 1 and 500),

  -- Permite até 50 posições, de 0 a 49.
  constraint community_survey_questions_position_check
    check (position between 0 and 49),

  -- Regras específicas para perguntas de escala:
  --
  -- Para outros tipos, os limites precisam permanecer nulos.
  -- Para `scale`, ambos devem existir, ficar entre 0 e 10
  -- e o limite mínimo precisa ser menor que o máximo.
  constraint community_survey_questions_scale_check
    check (
      (question_type <> 'scale'
        and scale_min is null
        and scale_max is null)
      or
      (question_type = 'scale'
        and scale_min is not null
        and scale_max is not null
        and scale_min >= 0
        and scale_max <= 10
        and scale_min < scale_max)
    ),

  -- Impede duas perguntas ocuparem a mesma posição no
  -- mesmo questionário.
  unique (survey_id, position)
);

-- =========================================================
-- OPÇÕES DE RESPOSTA
-- =========================================================
-- Armazena as opções disponíveis para perguntas de escolha.
--
-- A relação com `community_survey_questions` permite que
-- cada pergunta possua seu próprio conjunto de opções.
create table if not exists public.community_survey_options (
  id uuid primary key default gen_random_uuid(),

  question_id uuid not null
    references public.community_survey_questions(id)
    on delete cascade,

  -- Ordem da opção dentro da pergunta.
  position smallint not null,

  -- Texto exibido para o participante.
  label text not null,

  constraint community_survey_options_label_length
    check (char_length(label) between 1 and 200),

  constraint community_survey_options_position_check
    check (position between 0 and 49),

  -- Impede duas opções ocuparem a mesma posição na pergunta.
  unique (question_id, position)
);

-- =========================================================
-- RESPOSTAS
-- =========================================================
-- Representa uma participação de um usuário em um questionário.
--
-- A restrição de unicidade impede que o mesmo usuário envie
-- mais de uma resposta para a mesma pesquisa.
create table if not exists public.community_survey_responses (
  id uuid primary key default gen_random_uuid(),

  survey_id uuid not null
    references public.community_surveys(id)
    on delete cascade,

  user_id uuid not null
    references public.users(id)
    on delete cascade,

  created_at timestamptz not null default now(),

  unique (survey_id, user_id)
);

-- =========================================================
-- RESPOSTAS POR PERGUNTA
-- =========================================================
-- Armazena a resposta dada pelo participante para cada pergunta.
--
-- Valores textuais são armazenados em `text_value` e valores
-- numéricos em `numeric_value`.
create table if not exists public.community_survey_answers (
  id uuid primary key default gen_random_uuid(),

  response_id uuid not null
    references public.community_survey_responses(id)
    on delete cascade,

  question_id uuid not null
    references public.community_survey_questions(id)
    on delete cascade,

  text_value text,

  numeric_value numeric,

  -- Uma resposta não pode possuir simultaneamente um valor
  -- textual e um valor numérico.
  constraint community_survey_answers_single_value_check
    check (
      not (
        text_value is not null
        and numeric_value is not null
      )
    ),

  -- Cada pergunta pode possuir apenas uma resposta dentro
  -- de uma participação.
  unique (response_id, question_id)
);

-- =========================================================
-- OPÇÕES SELECIONADAS
-- =========================================================
-- Relaciona uma resposta às opções escolhidas pelo participante.
--
-- A estrutura permite representar tanto perguntas de escolha
-- única quanto de múltipla escolha.
create table if not exists public.community_survey_answer_options (
  answer_id uuid not null
    references public.community_survey_answers(id)
    on delete cascade,

  option_id uuid not null
    references public.community_survey_options(id)
    on delete cascade,

  -- Impede registrar a mesma opção duas vezes para uma resposta.
  primary key (answer_id, option_id)
);

-- =========================================================
-- INDEXES
-- =========================================================

-- Facilita a recuperação das perguntas de um questionário
-- já ordenadas pela posição.
create index if not exists idx_community_survey_questions_survey
  on public.community_survey_questions(survey_id, position);

-- Facilita a recuperação das opções de uma pergunta
-- já ordenadas pela posição.
create index if not exists idx_community_survey_options_question
  on public.community_survey_options(question_id, position);

-- Facilita a consulta das respostas de uma pesquisa,
-- priorizando as participações mais recentes.
create index if not exists idx_community_survey_responses_survey
  on public.community_survey_responses(survey_id, created_at desc);

-- Facilita a recuperação das respostas pertencentes
-- a uma participação específica.
create index if not exists idx_community_survey_answers_response
  on public.community_survey_answers(response_id);

-- Facilita consultas das respostas associadas a uma
-- determinada pergunta, inclusive para consolidação
-- de resultados.
create index if not exists idx_community_survey_answers_question
  on public.community_survey_answers(question_id);

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================
-- As tabelas internas dos questionários possuem RLS habilitado
-- como camada adicional de proteção.

alter table public.community_surveys enable row level security;

alter table public.community_survey_questions enable row level security;

alter table public.community_survey_options enable row level security;

alter table public.community_survey_responses enable row level security;

alter table public.community_survey_answers enable row level security;

alter table public.community_survey_answer_options enable row level security;

-- O acesso direto pelos papéis `anon` e `authenticated` é
-- removido. A aplicação utiliza o backend para executar as
-- operações autorizadas sobre essas estruturas.

revoke all on table public.community_surveys from anon, authenticated;

revoke all on table public.community_survey_questions from anon, authenticated;

revoke all on table public.community_survey_options from anon, authenticated;

revoke all on table public.community_survey_responses from anon, authenticated;

revoke all on table public.community_survey_answers from anon, authenticated;

revoke all on table public.community_survey_answer_options from anon, authenticated;

commit;