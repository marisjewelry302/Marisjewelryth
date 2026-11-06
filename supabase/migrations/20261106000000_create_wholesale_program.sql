-- Maris wholesale (B2B) program.
--
-- A signed-in customer applies for a wholesale account. Once an admin approves
-- it, the customer sees wholesale prices (price breaks per product, minus the
-- account's discount), builds a purchase order, and submits it. The atelier
-- quotes or confirms the order and moves it through production to shipment.
--
-- Wholesale pieces are made to order, so wholesale orders do not reserve or
-- consume retail stock and never touch public.orders or public.payments.
-- Payment is arranged directly with the atelier (bank transfer, terms); no
-- status here claims that money has been received.
--
-- Every price a customer is charged is computed in this file, inside the
-- submit function, from the database. Prices sent by the browser are ignored.

create extension if not exists pgcrypto;

create or replace function public.set_maris_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── Accounts ──────────────────────────────────────────────────────────────

create table if not exists public.wholesale_accounts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null unique references public.customers(id) on delete cascade,
  company_name text not null,
  business_type text not null default 'retailer',
  tax_id text,
  business_address text not null,
  country text not null default 'Thailand',
  website text,
  contact_name text not null,
  contact_phone text not null,
  line_id text,
  expected_monthly_volume text,
  interested_categories text[] not null default '{}',
  applicant_note text,
  status text not null default 'pending',
  discount_percent numeric(5, 2) not null default 0,
  payment_terms text not null default 'prepaid',
  admin_note text,
  reviewed_by text,
  reviewed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wholesale_accounts_status_check check (status in ('pending', 'approved', 'rejected', 'suspended')),
  constraint wholesale_accounts_business_type_check check (business_type in (
    'retailer', 'online_store', 'private_label', 'distributor', 'corporate_gifting', 'other'
  )),
  constraint wholesale_accounts_discount_check check (discount_percent >= 0 and discount_percent <= 90),
  constraint wholesale_accounts_payment_terms_check check (payment_terms in ('prepaid', 'deposit_50', 'net_15', 'net_30'))
);

create index if not exists idx_wholesale_accounts_status_created_at
  on public.wholesale_accounts(status, created_at desc);

-- ─── Product wholesale pricing ─────────────────────────────────────────────

create table if not exists public.product_wholesale_settings (
  product_id uuid primary key references public.products(id) on delete cascade,
  is_enabled boolean not null default false,
  minimum_order_quantity integer not null default 1,
  case_pack integer not null default 1,
  lead_time_days integer,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_wholesale_settings_moq_check check (minimum_order_quantity between 1 and 100000),
  constraint product_wholesale_settings_case_pack_check check (case_pack between 1 and 10000),
  constraint product_wholesale_settings_lead_time_check check (lead_time_days is null or lead_time_days between 0 and 365)
);

create table if not exists public.product_wholesale_price_breaks (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  min_quantity integer not null,
  unit_price numeric(12, 2) not null,
  created_at timestamptz not null default now(),
  constraint product_wholesale_price_breaks_qty_check check (min_quantity between 1 and 100000),
  constraint product_wholesale_price_breaks_price_check check (unit_price > 0)
);

create unique index if not exists idx_product_wholesale_price_breaks_product_qty
  on public.product_wholesale_price_breaks(product_id, min_quantity);

-- ─── Orders ────────────────────────────────────────────────────────────────

create table if not exists public.wholesale_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  wholesale_account_id uuid not null references public.wholesale_accounts(id) on delete restrict,
  customer_id uuid references public.customers(id) on delete set null,
  status text not null default 'submitted',
  customer_reference text,
  requested_ship_date date,
  shipping_address text not null,
  customer_note text,
  discount_percent numeric(5, 2) not null default 0,
  subtotal_amount numeric(12, 2) not null default 0,
  discount_amount numeric(12, 2) not null default 0,
  shipping_amount numeric(12, 2) not null default 0,
  total_amount numeric(12, 2) not null default 0,
  currency char(3) not null default 'THB',
  payment_terms text not null default 'prepaid',
  quote_valid_until date,
  tracking_number text,
  idempotency_key text,
  metadata jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wholesale_orders_status_check check (status in (
    'submitted', 'quoted', 'confirmed', 'in_production', 'ready', 'shipped', 'completed', 'cancelled'
  )),
  constraint wholesale_orders_amounts_check check (
    subtotal_amount >= 0 and discount_amount >= 0 and shipping_amount >= 0 and total_amount >= 0
  )
);

