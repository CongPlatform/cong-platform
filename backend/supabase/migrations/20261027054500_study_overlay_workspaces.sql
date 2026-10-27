-- Requer que a estrutura study_overlay_participants da pesquisa ja exista.
-- Uma conta e organizacao exclusivas por participante; nao inclui dados pessoais.
BEGIN;
CREATE TABLE IF NOT EXISTS public.study_overlay_workspaces (
 participant_id uuid PRIMARY KEY REFERENCES public.study_overlay_participants(id) ON DELETE CASCADE,
 auth_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
 organization_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
 email text NOT NULL UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS study_overlay_workspaces_auth_user_idx
 ON public.study_overlay_workspaces(auth_user_id);
-- Acesso somente via API controlada do backend.
ALTER TABLE public.study_overlay_workspaces ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.study_overlay_workspaces FROM anon, authenticated;
COMMIT;
