begin;

alter table public.institutional_sites
  add column if not exists source_template_id uuid
    references public.institutional_templates(id)
    on delete set null;

alter table public.institutional_sites
  add column if not exists editor_constraints jsonb not null
    default '{"mode":"free","minWidthPercent":15,"maxWidthPercent":100,"minFontSize":10,"maxFontSize":96,"maxOffset":100}'::jsonb;

alter table public.institutional_sites
  drop constraint if exists institutional_sites_editor_constraints_object;

alter table public.institutional_sites
  add constraint institutional_sites_editor_constraints_object
  check (jsonb_typeof(editor_constraints) = 'object');

alter table public.organization_brand_profiles
  add column if not exists public_slug text;

create unique index if not exists uq_organization_brand_profiles_public_slug
  on public.organization_brand_profiles (public_slug)
  where public_slug is not null;

create index if not exists idx_institutional_sites_source_template
  on public.institutional_sites (source_template_id)
  where source_template_id is not null;

commit;
