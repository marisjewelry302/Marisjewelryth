-- Product images carry a role: two "cover" images dress the catalogue card (the
-- second on hover) and "info" images fill the product page. The base schema
-- declared metadata, but the live table was created without it.
alter table public.product_images
  add column if not exists metadata jsonb not null default '{}'::jsonb;

comment on column public.product_images.metadata is
  'Image settings. role: "cover" (sort_order 0 = card image, 1 = hover image) or "info" (product page set).';
