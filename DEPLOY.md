# Maris Jewelry Vercel Deploy

This project now runs as a Next.js app for Vercel.

The repository root is the only deployable Next.js app. Do not point Vercel at a nested scaffold or create a second app folder for Maris site work.

## Before You Publish

1. Confirm `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `MARIS_ADMIN_SESSION_SECRET` are set in Vercel.
2. Confirm `npm run test:database` and `npm run test:admin-database-auth` pass locally.
3. Confirm `npm run build` passes locally.
4. Replace `https://www.your-domain.com` in [sitemap.xml](./sitemap.xml) with the production domain.
5. Open the homepage, category pages, product page, `/admin`, and 404 page on desktop and mobile before promoting production.
6. Confirm contact details, social links, quote request flow, wishlist, and shopping bag behavior.

## Vercel Git Workflow

1. Push the repository to GitHub.
2. In Vercel, choose `Add New Project` and import the repository.
3. Set the root directory to the repository root.
4. Vercel should auto-detect Next.js. This repo also includes `vercel.json` so the build stays pinned to the intended root Next.js app.
5. Keep the default settings:
   - Framework preset: `Next.js`
   - Install command: `npm ci`
   - Build command: `npm run build`
   - Output directory: leave default
6. Every branch or pull request gets a Preview Deployment.
7. Merging to `main` creates the Production Deployment.

## How The Legacy Site Builds

The HTML/CSS/JS site is still stored in the root `index.html`, `pages/`, and `assets/` folders. Before `next dev` and `next build`, `scripts/sync-legacy-public.mjs` copies the public site surface into `public/`.

The generated `public/` folder is ignored by git. Vercel regenerates it during `npm run build`.

`next.config.mjs` also sets production cache headers for legacy image, CSS, and JS assets. The cache values stay conservative because these files are not fingerprinted yet.

## Local Commands

```powershell
npm ci
npm run dev
npm run test:database
npm run test:admin-database-auth
npm run build
```

`npm run check:sheet-images` remains available only for historical Google Sheet diagnostics or one-off legacy imports. It is no longer called by `npm run build`.

If this Windows machine cannot find `npm` or `node`, use:

```powershell
.\tools\start-next-dev.cmd
.\tools\build-next.cmd
```

## Important Note

This site is launch-ready as a public brand and catalogue website. It is not yet a full ecommerce backend: account, cart persistence, stock, checkout, payment, and order handling still need production services.
