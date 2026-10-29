-- Executar SOMENTE no banco da CONG, DEPOIS de 20261023_study_overlay.sql.
-- Não apaga qualquer slot, participante ou resposta já existente.
BEGIN;
DO $$
DECLARE name text;
BEGIN
  IF to_regclass('public.study_overlay_slots') IS NULL THEN
    RAISE EXCEPTION 'Execute primeiro 20261023_study_overlay.sql no banco da CONG';
  END IF;
  -- Extensão P1000, P1001 ... (sem limite fixo de 3 dígitos).
  FOR name IN
    SELECT conname FROM pg_constraint
    WHERE conrelid='public.study_overlay_slots'::regclass AND contype='c'
      AND pg_get_constraintdef(oid) LIKE '%participant_code%'
  LOOP
    EXECUTE format('ALTER TABLE public.study_overlay_slots DROP CONSTRAINT %I',name);
  END LOOP;
  ALTER TABLE public.study_overlay_slots
    ADD CONSTRAINT study_overlay_slots_participant_code_unlimited CHECK (participant_code ~ '^P[0-9]{3,}$');
  FOR name IN
    SELECT conname FROM pg_constraint
    WHERE conrelid='public.study_overlay_slots'::regclass AND contype='c'
      AND pg_get_constraintdef(oid) LIKE '%cohort%'
  LOOP
    EXECUTE format('ALTER TABLE public.study_overlay_slots DROP CONSTRAINT %I',name);
  END LOOP;
  ALTER TABLE public.study_overlay_slots
    ADD CONSTRAINT study_overlay_slots_cohort_expanded CHECK (cohort IN ('Principal','Reserva','Adicional'));
END $$;
ALTER TABLE public.study_overlay_slots ADD COLUMN IF NOT EXISTS reused_scenario boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS study_overlay_slots_cohort_family_group_idx
  ON public.study_overlay_slots(cohort,family,group_code);
COMMIT;
