begin;

alter table public.users
  add column if not exists onboarding_representations text[]
  not null
  default '{}';

alter table public.users
  add constraint users_onboarding_representations_check
  check (
    onboarding_representations <@ array[
      'ngo',
      'company'
    ]::text[]
  );

commit;