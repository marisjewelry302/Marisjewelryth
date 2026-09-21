import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

import { normalizeProductCode, resolveProductModel } from "../app/lib/product-3d-models.js";

async function readSource(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

const files = {
  viewer: await readSource("../app/product/[slug]/Product3DViewer.jsx"),
  gemShader: await readSource("../app/product/[slug]/diamond-material.js"),
  envSources: await readSource("../assets/env/SOURCES.md"),
  gallery: await readSource("../app/product/[slug]/ProductGallery.jsx"),
  page: await readSource("../app/product/[slug]/product-slug-page.js"),
  models: await readSource("../app/lib/product-3d-models.js"),
  assetsRoute: await readSource("../app/assets/[...path]/route.js"),
  css: await readSource("../assets/css/product.css"),
  packageJson: await readSource("../package.json")
};

// The viewer is opt-in per SKU, decided on the server, so a piece without a
// model ships a page with no renderer in it at all.
assert.match(files.page, /resolveProductModel\(product\.sku\)/);
assert.match(files.page, /model=\{productModel\}/);
// The realtime model leads the sheet only when no rendered turntable does; see
// scripts/test-product-turntable.mjs for the other half of that order.
assert.match(files.gallery, /const show3d = !showTurntable && Boolean\(model\) && !modelFailed/);
assert.match(files.gallery, /onUnavailable=\{handleModelUnavailable\}/);
assert.match(files.gallery, /index === 0 && !showHeroMedia \? " is-hero" : ""/, "photography leads the mosaic only when nothing else does");

assert.equal(resolveProductModel("", { allowPreviewPlaceholder: true }), null);
assert.equal(resolveProductModel("SR 0086 ER", { allowPreviewPlaceholder: false }), null, "an unlisted SKU has no model in production");
assert.equal(normalizeProductCode("  sr  0086   er "), "SR 0086 ER");

const placeholder = resolveProductModel("SR 0086 ER", { allowPreviewPlaceholder: true });
assert.equal(placeholder.isPreviewPlaceholder, true);
assert.match(placeholder.url, /\.glb$/);
await access(new URL(`..${placeholder.url.replace("/assets/", "/assets/")}`, import.meta.url));
assert.ok(placeholder.views.length >= 3, "the viewer ships preset camera angles, not just a free orbit");

// The opening angle looks down on the piece. Level with the stone is the one
// angle at which a brilliant cut reads as grey glass.
const openingView = placeholder.views[0];
assert.ok(openingView.phi < 1, `the default view should look down on the piece, got phi ${openingView.phi}`);
placeholder.views.forEach((view) => {
  assert.ok(typeof view.theta === "number" && typeof view.phi === "number", `${view.id} needs a spherical position`);
  assert.ok(view.phi > 0 && view.phi < Math.PI, `${view.id} polar angle must stay off the poles`);
});

// Three.js must stay out of the product route's initial bundle: it is imported
// only after a shopper asks for the 3D view.
assert.doesNotMatch(files.viewer, /^import \* as THREE from "three"/m);
assert.doesNotMatch(files.viewer, /^import \{ GLTFLoader \}/m);
assert.match(files.viewer, /await Promise\.all\(\[\s*import\("three"\)/);
assert.match(files.gallery, /import Product3DViewer from "\.\/Product3DViewer"/);

// Nothing loads until the invitation is clicked.
assert.match(files.viewer, /if \(!started\) \{/);
assert.match(files.viewer, /setStarted\(true\); setStatus\("loading"\)/);

// Every failure path hands the gallery back to photography rather than leaving
// a dead square on the page.
for (const guard of ["webglcontextlost", "reportUnavailable", "onUnavailable"]) {
  assert.match(files.viewer, new RegExp(guard), `viewer should handle ${guard}`);
}
assert.match(files.viewer, /if \(!model \|\| status === "failed"\) \{\s*return null;/);

// On-demand rendering, and no rendering at all off screen.
assert.match(files.viewer, /const moved = controls\.update\(\);/);
assert.match(files.viewer, /if \(moved \|\| needsRender\)/);
assert.match(files.viewer, /new IntersectionObserver/);
assert.match(files.viewer, /renderer\.setAnimationLoop\(inView \? renderLoop : null\)/);
assert.match(files.viewer, /visibilitychange/);

// Motion preferences and teardown.
assert.match(files.viewer, /prefers-reduced-motion: reduce/);
assert.match(files.viewer, /controls\.autoRotate = !reduceMotion/);
// `environment?.dispose()` rather than `environment.dispose()`: the studio may
// still be in flight when a shopper navigates away.
for (const cleanup of ["controls.dispose()", "environment?.dispose()", "pmremGenerator.dispose()", "renderer.dispose()", "resizeObserver.disconnect()"]) {
  assert.ok(files.viewer.includes(cleanup), `viewer should run ${cleanup} on unmount`);
}
// An environment that arrives after teardown is disposed rather than leaked.
assert.match(files.viewer, /if \(disposed\) \{\s*texture\.dispose\(\);/);

// The look: a photographed studio through PMREM, filmic tonemapping, a contact
// shadow - and a procedural room kept only as the fallback.
assert.match(files.viewer, /PMREMGenerator/);
assert.match(files.viewer, /ACESFilmicToneMapping/);
assert.match(files.viewer, /toneMappingExposure = model\.exposure/);
assert.match(files.viewer, /ShadowMaterial/);
assert.match(files.viewer, /fromEquirectangular/);
assert.match(files.viewer, /RGBELoader/);
assert.match(files.viewer, /environmentRotation\.y = model\.envRotation/);

const environmentUrl = files.viewer.match(/const ENVIRONMENT_URL = "([^"]+)"/)?.[1];
assert.ok(environmentUrl, "the viewer should name its environment map");
assert.match(environmentUrl, /\.hdr$/);
await access(new URL(`..${environmentUrl}`, import.meta.url));
assert.match(files.assetsRoute, /"\.hdr": "image\/vnd\.radiance"/, "the .hdr has to get past the assets allowlist");

// Lighting and backdrop are separate jobs. The environment lights the piece and
// feeds the gem shader; the backdrop is a flat neutral so the tile sits beside
// the photographs. Putting the environment behind the piece instead makes the
// tile a picture of a room, and an `_nb` environment makes it a black one.
assert.match(files.viewer, /scene\.background = new THREE\.Color\(BACKDROP\)/);
assert.doesNotMatch(files.viewer, /scene\.background = texture/, "the environment map is lighting, not scenery");
assert.match(files.viewer, /scene\.environment = texture/);

// The back-facet buffer is read with gl_FragCoord, which counts drawing-buffer
// pixels. Measuring in CSS pixels divides the lookup by the device pixel ratio
// and the stones shade flat white.
assert.match(files.viewer, /renderer\.getDrawingBufferSize\(new THREE\.Vector2\(\)\)/);
assert.doesNotMatch(files.viewer, /renderer\.getSize\(new THREE\.Vector2\(\)\)/, "stone lookups must use drawing-buffer pixels");

// Stones are traced, not transmitted: three's screen-space transmission cannot
// carry light through a brilliant cut, so anything the converter marked
// transmissive is handed to the gem shader instead.
assert.match(files.viewer, /child\.material\?\.transmission > 0/);
assert.match(files.viewer, /createDiamondMaterial/);
assert.match(files.viewer, /readGemSettings/);

// A frame is the back-facet pass and then the scene; anything that renders only
// the second half leaves the stones hollow.
assert.match(files.viewer, /const drawFrame = \(\) => \{\s*renderStones\(\);\s*renderer\.render\(scene, camera\);/);
assert.doesNotMatch(files.viewer, /render: \(\) => renderer\.render/, "the dev handle must draw a whole frame too");

// Five bounces against a stand-in shape, per stone. This is the whole reason a
// cut stone reads as one: Cartier's own diamond material ships rayBounces 5,
// and their stones are a few hundred triangles each because the shader, not the
// geometry, does the work.
const bounces = Number(files.gemShader.match(/const RAY_BOUNCES = (\d+)/)?.[1]);
assert.ok(bounces >= 3 && bounces <= 8, `ray bounces should be several, got ${bounces}`);
assert.match(files.gemShader, /defines: \{ GEM_BOUNCES: RAY_BOUNCES \}/, "the loop bound has to reach the shader");
assert.match(files.gemShader, /Hit hitProxy\(vec3 origin, vec3 direction\)/);
assert.match(files.gemShader, /uCentre|uRadii/);

// One proxy per stone. Fitted over a whole pave band it would send light out of
// the far side of the ring, so the merged gem mesh is split into solids first -
// joined on position, because facets deliberately do not share vertices.
assert.match(files.gemShader, /export function splitIntoSolids/);
assert.match(files.gemShader, /atPosition/, "solids are found by shared position, not shared vertices");
assert.match(files.viewer, /splitIntoSolids\(THREE, mesh\.geometry\)/);
assert.match(files.viewer, /fitProxyToStone\(THREE, uniforms, stone\)/);

// The shader's own contract.
assert.match(files.gemShader, /uBackNormals/);
assert.match(files.gemShader, /directionToEquirect/);
assert.match(files.gemShader, /BackSide/, "the first pass records back facets");
assert.match(files.gemShader, /tonemapping_fragment/, "a raw shader still has to go through the tone mapper");
assert.match(files.gemShader, /colorspace_fragment/);

// Dispersion, when it is switched on, re-traces the same path at two more
// indices of refraction. It is off by default; see the shader for why fringing
// on top of this trace reads as a pinwheel rather than as fire.
assert.match(files.gemShader, /vec3 traceStone\(vec3 incident, vec3 surfaceNormal, vec2 uv, float ior\)/);
assert.match(files.gemShader, /if \(uDispersion > 0\.0005\)/, "no separation asked for means one trace, not three");
assert.match(files.gemShader, /traceStone\(incident, normal, uv, uIor \* \(1\.0 - uDispersion\)\)\.r/);

// The stone's numbers still come from the MatrixGold file by way of the glTF.
for (const uniform of ["uIor", "uDispersion", "uAttenuation", "uSpecularWeight"]) {
  assert.match(files.gemShader, new RegExp(uniform), `the shader should be driven by ${uniform}`);
}
assert.match(files.gemShader, /ior: material\.ior/);
assert.match(files.gemShader, /dispersion: material\.dispersion/);

// Zero by default, matching what Cartier ships. Fringing on top of a single
// bounce reads as a pinwheel, not as fire; it is worth turning on only once the
// trace does more than one bounce.
const gain = Number(files.gemShader.match(/const DISPERSION_GAIN = ([\d.]+)/)?.[1]);
assert.ok(gain >= 0 && gain <= 0.1, `dispersion gain should stay off or nearly off, got ${gain}`);

// The studio's brightness is not scaled up for the stones. Lifting it flatters
// the view down into the stone and clips every side-on view to white.
const gemEnvIntensity = Number(files.gemShader.match(/const DEFAULT_ENV_INTENSITY = ([\d.]+)/)?.[1]);
assert.equal(gemEnvIntensity, 1, "stones read the studio at its own brightness");

// Losing the studio should cost reflections, not the viewer.
assert.match(files.viewer, /RoomEnvironment/);
assert.match(files.viewer, /source: "fallback"/);
assert.match(files.viewer, /data-env=\{envSource\}/);

// Provenance is recorded for whichever environment is actually loaded, and it
// says where that file stands on licensing - some of these are CC0 and some
// come out of a renderer's own library.
const environmentFile = environmentUrl.split("/").pop();
assert.ok(
  files.envSources.includes(environmentFile),
  `assets/env/SOURCES.md should account for ${environmentFile}, the environment the viewer loads`
);
assert.match(files.envSources, /Licence unverified|CC0/, "each environment says where it stands on licensing");

// The assets route serves web content only - a manufacturing file parked under
// assets/ must not be downloadable.
assert.match(files.assetsRoute, /const contentType = getContentType\(filePath\);/);
assert.match(files.assetsRoute, /if \(!contentType\) \{\s*return new Response\("Not found", \{ status: 404 \}\);/);
assert.doesNotMatch(files.assetsRoute, /application\/octet-stream/, "an unknown extension should 404, not go out as octet-stream");

// Keyboard and screen-reader surface.
assert.match(files.viewer, /aria-label=\{`Load the interactive 3D view of \$\{productCode\}`\}/);
assert.match(files.viewer, /aria-pressed=\{view\.id === activeView\}/);
assert.match(files.viewer, /className="sr-only"/);
assert.match(files.viewer, /aria-hidden="true"/);

// Styles exist for every state the component can render.
for (const selector of [".product-3d-stage", ".product-3d-canvas", ".product-3d-invite", ".product-3d-progress", ".product-3d-view.is-active", ".product-3d-hint"]) {
  assert.ok(files.css.includes(selector), `product.css should style ${selector}`);
}
assert.doesNotMatch(files.css.slice(files.css.indexOf(".product-3d")), /:root\s*\{/, "the viewer styles must not re-declare the palette");

// Models are served with their real content type.
assert.match(files.assetsRoute, /"\.glb": "model\/gltf-binary"/);

// A model keeps its filename when it is re-baked, so a long cache behind that
// fixed URL simply hides the new bake - which is exactly what happened the
// first time a re-baked .glb was published: the browser went on showing the
// old one for an hour. Models and environment maps revalidate every time, and
// the ETag turns the unchanged case into a 304.
assert.match(files.assetsRoute, /normalized\.includes\("\/models\/"\) \|\| normalized\.includes\("\/env\/"\)/);
assert.match(files.assetsRoute, /return "public, no-cache";/);
assert.match(files.assetsRoute, /function entityTag\(fileStats\)/);
assert.match(files.assetsRoute, /request\.headers\.get\("if-none-match"\) === etag/);
assert.match(files.assetsRoute, /status: 304/);
assert.match(files.assetsRoute, /export async function GET\(request, context\)/);

assert.match(files.packageJson, /"test:product-3d-viewer": "node scripts\/test-product-3d-viewer\.mjs"/);

console.log("Product 3D viewer contract checks passed.");
