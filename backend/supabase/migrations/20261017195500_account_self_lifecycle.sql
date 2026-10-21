-- Auto-desativação da conta e solicitações explícitas de exclusão.
-- Preserva registros organizacionais; a exclusão definitiva requer
-- avaliação de dependências e procedimento de privacidade separado.
BEGIN;
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS self_deactivated_at timestamptz,
  ADD COLUMN IF NOT EXISTS deletion_requested_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_users_pending_deletion
  ON public.users (deletion_requested_at)
  WHERE deletion_requested_at IS NOT NULL;
COMMIT;
