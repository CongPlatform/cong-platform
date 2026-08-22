begin;

alter table public.collaboration_profiles
  add column profile_data jsonb not null default '{}'::jsonb;

alter table public.collaboration_profiles
  add constraint collaboration_profiles_profile_data_object
    check (jsonb_typeof(profile_data) = 'object');

commit;