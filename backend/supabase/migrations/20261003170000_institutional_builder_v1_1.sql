begin;

alter table public.institutional_sites
  drop constraint if exists institutional_sites_organization_id_key;

alter table public.institutional_sites
  add column if not exists name text not null default 'Site institucional',
  add column if not exists is_primary boolean not null default false;

create index if not exists institutional_sites_organization_idx
  on public.institutional_sites(organization_id, updated_at desc);

create unique index if not exists institutional_sites_single_primary_idx
  on public.institutional_sites(organization_id)
  where is_primary = true;

update public.institutional_sites s
set is_primary = true
where s.id = (
  select candidate.id
  from public.institutional_sites candidate
  where candidate.organization_id = s.organization_id
  order by candidate.published_at desc nulls last, candidate.updated_at desc
  limit 1
)
and not exists (
  select 1
  from public.institutional_sites already_primary
  where already_primary.organization_id = s.organization_id
    and already_primary.is_primary = true
);

alter table public.organization_media_assets
  add column if not exists width integer check (width is null or width > 0),
  add column if not exists height integer check (height is null or height > 0);

commit;
