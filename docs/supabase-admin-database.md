# Supabase Admin Database

This project now has a server-side Supabase foundation for the Maris admin workspace. Supabase is the storefront catalogue source for public products, product images, inventory-aware admin views, and future order data.

Admin login accounts live in the `admin_users` table. Environment variables hold server secrets only; they are not the place to rotate day-to-day admin usernames or passwords.

## Schema Migration

Run this SQL migration in the Supabase project before expecting `/admin` or `/api/catalogue/products` to show live products:

```text
supabase/migrations/20260526000000_create_maris_admin_schema.sql
```

The migration creates the tables checked by `/api/admin/database/status`, enables RLS on each table, and keeps privileged access on the server. It also prepares `products`, `product_variants`, and `product_images` as the catalogue records used by the storefront API.

## Environment Variables

Set these in local `.env.local` and in Vercel project environment variables:

```ini
MARIS_ADMIN_SESSION_SECRET=replace-with-a-long-random-secret
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=replace-with-server-only-service-role-key
MARIS_PAYMENT_WEBHOOK_SECRET=replace-with-a-webhook-secret
```

`MARIS_ADMIN_SESSION_SECRET` signs the HTTP-only admin session cookie. The service role key is server-only. `MARIS_PAYMENT_WEBHOOK_SECRET` is a gateway webhook secret for future payment webhook validation. Do not expose any of these values in browser JavaScript, public HTML, sheet data, or any `NEXT_PUBLIC_` variable.

## Storage

Create or verify a public Supabase Storage bucket named `product-images`.

The admin upload endpoint stores product files under `products/{productId}/...`, then writes the resulting public URL to `product_images.image_url`. The storefront catalogue API reads those image rows and normalizes the primary image, hover image, and gallery for the existing product pages.

Allowed admin upload types:

- `image/jpeg`
- `image/png`
- `image/webp`

The current file size limit is 5 MB per image.

## Expected Tables

The admin database contract expects these Supabase tables:

- `admin_users`
- `customers`
- `inventory_movements`
- `inventory_logs`
- `orders`
- `order_items`
- `payments`
- `product_images`
- `product_variants`
- `products`
- `settings`

The protected API route `/api/admin/database/status` checks each table with a server-side Supabase client and reports whether the table is reachable plus its row count.

## Setup Checklist

1. Open Supabase SQL Editor for the Maris project.
2. Paste and run `supabase/migrations/20260526000000_create_maris_admin_schema.sql`.
3. Create or verify the `product-images` Storage bucket.
4. Put `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in local `.env.local`.
5. Put `MARIS_ADMIN_SESSION_SECRET` in local `.env.local`.
6. Put the same variables in Vercel Project Settings -> Environment Variables.
7. Run the offline contract tests:

```bash
npm run test:database
npm run test:admin-database-auth
```

8. Run the live Supabase table check:

```bash
npm run test:database:live
```

9. Start the app and open `/admin/setup` to create the first owner account if `admin_users` is empty.
10. Log in at `/admin/login`, then open the Products and Database tabs.

## Current Boundary

- `/admin` is protected by the Maris admin session cookie.
- `/admin/setup` creates the first `owner` row only while `admin_users` is empty.
- `/admin/login` authenticates against `admin_users.password_hash`.
- `/api/admin/products`, `/api/admin/orders`, and `/api/admin/inventory-logs` require the same admin session.
- `/api/admin/uploads/product-image` requires the admin session and writes to Supabase Storage plus `product_images`.
- `/api/admin/database/status` and `/api/admin/database/catalogue` are protected admin-only checks.
- `/api/catalogue/products` is public, read-only, and returns only safe storefront product fields.
- The status and catalogue helpers use `SUPABASE_SERVICE_ROLE_KEY` only on the server.
- If Supabase env is missing, protected admin checks report `Needs env` and the public catalogue API returns an unavailable state instead of falling back to legacy sheet data.

## Operating Notes

Use `/admin` for catalogue edits and image uploads. Use Supabase directly only for schema maintenance, emergency fixes, or data reconciliation. The old Google Sheet guide is retained as a historical import reference, not as a live publishing path.
