begin;

create table public.operational_message_channels (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null,
 system_id uuid not null,
 module_id uuid not null,
 name text not null check (char_length(name) between 2 and 60),
 created_by_auth_user_id uuid not null,
 created_at timestamptz not null default now(),
 foreign key (organization_id,system_id,module_id) references public.operational_modules(organization_id,system_id,id) on delete cascade,
 unique (organization_id,system_id,module_id,id),
 unique (module_id,name)
);

create table public.operational_channel_messages (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null,
 system_id uuid not null,
 module_id uuid not null,
 channel_id uuid not null,
 author_auth_user_id uuid not null,
 body text not null check (char_length(body) between 1 and 2000),
 created_at timestamptz not null default now(),
 foreign key (organization_id,system_id,module_id,channel_id) references public.operational_message_channels(organization_id,system_id,module_id,id) on delete cascade
);
create index operational_channel_messages_feed_idx on public.operational_channel_messages (organization_id,system_id,module_id,channel_id,created_at desc);
create index operational_channel_messages_rate_idx on public.operational_channel_messages (organization_id,system_id,author_auth_user_id,created_at desc);

create table public.operational_reservation_resources (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null,
 system_id uuid not null,
 module_id uuid not null,
 name text not null check (char_length(name) between 2 and 100),
 description text not null default '' check (char_length(description) <= 300),
 active boolean not null default true,
 created_at timestamptz not null default now(),
 foreign key (organization_id,system_id,module_id) references public.operational_modules(organization_id,system_id,id) on delete cascade,
 unique (organization_id,system_id,module_id,id)
);

create table public.operational_resource_reservations (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null,
 system_id uuid not null,
 module_id uuid not null,
 resource_id uuid not null,
 title text not null check (char_length(title) between 2 and 120),
 starts_at timestamptz not null,
 ends_at timestamptz not null,
 created_by_auth_user_id uuid not null,
 cancelled_at timestamptz,
 created_at timestamptz not null default now(),
 check (ends_at > starts_at),
 foreign key (organization_id,system_id,module_id,resource_id) references public.operational_reservation_resources(organization_id,system_id,module_id,id) on delete cascade
);
create index operational_resource_reservations_slot_idx on public.operational_resource_reservations (organization_id,system_id,module_id,resource_id,starts_at,ends_at) where cancelled_at is null;

alter table public.operational_message_channels enable row level security;
alter table public.operational_channel_messages enable row level security;
alter table public.operational_reservation_resources enable row level security;
alter table public.operational_resource_reservations enable row level security;
revoke all on public.operational_message_channels,public.operational_channel_messages,public.operational_reservation_resources,public.operational_resource_reservations from anon,authenticated;

commit;
