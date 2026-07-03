import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function readSource(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

const files = {
  homepage: await readSource("../app/page.js"),
  siteHeader: await readSource("../app/components/SiteHeader.jsx"),
  routePage: await readSource("../app/design-your-ring/page.js"),
  client: await readSource("../app/design-your-ring/DesignYourRingClient.jsx"),
  css: await readSource("../assets/css/design-your-ring.css"),
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
assert.match(files.routePage, /Design Your Ring/);
assert.match(files.routePage, /dynamic\s*=\s*["']force-dynamic["']/);
assert.match(files.routePage, /DesignYourRingClient/);

for (const step of ["Style", "Stone / Diamond", "Metal", "Ring Customize", "Review", "Submit Custom Order"]) {
  assert.match(files.client, new RegExp(step.replace("/", "\\/")), `Wizard should include ${step}`);
}

for (const option of ["Solitaire", "Pavé", "Halo", "Hidden Halo", "Side Stone", "Natural"]) {
  assert.match(files.client, new RegExp(option), `Style option should include ${option}`);
}

for (const shape of ["Round", "Oval", "Pear", "Emerald", "Princess", "Marquise", "Heart", "Radiant", "Cushion", "Baguette"]) {
  assert.match(files.client, new RegExp(shape), `Stone shape option should include ${shape}`);
}

assert.match(files.client, /DESIGN-YOUR-RING/);
assert.match(files.client, /Choose your ring style/);
assert.doesNotMatch(files.client, /Choose the ring silhouette/);
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
assert.match(files.client, /Customer Account \/ Email/);
assert.doesNotMatch(files.client, /function\s+RingPreview/, "Design Your Ring should not render a visual ring preview component");
assert.doesNotMatch(files.client, /<RingPreview\b/, "Design Your Ring should not include ring preview placements");
assert.doesNotMatch(files.css, /\.ring-preview\b/, "Design Your Ring CSS should not include unused ring preview styles");

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
assert.match(files.css, /#00493a/i);
assert.match(files.css, /@media\s*\(max-width:\s*768px\)/);
assert.match(files.layout, /design-your-ring\.css/);

const packageJson = JSON.parse(files.packageJson);
assert.equal(packageJson.scripts["test:design-your-ring"], "node scripts/test-design-your-ring.mjs");

console.log("Design Your Ring contract passed.");
