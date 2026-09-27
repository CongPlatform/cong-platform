-- =========================================================
-- CONG - Display name uniqueness
-- =========================================================
-- display_name é um dado de apresentação e, portanto,
-- não precisa ser exclusivo entre os usuários.
--
-- O identificador público único continua sendo:
-- users.username (@username).
--
-- Esta migration é defensiva:
-- - remove apenas regras de unicidade aplicadas diretamente
--   a public.users.display_name;
-- - não altera a unicidade de username;
-- - não remove a chave primária da tabela;
-- - não altera constraints ou índices compostos.
-- =========================================================


-- =========================================================
-- UNIQUE CONSTRAINTS
-- =========================================================
-- Procura constraints UNIQUE que tenham exatamente
-- display_name como única coluna da regra.
--
-- A consulta utiliza os catálogos internos do PostgreSQL
-- (pg_constraint, pg_class, pg_namespace e pg_attribute)
-- para identificar essas constraints de forma dinâmica.
-- =========================================================

do $$
declare
  item record;
begin

  -- Percorre todas as constraints UNIQUE de public.users
  -- que possuem somente a coluna display_name.
  for item in
    select
      ns.nspname as schema_name,
      tbl.relname as table_name,
      con.conname as constraint_name

    from pg_constraint con

    -- Tabela à qual a constraint pertence.
    join pg_class tbl
      on tbl.oid = con.conrelid

    -- Schema da tabela.
    join pg_namespace ns
      on ns.oid = tbl.relnamespace

    -- Localiza a coluna display_name.
    join pg_attribute attr
      on attr.attrelid = tbl.oid
     and attr.attname = 'display_name'

    where ns.nspname = 'public'

      -- Atua somente sobre a tabela users.
      and tbl.relname = 'users'

      -- Considera somente constraints UNIQUE.
      and con.contype = 'u'

      -- Garante que a constraint possua exatamente uma coluna.
      and array_length(con.conkey, 1) = 1

      -- Garante que essa única coluna seja display_name.
      and con.conkey[1] = attr.attnum

  loop

    -- Remove a constraint encontrada de forma dinâmica.
    --
    -- %I trata os nomes como identificadores SQL, evitando
    -- problemas com caracteres especiais ou palavras reservadas.
    execute format(
      'alter table %I.%I drop constraint if exists %I',
      item.schema_name,
      item.table_name,
      item.constraint_name
    );

  end loop;
end $$;


-- =========================================================
-- UNIQUE INDEXES
-- =========================================================
-- Além de UNIQUE constraints, o PostgreSQL pode possuir
-- índices UNIQUE independentes.
--
-- Esta etapa procura índices únicos que:
-- - pertencem a public.users;
-- - não são a chave primária;
-- - possuem somente uma coluna;
-- - envolvem diretamente display_name.
--
-- Dessa forma, uma unicidade criada como índice também
-- é removida.
-- =========================================================

do $$
declare
  item record;
begin

  -- Percorre os índices únicos que correspondem aos critérios
  -- definidos acima.
  for item in
    select
      ns.nspname as schema_name,
      idx.relname as index_name

    from pg_index ix

    -- Tabela associada ao índice.
    join pg_class tbl
      on tbl.oid = ix.indrelid

    -- Schema da tabela.
    join pg_namespace ns
      on ns.oid = tbl.relnamespace

    -- Índice propriamente dito.
    join pg_class idx
      on idx.oid = ix.indexrelid

    -- Localiza a coluna display_name.
    join pg_attribute attr
      on attr.attrelid = tbl.oid
     and attr.attname = 'display_name'

    where ns.nspname = 'public'

      -- Atua somente sobre a tabela users.
      and tbl.relname = 'users'

      -- Considera somente índices UNIQUE.
      and ix.indisunique = true

      -- Não considera a chave primária.
      and ix.indisprimary = false

      -- Garante que o índice possua somente uma coluna.
      and ix.indnkeyatts = 1

      -- Garante que display_name faça parte do índice.
      and attr.attnum = any(ix.indkey::smallint[])

  loop

    -- Remove o índice UNIQUE encontrado.
    --
    -- A operação é dinâmica porque o nome do índice pode
    -- variar dependendo de como ele foi criado.
    execute format(
      'drop index if exists %I.%I',
      item.schema_name,
      item.index_name
    );

  end loop;
end $$;
