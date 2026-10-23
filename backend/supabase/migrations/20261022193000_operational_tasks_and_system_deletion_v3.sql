begin;

create table public.operational_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  system_id uuid not null,
  title text not null check (char_length(title) between 2 and 140),
  notes text not null default '' check (char_length(notes)<=1600),
  status text not null default 'todo' check (status in ('todo','progress','blocked','done')),
  priority text not null default 'normal' check (priority in ('low','normal','high')),
  due_on date,
  step_id uuid,
  module_id uuid,
  record_id uuid,
  assignee_user_id uuid references public.users(id) on delete set null,
  revision integer not null default 1 check (revision>0),
  archived_at timestamptz,
  created_by_auth_user_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id,system_id) references public.operational_systems(organization_id,id) on delete cascade,
  check (record_id is null or module_id is not null)
);
create index operational_tasks_org_system_idx on public.operational_tasks(organization_id,system_id,status,due_on) where archived_at is null;
create index operational_tasks_assignee_idx on public.operational_tasks(organization_id,assignee_user_id) where archived_at is null;
create trigger operational_tasks_updated before update on public.operational_tasks for each row execute function public.set_updated_at();

create table public.operational_task_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  system_id uuid not null,
  task_id uuid not null,
  action text not null check (action in ('created','updated','archived')),
  actor_auth_user_id uuid not null,
  created_at timestamptz not null default now(),
  foreign key (organization_id,system_id) references public.operational_systems(organization_id,id) on delete cascade
);
create index operational_task_events_history_idx on public.operational_task_events(organization_id,system_id,task_id,created_at desc);

create table public.operational_system_deletions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  deleted_system_id uuid not null,
  removed_module_count integer not null,
  removed_record_count integer not null,
  removed_task_count integer not null,
  actor_auth_user_id uuid not null,
  deleted_at timestamptz not null default now()
);
create index operational_system_deletions_org_idx on public.operational_system_deletions(organization_id,deleted_at desc);

alter table public.operational_tasks enable row level security;
alter table public.operational_task_events enable row level security;
alter table public.operational_system_deletions enable row level security;
revoke all on public.operational_tasks,public.operational_task_events,public.operational_system_deletions from anon,authenticated;

commit;
