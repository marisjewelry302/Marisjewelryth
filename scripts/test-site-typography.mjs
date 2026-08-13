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
  /import \{ Anuphan, Urbanist \} from "next\/font\/google"/,
  "Root layout should self-host Urbanist with Anuphan fallback glyph coverage through next/font."
);
assert.doesNotMatch(
  sources.layout,
  /fonts\.googleapis\.com|fonts\.gstatic\.com/,
  "Root layout must not reach out to Google Fonts at runtime."
);
for (const token of ["--font-urbanist", "--font-anuphan"]) {
  assert.match(
    sources.layout,
    new RegExp(`variable:\\s*"${token}"`),
    `Root layout should expose ${token} for the Maris font tokens to resolve through.`
  );
}
assert.match(
  sources.layout,
  /className=\{`notranslate \$\{urbanist\.variable\} \$\{anuphan\.variable\}`\}/,
  "Both font variables must be mounted on <html> or the tokens resolve to nothing."
);

const FONT_TOKENS = ["--maris-font-sans", "--maris-font-thai", "--maris-font-display", "--maris-font-body"];
const prefersUrbanist = (token) =>
  new RegExp(`${token}:\\s*var\\(--font-urbanist\\),\\s*var\\(--font-anuphan\\)`);

// style.css is the single source of truth for the storefront palette and type
// tokens. Admin ships its own sheet, so it declares them for itself.
for (const [token, source] of [
  ...FONT_TOKENS.map((token) => [token, sources.global]),
  ["--maris-font-thai", sources.adminAsset],
  ["--maris-font-thai", sources.adminApp]
]) {
  assert.match(source, prefersUrbanist(token), `${token} should prefer Urbanist before any fallback.`);
}

// These three used to re-declare :root themselves. Because they all load after
// style.css at the same specificity, whichever came last silently won and the
// style.css palette never applied. Keep them from drifting back.
for (const [name, source] of [
  ["site-header.css", sources.siteHeader],
  ["engagement-ring.css", sources.engagementRing],
  ["placeholder.css", sources.placeholder]
]) {
  assert.doesNotMatch(
    source,
    /^:root\s*\{/m,
    `${name} must not re-declare :root; it would override the style.css palette.`
  );
  for (const token of FONT_TOKENS) {
    assert.doesNotMatch(
      source,
      new RegExp(`^\\s*${token}\\s*:`, "m"),
      `${name} must not redefine ${token}; style.css owns it.`
    );
  }
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
  /\.shop-category-head h2,\s*\.best-seller-head h2,\s*\.atelier-reveal__focus h2\s*\{([\s\S]*?)\n\}/
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
