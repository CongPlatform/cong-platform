begin;

alter table public.collaboration_profiles
  drop constraint if exists collaboration_profiles_role_check;

alter table public.collaboration_profiles
  add constraint collaboration_profiles_role_check
  check (
    role in (
      'developer',
      'designer',
      'translator',
      'volunteer',
      'supporter'
    )
  );

commit;
