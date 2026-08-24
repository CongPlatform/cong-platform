begin;

-- =========================================================
-- CONG - Onboarding state
-- =========================================================

alter table public.users
  add column display_name text,
  add column pronouns text,
  add column onboarding_step text not null default 'identity',
  add column onboarding_roles text[] not null default '{}'::text[];

alter table public.users
  add constraint users_display_name_length
    check (
      display_name is null
      or char_length(display_name) between 1 and 60
    ),

  add constraint users_pronouns_length
    check (
      pronouns is null
      or char_length(pronouns) between 1 and 60
    ),

  add constraint users_onboarding_step_check
    check (
      onboarding_step in (
        'identity',
        'roles',
        'profiles',
        'completed'
      )
    ),

  add constraint users_onboarding_roles_check
    check (
      onboarding_roles <@ array[
        'organization',
        'developer',
        'designer',
        'translator',
        'volunteer',
        'supporter'
      ]::text[]
    );

-- Usuários que já possuíam perfis antes desta migração são tratados
-- como contas já configuradas. O nome de exibição começa com o nome
-- cadastrado apenas para preservar a experiência existente.
update public.users as users
set
  display_name = users.name,
  onboarding_roles = coalesce(
    (
      select array_agg(profile.role order by profile.created_at)
      from public.collaboration_profiles as profile
      where profile.user_id = users.id
    ),
    '{}'::text[]
  ),
  onboarding_step = case
    when exists (
      select 1
      from public.collaboration_profiles as profile
      where profile.user_id = users.id
    ) then 'completed'
    else 'identity'
  end;

commit;
