-- Stone list of the sample piece, imported in the admin from the CAD gem
-- report CSV and shown on the product page under the specs. The admin also
-- fills carat_weight, stone_type and stone_shape from it, so those stay the
-- short summary and this holds every row.
alter table public.products
  add column if not exists gem_report jsonb;

comment on column public.products.gem_report is 'Gem report of the sample piece: {stones: [{stone, shape, size, quantity, caratEach, caratTotal}], totalQuantity, totalCarat, fileName, importedAt}.';
