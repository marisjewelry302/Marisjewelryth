# Product 3D Viewer — Worklog and Handoff

Date: 2026-08-27
Branch: `product-detail-mosaic`
Status: working prototype, running on the dev server, not committed
Origin: a teardown of Cartier's product page, then a build of the same idea for Maris

This document is written so someone with no memory of the session — a person or
another agent — can pick the work up. It records what exists, why each decision
went the way it did, what broke along the way, and what is still open.

---

## 1. Where this started

The question was how `cartier.com` shows a product in 3D. The answer turned out
to be worth copying in structure, so the rest of the work is a Maris version of
it.

### What Cartier actually does

Their product gallery's first slide is not an image, it is an iframe:

```html
<iframe data-id="3DWidget" title="3D Product View"
        src="https://webgl.cartier.com/autoiFrame/redirectPage.html?country=TH&pId=B4225800"
        data-vto-button-text="CLICK HERE TO TRY ON">
```

- `redirectPage.html` is a router. It fetches a product list from
  `3dconfigurator.s3-accelerate.amazonaws.com/autoiFrame/productList.json`,
  strips the `CR` prefix from the SKU, and sends `ijewel` types to
  `/CartierJewelry/index.html` and everything else to `/CartierConfigurator/`.
  There are `_DEV` variants behind `?dev=TRUE`.
- **A SKU with no model posts `{"iframeStates":"SKU_NOT_AVAILABLE"}` to the
  parent page**, which then hides the 3D slide. This gating is the single most
  useful idea in the whole design and is reproduced here.
- The viewer is **WebGi** (Pixotronics), built on three.js r152 — the canvas
  carries `data-engine="three.js r152"` and `id="webgi-canvas"`. The bundle
  contains `DiamondPlugin`, `SSAOPlugin`, `SSRPlugin`, `BloomPlugin`,
  `TonemapPlugin`, `ProgressivePlugin`, `GroundPlugin`, `CameraViewPlugin`.
- Models live at `webgl.cartier.com/Jewelry/{SKU}.glb`. The Juste un Clou ring
  is 2.46 MB, glTF 2.0 from `THREE.GLTFExporter`, 4 meshes, gold at
  `metallicFactor 1, roughnessFactor 0`, using `KHR_materials_ior` and private
  `WEBGI_*` extensions.
- Scene setup is separate from the model: `preset.CameraViews.json` (named
  camera angles) and `preset.Ground.json` (`bakedShadows: true`, a shadow baker
  driven by a randomised directional light), plus a `CarterGradientBG.png`
  background.
- Parent and iframe talk over `postMessage`. Beyond `iframeStates`, the page
  drives personalisation live: `{engravingFont: "AVANT"|"SCRIPT412"}`,
  `{embossingFont: "SACKERS"|"CELESTE"}`, `{embossingColor: "GOLD"|"NEUTRAL"}`,
  `{strapId: ...}`.
- Desktop does not do virtual try-on. The page bundles `qrcodejs` and draws a QR
  code to hand the session to a phone; the viewer bundle carries `tryon`/`VTO`
  code and a face-tracking loader.

**Note for later:** Juste un Clou has no stones. Cartier's realtime viewer only
has to sell polished gold, which realtime rendering does well. Maris pieces are
mostly stone-led, and that difference is the whole subject of section 8.

---

## 2. What was built

| Path | Purpose |
| --- | --- |
| `app/lib/product-3d-models.js` | SKU → model lookup and camera presets. The `productList.json` analogue |
| `app/product/[slug]/Product3DViewer.jsx` | The viewer. Client component, lazy-loads three |
| `app/product/[slug]/diamond-material.js` | Custom gem shader (see section 8) |
| `app/product/[slug]/ProductGallery.jsx` | Modified: 3D takes the hero tile when a model exists |
| `app/product/[slug]/product-slug-page.js` | Modified: resolves the model server-side |
| `app/assets/[...path]/route.js` | Modified: MIME allowlist, `.glb` and `.hdr` added |
| `assets/css/product.css` | Appended: viewer styles |
| `assets/env/studio-small-08-1k.hdr` | Studio environment, 1.44 MB, CC0 |
| `assets/env/SOURCES.md` | Provenance and how to swap it |
| `assets/models/products/sr-0084.glb` | Converted Maris ring, 2.27 MB |
| `assets/models/products/README.md` | How to add a model |
| `scripts/cad-to-glb.mjs` | Rhino `.3dm` → `.glb` converter |
| `scripts/import-matrix-materials.mjs` | MatrixGold `.mkmtl` → material library |
| `scripts/data/jewellery-materials.json` | 54 metals + 50 stones, generated, committed |
| `scripts/test-cad-to-glb.mjs` | Pipeline test — builds a real `.3dm` fixture |
| `scripts/test-product-3d-viewer.mjs` | Viewer + shader contract test |
| `cad-source/` | Source CAD and material zips. **gitignored** |