create unique index if not exists idx_wholesale_orders_account_idempotency
  on public.wholesale_orders(wholesale_account_id, idempotency_key)
  where idempotency_key is not null;
create index if not exists idx_wholesale_orders_account_created_at
  on public.wholesale_orders(wholesale_account_id, created_at desc);
create index if not exists idx_wholesale_orders_status_created_at
  on public.wholesale_orders(status, created_at desc);

create table if not exists public.wholesale_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.wholesale_orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_sku text not null,
  product_name text not null,
  quantity integer not null,
  list_unit_price numeric(12, 2),
  unit_price numeric(12, 2),
  line_total numeric(12, 2),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wholesale_order_items_quantity_check check (quantity between 1 and 100000),
  constraint wholesale_order_items_price_check check (
    (unit_price is null and line_total is null)
    or (unit_price >= 0 and line_total >= 0)
  )
);

create index if not exists idx_wholesale_order_items_order_id on public.wholesale_order_items(order_id);
create index if not exists idx_wholesale_order_items_product_id on public.wholesale_order_items(product_id);

comment on column public.wholesale_order_items.unit_price is
  'Null means price on request: the atelier must quote it before the order can be confirmed.';

-- ─── RLS: server-only, like every other Maris table ───────────────────────

alter table public.wholesale_accounts enable row level security;
alter table public.product_wholesale_settings enable row level security;
alter table public.product_wholesale_price_breaks enable row level security;
alter table public.wholesale_orders enable row level security;
alter table public.wholesale_order_items enable row level security;

drop trigger if exists set_wholesale_accounts_updated_at on public.wholesale_accounts;
create trigger set_wholesale_accounts_updated_at
before update on public.wholesale_accounts
for each row execute function public.set_maris_updated_at();

drop trigger if exists set_product_wholesale_settings_updated_at on public.product_wholesale_settings;
create trigger set_product_wholesale_settings_updated_at
before update on public.product_wholesale_settings
for each row execute function public.set_maris_updated_at();

drop trigger if exists set_wholesale_orders_updated_at on public.wholesale_orders;
create trigger set_wholesale_orders_updated_at
before update on public.wholesale_orders
for each row execute function public.set_maris_updated_at();

drop trigger if exists set_wholesale_order_items_updated_at on public.wholesale_order_items;
create trigger set_wholesale_order_items_updated_at
before update on public.wholesale_order_items
for each row execute function public.set_maris_updated_at();

-- ─── Pricing ───────────────────────────────────────────────────────────────
-- Mirrors computeWholesaleUnitPrice() in app/lib/wholesale.js, which only
-- renders prices; this function is the one that charges them.
--   list price = the highest price break whose min_quantity <= quantity,
--                otherwise products.base_price
--   unit price = list price minus the account discount, rounded to satang

create or replace function public.maris_wholesale_list_price(p_product_id uuid, p_quantity integer)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select b.unit_price
        from public.product_wholesale_price_breaks b
       where b.product_id = p_product_id
         and b.min_quantity <= p_quantity
       order by b.min_quantity desc
       limit 1
    ),
    (select p.base_price from public.products p where p.id = p_product_id and p.base_price > 0)
  );
$$;

create or replace function public.maris_wholesale_history_entry(
  p_actor text,
  p_from text,
  p_to text,
  p_note text
)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'at', now(),
    'actor', left(coalesce(p_actor, ''), 120),
    'fromStatus', coalesce(p_from, ''),
    'toStatus', coalesce(p_to, ''),
    'note', left(coalesce(p_note, ''), 1000)
  );
$$;

