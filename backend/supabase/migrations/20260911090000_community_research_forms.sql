begin;

-- =========================================================
-- CONG - Community Social V2.1
-- Pesquisas internas, respostas e publicação de resultados.
-- =========================================================

alter table public.community_post_research
  add column if not exists participation_mode text not null default 'external',
  add column if not exists phase text not null default 'collecting',
  add column if not exists results_source_post_id uuid references public.community_posts(id) on delete set null,
  add column if not exists results_snapshot jsonb;

alter table public.community_post_research
  drop constraint if exists community_post_research_participation_mode_check;

alter table public.community_post_research
  add constraint community_post_research_participation_mode_check
  check (participation_mode in ('external', 'internal'));

alter table public.community_post_research
  drop constraint if exists community_post_research_phase_check;

alter table public.community_post_research
  add constraint community_post_research_phase_check
  check (phase in ('collecting', 'results'));

create table if not exists public.community_surveys (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null unique
    references public.community_posts(id)
    on delete cascade,
  status text not null default 'open',
  anonymous boolean not null default true,
  created_at timestamptz not null default now(),
  closed_at timestamptz,

  constraint community_surveys_status_check
    check (status in ('open', 'closed'))
);

create table if not exists public.community_survey_questions (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null
    references public.community_surveys(id)
    on delete cascade,
  position smallint not null,
  question_type text not null,
  prompt text not null,
  required boolean not null default true,
  scale_min smallint,
  scale_max smallint,
  created_at timestamptz not null default now(),

  constraint community_survey_questions_type_check
    check (question_type in ('short_text', 'long_text', 'single_choice', 'multiple_choice', 'scale')),
  constraint community_survey_questions_prompt_length
    check (char_length(prompt) between 1 and 500),
  constraint community_survey_questions_position_check
    check (position between 0 and 49),
  constraint community_survey_questions_scale_check
    check (
      (question_type <> 'scale' and scale_min is null and scale_max is null)
      or
      (question_type = 'scale' and scale_min is not null and scale_max is not null and scale_min >= 0 and scale_max <= 10 and scale_min < scale_max)
    ),
  unique (survey_id, position)
);

create table if not exists public.community_survey_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null
    references public.community_survey_questions(id)
    on delete cascade,
  position smallint not null,
  label text not null,

  constraint community_survey_options_label_length
    check (char_length(label) between 1 and 200),
  constraint community_survey_options_position_check
    check (position between 0 and 49),
  unique (question_id, position)
);

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

  constraint community_survey_answers_single_value_check
    check (not (text_value is not null and numeric_value is not null)),
  unique (response_id, question_id)
);

create table if not exists public.community_survey_answer_options (
  answer_id uuid not null
    references public.community_survey_answers(id)
    on delete cascade,
  option_id uuid not null
    references public.community_survey_options(id)
    on delete cascade,
  primary key (answer_id, option_id)
);

create index if not exists idx_community_survey_questions_survey
  on public.community_survey_questions(survey_id, position);
create index if not exists idx_community_survey_options_question
  on public.community_survey_options(question_id, position);
create index if not exists idx_community_survey_responses_survey
  on public.community_survey_responses(survey_id, created_at desc);
create index if not exists idx_community_survey_answers_response
  on public.community_survey_answers(response_id);
create index if not exists idx_community_survey_answers_question
  on public.community_survey_answers(question_id);

alter table public.community_surveys enable row level security;
alter table public.community_survey_questions enable row level security;
alter table public.community_survey_options enable row level security;
alter table public.community_survey_responses enable row level security;
alter table public.community_survey_answers enable row level security;
alter table public.community_survey_answer_options enable row level security;

revoke all on table public.community_surveys from anon, authenticated;
revoke all on table public.community_survey_questions from anon, authenticated;
revoke all on table public.community_survey_options from anon, authenticated;
revoke all on table public.community_survey_responses from anon, authenticated;
revoke all on table public.community_survey_answers from anon, authenticated;
revoke all on table public.community_survey_answer_options from anon, authenticated;

commit;
