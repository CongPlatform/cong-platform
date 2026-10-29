begin;
alter table public.operational_systems
  add column if not exists brand_site_id uuid references public.institutional_sites(id) on delete set null,
  add column if not exists dashboard_config jsonb not null default '{}'::jsonb;
alter table public.operational_systems
  add constraint operational_systems_dashboard_config_object_v4 check (jsonb_typeof(dashboard_config) = 'object');
create index if not exists operational_systems_brand_site_idx on public.operational_systems(brand_site_id) where brand_site_id is not null;
update public.operational_systems s
set brand_site_id=(
  select i.id from public.institutional_sites i
  where i.organization_id=s.organization_id and i.published_at is not null
  limit 1
)
where s.brand_site_id is null and (
  select count(*) from public.institutional_sites i
  where i.organization_id=s.organization_id and i.published_at is not null
)=1;
commit;
