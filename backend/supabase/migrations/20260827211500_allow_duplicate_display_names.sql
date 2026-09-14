-- Display names are presentation data and are intentionally NOT unique.
-- The unique public identifier remains users.username (@username).
-- This migration is defensive: it removes only uniqueness rules that target
-- public.users.display_name by itself. It does not touch username or primary keys.

do $$
declare
  item record;
begin
  for item in
    select
      ns.nspname as schema_name,
      tbl.relname as table_name,
      con.conname as constraint_name
    from pg_constraint con
    join pg_class tbl
      on tbl.oid = con.conrelid
    join pg_namespace ns
      on ns.oid = tbl.relnamespace
    join pg_attribute attr
      on attr.attrelid = tbl.oid
     and attr.attname = 'display_name'
    where ns.nspname = 'public'
      and tbl.relname = 'users'
      and con.contype = 'u'
      and array_length(con.conkey, 1) = 1
      and con.conkey[1] = attr.attnum
  loop
    execute format(
      'alter table %I.%I drop constraint if exists %I',
      item.schema_name,
      item.table_name,
      item.constraint_name
    );
  end loop;
end $$;

do $$
declare
  item record;
begin
  for item in
    select
      ns.nspname as schema_name,
      idx.relname as index_name
    from pg_index ix
    join pg_class tbl
      on tbl.oid = ix.indrelid
    join pg_namespace ns
      on ns.oid = tbl.relnamespace
    join pg_class idx
      on idx.oid = ix.indexrelid
    join pg_attribute attr
      on attr.attrelid = tbl.oid
     and attr.attname = 'display_name'
    where ns.nspname = 'public'
      and tbl.relname = 'users'
      and ix.indisunique = true
      and ix.indisprimary = false
      and ix.indnkeyatts = 1
      and attr.attnum = any(ix.indkey::smallint[])
  loop
    execute format(
      'drop index if exists %I.%I',
      item.schema_name,
      item.index_name
    );
  end loop;
end $$;
