# Environment Maps

The product 3D viewer lights every piece with an environment map rather than
with lamps. On a polished metal what a shopper sees is the room reflected in the
shank, so the room is the lighting: change this file and every piece in the
catalogue changes character at once.

## In use

- `maris-studio.hdr` - **generated, not photographed.** Rebuild it with
  `npm run env:studio`; the light rig lives in `scripts/make-studio-hdr.mjs`.
  - 1024 x 512, seven panels over a soft fill, **121 kB**
  - No third-party licence attached to it, which is the point: the two
    photographed candidates that came before it were a Poly Haven studio (CC0,
    fine to ship) and a Maverick library softbox (RandomControl's own asset,
    redistribution unverified). Generating the room settles the question and
    makes it smaller.

### Matched against Cartier's own map

Their viewer embeds its environment inside the `.glb`, as raw half-float. Read
out of `B4225700` it measures:

| | Cartier | `maris-studio.hdr` |
| --- | --- | --- |
| size | 1024 x 512 | 1024 x 512 |
| peak | 40.0 | 39.0 |
| mean | 0.89 | 0.86 |
| contrast | 45x | 45x |
| area brighter than 2.0 | 3.64% | 3.33% |

The shape of that profile is the lesson: **the average is ordinary and the peak
is enormous.** Their sources are three and a half times brighter than anything
this rig had before and cover only a thirty-fifth of the sphere. Small and
fierce, not large and mild - a highlight has to survive the tone mapper as a
highlight, and a wide gentle panel just lifts everything towards white.

Reproduce it with `--gain 3.5 --spread 0.45 --fill 0.40`.

### What was learned tuning it

Three things, in the order they mattered.

1. **Resolution decides how sharp the metal looks, not the light shape.** The
   same rig at 512 wide renders a satin shank; at 1024 the highlights have
   edges. three prefilters the environment into a roughness pyramid, and a
   coarse source has nothing sharp left in its top level. Cartier ships 1024 x
   512 too.
2. **A room needs several separated panels.** A shank is a curved mirror that
   sweeps most of the upper hemisphere along its length; with two or three
   sources it finds long stretches with nothing to reflect and goes dull.
3. **The fill must not be low.** Dropping it to 0.10 brings back the wide black
   bands that a photographed room causes.

Contrast ratio alone is a poor guide and was misleading twice. Maverick's `_nb`
maps measure 408x and render the piece almost black - the ratio climbs because
the average collapses, and polished metal spends most of its surface reflecting
that average. Peak, mean and coverage together are what describe a room.

### Paired settings

`exposure: 1.3` in `app/lib/product-3d-models.js`. The two move together, and
getting this wrong is what a flat-looking piece usually is: raise the exposure
past what the environment wants and every gradation on the metal is pushed into
the tone mapper's shoulder and compressed to white. The detail is still there -
drop the exposure to 0.5 and it reappears - it is simply being clipped.

## Known limit

The metal is bright and clean but not mirror-crisp the way a path-traced
reference is. three's image-based lighting goes through a prefiltered pyramid
whose top level is limited, so a perfect mirror is not on offer through the
standard material. Sampling the environment directly along the reflection
vector - the same thing `diamond-material.js` already does for stones - would
close most of it.
