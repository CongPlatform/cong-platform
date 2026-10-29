begin;
alter table public.operational_records
  add constraint operational_records_identity_v5 unique (organization_id,system_id,module_id,id);
create table public.operational_record_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  system_id uuid not null,
  source_module_id uuid not null,
  source_record_id uuid not null,
  source_field_key text not null check (source_field_key ~ '^[a-z][a-z0-9_]{0,39}$'),
  target_module_id uuid not null,
  target_record_id uuid not null,
  created_at timestamptz not null default now(),
  unique (organization_id,system_id,source_record_id,source_field_key),
  foreign key (organization_id,system_id,source_module_id,source_record_id)
    references public.operational_records(organization_id,system_id,module_id,id) on delete cascade,
  foreign key (organization_id,system_id,target_module_id,target_record_id)
    references public.operational_records(organization_id,system_id,module_id,id) on delete cascade
);
create index operational_record_links_target_v5
  on public.operational_record_links (organization_id,system_id,target_module_id,target_record_id);
alter table public.operational_record_links enable row level security;
revoke all on public.operational_record_links from anon, authenticated;
commit;
