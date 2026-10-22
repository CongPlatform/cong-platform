begin;

create table public.operational_execution_settings (
  organization_id uuid not null,
  system_id uuid not null,
  advance_on_completion boolean not null default false,
  revision integer not null default 1 check (revision >= 1),
  updated_by_auth_user_id uuid not null,
  updated_at timestamptz not null default now(),
  primary key (organization_id, system_id),
  foreign key (organization_id, system_id) references public.operational_systems(organization_id, id) on delete cascade
);

alter table public.operational_execution_settings enable row level security;
revoke all on public.operational_execution_settings from anon, authenticated;

alter table public.operational_tasks add column source_task_id uuid references public.operational_tasks(id) on delete set null;
create unique index operational_tasks_source_once_idx on public.operational_tasks(organization_id, system_id, source_task_id) where source_task_id is not null;

alter table public.operational_events drop constraint operational_events_action_check;
alter table public.operational_events add constraint operational_events_action_check check (action in ('system.created', 'system.updated', 'system.published', 'module.installed', 'module.schema_updated', 'record.created', 'record.updated', 'record.archived', 'plan.updated', 'automation.updated'));

alter table public.operational_task_events drop constraint operational_task_events_action_check;
alter table public.operational_task_events add constraint operational_task_events_action_check check (action in ('created', 'updated', 'archived', 'auto_created'));

commit;
