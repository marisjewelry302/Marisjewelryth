import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getPublicProductDisplayName, getPublicProductSeoTitle } from "../app/lib/product-display.js";

// --- Page titles must be unique per piece -------------------------------------
// The live catalogue has dozens of rings and bands, so a title built from the display
// name alone ("Diamond Ring | Maris Jewelry") repeats for every one of them.
const catalogue = [
  { sku: "SR 0039 WS", category: "ring", collection: "wedding-set" },
  { sku: "SR 0039 ER", category: "ring", collection: "engagement-ring" },
  { sku: "SR 0039 WB", category: "ring", collection: "wedding-bands" },
  { sku: "SR0040ER", category: "ring", collection: "engagement-ring" },
  { sku: "SR 0099 MWB", category: "ring", collection: "mens-wedding-bands" },
  { sku: "SE 0054", category: "earrings", collection: "earrings" },
  { sku: "SP 0003", category: "pendant", collection: "necklaces-pendants" }
];

const titles = catalogue.map(getPublicProductSeoTitle);
assert.equal(new Set(titles).size, catalogue.length, `every piece needs its own title, got: ${titles.join(" / ")}`);

const sharedName = catalogue.filter((product) => getPublicProductDisplayName(product) === "Diamond Ring");
assert.ok(sharedName.length >= 3, "the fixture must include pieces that share a display name");

assert.equal(getPublicProductSeoTitle({ sku: "SR 0039 WS", category: "ring" }), "Diamond Ring SR 0039 WS");
assert.equal(getPublicProductSeoTitle({ sku: "sr0040er", category: "ring" }), "Diamond Ring SR 0040 ER", "an unspaced catalogue code is shown in its tidy form");
assert.equal(getPublicProductSeoTitle({ sku: "", category: "ring" }), "Diamond Ring", "a piece without a code falls back to the display name");
assert.ok(`${getPublicProductSeoTitle({ sku: "SR 0099 MWB", category: "ring", collection: "mens-wedding-bands" })} | Maris Jewelry`.length <= 60, "titles stay short enough for search results");

// --- Product pages must be cacheable --------------------------------------------
const pageSource = await readFile(new URL("../app/product/[slug]/page.js", import.meta.url), "utf8");
const slugPageSource = await readFile(new URL("../app/product/[slug]/product-slug-page.js", import.meta.url), "utf8");

assert.match(pageSource, /export async function generateStaticParams\(\)/, "without generateStaticParams the product route renders on every request with no-store");
assert.match(pageSource, /export const revalidate = \d+/, "product pages need a revalidate window");
assert.match(pageSource, /catch \(error\) \{\s*return \[\];/, "an unreadable catalogue at build time must fall back to on-demand pages, not fail the build");
const withoutComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
assert.doesNotMatch(withoutComments(pageSource + slugPageSource), /force-dynamic|cookies\(|headers\(\)|noStore|no-store/, "request-time APIs would opt the product page out of caching again");
assert.match(slugPageSource, /getPublicProductSeoTitle\(product\)/, "the product metadata must use the unique title");
assert.doesNotMatch(slugPageSource, /title: `\$\{displayName\} \| Maris Jewelry`/, "the shared display name must not be the whole title");

// generateStaticParams must survive a missing database (no Supabase env in this process).
const savedEnv = { url: process.env.SUPABASE_URL, public: process.env.NEXT_PUBLIC_SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY };
delete process.env.SUPABASE_URL;
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
try {
  const paramsSource = pageSource.replace(/^import "[^"]+\.css";\n/m, "").replace(/^export \{[^}]+\} from "[^"]+";\n/m, "");
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(
    paramsSource
      .replace('"../../lib/maris-database.js"', JSON.stringify(new URL("../app/lib/maris-database.js", import.meta.url).href))
      .replace('"../../lib/product-display.js"', JSON.stringify(new URL("../app/lib/product-display.js", import.meta.url).href))
  ).toString("base64")}`;
  const { generateStaticParams } = await import(moduleUrl);
  assert.deepEqual(await generateStaticParams(), [], "no database means no prerendered products, and no crash");
} finally {
  if (savedEnv.url !== undefined) process.env.SUPABASE_URL = savedEnv.url;
  if (savedEnv.public !== undefined) process.env.NEXT_PUBLIC_SUPABASE_URL = savedEnv.public;
  if (savedEnv.key !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = savedEnv.key;
}

console.log("PASS: product pages are cacheable and every product has a unique title.");
