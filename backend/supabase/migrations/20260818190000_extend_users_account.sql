begin;

-- =========================================================
-- CONG - Basic user account information
-- =========================================================
-- Adiciona informações complementares ao cadastro do usuário.
--
-- Esses campos são utilizados para representar informações
-- básicas do perfil dentro da plataforma CONG.
-- =========================================================

alter table public.users
  add column username text,
  add column bio text,
  add column avatar_path text;


-- =========================================================
-- USERNAME
-- =========================================================
-- Define as regras do nome de usuário utilizado no perfil.
--
-- O username é opcional, mas quando informado precisa ser
-- único, ter tamanho válido e seguir o formato definido.
-- =========================================================

-- Garante que o username seja único sem diferenciar
-- letras maiúsculas de minúsculas.
--
-- Dessa forma, "Palka" e "palka" são considerados o mesmo
-- username e não podem existir simultaneamente.
--
-- O índice é parcial para permitir que vários usuários
-- permaneçam com username NULL.
create unique index idx_users_username_lower
  on public.users (lower(username))
  where username is not null;


-- =========================================================
-- USERNAME - VALIDATION
-- =========================================================

alter table public.users

  -- Define o tamanho permitido para o username.
  -- O campo continua opcional.
  add constraint users_username_length
    check (
      username is null
      or char_length(username) between 3 and 30
    ),

  -- Define os caracteres permitidos no username.
  --
  -- São aceitos:
  -- - letras de A a Z;
  -- - números de 0 a 9;
  -- - ponto (.);
  -- - underscore (_).
  --
  -- Espaços, acentos e outros caracteres não são permitidos.
  add constraint users_username_format
    check (
      username is null
      or username ~ '^[A-Za-z0-9._]+$'
    );


-- =========================================================
-- BIO
-- =========================================================
-- Define a descrição curta que pode ser utilizada no perfil
-- do usuário.
-- =========================================================

alter table public.users

  -- A bio é opcional e possui limite máximo de 300 caracteres.
  add constraint users_bio_length
    check (
      bio is null
      or char_length(bio) <= 300
    );


-- Finaliza a transação após a aplicação de todas as alterações.
commit;