-- Appends to metadata.history and keeps the newest 50 events.
create or replace function public.maris_wholesale_append_history(p_metadata jsonb, p_entry jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
    'history',
    (
      select coalesce(jsonb_agg(e order by ord), '[]'::jsonb)
        from (
          select e, ord
            from jsonb_array_elements(
              coalesce(p_metadata->'history', '[]'::jsonb) || jsonb_build_array(p_entry)
            ) with ordinality as h(e, ord)
           order by ord desc
           limit 50
        ) newest
    )
  );
$$;

create or replace function public.maris_wholesale_recalculate_totals(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_subtotal numeric(12, 2);
begin
  select coalesce(sum(line_total), 0)
    into v_subtotal
    from public.wholesale_order_items
   where order_id = p_order_id;

  update public.wholesale_orders
     set subtotal_amount = v_subtotal,
         discount_amount = least(discount_amount, v_subtotal),
         total_amount = greatest(v_subtotal - least(discount_amount, v_subtotal) + shipping_amount, 0)
   where id = p_order_id;
end;
$$;

-- ─── Customer: submit a purchase order ─────────────────────────────────────
-- p_items: [{ "productId": uuid, "quantity": int }, ...]  (1–100 lines)

create or replace function public.maris_submit_wholesale_order(
  p_customer_id uuid,
  p_items jsonb,
  p_shipping_address text,
  p_customer_reference text default null,
  p_requested_ship_date date default null,
  p_customer_note text default null,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.wholesale_accounts%rowtype;
  v_order public.wholesale_orders%rowtype;
  v_line record;
  v_product public.products%rowtype;
  v_settings public.product_wholesale_settings%rowtype;
  v_list numeric;
  v_unit numeric(12, 2);
  v_order_number text;
  v_key text := nullif(left(trim(coalesce(p_idempotency_key, '')), 120), '');
  v_line_count integer;
begin
  select * into v_account
    from public.wholesale_accounts
   where customer_id = p_customer_id
   for update;

  if not found or v_account.status <> 'approved' then
    raise exception 'Wholesale account is not approved.' using errcode = '42501';
  end if;

  if v_key is not null then
    select * into v_order
      from public.wholesale_orders
     where wholesale_account_id = v_account.id
       and idempotency_key = v_key;

    if found then
      return jsonb_build_object(
        'orderId', v_order.id,
        'orderNumber', v_order.order_number,
        'status', v_order.status,
        'idempotent', true
      );
    end if;
  end if;

  if nullif(trim(coalesce(p_shipping_address, '')), '') is null then
    raise exception 'Shipping address is required.' using errcode = '22023';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Order items must be a list.' using errcode = '22023';
  end if;

  v_line_count := jsonb_array_length(p_items);

  if v_line_count < 1 or v_line_count > 100 then
    raise exception 'An order needs between 1 and 100 lines.' using errcode = '22023';
  end if;

  v_order_number := 'WHS-' || to_char(clock_timestamp(), 'YYYYMMDD') || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  insert into public.wholesale_orders (
    order_number, wholesale_account_id, customer_id, status,
    customer_reference, requested_ship_date, shipping_address, customer_note,
    discount_percent, payment_terms, idempotency_key, metadata
  ) values (
    v_order_number, v_account.id, p_customer_id, 'submitted',
    nullif(left(trim(coalesce(p_customer_reference, '')), 80), ''),
    p_requested_ship_date,
    left(trim(p_shipping_address), 600),
    nullif(left(trim(coalesce(p_customer_note, '')), 2000), ''),
    v_account.discount_percent, v_account.payment_terms, v_key,
    public.maris_wholesale_append_history('{}'::jsonb,
      public.maris_wholesale_history_entry('customer', '', 'submitted', 'Purchase order submitted'))
  ) returning * into v_order;

  -- Lines for the same product are merged before MOQ and pricing are checked.
  for v_line in
    select (item->>'productId')::uuid as product_id,
           sum((item->>'quantity')::integer)::integer as quantity
      from jsonb_array_elements(p_items) as item
     group by 1
     order by 1
  loop
    if v_line.product_id is null or v_line.quantity is null or v_line.quantity < 1 or v_line.quantity > 100000 then
      raise exception 'Every line needs a product and a quantity between 1 and 100000.' using errcode = '22023';
    end if;

    select * into v_product
      from public.products
     where id = v_line.product_id and status = 'active';

    if not found then
      raise exception 'A product in this order is no longer available.' using errcode = 'P0002';
    end if;

    select * into v_settings
      from public.product_wholesale_settings
     where product_id = v_line.product_id and is_enabled;

    if not found then
      raise exception 'Product % is not offered for wholesale.', v_product.sku using errcode = '22023';
    end if;

    if v_line.quantity < v_settings.minimum_order_quantity then
      raise exception 'Product % needs at least % pieces.', v_product.sku, v_settings.minimum_order_quantity
        using errcode = '22023';
    end if;

    if v_line.quantity % v_settings.case_pack <> 0 then
      raise exception 'Product % is ordered in multiples of %.', v_product.sku, v_settings.case_pack
        using errcode = '22023';
    end if;

    v_list := public.maris_wholesale_list_price(v_product.id, v_line.quantity);
    v_unit := case
      when v_list is null then null
      else round(v_list * (100 - v_account.discount_percent) / 100, 2)
    end;

    insert into public.wholesale_order_items (
      order_id, product_id, product_sku, product_name, quantity,
      list_unit_price, unit_price, line_total
    ) values (
      v_order.id, v_product.id, v_product.sku, v_product.name, v_line.quantity,
      v_list, v_unit, case when v_unit is null then null else v_unit * v_line.quantity end
    );
  end loop;

  perform public.maris_wholesale_recalculate_totals(v_order.id);
  select * into v_order from public.wholesale_orders where id = v_order.id;

  return jsonb_build_object(
    'orderId', v_order.id,
    'orderNumber', v_order.order_number,
    'status', v_order.status,
    'totalAmount', v_order.total_amount,
    'idempotent', false
  );
end;
$$;

-- ─── Customer: accept a quote or cancel ────────────────────────────────────

create or replace function public.maris_customer_update_wholesale_order(
  p_order_id uuid,
  p_customer_id uuid,
  p_action text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.wholesale_orders%rowtype;
  v_next text;
begin
  select o.* into v_order
    from public.wholesale_orders o
    join public.wholesale_accounts a on a.id = o.wholesale_account_id
   where o.id = p_order_id
     and a.customer_id = p_customer_id
   for update of o;

  if not found then
    raise exception 'Order not found.' using errcode = 'P0002';
  end if;

  if p_action = 'accept' then
    if v_order.status <> 'quoted' then
      raise exception 'Only a quoted order can be accepted.' using errcode = '23514';
    end if;
    if v_order.quote_valid_until is not null and v_order.quote_valid_until < current_date then
      raise exception 'This quote has expired. Please ask the atelier for a new quote.' using errcode = '23514';
    end if;
    v_next := 'confirmed';
  elsif p_action = 'cancel' then
    if v_order.status not in ('submitted', 'quoted') then
      raise exception 'This order is already confirmed. Please contact the atelier to change it.' using errcode = '23514';
    end if;
    v_next := 'cancelled';
  else
    raise exception 'Unsupported action.' using errcode = '22023';
  end if;

  update public.wholesale_orders
     set status = v_next,
         metadata = public.maris_wholesale_append_history(metadata,
           public.maris_wholesale_history_entry('customer', v_order.status, v_next, p_note))
   where id = p_order_id;

  return jsonb_build_object('orderId', p_order_id, 'status', v_next);
end;
$$;

-- ─── Admin: quote, move through production, cancel, or note ────────────────
-- p_items for 'quote': [{ "id": order_item_id, "unitPrice": number }, ...]

create or replace function public.maris_admin_update_wholesale_order(
  p_order_id uuid,
  p_action text,
  p_actor text,
  p_items jsonb default null,
  p_shipping_amount numeric default null,
  p_discount_amount numeric default null,
  p_quote_valid_until date default null,
  p_tracking_number text default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.wholesale_orders%rowtype;
  v_item jsonb;
  v_price numeric;
  v_next text;
  v_unpriced integer;
begin
  select * into v_order from public.wholesale_orders where id = p_order_id for update;

  if not found then
    raise exception 'Order not found.' using errcode = 'P0002';
  end if;

  v_next := case p_action
    when 'quote' then 'quoted'
    when 'confirm' then 'confirmed'
    when 'start_production' then 'in_production'
    when 'mark_ready' then 'ready'
    when 'ship' then 'shipped'
    when 'complete' then 'completed'
    when 'cancel' then 'cancelled'
    when 'note' then v_order.status
    else null
  end;

  if v_next is null then
    raise exception 'Unsupported action.' using errcode = '22023';
  end if;

  if not (
    (p_action = 'quote' and v_order.status in ('submitted', 'quoted'))
    or (p_action = 'confirm' and v_order.status in ('submitted', 'quoted'))
    or (p_action = 'start_production' and v_order.status = 'confirmed')
    or (p_action = 'mark_ready' and v_order.status in ('confirmed', 'in_production'))
    or (p_action = 'ship' and v_order.status = 'ready')
    or (p_action = 'complete' and v_order.status = 'shipped')
    or (p_action = 'cancel' and v_order.status not in ('shipped', 'completed', 'cancelled'))
    or p_action = 'note'
  ) then
    raise exception 'Cannot % an order that is %.', replace(p_action, '_', ' '), replace(v_order.status, '_', ' ')
      using errcode = '23514';
  end if;

  if p_action = 'note' and nullif(trim(coalesce(p_note, '')), '') is null then
    raise exception 'A note is required.' using errcode = '22023';
  end if;

  if p_action = 'quote' then
    if p_items is not null then
      if jsonb_typeof(p_items) <> 'array' then
        raise exception 'Quote items must be a list.' using errcode = '22023';
      end if;

      for v_item in select * from jsonb_array_elements(p_items) loop
        v_price := (v_item->>'unitPrice')::numeric;
        if v_price is null or v_price < 0 or v_price > 100000000 then
          raise exception 'Every quoted unit price must be zero or more.' using errcode = '22023';
        end if;

        update public.wholesale_order_items
           set unit_price = round(v_price, 2),
               line_total = round(v_price, 2) * quantity
         where id = (v_item->>'id')::uuid
           and order_id = p_order_id;

        if not found then
          raise exception 'A quoted line does not belong to this order.' using errcode = '22023';
        end if;
      end loop;
    end if;

    if p_shipping_amount is not null then
      if p_shipping_amount < 0 then
        raise exception 'Shipping cannot be negative.' using errcode = '22023';
      end if;
      update public.wholesale_orders set shipping_amount = round(p_shipping_amount, 2) where id = p_order_id;
    end if;

    if p_discount_amount is not null then
      if p_discount_amount < 0 then
        raise exception 'Discount cannot be negative.' using errcode = '22023';
      end if;
      update public.wholesale_orders set discount_amount = round(p_discount_amount, 2) where id = p_order_id;
    end if;

    update public.wholesale_orders set quote_valid_until = p_quote_valid_until where id = p_order_id;
    perform public.maris_wholesale_recalculate_totals(p_order_id);
  end if;

  if p_action in ('quote', 'confirm') then
    select count(*) into v_unpriced
      from public.wholesale_order_items
     where order_id = p_order_id and unit_price is null;

    if v_unpriced > 0 then
      raise exception 'Price every line before quoting or confirming.' using errcode = '23514';
    end if;
  end if;

  update public.wholesale_orders
     set status = v_next,
         tracking_number = case
           when p_action = 'ship' then nullif(left(trim(coalesce(p_tracking_number, '')), 120), '')
           else tracking_number
         end,
         metadata = public.maris_wholesale_append_history(metadata,
           public.maris_wholesale_history_entry(p_actor, v_order.status, v_next, p_note))
   where id = p_order_id
   returning * into v_order;

  return jsonb_build_object(
    'orderId', v_order.id,
    'status', v_order.status,
    'totalAmount', v_order.total_amount
  );
end;
$$;

-- ─── Admin: set a product's wholesale terms in one transaction ─────────────
-- p_breaks: [{ "minQuantity": int, "unitPrice": number }, ...]  (0–10 breaks)

create or replace function public.maris_admin_set_product_wholesale_pricing(
  p_product_id uuid,
  p_is_enabled boolean,
  p_minimum_order_quantity integer,
  p_case_pack integer,
  p_lead_time_days integer default null,
  p_note text default null,
  p_breaks jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_break jsonb;
begin
  if not exists (select 1 from public.products where id = p_product_id) then
    raise exception 'Product not found.' using errcode = 'P0002';
  end if;

  if p_breaks is null or jsonb_typeof(p_breaks) <> 'array' or jsonb_array_length(p_breaks) > 10 then
    raise exception 'Price breaks must be a list of at most 10 entries.' using errcode = '22023';
  end if;

  insert into public.product_wholesale_settings (
    product_id, is_enabled, minimum_order_quantity, case_pack, lead_time_days, note
  ) values (
    p_product_id, coalesce(p_is_enabled, false), coalesce(p_minimum_order_quantity, 1),
    coalesce(p_case_pack, 1), p_lead_time_days, nullif(left(trim(coalesce(p_note, '')), 500), '')
  )
  on conflict (product_id) do update
     set is_enabled = excluded.is_enabled,
         minimum_order_quantity = excluded.minimum_order_quantity,
         case_pack = excluded.case_pack,
         lead_time_days = excluded.lead_time_days,
         note = excluded.note;

  delete from public.product_wholesale_price_breaks where product_id = p_product_id;

  for v_break in select * from jsonb_array_elements(p_breaks) loop
    insert into public.product_wholesale_price_breaks (product_id, min_quantity, unit_price)
    values (p_product_id, (v_break->>'minQuantity')::integer, round((v_break->>'unitPrice')::numeric, 2));
  end loop;

  return jsonb_build_object('productId', p_product_id, 'breaks', jsonb_array_length(p_breaks));
end;
$$;

-- ─── Grants: service role only ─────────────────────────────────────────────

revoke all on function public.maris_wholesale_list_price(uuid, integer) from public, anon, authenticated;
revoke all on function public.maris_wholesale_history_entry(text, text, text, text) from public, anon, authenticated;
revoke all on function public.maris_wholesale_append_history(jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.maris_wholesale_recalculate_totals(uuid) from public, anon, authenticated;
revoke all on function public.maris_submit_wholesale_order(uuid, jsonb, text, text, date, text, text) from public, anon, authenticated;
revoke all on function public.maris_customer_update_wholesale_order(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.maris_admin_update_wholesale_order(uuid, text, text, jsonb, numeric, numeric, date, text, text) from public, anon, authenticated;
revoke all on function public.maris_admin_set_product_wholesale_pricing(uuid, boolean, integer, integer, integer, text, jsonb) from public, anon, authenticated;

grant execute on function public.maris_wholesale_list_price(uuid, integer) to service_role;
grant execute on function public.maris_wholesale_history_entry(text, text, text, text) to service_role;
grant execute on function public.maris_wholesale_append_history(jsonb, jsonb) to service_role;
grant execute on function public.maris_wholesale_recalculate_totals(uuid) to service_role;
grant execute on function public.maris_submit_wholesale_order(uuid, jsonb, text, text, date, text, text) to service_role;
grant execute on function public.maris_customer_update_wholesale_order(uuid, uuid, text, text) to service_role;
grant execute on function public.maris_admin_update_wholesale_order(uuid, text, text, jsonb, numeric, numeric, date, text, text) to service_role;
grant execute on function public.maris_admin_set_product_wholesale_pricing(uuid, boolean, integer, integer, integer, text, jsonb) to service_role;

comment on table public.wholesale_accounts is 'Maris B2B accounts. One per customer; prices are shown only once status is approved.';
comment on table public.wholesale_orders is 'Maris wholesale purchase orders. Made to order: no retail stock is reserved.';
