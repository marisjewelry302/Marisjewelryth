-- Customer wishlist and shopping bag sync tables.
-- API routes scope access through the httpOnly maris_customer_session cookie.

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

create table if not exists public.customer_wishlists (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  item_id text not null,
  item_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_bags (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  item_id text not null,
  item_data jsonb not null default '{}'::jsonb,
  quantity integer not null default 1 check (quantity >= 1 and quantity <= 9),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_customer_wishlists_customer_item
on public.customer_wishlists(customer_id, item_id);

create unique index if not exists idx_customer_bags_customer_item
on public.customer_bags(customer_id, item_id);

create index if not exists idx_customer_wishlists_customer_id
on public.customer_wishlists(customer_id);

create index if not exists idx_customer_bags_customer_id
on public.customer_bags(customer_id);

alter table public.customer_wishlists enable row level security;
alter table public.customer_bags enable row level security;

drop trigger if exists set_customer_wishlists_updated_at on public.customer_wishlists;
create trigger set_customer_wishlists_updated_at
before update on public.customer_wishlists
for each row execute function public.set_maris_updated_at();

drop trigger if exists set_customer_bags_updated_at on public.customer_bags;
create trigger set_customer_bags_updated_at
before update on public.customer_bags
for each row execute function public.set_maris_updated_at();
