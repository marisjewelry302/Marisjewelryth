# Maris Jewelry Agent Guide

This guide is the repo-local operating manual for agents working in `Marisjewelryth`.

Codex reads `AGENTS.md` automatically; this `agent.md` is the detailed companion. Keep both small enough to be useful, and keep durable workflow detail in `.agents/marisjewelryth/SKILL.md` when it becomes longer or more specialized.

## Mission

Protect the Maris Jewelry site as a premium Next.js + Supabase catalogue and atelier experience. Do not treat it as a generic ecommerce demo.

When debugging, answer the real boundary:

- code, CSS, App Router, or hydration
- env or Vercel deployment
- Supabase database, storage, or RLS
- visible UI behavior
- copy/product-positioning mismatch

## Source Order

Use sources in this order:

1. User's latest instruction.
2. Current repository files.
3. `.agents/marisjewelryth/SKILL.md`.
4. Official docs and standards.
5. Prior memory only as context, never as proof of current repo state.

Prefer official sources for general web decisions:

- Codex `AGENTS.md` / skills docs from OpenAI.
- W3C WCAG for accessibility.
- MDN for HTML, CSS, forms, labels, buttons, accessibility, and responsive layout.
- web.dev for Core Web Vitals and field/lab performance thinking.
- React docs for rendering purity and effects.
- Next.js docs for App Router, metadata, fetch caching, and images.
- Supabase docs for RLS, service-role keys, storage access, and API security.
- OWASP cheat sheets for session, CSRF, headers, and web security.
- Google Search Central for SEO and structured data.
- Vercel docs for env and deployment behavior.

## Repo Map

Start here:

| Task | First Files |
| --- | --- |
| Root shell, CSS, header/footer | `app/layout.js`, `assets/css/*.css`, `app/react-migration.css`, `app/components/SiteHeader.jsx`, `app/components/SiteFooter.jsx` |
| Homepage | `app/page.js`, `app/BestSellerSection.jsx`, `app/HeroSlider.jsx`, `assets/css/style.css` |
| Public catalogue/product data | `app/lib/maris-database.js`, `app/api/catalogue/products/route.js`, `app/product/[slug]/page.js` |
| Admin UI | `app/admin/page.js`, `assets/js/admin-page.js`, `app/admin/admin.css`, `app/admin/AdminBodyClass.jsx` |
| Admin auth | `app/lib/admin-auth.js`, `app/lib/admin-users.js`, `app/api/admin/login/route.js`, `app/api/admin/setup/route.js` |
| Admin product/images | `app/lib/maris-database.js`, `app/api/admin/products`, `app/api/admin/uploads/product-image/route.js`, `app/api/admin/product-images/route.js` |
| Database/schema | `app/lib/maris-database.js`, `supabase/migrations/*.sql`, `docs/supabase-admin-database.md` |
| Legacy URL compatibility | `next.config.mjs`, `scripts/test-static-routing-contract.mjs` |
| Deploy docs | `DEPLOY.md`, `vercel.json`, `package.json` |

## Non-Negotiables

- Keep this as one root Next.js app. Do not create nested Next.js apps.
- `app/layout.js` owns the single document `<body>`. Admin pages must not render nested `<html>` or `<body>`.
- Admin pages use `AdminBodyClass` and `.admin-page-shell` for admin-specific body state.
- `app/lib/maris-database.js` is the Supabase contract boundary. Read it before changing thin route wrappers.
- Admin auth is app-owned: `admin_users` plus the signed `maris_admin_session` cookie. Do not switch to Supabase Auth unless the user explicitly asks.
- Supabase service-role credentials are server-only. Never expose them to client components, static JS, logs, screenshots, or generated docs.
- Missing env is an honest blocker. Do not guess secrets or treat placeholders as configured.
- `public/` and legacy docs can drift. Verify current `package.json`, `next.config.mjs`, `DEPLOY.md`, and active files before making deployment claims.
- `node --check` is not useful for `.jsx` in this repo. Use Next build and route-specific tests.
- If the user asks for commands only, provide commands only and do not execute them.

## Debugging Playbook

First localize the layer.

