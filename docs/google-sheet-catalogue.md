# Historical Google Sheet Catalogue Reference

This document is a historical reference for the former Google Sheet catalogue feed and the manual image checker. The storefront catalogue now comes from Supabase through `/api/catalogue/products`, and product updates should be managed in `/admin`.

Keep this file only for old row audits, one-off imports, or checking legacy sheet image data before migration cleanup. It is not a production publishing workflow.

## Current Source

- Storefront products: Supabase `products`, `product_variants`, and `product_images`
- Public API: `/api/catalogue/products`
- Admin product entry: `/admin` Products tab
- Product image hosting: Supabase Storage bucket `product-images`
- Historical sheet utility: `npm run check:sheet-images`

## Legacy Header Mapping

The old sheet parser mapped columns by header name, not by fixed column positions. If you need to inspect an exported legacy sheet, these headers are the recognizable names:

- `code`
- `name`
- `collection`
- `price`
- `description`
- `details`
- `image_url`
- `hover_image_url`
- `gallery`
- `top_image_url`
- `front_image_url`
- `side_image_url`
- `yellow_gold_image_url`
- `rose_gold_image_url`

Aliases such as `main_image`, `cover_image`, `product_name`, `display_name`, `price_label`, and `detail_lines` were accepted by the historical parser.

## Manual Image Check

Run the legacy checker only when you intentionally need to audit old Google Sheet image references:

```powershell
npm run check:sheet-images
```

The checker reads a configured sheet CSV, scans image-like columns, and reports values that are empty, unreachable, unsupported, or not image responses. It remains useful for import cleanup, but it is no longer part of the Next.js build.

## Import Notes

When reconciling old rows into Supabase:

- Treat `code` as the product code and keep it unique.
- Move product copy into `products.description` and product details into structured details data.
- Upload product files through `/admin` so the server writes Supabase Storage URLs to `product_images`.
- Use `image_url` as the legacy main-image hint only; do not paste long-term production image URLs into the sheet.
- Confirm visibility and status in Supabase before expecting products to appear publicly.
