# Product 3D Models

One `.glb` per piece, served from `/assets/models/products/<file>.glb` and shown
by `app/product/[slug]/Product3DViewer.jsx` as the lead tile of the product
gallery.

## From Rhino to the website

The bench already models every piece in CAD, so nothing is sculpted twice. Drop
the `.3dm` in `source/` (git ignores that folder - it is working material, not
something the site serves) and run:

```bash
npm run cad:glb -- "cad-source/sr-0086-er.3dm" --sku "SR 0086 ER" --metal white --gem diamond
```

`--list-materials` prints everything available. The shorthands `yellow`, `rose`,
`white` and `platinum` point at the 18k polished entries; anything else in the
library can be named in full, e.g. `--metal gold-24k-matte --gem gem-sapphire`.

Then add the row it prints to `PRODUCT_MODELS` in
`app/lib/product-3d-models.js`, and the piece has a 3D view.

No Rhino licence is needed - `rhino3dm` reads the file directly. What the
converter does:

- **reads the cached render meshes** out of the Brep surfaces, the same meshes
  Rhino draws in the viewport
- **sorts them by layer name** into metal and stone. Any layer whose name
  contains diamond, gem, stone, cz, sapphire, ruby, emerald, เพชร, พลอย (and so
  on) becomes a gem; everything else is metal. Add more with
  `--gem-words zircon,moissanite`
- **welds and simplifies** down to a triangle budget (90k by default, which lands
  around 2.3 MB; `--budget`), keeping facet edges sharp - it welds on position *and* normal, so
  a brilliant cut does not come out rounded off
- **assigns the bench's own materials**, read out of the MatrixGold libraries by
  `npm run cad:materials` into `scripts/data/jewellery-materials.json`: 54 metals
  and 50 stones with the exact colours, roughness and optical values Maris
  renders with. Metals carry their coating film as clearcoat; stones get
  transmission, their real index of refraction, dispersion from the Abbe number,
  and their colour as volume attenuation rather than as surface paint
- **centres and normalises** the piece, and turns Rhino's Z-up into glTF's Y-up
- **prints what it skipped**, so a component that was saved without its render
  mesh is never lost silently

- **bakes ambient occlusion into every vertex of the metal**, so the crevices
  are shaded (see below)

Useful flags: `--metal yellow|rose|white|platinum`, `--budget`, `--report-only`
to inspect a file without writing anything, `--out` to write elsewhere,
`--ao <rays>` or `--no-ao` for the occlusion bake.

## Baked occlusion

Nothing in a browser works out that the underside of a prong is buried in metal.
Left alone, a rasteriser lights the inside of a shank as brightly as the open
top of the piece, and the result reads as a plastic model of a ring rather than
a ring. It is the largest single thing a path tracer gives you for free, and the
main reason a web render does not look like a Maverick still.

Cartier do not solve it in the browser either. Their metal carries exactly one
texture - a 1024 x 1024 ambient occlusion map, baked long before the file
reached the web - and no normal map, no roughness map, nothing else. 92% of the
triangles in their Etincelle ring are shaded by a base colour, a roughness of
zero, and that one map.

The converter measures the same thing. From every vertex it looks out over the
hemisphere its normal faces and counts how much of the view the rest of the
piece blocks. Their model is unwrapped and can hold a texture; a Rhino render
mesh arrives with **no UVs at all**, so the answer is stored per vertex as
`COLOR_0`, which glTF multiplies into the base colour - and for a metal the base
colour is its reflectance, so the crevices dim with no shader code at all.

Stones are left out of what gets darkened, because light passes through them and
they are shaded by their own material - but they still block, since a stone does
cast shade on the setting beneath it.

The knobs live at the top of `scripts/vertex-ao.mjs`: `rays` (32 by default),
`reach` (how far a ray looks, as a fraction of the piece - occlusion is local,
and letting it reach too far turns the whole piece evenly grey instead of giving
it creases), and `floor` (how dark a fully enclosed vertex is allowed to get -
real crevices are lit by whatever bounces in, so they are not black).

It costs about 5 seconds for a 50,000-vertex piece and ~200 kB in the file.

### If it says there are no meshes

The `.3dm` was saved with **Save Small**, which throws the render meshes away
and keeps only the NURBS surfaces. `rhino3dm` cannot tessellate surfaces on its
own. Ask for the file to be re-saved with Save Small turned off, or for an
`.obj` export instead.

## Checks

```bash
npm run test:cad-to-glb        # builds a .3dm fixture, converts it, validates the .glb
npm run test:vertex-ao         # the occlusion bake, against geometry with a known answer
npm run test:product-3d-viewer # the viewer's own contract
```

## What a good model looks like

- **Under ~3 MB.** Cartier serves their Juste un Clou ring at 2.46 MB. Nothing
  is fetched until a shopper asks for the 3D view, but the wait after they ask
  is theirs.
- **No baked lighting in any texture.** The viewer lights the scene; highlights
  painted into a texture read as dirt.
- **A sensible layer scheme in the CAD file.** Layer names are the only thing
  telling the converter which parts are stones, so `Diamond 0.30ct` earns its
  keep over `Layer 04`.

## Sources

<!-- One entry per committed model: file, origin, licence, and what it depicts. -->

- `sr-0084.glb`
  - Source: `SR 0084 remesh logo.3dm`, Maris in-house CAD (kept in `cad-source/`, not committed)
  - Converted with: `npm run cad:glb -- "cad-source/SR 0084 remesh logo.3dm" --sku "SR 0084" --metal gold-white-14k-polished --gem diamond`
  - The piece is 14k white gold with a diamond. Note that white gold is normally
    rhodium plated, and the plating is what a customer actually sees - if these
    pieces are plated, `--metal rhodium-polished` is the truer material.
  - 1,244,538 triangles in the .3dm, 90,000 in the .glb, 2.27 MB
  - Currently wired as the development stand-in, because SR 0084 is not in the
    published catalogue. Once it is, add its row to `PRODUCT_MODELS` and give the
    stand-in back to whichever piece ships first.
