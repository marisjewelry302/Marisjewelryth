# Turntables

A turntable is a ring of rendered stills, one every few degrees around the
piece, played back under the pointer. It gives up free orbit and free zoom; in
exchange it looks exactly as good as the renderer that made it, which for a
stone-led catalogue is the trade worth making. No browser is going to
path-trace a brilliant cut. Maverick already does.

## What to render

One folder per piece, named after the SKU in lower kebab case:
`assets/turntable/sr-0084/`.

| | |
| --- | --- |
| **Frames** | 36, one every 10 degrees, all the way round |
| **Axis** | the piece turns about its own vertical axis; the camera stays put |
| **Size** | 1200 x 1200, square |
| **Format** | `.webp`, quality around 82. `.png` works and is four times the size |
| **Naming** | `0001.webp` … `0036.webp`, zero padded to four |
| **Background** | transparent if the renderer will do it; otherwise a flat `#e9e8e5`, which is what the page sits on |
| **Between frames** | nothing may change but the rotation - same camera, same lighting, same exposure, same crop |

The last row is the one that shows if it slips. A camera that drifts by a pixel
or a light that moves between frames reads as a wobble, and a wobble is the one
artefact a turntable cannot hide.

Aim for 80-120 kB a frame. Thirty-six of those is around 4 MB, which is why
nothing loads until a shopper asks for it, and why the first six arrive before
the rest.

## Adding one

1. Render the frames into `assets/turntable/<sku>/`.
2. `npm run check:turntable -- sr-0084` - it verifies the sequence is complete,
   evenly sized, and square, and reports the total weight.
3. Add the row it prints to `PRODUCT_TURNTABLES` in
   `app/lib/product-turntables.js`.

A piece with a turntable leads its gallery with it. A piece without falls back
to the realtime 3D model, and then to photography - see
`app/product/[slug]/ProductGallery.jsx`.

If the piece turns the wrong way under the pointer, set `reverse: true` on its
row rather than re-rendering.

## Sources

<!-- One entry per turntable: which SKU, rendered by whom, in what, when. -->

- _(none yet)_
