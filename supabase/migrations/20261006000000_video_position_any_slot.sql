-- The turntable video can now sit in any slot of the product page gallery, not
-- only first (0) or after the cover (1). video_position is the slide number
-- counting from 0; a number past the last photo puts the video last, and 99 is
-- what admin saves for "last".
--
-- Existing rows keep their meaning: 0 is still first, 1 is still after the cover.
-- Safe to run more than once.

alter table public.products
  drop constraint if exists products_video_position_check;

alter table public.products
  add constraint products_video_position_check check (video_position between 0 and 99);

comment on column public.products.video_position is
  'Slide number of the video in the product page gallery, from 0 (first). 1 = after the cover. 99 = last.';
