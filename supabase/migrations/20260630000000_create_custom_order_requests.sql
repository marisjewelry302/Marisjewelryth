-- Maris Jewelry custom order request foundation.
-- Stores custom-order leads submitted through the server-only form endpoint.

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

do $$
begin
  alter table public.customers add column if not exists full_name text;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'customers'
      and column_name = 'name'
  ) then
    execute 'update public.customers set full_name = coalesce(full_name, name) where full_name is null';
  end if;
end;
$$;

create table if not exists public.custom_order_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  product_code text not null,
  full_name text not null,
  company_name text,
  email text not null,
  contact_number text not null,
  metal text,
  metal_purity text,
  ring_size numeric(4, 1),
  stone_carat numeric(4, 2),
  stone_color text,
  stone_clarity text,
  stone_cut text,
  origin text,
  status text not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint custom_order_requests_status_check check (status in ('pending', 'contacted', 'completed', 'cancelled')),
  constraint custom_order_requests_metal_check check (metal is null or metal in ('WG', 'YG', 'RG', 'PN', 'Pd')),
  constraint custom_order_requests_metal_purity_check check (metal_purity is null or metal_purity in ('9K', '14K', '18K')),
  constraint custom_order_requests_ring_size_check check (
    ring_size is null
    or (ring_size between 5 and 16 and ring_size * 2 = floor(ring_size * 2))
  ),
  constraint custom_order_requests_stone_carat_check check (stone_carat is null or stone_carat between 0.2 and 5),
  constraint custom_order_requests_stone_color_check check (stone_color is null or stone_color in (
    'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N',
    'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'
  )),
  constraint custom_order_requests_stone_clarity_check check (stone_clarity is null or stone_clarity in (
    'VVS1', 'VVS2', 'VS1', 'VS2', 'SI1', 'SI2', 'I1', 'I2', 'I3'
  )),
  constraint custom_order_requests_stone_cut_check check (stone_cut is null or stone_cut in (
    'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'
  )),
  constraint custom_order_requests_origin_check check (origin is null or origin in ('Lab-grown', 'Natural'))
);

comment on column public.custom_order_requests.ring_size is
  'Keep ring_size as exact numeric; the half-step check is unsafe if changed to real/double precision.';

create index if not exists idx_custom_order_requests_customer_id on public.custom_order_requests(customer_id);
create index if not exists idx_custom_order_requests_email on public.custom_order_requests(lower(email));
create index if not exists idx_custom_order_requests_product_code on public.custom_order_requests(product_code);
create index if not exists idx_custom_order_requests_status_created_at on public.custom_order_requests(status, created_at desc);

alter table public.custom_order_requests enable row level security;

drop trigger if exists set_custom_order_requests_updated_at on public.custom_order_requests;
create trigger set_custom_order_requests_updated_at
before update on public.custom_order_requests
for each row execute function public.set_maris_updated_at();

comment on table public.custom_order_requests is 'Maris custom-order lead table for server-only product enquiry submissions.';
