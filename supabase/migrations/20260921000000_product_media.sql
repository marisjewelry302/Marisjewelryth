-- Product media: the catalogue card's cover and hover images, and a square
-- turntable video for the product page, each held on the product itself.
-- Gallery photography stays in product_images, ordered by sort_order.
--
-- Safe to run more than once: every statement is guarded, and the backfill only
-- fills a column that is still empty.

-- 1. Columns -----------------------------------------------------------------

alter table public.products
  add column if not exists cover_image_url text,
  add column if not exists hover_image_url text,
  add column if not exists video_url text,
  add column if not exists video_poster_url text,
  add column if not exists video_position smallint not null default 1;

comment on column public.products.cover_image_url is
  'Catalogue card image. Independent of the product_images gallery.';
comment on column public.products.hover_image_url is
  'Catalogue card image shown on hover (desktop). Empty means no swap.';
comment on column public.products.video_url is
  'Square (1:1) turntable video, MP4/H.264, in the product-videos bucket.';
comment on column public.products.video_poster_url is
  'Poster frame for video_url.';
comment on column public.products.video_position is
  'Where the video sits in the product page gallery: 0 = first, 1 = after the cover.';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'products_video_position_check'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_video_position_check check (video_position in (0, 1));
  end if;
end
$$;

-- 2. Backfill ----------------------------------------------------------------
-- Cover takes the first gallery image and hover the second, in the order the
-- storefront already reads them (primary first, then sort_order). Gallery rows
-- are not touched.

with ranked as (
  select
    product_id,
    image_url,
    row_number() over (
      partition by product_id
      order by is_primary desc, sort_order asc, created_at asc, id asc
    ) as position
  from public.product_images
  where coalesce(image_url, '') <> ''
)
update public.products as p
set
  cover_image_url = coalesce(nullif(p.cover_image_url, ''), first_image.image_url),
  hover_image_url = coalesce(nullif(p.hover_image_url, ''), second_image.image_url)
from ranked as first_image
left join ranked as second_image
  on second_image.product_id = first_image.product_id
  and second_image.position = 2
where first_image.product_id = p.id
  and first_image.position = 1
  and (coalesce(p.cover_image_url, '') = '' or coalesce(p.hover_image_url, '') = '');

-- 3. updated_at --------------------------------------------------------------
-- Re-assert the trigger in case the live table drifted from the base schema.

create or replace function public.set_maris_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter table public.products
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
before update on public.products
for each row execute function public.set_maris_updated_at();

-- 4. Storage -----------------------------------------------------------------
-- Public read through the public URL. There are no insert/update/delete
-- policies: only the service role (which bypasses RLS) writes, and admins
-- upload through signed upload URLs that the service role issues.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-videos',
  'product-videos',
  true,
  20971520,
  array['video/mp4', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 5. Check -------------------------------------------------------------------

select
  count(*) as products,
  count(*) filter (where coalesce(cover_image_url, '') <> '') as with_cover,
  count(*) filter (where coalesce(hover_image_url, '') <> '') as with_hover,
  (select count(*) from pg_trigger
     where tgname = 'set_products_updated_at'
       and tgrelid = 'public.products'::regclass
       and not tgisinternal) as updated_at_trigger,
  (select count(*) from storage.buckets where id = 'product-videos') as video_bucket
from public.products;
