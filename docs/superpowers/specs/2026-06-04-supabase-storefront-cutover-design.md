# Supabase Storefront Cutover Design

## Goal

Move Maris Jewelry from a Google Sheet powered storefront to a single back-office source of truth. The public site will show products, images, gallery items, stock status, and visibility from Supabase data that is managed in `/admin`.

## Approved Direction

Use Supabase Database plus Supabase Storage, while keeping Maris-owned admin authentication.

Admins upload product images from the admin page. The server stores image files in Supabase Storage, writes public image URLs into `product_images`, and the public storefront reads products through a public catalogue API backed by Supabase. Google Sheet is retired as a runtime dependency and as a build gate.

Admin login stays in the existing Maris application layer. Admin accounts live in the Supabase `admin_users` table, passwords are verified by the app, and the Next.js server issues the HTTP-only `maris_admin_session` cookie. This design does not migrate admin login to the Supabase Auth service.

## Current State

- `assets/js/product-data.js` still fetches the Google Sheet CSV and exposes sheet-oriented globals such as `MARIS_SHEET_PRODUCTS`, `MARIS_SHEET_STATUS`, and `MARIS_GOOGLE_SHEET_URL`.
- `package.json` runs `npm run check:sheet-images` in `prebuild`, so `npm run build` can fail before Next.js compilation because of live Sheet image data.
- Admin product, inventory, order, customer, payment, and database status routes already use protected Next.js APIs.
- `app/lib/maris-database.js` already reads Supabase server-side with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- The database schema already has `products`, `product_variants`, and `product_images`.
- Admin product forms can create product records, but image entry is still path-oriented and not yet a direct file upload workflow.

## Migration Phases

### Phase 1: Add Supabase Catalogue API

Create the server-side catalogue read path before changing storefront code.

- Add a public read-only API route at `/api/catalogue/products`.
- Add a public catalogue normalization helper in `app/lib/maris-database.js` or a focused catalogue module.
- Keep the route server-only for Supabase access; do not expose `SUPABASE_SERVICE_ROLE_KEY`.
- Add tests that prove the route returns active products, product images, and safe storefront fields.
- Keep the existing Google Sheet storefront runtime untouched during this phase.

### Phase 2: Switch Storefront Fetch

Change the public storefront runtime to use the Supabase catalogue API.

- Refactor `assets/js/product-data.js` to fetch `/api/catalogue/products`.
- Preserve existing storefront globals and events used by category and product pages.
- Remove Google Sheet CSV fetch behavior from the storefront runtime.
- Keep any Sheet-specific globals only as inert compatibility values if needed for old code during cutover.
- Verify category pages, product detail pages, wishlist, and bag flows still resolve product codes.

### Phase 3: Add Admin Image Upload

Make `/admin` the simple product-image workflow.

- Add an authenticated upload endpoint at `/api/admin/uploads/product-image`.
- Upload accepted image files to the public-read Supabase Storage bucket.
- Insert uploaded image metadata into `product_images`.
- Update admin product/catalogue forms to use file inputs for main and gallery images.
- Keep upload writes behind admin session checks.

### Phase 4: Remove Google Sheet From Build And Docs

Retire the Sheet dependency after the Supabase storefront and upload paths are in place.

- Remove `check:sheet-images` from `prebuild`.
- Update docs and admin copy so they describe `/admin` and Supabase as the catalogue source.
- Keep old Sheet checker scripts only as non-blocking historical utilities if they are still useful.
- Run the full focused verification stack and `npx next build`.

## Target Architecture

The desired operating stack is:

```text
GitHub
  -> VS Code + Codex
      -> Next.js root app
          -> Frontend storefront and admin UI
          -> Backend/API routes
              -> Custom admin auth using admin_users
              -> Product, order, inventory, payment, and catalogue APIs
              -> Product image upload API
          -> Supabase
              -> Database for catalogue, admin users, orders, inventory, and payments
              -> Storage bucket for product images
          -> Vercel
              -> Root app hosting and deployment
              -> Runtime env for Supabase and admin session secrets
```

GitHub remains the version-control source, Vercel deploys the root Next.js app, and Supabase is the production data and media backend. VS Code, GitHub Copilot, and Codex are local development tools, not runtime dependencies.

### Data Source

Supabase is the only production catalogue source.

- `products` stores product identity, category, collection, price, publication state, stock, and metadata.
- `product_images` stores all storefront images for a product.
- `product_variants` remains available for future variant-specific catalogue and stock display.
- Supabase Storage stores uploaded image files.

### Public Catalogue API

Add a public, read-only route such as `/api/catalogue/products`.

