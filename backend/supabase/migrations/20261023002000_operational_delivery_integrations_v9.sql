begin;
alter table public.operational_systems add column external_routing_enabled boolean not null default false;
alter table public.operational_delivery_demands add column source_module_id uuid null;
alter table public.operational_delivery_demands add column source_record_id uuid null;
alter table public.operational_delivery_demands add constraint operational_delivery_source_pair check ((source_module_id is null) = (source_record_id is null));
create unique index operational_delivery_import_origin_unique on public.operational_delivery_demands(organization_id,system_id,service_day,source_module_id,source_record_id) where source_record_id is not null;
commit;
