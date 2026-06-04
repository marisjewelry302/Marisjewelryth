# Supabase Admin Database

This project now has a server-side Supabase foundation for the Maris admin workspace.

Google Sheet remains the live storefront source until product migration, image mapping, and admin CRUD are verified. The Database panel in `/admin` is a protected status check only.

Admin login accounts now live in the `admin_users` table. Environment variables hold server secrets only; they are not the place to rotate day-to-day admin usernames or passwords.

## Schema Migration

Run this SQL migration in the Supabase project before expecting `/admin` to show reachable database tables:

```text
supabase/migrations/20260526000000_create_maris_admin_schema.sql
```

The migration creates the 9 tables checked by `/api/admin/database/status`, enables RLS on each table, and keeps the service-role-only boundary. It prepares shared persistence for admin work, but it does not import products or switch the public storefront away from the Google Sheet feed.

## Environment Variables

Set these in local `.env.local` and in Vercel project environment variables:

```ini
MARIS_ADMIN_SESSION_SECRET=replace-with-a-long-random-secret
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=replace-with-server-only-service-role-key
MARIS_PAYMENT_WEBHOOK_SECRET=replace-with-a-webhook-secret
```

`MARIS_ADMIN_SESSION_SECRET` signs the HTTP-only admin session cookie. The service role key is server-only. `MARIS_PAYMENT_WEBHOOK_SECRET` is a gateway webhook secret for future payment webhook validation. Do not expose any of these values in browser JavaScript, public HTML, Google Sheet data, or any `NEXT_PUBLIC_` variable.

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
3. Put `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in local `.env.local`.
4. Put `MARIS_ADMIN_SESSION_SECRET` in local `.env.local`.
5. Put the same variables in Vercel Project Settings -> Environment Variables.
6. Run the offline contract tests:

```bash
npm run test:database
npm run test:admin-database-auth
```

7. Run the live Supabase table check:

```bash
npm run test:database:live
```

8. Start the app and open `/admin/setup` to create the first owner account if `admin_users` is empty.
9. Log in at `/admin/login`, then open the Database tab. A configured project should show reachable tables and row counts instead of `Needs env`.

## Current Boundary

- `/admin` is protected by the Maris admin session cookie.
- `/admin/setup` creates the first `owner` row only while `admin_users` is empty.
- `/admin/login` authenticates against `admin_users.password_hash`.
- `/api/admin/database/status` requires that same admin session.
- `/api/admin/database/catalogue` reads Supabase `products`, `product_variants`, and `product_images` for the admin Database tab only.
- The status endpoint uses `SUPABASE_SERVICE_ROLE_KEY` only on the server.
- The live status script uses the same server helper as `/api/admin/database/status`.
- The Supabase catalogue table is read-only until `npm run test:database:live` passes against the real project.
- Product pages still read the published Google Sheet feed.
- Manual admin product drafts remain browser-local sandbox data.

## Next Database Step

After credentials are set and the Database panel shows reachable tables/products, the next safe step is to move one workflow at a time:

1. Run `npm run test:database:live` and confirm every expected table is reachable.
2. Add create/update/delete endpoints for products.
3. Import or reconcile Google Sheet rows into `products`, `product_variants`, and `product_images`.
4. Switch the storefront source only after the Supabase product data matches the live Sheet.
