# Maris Jewelry Agent Instructions

## Working Rules

- Follow the user's latest instruction first and keep work within the requested scope.
- Preserve unrelated worktree changes.
- If the user asks for commands only, provide commands only and do not execute them.
- Load `.agents/marisjewelryth/SKILL.md` only for admin, storefront, Supabase, web quality, deployment, or debugging work.

## Project Invariants

- Keep one deployable Next.js app at the repository root.
- `app/layout.js` owns the only document `<body>`; admin body state uses `AdminBodyClass` and `.admin-page-shell`.
- `app/lib/maris-database.js` is the Supabase contract boundary; inspect it before thin route wrappers. It is a re-export barrel — the implementation lives in `app/lib/maris-database/` split by domain (`connection`, `catalogue`, `commerce`, `customers`, `custom-orders`, `product-images`, `shared`). Import from the barrel, not the submodules, and keep its export surface stable.
- Storefront palette and type tokens are declared once, in `assets/css/style.css`. No other global sheet may re-declare `:root`; they all load after it at equal specificity, so a duplicate silently wins.
- Images go through `next/image`. `app/lib/image-source.js` decides what is safe to optimize; the four SVG preview layers in `design-your-ring` stay raw `<img>` so `dangerouslyAllowSVG` can remain off.
- Admin auth remains `admin_users` plus the signed `maris_admin_session` cookie unless the user requests otherwise.
- Keep service-role credentials server-only. Missing or placeholder environment variables are blockers; never invent secrets.
- Run the narrowest relevant check first. Run live database checks only with real environment values, and inspect rendered routes for visible UI work.
- Keep Maris premium, bilingual where relevant, and truthful; do not claim unverified ecommerce behavior.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
