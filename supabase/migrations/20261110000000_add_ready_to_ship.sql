-- Ready to Ship: pieces the atelier already holds in stock, listed on their own
-- page so customers can add them to the bag and order straight away.
--
-- base_price stays the price the customer pays (the discounted price, and the
-- one the bag and order flow read). compare_at_price already exists on products
-- and holds the full price before the discount, shown struck through.

alter table public.products
  add column if not exists ready_to_ship boolean not null default false;

create index if not exists products_ready_to_ship_idx
  on public.products (updated_at desc)
  where ready_to_ship = true and status = 'active';
