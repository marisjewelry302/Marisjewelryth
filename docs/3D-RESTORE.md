# Restoring the product 3D viewer

The product-page 3D viewer and the image-sequence turntable were taken out of
the storefront on 2026-09-21 to make room for the square turntable video. They
were never merged to `main`; the work is kept whole on GitHub.

| | |
| --- | --- |
| Branch | `archive/3d-configurator` |
| Tag | `3d-before-removal` (commit `3e5bc19`) |
| Removed on | `product-media-update` |

The archive commit also carries the product-detail-mosaic work it was staged
with. That work was not removed and continues on `product-media-update`.

## What stays on `main`

The `/assets/*` route still serves `.glb` with `no-cache` for anything under
`/models/`.

Design Your Ring (`/design-your-ring`), which had its own three.js ring
builder, was removed later, and `three` went out of `package.json` with it.
The URL now redirects to `/our-service`. Restoring the 3D viewer means
running `npm install three` again; the builder itself is in git history
before its removal commit.

## What was removed

Code

- `app/product/[slug]/Product3DViewer.jsx` - realtime viewer (three.js, OrbitControls, RGBELoader)
- `app/product/[slug]/diamond-material.js` - stone material and proxy fitting
- `app/product/[slug]/ProductTurntable.jsx` - drag-to-turn image sequence
- `app/lib/product-3d-models.js` - SKU to `.glb` table (`resolveProductModel`)
- `app/lib/product-turntables.js` - SKU to frame folder table (`resolveProductTurntable`)
- The viewer/turntable branches in `app/product/[slug]/ProductGallery.jsx` and
  their props from `app/product/[slug]/product-slug-page.js`
- The `3D product view` and `turntable` sections at the end of `assets/css/product.css`
- `.hdr` from the MIME allowlist and the `/env/` cache rule in `app/assets/[...path]/route.js`

Assets

- `assets/models/products/` - `sr-0014.glb`, `sr-0084.glb`, README (4.7 MB)
- `assets/env/` - `maris-studio.hdr`, SOURCES.md
- `assets/turntable/README.md` - render spec for turntable frames

Pipeline scripts and data

- `scripts/cad-to-glb.mjs`, `scripts/test-cad-to-glb.mjs`
- `scripts/vertex-ao.mjs`, `scripts/test-vertex-ao.mjs`
- `scripts/exr-to-hdr.mjs`, `scripts/make-studio-hdr.mjs`
- `scripts/import-matrix-materials.mjs`, `scripts/make-jewellery-materials.mjs`
- `scripts/data/jewellery-materials.json`, `scripts/data/jewellery-surfaces.json`
- `scripts/test-product-3d-viewer.mjs`, `scripts/check-turntable.mjs`, `scripts/test-product-turntable.mjs`
- `docs/2026-08-27-product-3d-viewer-worklog.md`

npm scripts removed from `package.json`: `test:product-3d-viewer`,
`test:cad-to-glb`, `test:vertex-ao`, `cad:glb`, `cad:materials`,
`cad:surfaces`, `check:turntable`, `test:product-turntable`, `env:hdr`,
`env:studio`.

Dependencies removed: `rhino3dm` (devDependency, used only by `cad-to-glb`).

## Kept outside git

These were never committed and live only on the workstation, under
`cad-source/` (ignored by both `.gitignore` and `.vercelignore`):

- `cad-source/FOR 3d/` - the Maverick material and scene library (1.9 GB,
  10,765 files). It used to sit in `assets/FOR 3d/`, where the public
  `/assets/*` route and the Vercel upload would both have picked it up.
- `cad-source/*.3dm` and the Gemstone/Metal zip exports.

Back these up separately (a drive or cloud folder); git does not have them.

## Restoring

```powershell
git fetch origin --tags
git checkout -b restore-3d main

# Bring back the removed files exactly as archived
git checkout 3d-before-removal -- `
  "app/product/[slug]/Product3DViewer.jsx" `
  "app/product/[slug]/diamond-material.js" `
  "app/product/[slug]/ProductTurntable.jsx" `
  app/lib/product-3d-models.js `
  app/lib/product-turntables.js `
  assets/models/products assets/env assets/turntable `
  scripts/cad-to-glb.mjs scripts/test-cad-to-glb.mjs `
  scripts/vertex-ao.mjs scripts/test-vertex-ao.mjs `
  scripts/exr-to-hdr.mjs scripts/make-studio-hdr.mjs `
  scripts/import-matrix-materials.mjs scripts/make-jewellery-materials.mjs `
  scripts/data `
  scripts/test-product-3d-viewer.mjs scripts/check-turntable.mjs scripts/test-product-turntable.mjs `
  docs/2026-08-27-product-3d-viewer-worklog.md

npm install --save-dev rhino3dm@^8.32.2
```

Then re-apply by hand, comparing against the tag (`git diff 3d-before-removal -- <file>`):

1. `ProductGallery.jsx` - accept `model` and `turntable` props again and
   render the viewer or turntable as the first gallery item. The gallery has
   since been rebuilt around a 1:1 frame with a video slot, so place the 3D
   view as another slot rather than restoring the old mosaic hero.
2. `product-slug-page.js` - call `resolveProductModel(product.sku)` and
   `resolveProductTurntable(product.sku)` and pass the results down.
3. `assets/css/product.css` - restore the `3D product view` and `turntable`
   sections.
4. `app/assets/[...path]/route.js` - add `".hdr": "image/vnd.radiance"` and the
   `/env/` no-cache rule.
5. `package.json` - restore the npm scripts listed above.

Check with:

```powershell
npm run test:product-3d-viewer
npm run test:product-turntable
npm run build
```

`cad:materials` and `cad:surfaces` read from the Maverick library; point them at
`cad-source/FOR 3d/` rather than moving it back under `assets/`.
