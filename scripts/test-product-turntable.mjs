import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { resolveProductTurntable, turntableFolder, PRODUCT_TURNTABLES } from "../app/lib/product-turntables.js";

async function readSource(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

const files = {
  viewer: await readSource("../app/product/[slug]/ProductTurntable.jsx"),
  gallery: await readSource("../app/product/[slug]/ProductGallery.jsx"),
  page: await readSource("../app/product/[slug]/product-slug-page.js"),
  library: await readSource("../app/lib/product-turntables.js"),
  checker: await readSource("./check-turntable.mjs"),
  readme: await readSource("../assets/turntable/README.md"),
  css: await readSource("../assets/css/product.css"),
  packageJson: await readSource("../package.json")
};

// Opt-in per SKU and decided on the server, the same as the 3D model. A piece
// with no turntable ships a page with no turntable code path taken.
assert.equal(resolveProductTurntable("SR 9999"), null);
assert.equal(resolveProductTurntable(""), null);
assert.match(files.page, /resolveProductTurntable\(product\.sku\)/);
assert.match(files.page, /turntable=\{productTurntable\}/);

// Frame paths are built from the manifest, so a mis-set pad or format shows up
// as a 404 wall rather than a quiet wrong-file.
const sample = resolveProductTurntable(
  Object.keys(PRODUCT_TURNTABLES)[0] || "SR 0000"
) || (() => {
  // Nothing listed yet is the expected state before the first render lands;
  // exercise the builder directly so the shape is still covered.
  PRODUCT_TURNTABLES["TEST 0001"] = { frames: 12, format: "webp", pad: 4 };
  const built = resolveProductTurntable("TEST 0001");
  delete PRODUCT_TURNTABLES["TEST 0001"];
  return built;
})();

assert.ok(sample.frames.length >= 12, "a turntable needs enough frames to read as a turn");
assert.match(sample.frames[0], /\/assets\/turntable\/[a-z0-9-]+\/0*1\.(webp|png|jpg)$/);
assert.equal(new Set(sample.frames).size, sample.frames.length, "frame paths must be distinct");
assert.equal(turntableFolder("SR 0084"), "sr-0084");
assert.ok(sample.previewStride >= 2, "a coarse pass has to come before the full set");

// The order the gallery prefers: a rendered turntable, then the realtime model,
// then photography. Each one steps aside when it cannot run.
assert.match(files.gallery, /const showTurntable = Boolean\(turntable\) && !turntableFailed/);
assert.match(files.gallery, /const show3d = !showTurntable && Boolean\(model\) && !modelFailed/);
assert.match(files.gallery, /index === 0 && !showHeroMedia \? " is-hero" : ""/);
assert.match(files.gallery, /onUnavailable=\{handleTurntableUnavailable\}/);
assert.match(files.viewer, /if \(!turntable \|\| status === "failed"\) \{\s*return null;/);

// Nothing is fetched until a shopper asks for it - a turntable is several
// megabytes and most visitors will not turn it.
assert.match(files.viewer, /if \(!started \|\| !turntable\)/);
assert.match(files.viewer, /setStarted\(true\); setStatus\("loading"\)/);

// A sparse pass first, and the nearest loaded frame stands in for a gap, so a
// half-loaded sequence still turns instead of stalling.
assert.match(files.viewer, /i \+= previewStride/);
assert.match(files.viewer, /if \(!framesRef\.current\[wrapped\]\)/);

// Losing the first frame means the sequence is not there; losing one in the
// middle is a gap the fallback covers.
assert.match(files.viewer, /if \(index === 0\) \{\s*if \(!cancelled\) reportUnavailable\(\);/);

// A refused pointer capture must not take dragging down with it. It did, and
// the whole turn was dead until the call was wrapped.
assert.match(files.viewer, /const capture = \(event, take\) => \{\s*try \{/);
assert.match(files.viewer, /capture\(event, true\);\s*dragRef\.current = \{ x: event\.clientX/);

// The drag is measured from where it started, so a long turn cannot drift.
assert.match(files.viewer, /dragRef\.current\.index \+ turnBy\(event\.clientX - dragRef\.current\.x\)/);

// Reachable without a pointer, and it says what it is.
assert.match(files.viewer, /event\.key !== "ArrowLeft" && event\.key !== "ArrowRight"/);
assert.match(files.viewer, /role="img"/);
assert.match(files.viewer, /aria-label=\{label\}/);
assert.match(files.viewer, /prefers-reduced-motion: reduce/);

// Vertical scrolling still belongs to the page on a phone; only the horizontal
// axis is the turntable's.
assert.match(files.css, /\.product-turntable-canvas \{[\s\S]*?touch-action: pan-y;/);

// The checker reads the padding off the filename. Reading it off the parsed
// number reports 1 for `0001` and sends the viewer looking for `1.png`.
assert.match(files.checker, /Read the padding off the filename, not off the parsed number/);
assert.match(files.checker, /entries\[0\]\.match\(\/\(\\d\+\)\//);

// What to render is written down, because it is someone else's job.
for (const detail of ["36", "1200", "webp", "0001", "same camera"]) {
  assert.ok(files.readme.includes(detail), `the turntable README should state ${detail}`);
}

assert.match(files.packageJson, /"check:turntable": "node scripts\/check-turntable\.mjs"/);

console.log("Product turntable contract checks passed.");
