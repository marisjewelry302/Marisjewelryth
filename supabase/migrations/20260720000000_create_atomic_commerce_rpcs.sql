-- Atomic inventory, order, and payment workflows.
-- These RPCs are server-only and are callable only with the Supabase service role.

create unique index if not exists idx_payments_gateway_transaction_unique
  on public.payments(payment_gateway, gateway_transaction_id)
  where gateway_transaction_id is not null;

create or replace function public.maris_apply_inventory_movement(
  p_product_id uuid,
  p_movement_type text,
  p_quantity integer,
  p_variant_id uuid default null,
  p_note text default '',
  p_reference_type text default null,
  p_reference_id uuid default null,
  p_metadata jsonb default '{}'::jsonb,
  p_created_by uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product public.products%rowtype;
  v_log public.inventory_logs%rowtype;
  v_stock integer;
  v_reserved integer;
  v_metadata jsonb;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Inventory quantity must be greater than zero.' using errcode = '22023';
  end if;

  if p_movement_type not in ('receive', 'reserve', 'release', 'sale', 'damage', 'return', 'adjustment') then
    raise exception 'Unsupported inventory movement type.' using errcode = '22023';
  end if;

  select *
    into v_product
    from public.products
   where id = p_product_id
   for update;

  if not found then
    raise exception 'Product not found for inventory movement.' using errcode = 'P0002';
  end if;

  v_stock := v_product.stock_quantity;
  v_reserved := v_product.reserved_quantity;

  case p_movement_type
    when 'receive', 'return' then
      v_stock := v_stock + p_quantity;
    when 'reserve' then
      if v_stock - v_reserved < p_quantity then
        raise exception 'Not enough available stock to reserve.' using errcode = '23514';
      end if;
      v_reserved := v_reserved + p_quantity;
    when 'release' then
      if v_reserved < p_quantity then
        raise exception 'Reserved stock is lower than this quantity.' using errcode = '23514';
      end if;
      v_reserved := v_reserved - p_quantity;
    when 'sale' then
      if v_stock < p_quantity or v_reserved < p_quantity then
        raise exception 'Paid sale needs enough real and reserved stock.' using errcode = '23514';
      end if;
      v_stock := v_stock - p_quantity;
      v_reserved := v_reserved - p_quantity;
    when 'damage' then
      if v_stock - v_reserved < p_quantity then
        raise exception 'Damage cannot reduce real stock below reserved stock.' using errcode = '23514';
      end if;
      v_stock := v_stock - p_quantity;
    when 'adjustment' then
      v_stock := v_stock + p_quantity;
  end case;

  if v_stock < 0 or v_reserved < 0 or v_reserved > v_stock then
    raise exception 'Inventory movement would create invalid stock quantities.' using errcode = '23514';
  end if;

  update public.products
     set stock_quantity = v_stock,
         reserved_quantity = v_reserved,
         updated_at = now()
   where id = p_product_id;

  v_metadata := coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
    'stockQuantity', v_stock,
    'reservedQuantity', v_reserved
  );

  insert into public.inventory_movements (
    product_id, variant_id, movement_type, quantity, reference_type,
    reference_id, note, metadata, created_by
  ) values (
    p_product_id, p_variant_id, p_movement_type, p_quantity, p_reference_type,
    p_reference_id, coalesce(p_note, ''), v_metadata, p_created_by
  );

  insert into public.inventory_logs (
    product_id, variant_id, change_type, quantity, reference_type,
    reference_id, note, metadata, created_by
  ) values (
    p_product_id, p_variant_id, p_movement_type, p_quantity, p_reference_type,
    p_reference_id, coalesce(p_note, ''), v_metadata, p_created_by
  ) returning * into v_log;

  return to_jsonb(v_log) || jsonb_build_object(
    'products', jsonb_build_object(
      'id', v_product.id,
      'sku', v_product.sku,
      'name', v_product.name,
      'stock_quantity', v_stock,
      'reserved_quantity', v_reserved
    )
  );
end;
$$;

