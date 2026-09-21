import assert from "node:assert/strict";

import { bakeVertexOcclusion } from "./vertex-ao.mjs";

// A flat sheet in the z = height plane, facing up, cut into a grid so there are
// vertices in the middle of it and not only at its corners. The middle is the
// interesting part: a corner always sees a lot of sky.
function sheet(height, half, divisions) {
  const position = [];
  const normal = [];
  const index = [];
  const step = (half * 2) / divisions;

  for (let row = 0; row <= divisions; row += 1) {
    for (let column = 0; column <= divisions; column += 1) {
      position.push(-half + column * step, -half + row * step, height);
      normal.push(0, 0, 1);
    }
  }

  for (let row = 0; row < divisions; row += 1) {
    for (let column = 0; column < divisions; column += 1) {
      const a = row * (divisions + 1) + column;
      const b = a + 1;
      const c = a + divisions + 1;
      const d = c + 1;
      index.push(a, c, b, b, c, d);
    }
  }

  return {
    position: new Float32Array(position),
    normal: new Float32Array(normal),
    index: new Uint32Array(index)
  };
}

const ground = sheet(0, 0.5, 8);
// Wide enough to cover the whole of the ground, and close enough over it that
// the gap is small next to the reach of a ray.
const lid = sheet(0.04, 2, 2);

const centre = Math.floor((8 + 1) * (8 + 1) / 2);

// Nothing above it: every ray escapes.
const open = bakeVertexOcclusion([ground], [ground], { rays: 32 }).occlusion[0];
assert.ok(
  open.every((value) => value > 0.999),
  `a sheet on its own should be fully open, darkest was ${Math.min(...open)}`
);

// A lid right over it: nothing escapes, so the floor is what is left.
const shut = bakeVertexOcclusion([ground], [ground, lid], { rays: 32, floor: 0.35 }).occlusion[0];
assert.ok(
  shut[centre] < 0.36,
  `a covered vertex should sit on the floor, got ${shut[centre]}`
);
assert.ok(
  shut.every((value) => value >= 0.35 - 1e-6 && value <= 1 + 1e-6),
  "occlusion must stay inside the floor and full daylight"
);

// The floor is a floor, not a fixed offset: at zero it goes all the way down.
const unfloored = bakeVertexOcclusion([ground], [ground, lid], { rays: 32, floor: 0 }).occlusion[0];
assert.ok(unfloored[centre] < 0.01, `with no floor a covered vertex should reach 0, got ${unfloored[centre]}`);

// Reach is real. Occlusion is meant to be local: something far enough away must
// stop counting, or a ring's far side shadows its near side and the piece goes
// evenly grey instead of gaining creases.
const brief = bakeVertexOcclusion([ground], [ground, lid], { rays: 32, reach: 0.005, floor: 0 }).occlusion[0];
assert.ok(brief[centre] > 0.9, `a ray that stops short of the lid should see sky, got ${brief[centre]}`);

// One value per vertex, in the order the parts were given.
const pair = bakeVertexOcclusion([ground, lid], [ground, lid], { rays: 16 });
assert.equal(pair.occlusion.length, 2);
assert.equal(pair.occlusion[0].length, ground.position.length / 3);
assert.equal(pair.occlusion[1].length, lid.position.length / 3);

// A vertex must not shadow itself on the triangles it belongs to. Without the
// bias that lifts the ray off the surface, every vertex comes back black.
const alone = bakeVertexOcclusion([ground], [ground], { rays: 64, floor: 0 }).occlusion[0];
assert.ok(Math.min(...alone) > 0.99, `self-shadowing at the origin vertex, darkest ${Math.min(...alone)}`);

// The stones are shaded by their own material and light goes through them, so
// the converter leaves them out of what it darkens - but they still block.
const converter = await (await import("node:fs/promises")).readFile(
  new URL("./cad-to-glb.mjs", import.meta.url),
  "utf8"
);
assert.match(converter, /const shaded = parts\.filter\(\(part\) => !part\.name\.startsWith\("gem-"\)\);/);
assert.match(converter, /parts\.map\(\(part\) => part\.geometry\),/);

console.log("Vertex occlusion checks passed.");
