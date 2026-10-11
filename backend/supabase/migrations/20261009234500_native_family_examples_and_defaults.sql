-- Native family V2.2
-- Mark the ten new native families as contextual examples so newly created
-- sites receive cause-aware copy. Existing sites are intentionally untouched.

update public.institutional_templates
set definition = jsonb_set(
  coalesce(definition, '{}'::jsonb),
  '{example}',
  'true'::jsonb,
  true
)
where family_key in (
  'horizonte',
  'territorio-vivo',
  'acolher',
  'essencial',
  'comunidade',
  'vozes',
  'pulso',
  'profundezas',
  'sereno',
  'conexao'
)
and is_system = true;