create or replace function public.maris_create_admin_order(
  p_product_id uuid,
  p_quantity integer,
  p_customer_name text default null,
  p_customer_email text default null,
  p_customer_phone text default null,
  p_channel text default 'admin',
  p_unit_price_amount numeric default null,
  p_subtotal_amount numeric default null,
  p_discount_amount numeric default 0,
  p_shipping_amount numeric default 0,
  p_total_amount numeric default null,
  p_currency text default 'THB',
  p_placed_at timestamptz default null,
  p_notes text default '',
  p_metadata jsonb default '{}'::jsonb,
  p_created_by uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product public.products%rowtype;
  v_customer_id uuid;
  v_order public.orders%rowtype;
  v_item public.order_items%rowtype;
  v_order_number text;
  v_unit_price numeric(12, 2);
  v_subtotal numeric(12, 2);
  v_discount numeric(12, 2);
  v_shipping numeric(12, 2);
  v_total numeric(12, 2);
  v_currency text;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Order quantity must be greater than zero.' using errcode = '22023';
  end if;

  select *
    into v_product
    from public.products
   where id = p_product_id
   for update;

  if not found then
    raise exception 'Product not found for order.' using errcode = 'P0002';
  end if;

  if v_product.stock_quantity - v_product.reserved_quantity < p_quantity then
    raise exception 'Not enough available stock to reserve for this order.' using errcode = '23514';
  end if;

  if nullif(trim(coalesce(p_customer_email, '')), '') is not null then
    select id into v_customer_id
      from public.customers
     where lower(email) = lower(trim(p_customer_email))
     order by created_at
     limit 1
     for update;
  end if;

  if v_customer_id is null and nullif(trim(coalesce(p_customer_phone, '')), '') is not null then
    select id into v_customer_id
      from public.customers
     where phone = trim(p_customer_phone)
     order by created_at
     limit 1
     for update;
  end if;

  if v_customer_id is null and (
    nullif(trim(coalesce(p_customer_name, '')), '') is not null
    or nullif(trim(coalesce(p_customer_email, '')), '') is not null
    or nullif(trim(coalesce(p_customer_phone, '')), '') is not null
  ) then
    insert into public.customers (full_name, email, phone)
    values (
      nullif(trim(coalesce(p_customer_name, '')), ''),
      nullif(lower(trim(coalesce(p_customer_email, ''))), ''),
      nullif(trim(coalesce(p_customer_phone, '')), '')
    ) returning id into v_customer_id;
  elsif v_customer_id is not null then
    update public.customers
       set full_name = coalesce(nullif(trim(coalesce(p_customer_name, '')), ''), full_name),
           email = coalesce(nullif(lower(trim(coalesce(p_customer_email, ''))), ''), email),
           phone = coalesce(nullif(trim(coalesce(p_customer_phone, '')), ''), phone),
           updated_at = now()
     where id = v_customer_id;
  end if;

  v_unit_price := greatest(coalesce(p_unit_price_amount, 0), 0);
  v_subtotal := greatest(coalesce(p_subtotal_amount, v_unit_price * p_quantity), 0);
  v_discount := greatest(coalesce(p_discount_amount, 0), 0);
  v_shipping := greatest(coalesce(p_shipping_amount, 0), 0);
  v_total := greatest(coalesce(p_total_amount, v_subtotal - v_discount + v_shipping), 0);
  v_currency := upper(trim(coalesce(p_currency, 'THB')));

  if v_currency !~ '^[A-Z]{3}$' then
    raise exception 'Currency must be a three-letter ISO code.' using errcode = '22023';
  end if;

  v_order_number := 'ORD-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISS') || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  insert into public.orders (
    order_number, customer_id, status, payment_status, channel,
    subtotal_amount, discount_amount, shipping_amount, total_amount,
    currency, placed_at, notes, metadata
  ) values (
    v_order_number, v_customer_id, 'draft', 'unpaid', coalesce(nullif(trim(p_channel), ''), 'admin'),
    v_subtotal, v_discount, v_shipping, v_total,
    v_currency, p_placed_at, coalesce(p_notes, ''), coalesce(p_metadata, '{}'::jsonb)
  ) returning * into v_order;

  insert into public.order_items (
    order_id, product_id, product_code, item_name, quantity,
    unit_price_amount, total_amount, metadata
  ) values (
    v_order.id, v_product.id, v_product.sku, v_product.name, p_quantity,
    v_unit_price, v_unit_price * p_quantity, coalesce(p_metadata, '{}'::jsonb)
  ) returning * into v_item;

  perform public.maris_apply_inventory_movement(
    v_product.id,
    'reserve',
    p_quantity,
    null,
    'Reserved by order ' || v_order_number,
    'order',
    v_order.id,
    '{}'::jsonb,
    p_created_by
  );

  return jsonb_build_object(
    'orderId', v_order.id,
    'orderNumber', v_order.order_number,
    'itemId', v_item.id,
    'customerId', v_customer_id
  );