### Commands

```bash
npm run cad:glb -- "cad-source/FILE.3dm" --sku "SR 0086 ER" --metal white --gem diamond
npm run cad:glb -- --list-materials
npm run cad:glb -- "cad-source/FILE.3dm" --report-only
npm run cad:materials -- cad-source/Metal-*.zip cad-source/Gemstone-*.zip
npm run test:cad-to-glb
npm run test:product-3d-viewer
```

---

## 3. How a piece gets onto the site

1. Drop the `.3dm` in `cad-source/`.
2. Run `npm run cad:glb` with a `--sku` and a `--metal`. It writes
   `assets/models/products/<sku>.glb` and prints the row to add.
3. Add that row to `PRODUCT_MODELS` in `app/lib/product-3d-models.js`.

A SKU that is not in `PRODUCT_MODELS` has no 3D tile at all — the page ships
without the viewer in it. This mirrors Cartier's `SKU_NOT_AVAILABLE`. There is a
development-only placeholder so the viewer can be judged before the catalogue
has models; it never resolves in a production build.

`sr-0084.glb` is currently wired as that placeholder because **SR 0084 is not in
the published catalogue** (51 products, none of them this one). When a real SKU
gets a model, move the placeholder.

---

## 4. The converter, and what it has to handle

`scripts/cad-to-glb.mjs`. No Rhino licence needed — `rhino3dm` (npm, wasm) reads
the file directly, and `meshopt_simplifier` (already shipped inside three) does
the decimation.

What it does, in order:

1. Reads the **cached render meshes** out of Brep faces. It cannot tessellate
   NURBS itself, so a `.3dm` saved with **Save Small** has no meshes and the
   converter says so loudly rather than writing an empty file.
2. **Expands block instances** — see the bug in section 7, this matters.
3. Skips objects flagged hidden, and ignores curves and points (they are not
   missing geometry, they are not geometry).
4. Sorts meshes into `metal` and `gem` by layer and object name. Gem keywords
   include `diamond, gem, stone, cz, sapphire, ruby, emerald, เพชร, พลอย`;
   extend with `--gem-words`.
5. Welds on **position and normal** — welding on position alone would round the
   facets off a brilliant cut.
6. Simplifies to a triangle budget. **Stones are not cut in proportion** — they
   keep their triangles until they alone would take a quarter of the budget,
   because they are a small share of the geometry and most of what the eye goes
   to.
7. Centres the piece and normalises the longest axis to 1.0, then rotates
   Rhino's Z-up into glTF's Y-up on the root node.
8. Writes materials from the MatrixGold library (section 5).

### Real numbers from `SR 0084 remesh logo.3dm`

```
layers      Metal, Metal 01 ... Gem, Gem 03 ... Extra 01 ... (46 layers, the Matrix template)
size        20.51 x 9.48 x 23.53 file units
triangles   1,244,538 -> 90,000
  metal      87,560   (simplified, error 0.0003)
  gem         2,440   (kept whole)
notes       1 block placement expanded, 2 hidden objects left out
wrote       2.27 MB
```

**Layer naming warning.** In this file the main body sits on `Extra 01` and the
stones on `Gem` / `Gem 03`. The sort worked by luck of the word "Gem". A file
that puts stones on `Extra 07` would render them as metal. Ask the bench to keep
stone layers named with Gem or Diamond.

### Budget vs file size

| budget | output |
| --- | --- |
| 60,000 | 1.5 MB |
| 90,000 | 2.3 MB (default) |
| 120,000 | 3.0 MB |
| 150,000 | 3.6 MB |

Roughly 25 kB per 1,000 triangles. Cartier's reference point is 2.46 MB.

---

## 5. Materials come from MatrixGold, not from taste

`scripts/import-matrix-materials.mjs` reads the `.mkmtl` libraries into
`scripts/data/jewellery-materials.json`: **54 metals** (Polished/Matte/Rough,
18 each) and **50 stones**.

