begin;

-- =========================================================
-- CONG - Basic user account information
-- =========================================================

alter table public.users
  add column username text,
  add column bio text,
  add column avatar_path text;


-- =========================================================
-- USERNAME
-- =========================================================

-- Impede @Palka e @palka de existirem ao mesmo tempo.
create unique index idx_users_username_lower
  on public.users (lower(username))
  where username is not null;


alter table public.users
  add constraint users_username_length
    check (
      username is null
      or char_length(username) between 3 and 30
    ),

  add constraint users_username_format
    check (
      username is null
      or username ~ '^[A-Za-z0-9._]+$'
    );


-- =========================================================
-- BIO
-- =========================================================

alter table public.users
  add constraint users_bio_length
    check (
      bio is null
      or char_length(bio) <= 300
    );

commit;