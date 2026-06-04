-- Maris Jewelry admin database foundation.
-- This creates the tables checked by /api/admin/database/status.
-- It does not switch the live storefront away from the Google Sheet feed.

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

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  display_name text,
  role text not null default 'admin' check (role in ('owner', 'admin', 'staff', 'viewer')),
  is_active boolean not null default true,
  password_hash text,
  last_signed_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text,
  line_id text,
  address jsonb not null default '{}'::jsonb,
  notes text,
  tags text[] not null default '{}'::text[],
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  product_code text not null unique,
  slug text unique,
  name_en text not null,
  name_th text,
  category text not null,
  collection text,
  description text,
  material text,
  gold_color text,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  google_sheet_row_id text,
  sheet_updated_at timestamptz,
  price_amount numeric(12, 2),
  currency char(3) not null default 'THB',
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  reserved_quantity integer not null default 0 check (reserved_quantity >= 0),
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text unique,
  variant_name text,
  metal text,
  size_label text,
  diamond_shape text,
  diamond_size text,
  price_delta numeric(12, 2) not null default 0,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete set null,
  image_url text not null,
  alt_text text,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  source text not null default 'manual' check (source in ('google_sheet', 'manual', 'upload')),
  google_sheet_image_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid references public.customers(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'quoted', 'confirmed', 'paid', 'making', 'ready', 'shipped', 'completed', 'cancelled')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'pending', 'paid', 'failed', 'refunded', 'cancelled')),
  channel text,
  subtotal_amount numeric(12, 2) not null default 0,
  discount_amount numeric(12, 2) not null default 0,
  shipping_amount numeric(12, 2) not null default 0,
  total_amount numeric(12, 2) not null default 0,
  currency char(3) not null default 'THB',
  placed_at timestamptz,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  product_code text,
  item_name text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_price_amount numeric(12, 2) not null default 0,
  total_amount numeric(12, 2) not null default 0,
  production_notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  payment_gateway text,
  gateway_transaction_id text,
  amount numeric(12, 2) not null default 0,
  currency char(3) not null default 'THB',
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
  captured_at timestamptz,
  received_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_logs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  change_type text not null check (change_type in ('receive', 'reserve', 'release', 'sale', 'damage', 'return', 'adjustment')),
  quantity integer not null,
  reference_type text,
  reference_id uuid,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.admin_users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  movement_type text not null check (movement_type in ('stock_in', 'stock_out', 'adjustment', 'reservation', 'release')),
  quantity_delta integer not null check (quantity_delta <> 0),
  reference_type text,
  reference_id uuid,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.admin_users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  description text,
  is_public boolean not null default false,
  updated_by uuid references public.admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_code on public.products(product_code);
create index if not exists idx_products_category_status on public.products(category, status);
create index if not exists idx_product_variants_product_id on public.product_variants(product_id);
create index if not exists idx_product_images_product_id on public.product_images(product_id);
create index if not exists idx_product_images_variant_id on public.product_images(variant_id);
create index if not exists idx_customers_email on public.customers(lower(email)) where email is not null;
create index if not exists idx_customers_phone on public.customers(phone) where phone is not null;
create index if not exists idx_orders_customer_id on public.orders(customer_id);
create index if not exists idx_orders_status_created_at on public.orders(status, created_at desc);
create index if not exists idx_order_items_order_id on public.order_items(order_id);
create index if not exists idx_order_items_product_id on public.order_items(product_id);
create index if not exists idx_payments_order_id on public.payments(order_id);
create index if not exists idx_payments_customer_id on public.payments(customer_id);
create index if not exists idx_inventory_logs_product_id on public.inventory_logs(product_id);
create index if not exists idx_inventory_logs_variant_id on public.inventory_logs(variant_id);
create index if not exists idx_inventory_movements_product_id on public.inventory_movements(product_id);
create index if not exists idx_inventory_movements_variant_id on public.inventory_movements(variant_id);

alter table public.admin_users enable row level security;
alter table public.customers enable row level security;
alter table public.inventory_logs enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.order_items enable row level security;
alter table public.orders enable row level security;
alter table public.payments enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.products enable row level security;
alter table public.settings enable row level security;

drop trigger if exists set_admin_users_updated_at on public.admin_users;
create trigger set_admin_users_updated_at
before update on public.admin_users
for each row execute function public.set_maris_updated_at();

drop trigger if exists set_customers_updated_at on public.customers;
create trigger set_customers_updated_at
before update on public.customers
for each row execute function public.set_maris_updated_at();

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
before update on public.products
for each row execute function public.set_maris_updated_at();

drop trigger if exists set_product_variants_updated_at on public.product_variants;
create trigger set_product_variants_updated_at
before update on public.product_variants
for each row execute function public.set_maris_updated_at();

drop trigger if exists set_product_images_updated_at on public.product_images;
create trigger set_product_images_updated_at
before update on public.product_images
for each row execute function public.set_maris_updated_at();

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at
before update on public.orders
for each row execute function public.set_maris_updated_at();

drop trigger if exists set_order_items_updated_at on public.order_items;
create trigger set_order_items_updated_at
before update on public.order_items
for each row execute function public.set_maris_updated_at();

drop trigger if exists set_settings_updated_at on public.settings;
create trigger set_settings_updated_at
before update on public.settings
for each row execute function public.set_maris_updated_at();

comment on table public.products is 'Prepared Maris admin product table. Live storefront still reads Google Sheet until migration is explicitly completed.';
comment on table public.product_variants is 'Prepared Maris admin variant table for future CRUD and inventory workflows.';
comment on table public.product_images is 'Prepared Maris admin image mapping table for future Google Sheet reconciliation and uploads.';