- If the UI looks broken, inspect the rendered route, DOM, CSS assets, console, and screenshots.
- If the admin modal has product/image counts but no controls, inspect `assets/js/admin-page.js` around modal gallery rendering, delete, and reorder.
- If `/admin*` has hydration/document-shell warnings, inspect `app/layout.js`, `app/admin/page.js`, `AdminBodyClass`, `SiteHeader`, and `SiteFooter`.
- If the homepage looks like default browser styling, check global CSS imports and asset routes before chasing Supabase.
- If catalogue data is empty, distinguish `status: "unavailable"` from `status: "empty"` in Supabase-backed APIs.
- If live Supabase verification is requested, run the real command only when env exists; otherwise report the missing env boundary.

## Web Quality Standard

Design for real users, not just passing builds.

- Accessibility: use semantic HTML first, explicit labels, keyboard paths, visible focus, meaningful link/button text, alt text, status messages, and logical headings. Aim for WCAG 2.2 AA.
- Responsive: test mobile and desktop. Avoid horizontal overflow, clipped text, fixed-width traps, and imagery that becomes uninspectable.
- Performance: protect LCP, INP, and CLS. Reserve image dimensions/aspect ratios, optimize hero/product media, lazy-load below-fold images, and avoid layout shifts.
- React: keep rendering pure. Do not use effects for derived state; use effects only for external systems like DOM APIs, storage, subscriptions, or network side effects.
- Next.js: prefer Server Components or route handlers for credentialed data. Set `dynamic`, `revalidate`, and `Cache-Control` deliberately.
- Security: validate server-side, authorize every protected mutation, use secure cookie practices, and add CSRF/same-origin protection when unsafe cookie-authenticated methods are exposed.
- SEO: keep important content crawlable, preserve redirects/canonicals, maintain sitemap/robots behavior, and add structured data only for visible truthful content.
- Vercel: env changes apply to new deployments; separate local, preview, and production assumptions.

## Verification

Use focused checks first:

```powershell
npm run test:static-routing
npm run test:admin-auth
npm run test:admin-database-auth
npm run test:database
npm run build
```

Use live checks only when real env is configured:

```powershell
npm run test:database:live
```

For UI work, run the app and inspect real routes:

```powershell
npm run dev
```

Check the relevant route on desktop and mobile. For admin shell work, prove one body, no storefront chrome, and visible admin shell after auth. For web quality work, include browser evidence: screenshot, console/network state, keyboard path, no horizontal overflow, image behavior, and metadata when relevant.

## Product Voice

Maris Jewelry should sound premium, calm, and truthful.

- Prefer catalogue, atelier, custom design, consultation, quote, availability review.
- Do not claim full ecommerce, payment capture, or automated fulfilment unless production services are connected and verified.
- Preserve bilingual EN/TH tone when editing copy.
- Avoid fake scarcity, fake checkout confidence, or claims unsupported by the current app.

## When To Update This File

Update this file when an agent repeatedly makes the same wrong assumption, reads too widely before finding the right files, misses a verification gate, or receives recurring review feedback.

Move long or specialized workflows into `.agents/marisjewelryth/SKILL.md` instead of making this file huge.

## Internet Source Anchors

- OpenAI Codex AGENTS.md: https://developers.openai.com/codex/guides/agents-md
- OpenAI Codex skills: https://developers.openai.com/codex/skills
- W3C WCAG Quick Reference: https://www.w3.org/WAI/WCAG22/quickref/
- MDN accessibility HTML: https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Accessibility/HTML
- MDN responsive design: https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Responsive_Design
- web.dev Core Web Vitals: https://web.dev/articles/vitals
- React effects guidance: https://react.dev/learn/you-might-not-need-an-effect
- Next.js App Router data: https://nextjs.org/docs/app/getting-started/fetching-data
- Next.js images: https://nextjs.org/docs/app/getting-started/images
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase API keys: https://supabase.com/docs/guides/getting-started/api-keys
- OWASP CSRF cheat sheet: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- OWASP session management: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- Google SEO starter guide: https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- Vercel environment variables: https://vercel.com/docs/environment-variables
