-- CONG Site Builder: identidade visual isolada por site.
-- Sites legados mantêm o comportamento atual até que sua identidade seja personalizada.
ALTER TABLE public.institutional_sites
  ADD COLUMN IF NOT EXISTS identity_mode text NOT NULL DEFAULT 'organization'
    CHECK (identity_mode IN ('template', 'organization', 'custom')),
  ADD COLUMN IF NOT EXISTS brand_override jsonb;
COMMENT ON COLUMN public.institutional_sites.brand_override IS
  'Snapshot da marca deste site. Somente serviços autenticados de institutional.edit alteram esta coluna.';
COMMENT ON COLUMN public.institutional_sites.identity_mode IS
  'Origem inicial da marca; mudanças posteriores ficam isoladas em brand_override.';
