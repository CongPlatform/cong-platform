begin;
create table public.operational_forms (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null,
 system_id uuid not null,
 site_id uuid references public.institutional_sites(id) on delete cascade,
 title text not null check(char_length(title) between 2 and 110),
 description text not null default '',
 fields jsonb not null check(jsonb_typeof(fields)='array'),
 page_slug text not null default '',
 enabled boolean not null default false,
 target_module_id uuid,
 bindings jsonb not null default '{}'::jsonb check(jsonb_typeof(bindings)='object'),
 revision int not null default 1,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(organization_id,system_id,id),
 foreign key(organization_id,system_id) references public.operational_systems(organization_id,id) on delete cascade,
 foreign key(organization_id,system_id,target_module_id) references public.operational_modules(organization_id,system_id,id) on delete set null (target_module_id)
);
create index operational_forms_site_idx on public.operational_forms(site_id,page_slug) where enabled=true;
create trigger operational_forms_updated before update on public.operational_forms for each row execute function public.set_updated_at();
create table public.operational_form_submissions (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null,
 system_id uuid not null,
 form_id uuid not null,
 fields_snapshot jsonb not null check(jsonb_typeof(fields_snapshot)='array'),
 bindings_snapshot jsonb not null default '{}'::jsonb check(jsonb_typeof(bindings_snapshot)='object'),
 target_module_snapshot_id uuid,
 payload jsonb not null check(jsonb_typeof(payload)='object'),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 module_record_id uuid references public.operational_records(id) on delete set null,
 reviewed_by_auth_user_id uuid,
 reviewed_at timestamptz,
 created_at timestamptz not null default now(),
 foreign key(organization_id,system_id,form_id) references public.operational_forms(organization_id,system_id,id) on delete cascade
);
create index operational_form_submissions_queue_idx on public.operational_form_submissions(organization_id,system_id,form_id,status,created_at desc);
alter table public.operational_forms enable row level security;
alter table public.operational_form_submissions enable row level security;
revoke all on public.operational_forms,public.operational_form_submissions from anon,authenticated;
commit;
