-- CONG / Pesquisa experimental. Executar somente no banco PRINCIPAL da CONG.
-- Não concede acesso das chaves públicas ao protocolo/rubricas ou dados dos participantes.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.study_overlay_scenarios (
  scenario_code text PRIMARY KEY CHECK (scenario_code ~ '^S[0-9]{3}$'),
  ngo text NOT NULL,
  family text NOT NULL CHECK (family IN ('F1','F2','F3','F4')),
  prompt_a text NOT NULL,
  prompt_b text NOT NULL,
  rubric text NOT NULL,
  protocol_version text NOT NULL DEFAULT '2026-10'
);
CREATE TABLE IF NOT EXISTS public.study_overlay_slots (
  participant_code text PRIMARY KEY CHECK (participant_code ~ '^P[0-9]{3}$'),
  scenario_code text NOT NULL REFERENCES public.study_overlay_scenarios(scenario_code),
  cohort text NOT NULL CHECK (cohort IN ('Principal','Reserva')),
  family text NOT NULL CHECK (family IN ('F1','F2','F3','F4')),
  group_code text NOT NULL CHECK (group_code IN ('G1','G2','G3','G4')),
  order_number integer NOT NULL UNIQUE CHECK (order_number > 0),
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.study_overlay_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_code text NOT NULL UNIQUE REFERENCES public.study_overlay_slots(participant_code),
  source_participant_id uuid NOT NULL UNIQUE,
  source_score numeric,
  source_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  consent boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','withdrawn')),
  session_hash text NOT NULL UNIQUE,
  session_expires_at timestamptz NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.study_overlay_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES public.study_overlay_participants(id),
  sequence_number smallint NOT NULL CHECK(sequence_number IN (1,2)),
  version text NOT NULL CHECK (version IN ('A','B')),
  condition text NOT NULL CHECK (condition IN ('sem_ia','com_ia')),
  status text NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned','running','submitted')),
  started_at timestamptz,
  submitted_at timestamptz,
  reported_completed boolean,
  difficulty smallint CHECK (difficulty BETWEEN 1 AND 5),
  confidence smallint CHECK (confidence BETWEEN 1 AND 5),
  understood_result text CHECK (understood_result IN ('sim','parcialmente','nao')),
  reported_difficulty text CHECK (length(reported_difficulty) <= 500),
  self_reported_help boolean,
  observer_help_count integer NOT NULL DEFAULT 0 CHECK (observer_help_count >= 0),
  observer_error_count integer NOT NULL DEFAULT 0 CHECK (observer_error_count >= 0),
  observer_criteria jsonb,
  observer_notes text,
  observer_assessed_at timestamptz,
  technical_issue boolean NOT NULL DEFAULT false,
  CONSTRAINT study_overlay_unique_run UNIQUE (participant_id,sequence_number)
);
CREATE TABLE IF NOT EXISTS public.study_overlay_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  participant_id uuid REFERENCES public.study_overlay_participants(id),
  run_id uuid REFERENCES public.study_overlay_runs(id),
  actor text NOT NULL CHECK(actor IN ('participant','observer','system')),
  event_type text NOT NULL CHECK(event_type IN ('navigation','help_request','technical_issue','observer_help','observer_error','observation','run_started','run_submitted','completed','withdrawn')),
  details text CHECK (length(details) <= 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.study_overlay_feedback (
  participant_id uuid PRIMARY KEY REFERENCES public.study_overlay_participants(id),
  answers jsonb NOT NULL,
  questionnaire_version text NOT NULL DEFAULT '2026-10',
  submitted_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.study_overlay_observer_sessions (
  session_hash text PRIMARY KEY,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS study_overlay_runs_part_idx ON public.study_overlay_runs(participant_id,sequence_number);
CREATE INDEX IF NOT EXISTS study_overlay_events_run_idx ON public.study_overlay_events(run_id,created_at);

ALTER TABLE public.study_overlay_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_overlay_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_overlay_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_overlay_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_overlay_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_overlay_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_overlay_observer_sessions ENABLE ROW LEVEL SECURITY;
-- A API com conexão PostgreSQL administrativa faz as verificações de acesso.
-- Não criar policies que liberem acesso anon/authenticated via Supabase REST.
REVOKE ALL ON public.study_overlay_scenarios,public.study_overlay_slots,public.study_overlay_participants,
 public.study_overlay_runs,public.study_overlay_events,public.study_overlay_feedback,
 public.study_overlay_observer_sessions FROM anon, authenticated;
