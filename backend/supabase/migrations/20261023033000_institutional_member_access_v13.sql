begin;
create table if not exists public.institutional_member_access (
  organization_id uuid not null,
  user_id uuid not null,
  access_level varchar(12) not null check(access_level in ('viewer','editor','publisher')),
  granted_by_auth_user_id uuid not null,
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id),
  foreign key (organization_id, user_id) references public.organization_users(organization_id, user_id) on delete cascade
);
create index if not exists institutional_member_access_user_idx on public.institutional_member_access(user_id, organization_id);
alter table public.institutional_member_access enable row level security;
revoke all on public.institutional_member_access from anon, authenticated;
insert into public.role_permissions(role_id, permission_id)
select r.id,p.id
from public.roles r cross join public.permissions p
where r.code='organization_admin'
  and r.scope='organization'
  and r.is_system=true
  and p.code in ('institutional.read','institutional.edit','institutional.publish')
on conflict do nothing;
commit;