The route reads Supabase using server-side credentials and returns only safe public data:

- active products only: `is_active = true`
- visible products only: `status = active`
- product code, slug, names, category, collection, description, material fields, price label, stock display state, images, gallery, and public metadata
- no admin-only fields, no service-role key, no private customer, order, payment, or inventory log data

If Supabase env is missing, the API returns a clear unavailable state instead of trying to fall back to Google Sheet.

#### Data Contract

`GET /api/catalogue/products`

Successful response:

```json
{
  "source": "supabase",
  "status": "ready",
  "checkedAt": "2026-06-04T05:20:00.000Z",
  "productCount": 2,
  "products": [
    {
      "id": "8c56f7c1-6b42-4e25-9f57-0a27a88ad111",
      "code": "ER1001",
      "slug": "er1001",
      "title": "ER1001",
      "name": "The Infinite Hold Collection Round",
      "nameTh": "The Infinite Hold Collection Round",
      "collectionKey": "engagement-ring",
      "category": "Engagement Rings",
      "description": "Round diamond engagement ring in white gold.",
      "details": [
        "14K White Gold",
        "Round diamond",
        "Made to order"
      ],
      "price": "12,900 THB",
      "priceAmount": 12900,
      "currency": "THB",
      "status": "active",
      "stockState": "available",
      "availableQuantity": 3,
      "image": "https://example.supabase.co/storage/v1/object/public/product-images/products/ER1001/main.webp",
      "hover": "https://example.supabase.co/storage/v1/object/public/product-images/products/ER1001/hover.webp",
      "gallery": [
        {
          "id": "0ad3175d-2ef6-45d9-9e53-a4a6d1dc1111",
          "label": "Primary View",
          "src": "https://example.supabase.co/storage/v1/object/public/product-images/products/ER1001/main.webp",
          "alt": "The Infinite Hold Collection Round primary view",
          "sortOrder": 0,
          "isPrimary": true
        }
      ],
      "filterValues": [
        "white-gold",
        "round"
      ],
      "imagePresentation": "contain",
      "updatedAt": "2026-06-04T05:19:00.000Z"
    }
  ]
}
```

Unavailable response when Supabase env is missing:

```json
{
  "source": "supabase",
  "status": "unavailable",
  "error": "Supabase catalogue is not configured.",
  "missingEnv": [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY"
  ],
  "checkedAt": "2026-06-04T05:20:00.000Z",
  "productCount": 0,
  "products": []
}
```

Contract rules:

- `source` is always `supabase` after the cutover.
- `status` is `ready`, `empty`, or `unavailable`.
- `products` is always an array.
- `code`, `name`, `collectionKey`, `image`, and `gallery` use the same shape expected by existing storefront page scripts.
- `gallery` is sorted by `isPrimary` first, then `sortOrder`.
- `availableQuantity` is `stock_quantity - reserved_quantity`, never below zero.
- `stockState` is `available`, `low-stock`, `sold-out`, or `preorder`.
- Private admin/customer/order/payment fields are never included.

### Storefront Runtime

Refactor `assets/js/product-data.js` so it initializes the same storefront globals expected by existing category and product pages, but fills them from the public catalogue API instead of Google Sheet CSV.

The compatibility target is:

- keep `window.MARIS_PRODUCTS`
- keep `window.MARIS_COLLECTION_META`
- keep `window.MARIS_COLLECTION_PRODUCTS`
- keep `window.MARIS_DATA_READY`
- dispatch `maris:catalogue-data-updated`

The Sheet-specific globals can remain temporarily as inert compatibility values only if existing admin or storefront code still reads them during the first cutover. They must not fetch Google Sheet or control product rendering.

### Admin Upload Flow

Add an authenticated admin upload endpoint such as `/api/admin/uploads/product-image`.

The endpoint:

- requires a valid admin session cookie
- accepts multipart form data with `productId`, `file`, and optional `altText`, `sortOrder`, and `isPrimary`
- validates file type as an image
- limits accepted file size to a documented maximum
- uploads to a Supabase Storage bucket for product images
- creates a `product_images` row with the public URL
- returns the normalized image record

The admin catalogue/product form changes from manual image URL entry to file upload controls for main image and gallery images. Existing manual URL metadata should not be the primary path after this migration.

### Storage

Use one public-read Supabase Storage bucket for product images.

Recommended bucket name: `product-images`.

File paths should be deterministic enough to audit and unique enough to avoid collisions, for example:

`products/<product-code-or-id>/<timestamp>-<safe-filename>`

The bucket can be public because product images are intentionally shown on the storefront. Write access remains server-only through authenticated admin API routes.

### Image Constraints

