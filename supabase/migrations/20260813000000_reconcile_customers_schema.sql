-- Reconcile public.customers with the schema the application actually expects.
--
-- Two changes had been applied to the deployed database by hand and were never
-- recorded as migrations, so a database rebuilt from this folder alone produced a
-- customers table the app could not use:
--   1. customers.metadata was added manually. app/lib/customer-users.js selects it
--      on every signup, sign-in, and profile read, so its absence breaks those routes.
--   2. customers.name was dropped manually after 20260630000000 backfilled full_name.
--
-- This migration is a no-op against the deployed database and repairs any
-- environment built from migrations. It must stay ordered after
-- 20260630000000_create_custom_order_requests.sql, which performs the
-- name -> full_name backfill this relies on.

alter table public.customers
  add column if not exists metadata jsonb not null default '{}'::jsonb;

comment on column public.customers.metadata is
  'Non-credential customer attributes. Filtered by sanitizeCustomerMetadata before any response.';

do $$
begin
  if exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name   = 'customers'
       and column_name  = 'name'
  ) then
    -- Never drop the column while a row still depends on it for its display name.
    update public.customers
       set full_name = coalesce(full_name, name)
     where full_name is null;

    alter table public.customers drop column name;
  end if;
end;
$$;
