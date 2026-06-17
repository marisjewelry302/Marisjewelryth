# Maris Jewelry Vercel Deploy

This project now runs as a Next.js app for Vercel.

The repository root is the only deployable Next.js app. Do not point Vercel at a nested scaffold or create a second app folder for Maris site work.

## Before You Publish

1. Confirm `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `MARIS_ADMIN_SESSION_SECRET` are set in Vercel.
2. Confirm `npm run test:database` and `npm run test:admin-database-auth` pass locally.
3. Confirm `npm run build` passes locally.
4. Confirm [app/sitemap.js](./app/sitemap.js) uses the intended production domain.
5. Open the homepage, category pages, product page, `/admin`, and 404 page on desktop and mobile before promoting production.
6. Confirm contact details, social links, quote request summary flow, wishlist, and shopping bag behavior.

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

## How The React Site Builds

The public storefront now renders through Next.js App Router routes in `app/`. Legacy public `.html` pages are no longer copied into `public/` before development or build.

The generated `public/` folder is ignored by git and is not required for the migrated storefront. Storefront assets are served from the tracked `assets/` folder through the `/assets/*` App Router handler.

`next.config.mjs` sets compatibility redirects for old `.html` URLs and production cache headers for image, CSS, and JS assets. The cache values stay conservative because these files are not fingerprinted yet.

## Local Commands

```powershell
npm ci
npm run dev
npm run test:database
npm run test:admin-database-auth
npm run build
```

`npm run check:sheet-images` remains available only as a manual diagnostic for historical Google Sheet audits or one-off legacy imports. It is no longer called by `npm run build`.

If this Windows machine cannot find `npm` or `node`, use:

```powershell
.\tools\start-next-dev.cmd
.\tools\build-next.cmd
```

## Important Note

This site is launch-ready as a public brand and catalogue website. Supabase backs the admin catalogue, inventory, image uploads, and order records. Public account persistence, checkout, payment capture, and automated form delivery still need production services before the site should be described as full ecommerce.
