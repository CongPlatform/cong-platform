begin;

create table public.operational_step_rules (
  organization_id uuid not null,
  system_id uuid not null,
  step_id uuid not null,
  enabled boolean not null default false,
  priority text not null default 'any' check (priority in ('any','low','normal','high')),
  assignment text not null default 'unassigned' check (assignment in ('unassigned','keep')),
  due_days integer not null default 0 check (due_days between 0 and 30),
  revision integer not null default 1 check (revision >= 1),
  updated_by_auth_user_id uuid not null,
  updated_at timestamptz not null default now(),
  primary key (organization_id,system_id,step_id),
  foreign key (organization_id,system_id) references public.operational_systems(organization_id,id) on delete cascade
);

alter table public.operational_step_rules enable row level security;
revoke all on public.operational_step_rules from anon,authenticated;

alter table public.operational_events drop constraint operational_events_action_check;
alter table public.operational_events add constraint operational_events_action_check check (action in ('system.created','system.updated','system.published','module.installed','module.schema_updated','record.created','record.updated','record.archived','plan.updated','automation.updated','step_rule.updated'));

commit;