Accepted upload formats:

- `.jpg`
- `.jpeg`
- `.png`
- `.webp`

Limits:

- Maximum file size: 5 MB per image.
- Reject non-image MIME types and unsupported extensions.
- Preserve original aspect ratio.
- Recommended product image size: at least 1600 px on the longest edge.
- Recommended catalogue card ratio: square or near-square product cutout, with enough padding for responsive crops.
- Recommended gallery ratio: consistent per product, preferably square or 4:5.

The first implementation does not need server-side image resizing. The admin UI should explain the recommended size and reject files above 5 MB.

### Cache Strategy

During cutover, use conservative cache behavior:

- `/api/catalogue/products` should use `Cache-Control: no-store` until the Supabase catalogue and admin upload flow are verified end-to-end.
- After the cutover is stable, the route can move to short public caching such as `public, max-age=60, stale-while-revalidate=300`.
- Admin mutation and upload routes stay `private, no-store`.
- Browser-side storefront code should not add a Google Sheet fallback cache.

### Build And Deploy

Remove Google Sheet image checking from `prebuild`.

The new build path should run:

`node scripts/sync-legacy-public.mjs`

The old Sheet image checker scripts and tests may remain for reference during the migration, but they must not block `npm run build`.

### Rollback Plan

Rollback is deploy-based, not data-source fallback based.

- If the Supabase catalogue API or storefront fetch fails during rollout, revert or redeploy the previous known-good build.
- Do not restore Google Sheet fallback inside the new storefront runtime.
- Keep database writes made through `/admin`; rollback should not delete Supabase catalogue data.
- If an uploaded image is bad, replace or delete the `product_images` row from admin tooling or Supabase, then redeploy only if code changed.
- If real Supabase env is missing in a deployment target, treat it as a deployment configuration blocker and keep the previous build live.

### Documentation

Update operator-facing docs and admin copy:

- `README.md`
- `DEPLOY.md`
- `docs/README.md`
- `docs/supabase-admin-database.md`
- retire or rewrite `docs/google-sheet-catalogue.md`
- `pages/admin.html`

The docs should say that the storefront catalogue is managed from `/admin` and Supabase, not Google Sheet.

## User Experience

In `/admin`, product creation should feel simple:

1. Enter product code, collection, name, price, stock, and status.
2. Upload the main image from the local machine.
3. Optionally upload gallery images.
4. Save.
5. Refresh or open the storefront page and see the product there.

No Google Sheet URL, image URL typing, repeated `image_url` headers, or prebuild Sheet cleanup should be required.

## Error Handling

- Missing Supabase env should show a clear admin and API message.
- Upload endpoint should reject unauthenticated requests with `401`.
- Upload endpoint should reject non-image files with `400`.
- Upload endpoint should reject oversized images with `413` or `400` with a clear message.
- Storefront should show an empty catalogue state if Supabase catalogue data cannot be loaded.
- Build should not fail because of Google Sheet image data.

## Security

- `SUPABASE_SERVICE_ROLE_KEY` stays server-only.
- Public catalogue route returns only storefront-safe fields.
- Upload and product mutation routes require admin session verification.
- Supabase Storage writes happen only through server routes.
- Public bucket read access is acceptable for product photos.

## Testing

Add or update tests for:

- public catalogue mapping from Supabase products and `product_images`
- no Google Sheet fetch in storefront product data
- `prebuild` no longer calls `check:sheet-images`
- admin upload route rejects unauthenticated requests
- admin upload route validates image file type
- product creation can save image rows and returns normalized public image data

Run the existing focused stack:

- `npm run test:admin-auth`
- `npm run test:admin-database-auth`
- `npm run test:admin-clarity`
- `npm run test:database`
- `node --check assets/js/admin-page.js`
- `node --check assets/js/product-data.js`
- `npx next build`

Run `npm run test:database:live` only when real `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are configured.

## Out Of Scope

- Full ecommerce checkout.
- Payment processing changes.
- Customer account redesign.
- Variant editing UI beyond what is needed to keep existing catalogue display stable.
- Removing all localStorage usage for wishlist, bag, language, or user preferences.
- Rebuilding the storefront visual design.

## Acceptance Criteria

- The storefront catalogue renders from Supabase-backed public API data.
- Admins can upload product images through `/admin`.
- Uploaded images are stored in Supabase Storage and linked in `product_images`.
- `npm run build` no longer runs the Google Sheet image checker.
- Google Sheet is no longer required for runtime catalogue updates.
- Admin docs and visible copy no longer describe Google Sheet as the storefront source.
- Existing admin auth and Supabase server-only boundaries remain intact.
