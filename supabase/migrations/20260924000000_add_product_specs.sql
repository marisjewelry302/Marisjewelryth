-- Metal and stone specs shown on the product page and edited in the admin.
alter table public.products
  add column if not exists metal_type text,
  add column if not exists metal_weight text,
  add column if not exists stone_type text,
  add column if not exists carat_weight text;

comment on column public.products.metal_type is 'Metal shown on the product page, e.g. 18K White Gold.';
comment on column public.products.metal_weight is 'Metal weight as displayed, e.g. 3.20 g.';
comment on column public.products.stone_type is 'Main stone shown on the product page, e.g. Natural Diamond.';
comment on column public.products.carat_weight is 'Carat weight as displayed, e.g. 0.50 ct.';
