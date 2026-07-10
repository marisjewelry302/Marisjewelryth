import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function readSource(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

const sources = {
  global: await readSource("../assets/css/style.css"),
  siteHeader: await readSource("../assets/css/site-header.css"),
  engagementRing: await readSource("../assets/css/engagement-ring.css"),
  placeholder: await readSource("../assets/css/placeholder.css"),
  adminAsset: await readSource("../assets/css/admin.css"),
  adminApp: await readSource("../app/admin/admin.css"),
  adminLogin: await readSource("../app/admin/login/login.module.css"),
  designYourRing: await readSource("../assets/css/design-your-ring.css"),
  customerEmail: await readSource("../app/lib/customer-email.js"),
  customOrderEmail: await readSource("../app/lib/custom-order-email.js"),
  layout: await readSource("../app/layout.js"),
  homepage: await readSource("../app/page.js"),
  bestSeller: await readSource("../app/BestSellerSection.jsx")
};

assert.match(
  sources.layout,
  /family=Anuphan:[^"]+family=Urbanist:/,
  "Root layout should keep loading Urbanist with Anuphan fallback glyph coverage."
);

for (const [token, source] of [
  ["--maris-font-sans", sources.global],
  ["--maris-font-thai", sources.global],
  ["--maris-font-display", sources.global],
  ["--maris-font-body", sources.global],
  ["--maris-font-thai", sources.siteHeader],
  ["--maris-font-thai", sources.engagementRing],
  ["--maris-font-thai", sources.placeholder],
  ["--maris-font-thai", sources.adminAsset],
  ["--maris-font-thai", sources.adminApp]
]) {
  assert.match(
    source,
    new RegExp(`${token}:\\s*"Urbanist",\\s*"Anuphan"`),
    `${token} should prefer Urbanist before any fallback.`
  );
}

assert.match(
  sources.adminLogin,
  /font-family:\s*var\(--maris-font-sans/,
  "Admin login should use the shared Maris font token."
);
assert.match(
  sources.designYourRing,
  /font-family:\s*var\(--maris-font-(sans|display)/,
  "Design Your Ring should use shared Maris font tokens."
);

const legacySerifPattern = /font-family:\s*(?:Georgia|Arial|["']Times New Roman["'])/;
for (const [name, source] of Object.entries(sources)) {
  if (name === "layout") {
    continue;
  }

  assert.doesNotMatch(
    source,
    legacySerifPattern,
    `${name} should not override Maris typography with legacy serif/system families.`
  );
}

const sharedHomeHeadingStyles = sources.global.match(
  /\.shop-category-head h2,\s*\.best-seller-head h2,\s*\.atelier-reveal__focus h3\s*\{([\s\S]*?)\n\}/
)?.[1] ?? "";

for (const declaration of [
  "color: oklch(18% 0.03 76);",
  "font-family: var(--maris-font-display);",
  "font-size: clamp(36px, 3.7vw, 58px);",
  "font-weight: 400;",
  "letter-spacing: 0.08em;",
  "line-height: 1;",
  "text-transform: uppercase;"
]) {
  assert.ok(
    sharedHomeHeadingStyles.includes(declaration),
    `Best Seller and New arrival headings should share Shop By Category declaration: ${declaration}`
  );
}

assert.match(
  sources.global,
  /\.shop-category-head span,\s*\.best-seller-head span,\s*\.atelier-reveal__heading-rule\s*\{[\s\S]*?width:\s*112px;[\s\S]*?height:\s*2px;[\s\S]*?background:\s*var\(--maris-gold\);[\s\S]*?\n\}/,
  "Best Seller and New arrival headings should use the same gold rule as Shop By Category."
);
assert.match(
  sources.bestSeller,
  /<span aria-hidden="true" \/>/,
  "Best Seller heading should render the same decorative rule element as Shop By Category."
);
assert.match(
  sources.homepage,
  /<span className="atelier-reveal__heading-rule" aria-hidden="true" \/>/,
  "New arrival heading should render the same decorative rule element as Shop By Category."
);

console.log("PASS: Site typography uses Urbanist through shared Maris font tokens.");
