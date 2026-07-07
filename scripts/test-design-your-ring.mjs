import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

async function readSource(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

const files = {
  homepage: await readSource("../app/page.js"),
  siteHeader: await readSource("../app/components/SiteHeader.jsx"),
  siteFooter: await readSource("../app/components/SiteFooter.jsx"),
  routePage: await readSource("../app/design-your-ring/page.js"),
  client: await readSource("../app/design-your-ring/DesignYourRingClient.jsx"),
  css: await readSource("../assets/css/design-your-ring.css"),
  modelSources: await readSource("../assets/models/design-your-ring/SOURCES.md"),
  layout: await readSource("../app/layout.js"),
  requests: await readSource("../app/lib/custom-order-requests.js"),
  email: await readSource("../app/lib/custom-order-email.js"),
  account: await readSource("../app/account/AccountClient.jsx"),
  adminPage: await readSource("../app/admin/page.js"),
  adminJs: await readSource("../assets/js/admin-page.js"),
  adminRoute: await readSource("../app/api/admin/custom-order-requests/route.js"),
  database: await readSource("../app/lib/maris-database.js"),
  packageJson: await readSource("../package.json")
};

assert.match(files.homepage, /href="\/design-your-ring"[\s\S]*Design Your Ring/, "homepage should include a visible Design Your Ring entry link");
assert.match(files.siteHeader, /href:\s*"\/design-your-ring",\s*label:\s*"Design Your Ring"/);
assert.match(files.siteFooter, /normalizedPathname\s*===\s*"\/design-your-ring"/, "Design Your Ring should use an immersive no-footer shell");
assert.match(files.routePage, /Design Your Ring/);
assert.match(files.routePage, /dynamic\s*=\s*["']force-dynamic["']/);
assert.match(files.routePage, /DesignYourRingClient/);

for (const step of ["Metal", "Stone", "Band", "Engrave", "Review"]) {
  assert.match(files.client, new RegExp(step.replace("/", "\\/")), `Wizard should include ${step}`);
}

for (const option of ["Solitaire", "Pavé", "Halo", "Hidden Halo", "Side Stone", "Natural"]) {
  assert.match(files.client, new RegExp(option), `Style option should include ${option}`);
}

for (const shape of ["Round", "Oval", "Pear", "Emerald", "Princess", "Marquise", "Heart", "Radiant", "Cushion", "Baguette"]) {
  assert.match(files.client, new RegExp(shape), `Stone shape option should include ${shape}`);
}

assert.match(files.client, /OPTION_IMAGE_BASE/);
assert.match(files.client, /design-ring-option-media/);
assert.match(files.client, /imageSrc:\s*optionImage/);
assert.match(files.css, /design-ring-option-media/);

for (const assetName of ["metal-platinum", "stone-round", "band-classic"]) {
  assert.match(files.client, new RegExp(`optionImage\\("${assetName}"\\)`));
  await access(new URL(`../assets/images/design-your-ring/options/${assetName}.webp`, import.meta.url));
}

assert.match(files.client, /DESIGN-YOUR-RING/);
assert.match(files.client, /Design first, consult next/);
assert.match(files.client, /Create a private ring brief for a Maris consultation/);
assert.match(files.client, /design-ring-atelier-mark/);
assert.match(files.client, /design-ring-topbar-actions/);
assert.match(files.client, /design-ring-mobile-progress/);
assert.match(files.client, /design-ring-tray-current/);
assert.match(files.client, /design-ring-tab-hint/);
assert.match(files.client, /design-ring-summary-note/);
assert.match(files.client, /design-ring-review-note/);
assert.match(files.client, /Your Design/);
assert.match(files.client, /Save Design/);
assert.match(files.client, /Request Consultation/);
assert.match(files.client, /Your design is saved/);
assert.match(files.client, /DESIGN_RING_DRAFT_KEY/);
assert.match(files.client, /\/api\/account\/me/);
assert.match(files.client, /\/api\/custom-order-requests/);
assert.match(files.client, /\/account\?mode=signin&next=\/design-your-ring/);
assert.match(files.client, /\/account\?mode=signup&next=\/design-your-ring/);
assert.match(files.client, /localStorage\.setItem\(DESIGN_RING_DRAFT_KEY/);
assert.match(files.client, /localStorage\.removeItem\(DESIGN_RING_DRAFT_KEY/);
assert.match(files.client, /engraving_text/);
assert.match(files.client, /maxLength=\{40\}/);
assert.match(files.client, /ring_design/);
assert.match(files.client, /Contact number/);
assert.match(files.client, /function\s+ToolRail/);
assert.match(files.client, /function\s+RingPreviewStudio/);
assert.match(files.client, /function\s+InteractiveRingPreview/);
assert.match(files.client, /function\s+DesignSummary/);
assert.match(files.client, /function\s+BottomOptionTray/);
assert.match(files.client, /<RingPreviewStudio\b/);
assert.match(files.client, /<DesignSummary\b/);
assert.match(files.client, /<BottomOptionTray\b/);
assert.match(files.client, /<InteractiveRingPreview\b/);
assert.match(files.client, /PREVIEW_IMAGE_BASE/);
assert.match(files.client, /function\s+PhotorealRingPreview/);
assert.match(files.client, /getPreviewBandLayer/);
assert.match(files.client, /getPreviewStoneLayer/);
assert.match(files.client, /getPreviewSettingLayer/);
assert.match(files.client, /design-ring-photoreal-preview/);
assert.match(files.client, /design-ring-preview-band-image/);
assert.match(files.client, /design-ring-preview-stone-image/);
assert.match(files.client, /design-ring-preview-setting-image/);
for (const assetName of [
  "shadow-soft",
  "band-classic-platinum",
  "band-halo-rose-gold",
  "band-pave-yellow-gold",
  "band-side-stone-white-gold",
  "setting-platinum",
  "setting-rose-gold",
  "stone-round",
  "stone-pear",
  "stone-emerald"
]) {
  await access(new URL(`../assets/images/design-your-ring/preview/${assetName}.svg`, import.meta.url));
}
assert.match(files.client, /import\s+\*\s+as\s+THREE\s+from\s+"three"/);
assert.match(files.client, /GLTFLoader/, "3D preview should use downloaded GLB geometry for the center stone");
assert.match(files.client, /STONE_MODEL_SOURCE/);
assert.match(files.client, /diamond\.glb/);
assert.match(files.client, /createImportedStoneModel/);
await access(new URL("../assets/models/design-your-ring/stones/diamond.glb", import.meta.url));
assert.match(files.modelSources, /drcmda\/the-substance/);
assert.match(files.modelSources, /MIT License/);
assert.match(files.client, /RoomEnvironment/, "3D preview should use an environment for realistic metal and diamond reflections");
assert.match(files.client, /useRef/);
assert.match(files.client, /new THREE\.WebGLRenderer\(\{\s*canvas,\s*alpha:\s*true/);
assert.match(files.client, /renderer\.setClearColor\(0x000000,\s*0\)/);
assert.match(files.client, /THREE\.ACESFilmicToneMapping/, "3D preview should use filmic tone mapping for jewelry-style highlights");
assert.match(files.client, /renderer\.toneMappingExposure/, "3D preview should tune exposure instead of relying on flat colors");
assert.match(files.client, /new THREE\.PMREMGenerator/, "3D preview should prefilter environment reflections");
assert.match(files.client, /new THREE\.TubeGeometry/, "Ring shank should be modeled from curved tubes instead of a toy torus");
assert.match(files.client, /new THREE\.CatmullRomCurve3/, "Ring shank and shoulders should use shaped curves");
assert.match(files.client, /new THREE\.MeshPhysicalMaterial/);
assert.match(files.client, /transmission:\s*0\.[6-9]/, "Diamond material should be transparent enough to read as gemstone");
assert.match(files.client, /envMapIntensity/, "Jewelry materials should react to the environment map");
assert.match(files.client, /design-ring-3d-preview/);
assert.match(files.client, /design-ring-3d-canvas/);
assert.match(files.client, /data-metal=\{selectedMetal\?\.swatch/);
assert.match(files.client, /data-stone=\{stoneSlug/);
assert.match(files.client, /data-band=\{bandSlug/);
assert.doesNotMatch(files.client, /RING_PREVIEW_SRC/, "Preview should be a live configurable model, not a fixed catalogue image");
assert.match(files.client, /360/);
assert.match(files.client, /Fullscreen/);
assert.doesNotMatch(files.client, /Buy Now|Checkout|Add to Cart|Payment/i, "Design Your Ring should stay consultation-led, not ecommerce");
assert.doesNotMatch(files.client, /[\u0E00-\u0E7F]/, "Design Your Ring UI copy should remain English-only");

assert.match(files.requests, /RING_STYLES/);
assert.match(files.requests, /STONE_SHAPES/);
assert.match(files.requests, /ringDesign/);
assert.match(files.requests, /engraving_enabled/);
assert.match(files.requests, /metadata:\s*\{[\s\S]*ringDesign/);
assert.match(files.requests, /style: order\.ringDesign\.style/);
assert.match(files.requests, /stoneShape: order\.ringDesign\.stoneShape/);
assert.match(files.requests, /Engraving text is required/);

assert.match(files.email, /Style:/);
assert.match(files.email, /Stone shape:/);
assert.match(files.email, /Engraving:/);

assert.match(files.account, /safeNextPath/);
assert.match(files.account, /window\.location\.assign\(safeNextPath\)/);

assert.match(files.adminPage, /data-admin-tab="custom-requests"/);
assert.match(files.adminPage, /data-custom-requests-table/);
assert.match(files.adminJs, /customRequestsTable/);
assert.match(files.adminJs, /\/api\/admin\/custom-order-requests/);
assert.match(files.adminRoute, /readAdminCustomOrderRequests/);
assert.match(files.database, /readAdminCustomOrderRequests/);
assert.match(files.database, /normalizeCustomOrderRequest/);

assert.match(files.css, /design-ring-page/);
assert.match(files.css, /design-ring-configurator/);
assert.match(files.css, /design-ring-tool-rail/);
assert.match(files.css, /design-ring-preview-studio/);
assert.match(files.css, /design-ring-photoreal-preview/);
assert.match(files.css, /design-ring-preview-layer/);
assert.match(files.css, /design-ring-preview-band-image/);
assert.match(files.css, /design-ring-preview-stone-image/);
assert.match(files.css, /design-ring-preview-setting-image/);
assert.match(files.css, /design-ring-3d-preview/);
assert.match(files.css, /design-ring-3d-canvas/);
assert.match(files.css, /background:\s*transparent/);
assert.match(files.css, /data-metal="yellow-gold"/);
assert.match(files.css, /data-stone="pear"/);
assert.match(files.css, /data-band="halo"/);
assert.match(files.css, /design-ring-summary-panel/);
assert.match(files.css, /design-ring-atelier-mark/);
assert.match(files.css, /design-ring-topbar-actions/);
assert.match(files.css, /design-ring-mobile-progress/);
assert.match(files.css, /design-ring-tray-current/);
assert.match(files.css, /design-ring-tab-hint/);
assert.match(files.css, /design-ring-summary-note/);
assert.match(files.css, /design-ring-review-note/);
assert.match(files.css, /position:\s*sticky/);
assert.match(files.css, /design-ring-bottom-tray/);
assert.match(files.css, /#00493a/i);
assert.match(files.css, /@media\s*\(max-width:\s*1100px\)/);
assert.match(files.css, /@media\s*\(max-width:\s*768px\)/);
assert.match(files.layout, /design-your-ring\.css/);

const packageJson = JSON.parse(files.packageJson);
assert.equal(packageJson.scripts["test:design-your-ring"], "node scripts/test-design-your-ring.mjs");
assert.match(packageJson.dependencies.three, /^\^/);

console.log("Design Your Ring contract passed.");
