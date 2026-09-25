-- Centre stone shape of the sample piece, shown on the product page beside
-- carat weight and stone type. Customers change it by enquiring, so it stays
-- free text rather than an enum.
alter table public.products
  add column if not exists stone_shape text;

comment on column public.products.stone_shape is 'Centre stone shape of the sample piece, e.g. Round Brilliant.';
