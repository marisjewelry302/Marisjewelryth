-- Store the admin-facing collection label separately from the collection slug.
alter table public.products
  add column if not exists collection_name text;

comment on column public.products.collection_name is
  'Human-readable collection label shown in the admin product editor.';
