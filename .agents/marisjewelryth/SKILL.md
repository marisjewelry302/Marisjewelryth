---
name: marisjewelryth
description: Use when working in the Marisjewelryth root Next.js checkout, especially admin, storefront catalogue, Supabase, App Router shell, legacy URL redirects, product images, account/customer flows, web quality, accessibility, performance, SEO, deploy/build checks, or debugging whether a failure is code, CSS, routing, env, or Supabase.
---

# Marisjewelryth

## Core Map

This checkout is the one deployable Maris Jewelry Next.js app. Keep site work in the repository root; do not create nested Next.js apps or move deploy scope.

Start from the current code, not old assumptions:

| Concern | Start Here | Then Check |
| --- | --- | --- |
| Root shell, global CSS, header/footer | `app/layout.js` | `assets/css/*.css`, `app/react-migration.css`, `app/components/SiteHeader.jsx`, `app/components/SiteFooter.jsx` |
| Homepage/storefront UI | `app/page.js` | `app/BestSellerSection.jsx`, `app/HeroSlider.jsx`, `app/lib/maris-database.js`, `assets/css/style.css` |
| Product/category data | `app/lib/maris-database.js` | `app/api/catalogue/products/route.js`, `app/product/[slug]/page.js`, category routes |
| Admin page and tabs | `app/admin/page.js` | `assets/js/admin-page.js`, `app/admin/admin.css`, `app/admin/AdminBodyClass.jsx` |
| Admin auth | `app/lib/admin-auth.js`, `app/lib/admin-users.js` | `/api/admin/login`, `/api/admin/setup`, `admin_users` |
| Admin products/images | `app/lib/maris-database.js` | `/api/admin/products`, `/api/admin/uploads/product-image`, `/api/admin/product-images` |
| Database/schema | `app/lib/maris-database.js` | `supabase/migrations/*.sql`, `docs/supabase-admin-database.md` |
| Legacy URL behavior | `next.config.mjs` | `scripts/test-static-routing-contract.mjs` |

`app/lib/maris-database.js` is the main Supabase contract boundary. Inspect it before thin route wrappers when debugging catalogue, admin products, image uploads, inventory, orders, payments, customers, or custom requests.

## Web Quality Baseline

Use current official docs and standards as the default source of truth for general web work. Prefer W3C/WCAG, MDN, web.dev, React, Next.js, Supabase, OWASP, Google Search Central, and Vercel docs over blog posts unless the user asks for broader research.

- Accessibility: use semantic HTML first, with real buttons/links/labels before ARIA. Preserve keyboard operation, visible focus, meaningful link/button text, alt text, status messages, logical heading order, and source order. Aim for WCAG 2.2 AA unless the user gives another target.
- Responsive design: design defensively for unknown devices. Avoid fixed-width layout traps, horizontal overflow, text clipping, and viewport-only assumptions. Check small mobile widths and desktop; jewellery imagery should remain inspectable rather than decorative-only.
- Performance: protect Core Web Vitals. Treat LCP, INP, and CLS as user-experience signals; optimize hero/product images, avoid layout shift, lazy-load below-fold media, keep critical CSS/JS lean, and measure on real routes when performance is the task.
- React: keep rendering pure. Do not add effects for derived state; use effects only to sync with external systems such as DOM APIs, storage, subscriptions, or network side effects. Keep client components limited to interaction-heavy islands.
- Next.js App Router: fetch server-side data in Server Components or route handlers when credentials are involved. Choose `dynamic`, `revalidate`, `Cache-Control`, and streaming/loading states intentionally instead of letting cache behavior be accidental.
- Images: prefer `next/image` or well-sized responsive images where practical, but do not blindly convert Supabase/legacy image paths without checking remote config and rendered output. Always reserve dimensions or aspect ratio to prevent gallery and hero layout shift.
- Security: validate inputs server-side, authorize every protected mutation, keep service-role credentials off the client, use secure session-cookie practices, and add CSRF protection or same-origin checks when cookie-authenticated unsafe methods become exposed to cross-site requests.
- Supabase: keep RLS enabled for exposed schemas and use least privilege. Service-role keys bypass RLS, so only use them in server-only code paths and never in browser bundles.
- SEO: make important content crawlable in HTML, keep unique metadata for meaningful pages, preserve redirects/canonicals for legacy URLs, maintain sitemap/robots behavior, and add structured data only when it accurately describes visible content.
- Deploy/env: Vercel env values belong outside source control and changes apply to new deployments. Separate local, preview, and production env assumptions when diagnosing failures.