end;
$$;

create or replace function public.maris_update_admin_order(
  p_order_id uuid,
  p_status text default null,
  p_payment_status text default null,
  p_notes text default null,
  p_created_by uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_item public.order_items%rowtype;
  v_next_payment_status text;
begin
  if p_status = 'paid' or p_payment_status = 'paid' then
    raise exception 'Paid status must be set by the payment gateway transaction.' using errcode = '42501';
  end if;

  select * into v_order
    from public.orders
   where id = p_order_id
   for update;

  if not found then
    raise exception 'Order not found.' using errcode = 'P0002';
  end if;

  if p_status = 'cancelled' and v_order.status <> 'cancelled' then
    if v_order.payment_status = 'paid' then
      raise exception 'Paid orders must be refunded before cancellation.' using errcode = '23514';
    end if;

    for v_item in
      select * from public.order_items where order_id = p_order_id order by id
    loop
      if v_item.product_id is not null then
        perform public.maris_apply_inventory_movement(
          v_item.product_id,
          'release',
          v_item.quantity,
          v_item.variant_id,
          'Released reservation for cancelled order ' || v_order.order_number,
          'order',
          v_order.id,
          '{}'::jsonb,
          p_created_by
        );
      end if;
    end loop;
  end if;

  v_next_payment_status := coalesce(
    p_payment_status,
    case when p_status = 'cancelled' then 'cancelled' else v_order.payment_status end
  );

  update public.orders
     set status = coalesce(p_status, status),
         payment_status = v_next_payment_status,
         notes = coalesce(p_notes, notes),
         updated_at = now()
   where id = p_order_id
   returning * into v_order;

  return jsonb_build_object('orderId', v_order.id, 'status', v_order.status, 'paymentStatus', v_order.payment_status);
end;
$$;

create or replace function public.maris_create_admin_payment(
  p_order_id uuid default null,
  p_customer_id uuid default null,
  p_gateway text default 'manual',
  p_transaction_id text default null,
  p_amount numeric default 0,
  p_currency text default 'THB',
  p_status text default 'pending',
  p_captured_at timestamptz default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_payment public.payments%rowtype;
  v_status text := lower(trim(coalesce(p_status, 'pending')));
  v_currency text := upper(trim(coalesce(p_currency, 'THB')));
begin
  if v_status = 'paid' then
    raise exception 'Paid status must be set by the payment gateway transaction.' using errcode = '42501';
  end if;

  if v_status not in ('pending', 'failed', 'refunded', 'cancelled') then
    raise exception 'Unsupported payment status.' using errcode = '22023';
  end if;

  if coalesce(p_amount, 0) < 0 or v_currency !~ '^[A-Z]{3}$' then
    raise exception 'Payment amount or currency is invalid.' using errcode = '22023';
  end if;

  if p_order_id is not null then
    select * into v_order from public.orders where id = p_order_id for update;
    if not found then
      raise exception 'Order not found for payment.' using errcode = 'P0002';
    end if;

    if v_status = 'refunded' and v_order.payment_status <> 'paid' then
      raise exception 'Only a paid order can be refunded.' using errcode = '23514';
    end if;

    if v_order.payment_status = 'paid' and v_status <> 'refunded' then
      raise exception 'A paid order cannot be downgraded by an admin payment record.' using errcode = '23514';
    end if;
  end if;

  insert into public.payments (
    order_id, customer_id, payment_gateway, gateway_transaction_id,
    amount, currency, status, captured_at, metadata
  ) values (
    p_order_id,
    coalesce(p_customer_id, v_order.customer_id),
    coalesce(nullif(trim(p_gateway), ''), 'manual'),
    nullif(trim(coalesce(p_transaction_id, '')), ''),
    coalesce(p_amount, 0),
    v_currency,
    v_status,
    p_captured_at,
    coalesce(p_metadata, '{}'::jsonb)
  ) returning * into v_payment;

  if p_order_id is not null then
    update public.orders
       set payment_status = v_status,
           updated_at = now()
     where id = p_order_id;
  end if;

  return jsonb_build_object('paymentId', v_payment.id, 'orderId', v_payment.order_id, 'status', v_payment.status);
end;
$$;

create or replace function public.maris_capture_order_payment(
  p_order_id uuid,
  p_gateway text,
  p_transaction_id text,
  p_amount numeric,
  p_currency text default 'THB',
  p_captured_at timestamptz default now(),
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_item public.order_items%rowtype;
  v_payment public.payments%rowtype;
  v_currency text := upper(trim(coalesce(p_currency, 'THB')));
begin
  if nullif(trim(coalesce(p_gateway, '')), '') is null
     or nullif(trim(coalesce(p_transaction_id, '')), '') is null then
    raise exception 'Gateway and transaction id are required.' using errcode = '22023';
  end if;

  select * into v_payment
    from public.payments
   where payment_gateway = trim(p_gateway)
     and gateway_transaction_id = trim(p_transaction_id)
   limit 1;

  if found then
    if v_payment.order_id is distinct from p_order_id then
      raise exception 'Gateway transaction id is already assigned to another order.' using errcode = '23505';
    end if;
    return jsonb_build_object('paymentId', v_payment.id, 'orderId', v_payment.order_id, 'status', v_payment.status, 'idempotent', true);
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found for payment capture.' using errcode = 'P0002';
  end if;

  if v_order.payment_status = 'paid' then
    raise exception 'Order is already paid with a different gateway transaction.' using errcode = '23505';
  end if;

  if coalesce(p_amount, -1) <> v_order.total_amount or v_currency <> trim(v_order.currency) then
    raise exception 'Captured amount or currency does not match the order total.' using errcode = '23514';
  end if;

  for v_item in
    select * from public.order_items where order_id = p_order_id order by id
  loop
    if v_item.product_id is not null then
      perform public.maris_apply_inventory_movement(
        v_item.product_id,
        'sale',
        v_item.quantity,
        v_item.variant_id,
        'Sold by paid order ' || v_order.order_number,
        'order',
        v_order.id,
        '{}'::jsonb,
        null
      );
    end if;
  end loop;

  insert into public.payments (
    order_id, customer_id, payment_gateway, gateway_transaction_id,
    amount, currency, status, captured_at, metadata
  ) values (
    v_order.id, v_order.customer_id, trim(p_gateway), trim(p_transaction_id),
    p_amount, v_currency, 'paid', coalesce(p_captured_at, now()), coalesce(p_metadata, '{}'::jsonb)
  ) returning * into v_payment;

  update public.orders
     set status = 'paid',
         payment_status = 'paid',
         updated_at = now()
   where id = v_order.id;

  return jsonb_build_object('paymentId', v_payment.id, 'orderId', v_order.id, 'status', 'paid', 'idempotent', false);
end;
$$;

revoke all on function public.maris_apply_inventory_movement(uuid, text, integer, uuid, text, text, uuid, jsonb, uuid) from public, anon, authenticated;
revoke all on function public.maris_create_admin_order(uuid, integer, text, text, text, text, numeric, numeric, numeric, numeric, numeric, text, timestamptz, text, jsonb, uuid) from public, anon, authenticated;
revoke all on function public.maris_update_admin_order(uuid, text, text, text, uuid) from public, anon, authenticated;
revoke all on function public.maris_create_admin_payment(uuid, uuid, text, text, numeric, text, text, timestamptz, jsonb) from public, anon, authenticated;
revoke all on function public.maris_capture_order_payment(uuid, text, text, numeric, text, timestamptz, jsonb) from public, anon, authenticated;

grant execute on function public.maris_apply_inventory_movement(uuid, text, integer, uuid, text, text, uuid, jsonb, uuid) to service_role;
grant execute on function public.maris_create_admin_order(uuid, integer, text, text, text, text, numeric, numeric, numeric, numeric, numeric, text, timestamptz, text, jsonb, uuid) to service_role;
grant execute on function public.maris_update_admin_order(uuid, text, text, text, uuid) to service_role;
grant execute on function public.maris_create_admin_payment(uuid, uuid, text, text, numeric, text, text, timestamptz, jsonb) to service_role;
grant execute on function public.maris_capture_order_payment(uuid, text, text, numeric, text, timestamptz, jsonb) to service_role;