A `.mkmtl` is a Maverick Render "rooted subgraph" — plain text. 99% of the file
is a base85 swatch render, which is a preview image and not a material value.
The material itself is a handful of numbers:

```
gemstone Diamond {
  alias "Diamond"
  specular_ior 2.418
  transmission_abbe 50
  diffuse_color int 208 208 208
}
```

**Every parameter in every importable file is used.** A full audit of all 165
root nodes was run; the only unimported parameters belong to the 61 materials
that are skipped wholesale (they need `.jpg` maps from a `Z:\` drive that is not
in the archive, or build their finish from procedural nodes).

### Mapping

| MatrixGold | glTF | why |
| --- | --- | --- |
| `diffuse_color` (metal) | `baseColorFactor` + `metallicFactor 1` | |
| `specular_roughness` | `roughnessFactor` | Polished 0.07, Matte 0.35, Rough 0.1 |
| `coating_film_enable` | `KHR_materials_clearcoat` | the film over polished metal |
| `transmission_color` | `KHR_materials_volume.attenuationColor` | a sapphire is blue because light is absorbed crossing it, not because its surface is painted |
| `transmission_abbe` | `KHR_materials_dispersion` (20 ÷ abbe) | |
| `specular_ior` | `KHR_materials_ior` | |
| `specular_weight` | `KHR_materials_specular` | only Jet and Garnet use it |

### Colour space — settled empirically, do not "fix" it

`diffuse_color` is **sRGB**, converted to linear on import. Two pieces of
evidence, both from the files:

1. The same libraries write colours both ways — `int 250 157 19` and
   `float 0.94424 0.86612 0.31585` — which is the same 0–255 scale normalised.
2. Read as sRGB, `Gold Yellow 24` lands at a linear ratio of 1 : 0.70 : 0.32,
   next to pure gold's real 1 : 0.78 : 0.34. Read as linear it gives
   1 : 0.85 : 0.60, which is far too pale for gold.

A test pins this: 24k gold must have a linear blue channel under 0.3.

### Skipped on purpose

23 materials get their finish from procedural maps (`normal_map <- Bump_001`).
Their root node is an ordinary `metal`, so importing just the root would turn
**brushed zirconium into polished zirconium with nothing to warn you**. They are
excluded with that reason printed.

---

## 6. The viewer

`app/product/[slug]/Product3DViewer.jsx`.

- **Three.js is dynamically imported**, only after a shopper clicks "View in
  3D". Verified against a production build: the 347 kB three chunk, the 44 kB
  GLTFLoader chunk and the 4 kB RGBELoader chunk are all absent from the
  `/product/[slug]` initial JS, which carries only the 15 kB component.
- Lighting is a **photographed studio** (`studio_small_08`, Poly Haven, CC0,
  1024×512) through `PMREMGenerator`, plus one dim directional light that exists
  only so the contact shadow has a caster. If the HDR fails to load it falls
  back to three's `RoomEnvironment` and reports `data-env="fallback"` on the
  element; a healthy viewer reads `data-env="studio"`.
- The **studio is also the scene background**, blurred (`BACKGROUND_BLUR = 0.35`).
  This is not decoration — see bug 2 in section 7.
- **On-demand rendering.** `controls.update()` returns whether anything moved;
  an untouched viewer costs one boolean per frame. An `IntersectionObserver`
  stops the loop entirely when the tile scrolls off screen.
- Auto-rotate stops on the first pointer or wheel event and stays stopped.
- Camera presets come from `DEFAULT_CAMERA_VIEWS`. **The opening angle is
  `phi 0.72`, looking down on the piece.** Level with the stone (`phi 1.16`, the
  original) is the one angle at which a brilliant cut reads as grey glass.
- Every failure path — no WebGL, model 404, lost context — calls
  `onUnavailable`, and the gallery drops back to photography with no error shown.
- `window.__marisViewer` is exposed **in development only**: `{renderer, scene,
  camera, controls, render}`. `render()` draws a whole frame, which matters —
  see bug 8.

---

## 7. Bugs found, and what caused them

These are recorded because most of them are re-introducible.

**1. The stone was in the wrong place and the wrong size.**
`Diamond_Pear` is placed as a Rhino **block instance** with a non-uniform scale
(0.743 / 0.81 / 0.778) and a 12.2 mm lift. The first converter ignored the
instance and took the definition geometry, which sits untransformed at the
origin — inside the shank. Fixed by skipping objects flagged
`isInstanceDefinitionObject`, expanding instance references recursively, and
transforming normals by the **inverse transpose** — with a non-uniform scale the
plain matrix lights every facet in the wrong direction. Verified: the stone now
sits at `centre y = +0.426` with the piece topping out at 0.5.

**2. The diamond rendered as a black pebble.**
three's transmission is screen-space: a stone refracts whatever was drawn behind
it. Over a transparent canvas that is nothing at all. Giving the scene a
background fixed it. Cartier ships a background image for the same reason.

**3. The diamond rendered as smoked quartz.**
The gem's `baseColorFactor` was set from the library's `diffuse_color` (grey,
0.63 linear). In glTF the base colour of a transmissive material **tints the
light passing through it**, so a third of the light was being eaten. Gems are
now written white, and their colour lives only in attenuation.

**4. The stone had nothing inside it.** Gem materials were single-sided, so the
back facets never rendered. Now `doubleSided: true`.

**5. The stone came out as a rainbow pinwheel.**
Dispersion was traced once per wavelength. A few percent of index of refraction
is enough to carry one wavelength across the critical angle while the others
stay inside, so **whole colour channels flipped on and off per facet**. Fixed by
deciding the path once at the middle wavelength and letting only the exit
direction differ. If someone "simplifies" `traceStone` back to a per-wavelength
call, this returns.

**6. Side views were flat white.**
`envIntensity` had been raised to 1.8 while tuning against the top view only
(looking down into a stone, the light has bounced off a dark ceiling and comes
back dim). Seen from the side a stone looks straight through to the white cove,
and anything above 1.0 clips it. Now **1.0, and a test pins it there.** The dark
facets are supposed to be dark.

**7. A 39.5 MB manufacturing CAD file was publicly downloadable.**
`assets/SR 0084 remesh logo.3dm` was served by `/assets/*` with a 200 and
`application/octet-stream`. Fixed twice over: source CAD moved to `cad-source/`
outside the served tree, and the assets route now serves **only extensions in
its MIME table** — anything else 404s instead of going out as an anonymous
octet-stream.

**8. A capture path that drew half a frame.**
The gem shader needs a back-facet pass before the scene is drawn. The dev handle
called `renderer.render()` directly and got hollow stones. There is now one
`drawFrame()` used by both the animation loop and the dev handle, and a test
that forbids the handle from calling `renderer.render` on its own.

**9. Stale models in the browser.** `/assets/*` sends `max-age=3600`, so a
re-converted `.glb` can take an hour to reach a visitor — an early analysis in
this session was made against a cached older file. **Still open**, see section 10.

---

## 8. The gem shader

`app/product/[slug]/diamond-material.js`. This exists because three's stock
transmission cannot render a cut stone, and because Maris pieces are stone-led.

### How it works

1. **Pass one** renders the stone's back facets into a render target as packed
   world-space normals, with every other mesh hidden and the background off.
2. **Pass two** shades the front facets: refract into the stone, read the back
   facet behind this pixel, and either leave through it or — past the critical
   angle — turn back and leave the other way. The exit direction samples the
   studio, sharp (the raw equirectangular texture, not the PMREM pyramid).
3. Three wavelengths follow **one shared path**, differing only in exit
   direction. That separation is the fire.
4. Fresnel decides how much came off the surface instead of going in;
   attenuation colours the light that crossed the stone.

Every number comes from the `.mkmtl` by way of the glTF: `uIor`, `uDispersion`
(from the Abbe number), `uAttenuation` (from `transmission_color`),
`uSpecularWeight`.

### Its limit — read this before promising more

| | Maverick | this shader |
| --- | --- | --- |
| internal bounces | 10–30 until the ray leaves | **1**, plus one turn-back |
| rays per pixel | thousands | 3, along one path |
| knowledge of the stone | the whole solid | one back facet per pixel |
| light from the setting into the stone | yes | no |
| caustics onto the shank | yes | no |
| time per image | minutes to hours | 16 ms |

**The first row is the gap.** A brilliant cut exists to bounce light off the
pavilion two or three times and send it back up through the crown. With one
bounce this renders a faceted glass pebble, not a diamond. A second bounce is
not possible with the current design because the back-facet buffer holds one
sample per pixel — after the first bounce the ray's next surface is unknown.

The geometry is not the problem, which was checked: 68% of the stone's triangles
are flat-shaded and the largest 58 planes cover 79% of its surface, which is what
a 58-facet pear brilliant should look like.

The `.mkmtl` is not the problem either. `Diamond.mkmtl` holds four values and all
four are in the model. **A material file says what a stone is made of; it does
not contain how it looks.** The look is made by the renderer.

### Two tuning values are deliberate exaggerations

Both are commented as such in the source. Everything else is physical.

- `DISPERSION_GAIN = 0.5` — a diamond's index of refraction really moves by under
  2% across the visible spectrum. On a 3 mm stone in a 600 px frame that is a
  fraction of a pixel and no fire at all. The Abbe number from the material file
  still decides which stones sparkle more than others; this decides how loudly.
- `DEFAULT_GEM_IOR = 1.8` in the converter — the coloured Swarovski-style stones
  carry no index of refraction of their own, so they inherit the library's own
  `Crystal` value rather than glTF's plastic-like 1.5.

---

## 9. Verification

```bash
npm run test:cad-to-glb          # builds a genuine .3dm through rhino3dm, converts it,
                                 # validates the glb byte by byte
npm run test:product-3d-viewer   # viewer + shader contract, asset allowlist, provenance
npm run build                    # clean
```

Eleven existing suites were run alongside and pass unchanged.

**To look at it:** `http://localhost:3000/product/sr-0086-er`, then "View in 3D".
Every product page shows the placeholder in development.

**To capture renders from a hidden browser pane:** the animation loop is driven
by `requestAnimationFrame`, which the browser suspends when the pane is not
displayed, so nothing renders and screenshots time out. The way through is
`window.__marisViewer.render()` — it forces a frame synchronously — followed
immediately by `canvas.toDataURL()`. During this session a temporary
`app/api/dev-capture/route.js` accepted those data URLs and wrote PNGs to
`.captures/`. **That route was deleted**; recreate it if the loop is needed
again, and delete it again afterwards — it is a POST endpoint that writes files.

---

## 10. Open decisions

### The big one: how realistic does the stone need to be

**Path A — trace real geometry in the shader.** Put the stone's 2,440 triangles
into a texture and intersect them properly in the fragment shader, for 3–5 real
bounces. This is what a serious diamond shader does and would close much of the
gap. It is a substantial piece of work and still will not match a path tracer.

**Path B — do not render it in the browser at all.** Render the piece in
**Maverick**, 36 frames around the axis, and ship an image sequence. The result
is photoreal because it *is* Maverick. The tooling and files are already in
house; the cost is render time, roughly half an hour per piece. The loss is free
orbit, free zoom, and live metal changes.

Everything built here survives either choice — the CAD converter, the material
library, the per-SKU gating and the gallery integration are all independent of
how the frames are produced. Only the display component changes.

Recommendation on the table: for a stone-led catalogue, B gives more per hour
spent. Cartier chose realtime, but Juste un Clou has no stones in it.

### Smaller open items

- **Model cache busting.** `/assets/*` sends `max-age=3600`. Put a content hash
  in the filename (`sr-0084.a1b2c3.glb`) and raise the cache to immutable.
- **Whether to commit `sr-0084.glb`** (2.3 MB binary) and which real SKU should
  take over as the development placeholder.
- **Rhodium vs 14k white gold.** The piece was described as 14k WG. White gold is
  normally rhodium plated and the plating is what a customer sees; the file was
  last converted with `--metal rhodium-polished`. Confirm which is wanted.
- **HDRI size.** 1.44 MB at 1k. A 512×256 version would be about 380 kB and, for
  a prefiltered environment, near-identical — worth doing if the click-to-load
  payload (currently 1.44 MB studio + 2.27 MB model) matters.

---

## 11. Traps

- `Product3DViewer` must never import three at module scope. There is a test.
- `started` and `status` are separate state on purpose. If the boot effect ever
  depends on the status it sets, reaching `"ready"` tears the scene down again.
- `environment?.dispose()` keeps the optional chain — the studio can still be in
  flight when a shopper navigates away.
- Do not raise the gem's `envIntensity` above 1 to flatter the top view.
- Do not trace dispersion per wavelength.
- Do not add a file type to the assets MIME table unless it is meant to be
  publicly downloadable; the table is the allowlist.
- `scripts/data/jewellery-materials.json` is generated but **must stay
  committed** — its source zips are gitignored.
