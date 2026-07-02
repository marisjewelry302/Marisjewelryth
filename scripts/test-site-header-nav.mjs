import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../app/components/SiteHeader.jsx", import.meta.url), "utf8");

function extractArray(name) {
  const match = source.match(new RegExp(String.raw`const ${name} = \[([\s\S]*?)\];`));
  assert.ok(match, `${name} declaration should exist`);
  return match[1];
}

const primaryNav = extractArray("primaryNav");
const dropdownNav = extractArray("dropdownNav");

assert.match(
  primaryNav,
  /href:\s*"\/category\/wedding-set",\s*label:\s*"Wedding set"/,
  "Wedding set should be a top-level navigation item"
);

assert.match(
  primaryNav,
  /href:\s*"\/category\/engagement-ring",\s*label:\s*"Engagement ring"/,
  "Engagement ring should be a top-level navigation item"
);

assert.doesNotMatch(
  primaryNav,
  /mens-wedding-bands/,
  "Men's Wedding Bands should not be a top-level navigation item"
);

const weddingBandGroup = dropdownNav.match(/label:\s*"Wedding band",\s*items:\s*\[([\s\S]*?)\]\s*\}/);
assert.ok(weddingBandGroup, "Wedding band should be a dropdown navigation group");
assert.match(
  weddingBandGroup[1],
  /href:\s*"\/category\/wedding-bands",\s*label:\s*"Wedding Bands"/,
  "Wedding band dropdown should link to Wedding Bands"
);
assert.match(
  weddingBandGroup[1],
  /href:\s*"\/category\/mens-wedding-bands",\s*label:\s*"Men's Wedding Bands"/,
  "Wedding band dropdown should include Men's Wedding Bands"
);

assert.match(dropdownNav, /label:\s*"Gift"/, "Gift should be a top-level dropdown label");
assert.match(dropdownNav, /label:\s*"Our Expertise"/, "Our Expertise should remain a top-level dropdown label");
assert.match(dropdownNav, /label:\s*"About Us"/, "About Us should remain a top-level dropdown label");
