-- Builder 2.0 Patch 02: additive design defaults per organization.
-- Old pages, drafts, published JSON snapshots and brand colors remain intact.
begin;
alter table public.organization_brand_profiles
  add column if not exists design_system jsonb not null default '{}'::jsonb;
comment on column public.organization_brand_profiles.design_system is
  'Builder 2.0 organization-wide theme defaults. Snapshot on publication.';
commit;
