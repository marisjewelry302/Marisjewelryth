# Maris Jewelry

Next.js + Vercel project for the Maris Jewelry bilingual portfolio and catalogue site.

There is one deployable Next.js app in this repository: the app at the repository root. Keep build, deploy, and code changes in the root app so Vercel and local development do not split across duplicate scaffolds.

The public storefront now renders through Next.js App Router routes in `app/`. Shared CSS, JavaScript, and media assets live in the tracked `assets/` folder and are served through the `/assets/*` route handler. The generated `public/` folder is ignored by git and is not required for the migrated storefront.

## Project layout

```text
maris-jewelry/
|-- app/                    Next.js App Router pages, route handlers, and shared app code
|-- assets/                 Tracked storefront CSS, JavaScript, images, and models
|-- scripts/                Local checks, data helpers, migrations, and diagnostics
|-- tools/                  Local helper scripts for preview and artifact workflows
|-- docs/
|   |-- guides/             Active workflow notes and how-to documents
|   |-- superpowers/        Planning/spec artifacts from agent workflows
|   `-- archive/backups/    Manual backup files kept for reference
|-- supabase/               Local Supabase config and migrations
|-- next.config.mjs         Next.js routing config
|-- vercel.json             Vercel install/build settings
|-- package.json            Next.js scripts and dependencies
`-- DEPLOY.md               Vercel deployment notes
```

## Local workflow

Install dependencies:

```powershell
npm ci
```

Start the Next.js dev server:

```powershell
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

On this Windows/Codex machine, if `npm` or `node` is not available from PATH, use the bundled-runtime helper:

```powershell
.\tools\start-next-dev.cmd
```

Build before deploying:

```powershell
npm run build
```

or:

```powershell
.\tools\build-next.cmd
```

## Notes

- Vercel should use the default Next.js settings. This repo no longer has a `prebuild` legacy public sync.
- The storefront catalogue now reads Supabase through `/api/catalogue/products`; `/admin` manages product records and product images with Supabase Database and Storage.
- `npm run check:sheet-images` is still available as a manual historical Google Sheet diagnostic, but it is no longer part of the build gate.
- Vercel deploys from the repository root and uses `vercel.json` for `npm ci` plus `npm run build`.
- Do not create or deploy nested Next.js apps inside this checkout; shared site work belongs in the root app.
- Generated screenshots, runtime folders, temp previews, and logs are stored outside the repository.
- Artifact workflow details live in `docs/guides/LOCAL_ARTIFACTS.md`.
- Documentation structure is summarized in `docs/README.md`.
- Helper script descriptions live in `tools/README.md`.