## Debugging Rules

- Localize the failure layer. If the user asks whether a bug is from a file or Supabase, prove it with the active route, DOM/API response, and the contract file.
- Treat visible rendering as evidence. Counts in data are not enough when the user reports a broken modal/page; inspect the rendered DOM or browser state.
- Treat hydration and document-shell warnings on `/admin*` as blockers. `app/layout.js` owns the only `<body>`; admin pages should use `AdminBodyClass` plus `.admin-page-shell`, never a nested `<body>`.
- For admin gallery bugs, inspect the edit modal path in `assets/js/admin-page.js`: `renderModalGalleryImages`, `deleteModalGalleryImage`, and `reorderModalGalleryImages`. The protected image action API is `app/api/admin/product-images/route.js`.
- For homepage styling regressions, look for CSS linkage first: default Times New Roman, default body margin, oversized logo, or huge mobile `scrollWidth` usually means missing global stylesheet/import or asset routing.
- For Supabase readiness, missing or placeholder `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, or `MARIS_ADMIN_SESSION_SECRET` is a real blocker. Do not invent secrets or treat placeholders as configured.
- Admin auth is app-owned: `admin_users` plus signed `maris_admin_session` cookie. Do not switch to Supabase Auth unless explicitly requested.
- If the user asks for commands only, answer with commands only and do not execute them.

## Current Contracts

The current table list in `MARIS_DATABASE_TABLES` includes `admin_users`, `customers`, `custom_order_requests`, `inventory_movements`, `inventory_logs`, `orders`, `order_items`, `payments`, `product_images`, `product_variants`, `products`, and `settings`.

Public catalogue reads active products through `/api/catalogue/products`, which calls `readPublicCatalogueProducts()`. Product details resolve by slug or SKU through `readPublicProductBySlug()`.

Admin image uploads use Supabase Storage bucket `product-images` and write rows to `product_images`. Reorder makes the first ordered image primary.

Order payment status is intentionally constrained: admin order updates must not mark orders as paid; payment status should be updated by the payment gateway webhook path.

Docs can drift. `README.md` may mention legacy `public/` sync, while current `package.json` has no `prebuild` script and `DEPLOY.md` says migrated storefront assets are served from tracked `assets/`. Verify `package.json`, `next.config.mjs`, and the current files before making deploy claims.

## Verification

Use focused checks first, then broaden:

```powershell
npm run test:static-routing
npm run test:admin-auth
npm run test:admin-database-auth
npm run test:database
npm run build
```

Run `npm run test:database:live` only when real Supabase env values are present. If env is missing, report that boundary plainly.

For admin shell or visible UI work, also run the app and inspect real routes:

```powershell
npm run dev
```

Check `/`, key category/product pages, `/admin/login`, and `/admin`. On `/admin`, prove there is one body, no storefront header/footer, and the expected admin shell after login/session setup.

For web quality changes, add browser evidence as needed: mobile/desktop screenshots, console/network errors, keyboard path for forms/modals, no obvious horizontal overflow, image loading behavior, and page metadata. Use Lighthouse/PageSpeed or Core Web Vitals tooling when performance is explicitly in scope.

Do not use plain `node --check` for `.jsx` files in this repo; use `next build` or route-specific tests.

## Product And Copy Posture

Maris is a premium jewellery catalogue/atelier site, not a fake full ecommerce claim. Keep copy honest: availability is confirmed by the atelier, quote/contact flows are legitimate, and public checkout/payment capture should not be described as fully production-ready unless the production services are actually connected and verified.

## Source Anchors

- W3C WCAG Quick Reference: https://www.w3.org/WAI/WCAG22/quickref/
- MDN HTML accessibility and responsive design: https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Accessibility/HTML
- web.dev Core Web Vitals: https://web.dev/articles/vitals
- React effects guidance: https://react.dev/learn/you-might-not-need-an-effect
- Next.js App Router data and image docs: https://nextjs.org/docs/app/getting-started/fetching-data
- Supabase RLS and API keys: https://supabase.com/docs/guides/database/postgres/row-level-security
- OWASP Cheat Sheet Series: https://cheatsheetseries.owasp.org/
- Google SEO Starter Guide: https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- Vercel environment variables: https://vercel.com/docs/environment-variables
