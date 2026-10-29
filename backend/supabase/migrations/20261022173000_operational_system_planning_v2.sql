begin;
create table public.operational_system_plans (
  organization_id uuid not null,
  system_id uuid not null,
  intent text not null default '' check (char_length(intent)<=1200),
  needs jsonb not null default '[]'::jsonb check (jsonb_typeof(needs)='array'),
  steps jsonb not null default '[]'::jsonb check (jsonb_typeof(steps)='array'),
  revision integer not null default 1 check (revision>=1),
  updated_by_auth_user_id uuid not null,
  updated_at timestamptz not null default now(),
  primary key (organization_id,system_id),
  foreign key (organization_id,system_id) references public.operational_systems(organization_id,id) on delete cascade
);
alter table public.operational_events drop constraint operational_events_action_check;
alter table public.operational_events add constraint operational_events_action_check check (action in ('system.created', 'system.updated', 'system.published', 'module.installed', 'module.schema_updated', 'record.created', 'record.updated', 'record.archived', 'plan.updated'));
alter table public.operational_system_plans enable row level security;
revoke all on public.operational_system_plans from anon,authenticated;
commit;
