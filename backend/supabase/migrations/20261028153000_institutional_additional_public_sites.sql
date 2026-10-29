-- Uma organizacao pode manter multiplos sites no ar somente por publicacoes autorizadas.
-- O endereco principal legado continua em organization_brand_profiles.
BEGIN;
CREATE TABLE IF NOT EXISTS public.institutional_site_domains (
  site_id uuid PRIMARY KEY REFERENCES public.institutional_sites(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  public_slug text NOT NULL UNIQUE CHECK (public_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  published_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT institutional_site_domains_slug_length CHECK (length(public_slug) BETWEEN 3 AND 45)
);
CREATE INDEX IF NOT EXISTS institutional_site_domains_org_idx ON public.institutional_site_domains(organization_id);
ALTER TABLE public.institutional_site_domains ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.institutional_site_domains FROM anon, authenticated;
COMMIT;
