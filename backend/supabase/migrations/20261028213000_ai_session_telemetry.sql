-- CONG / IA — telemetria interna por sessão (somente pela API autenticada).
-- Não armazena o briefing, prompts, IPs, contatos ou conteúdo dos sites.
BEGIN;
CREATE TABLE IF NOT EXISTS public.ai_session_telemetry (
  id uuid PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.ai_sessions(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_auth_user_id uuid NOT NULL,
  event_kind text NOT NULL CHECK (event_kind IN
    ('draft_started','draft_completed','draft_failed','manual_adjustment','revision_requested','review_opened','published')),
  run_id uuid,
  elapsed_ms integer CHECK (elapsed_ms IS NULL OR elapsed_ms BETWEEN 0 AND 86400000),
  pages_created integer CHECK (pages_created IS NULL OR pages_created BETWEEN 0 AND 500),
  modules_created integer CHECK (modules_created IS NULL OR modules_created BETWEEN 0 AND 500),
  forms_prepared integer CHECK (forms_prepared IS NULL OR forms_prepared BETWEEN 0 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_session_telemetry_owner_idx
  ON public.ai_session_telemetry (organization_id, actor_auth_user_id, session_id, created_at);
CREATE INDEX IF NOT EXISTS ai_session_telemetry_run_idx
  ON public.ai_session_telemetry (session_id, run_id, event_kind);
ALTER TABLE public.ai_session_telemetry ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_session_telemetry FROM anon, authenticated;
COMMIT;
