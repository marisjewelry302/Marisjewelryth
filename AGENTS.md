# Maris Jewelry Agent Instructions

## Working Rules

- Follow the user's latest instruction first and keep work within the requested scope.
- Preserve unrelated worktree changes.
- If the user asks for commands only, provide commands only and do not execute them.
- Load `.agents/marisjewelryth/SKILL.md` only for admin, storefront, Supabase, web quality, deployment, or debugging work.

## Project Invariants

- Keep one deployable Next.js app at the repository root.
- `app/layout.js` owns the only document `<body>`; admin body state uses `AdminBodyClass` and `.admin-page-shell`.
- `app/lib/maris-database.js` is the Supabase contract boundary; inspect it before thin route wrappers.
- Admin auth remains `admin_users` plus the signed `maris_admin_session` cookie unless the user requests otherwise.
- Keep service-role credentials server-only. Missing or placeholder environment variables are blockers; never invent secrets.
- Run the narrowest relevant check first. Run live database checks only with real environment values, and inspect rendered routes for visible UI work.
- Keep Maris premium, bilingual where relevant, and truthful; do not claim unverified ecommerce behavior.
