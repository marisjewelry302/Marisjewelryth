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

// --- Homepage brand header --------------------------------------------------

const brandHeaderCss = await readFile(new URL("../assets/css/site-header.css", import.meta.url), "utf8");

assert.match(
  brandHeaderCss,
  /@media \(min-width: 700px\) and \(max-width: 920px\)[\s\S]*?grid-template-areas:\s*\n\s*"search logo icons"\s*\n\s*"nav nav nav";/,
  "The centred logo over a full width menu should survive down to tablet widths, not only desktop"
);

assert.match(
  brandHeaderCss,
  /@media \(min-width: 700px\) and \(max-width: 920px\)[\s\S]*?\.site-header--home \.mobile-menu-toggle \{\s*\n\s*display: none;/,
  "Tablet keeps the real menu bar, so the homepage drawer button must be hidden there"
);

assert.match(
  brandHeaderCss,
  /@media \(max-width: 699px\)[\s\S]*?grid-template-columns: minmax\(44px, 1fr\) auto minmax\(44px, 1fr\);/,
  "Equal outer tracks keep the phone logo centred between the menu button and the icons"
);

assert.match(
  brandHeaderCss,
  /@media \(max-width: 768px\) \{\s*\n\s*\.site-header:not\(\.site-header--home\) \.navbar,[\s\S]*?padding-left: 60px;/,
  "Inner pages must reserve room for the 44px menu button, beating the padding-inline rule above"
);

// The tablet block above repeats the light on photograph treatment at the same
// specificity as the pinned header rules, and sits later in the file, so it
// would win on source order and leave cream text on a cream bar. The compact
// override has to be both later and more specific than that block.
const tabletBlockIndex = brandHeaderCss.indexOf("@media (min-width: 700px) and (max-width: 920px)");
const compactOverrideIndex = brandHeaderCss.indexOf(
  "body.is-home-page.is-home-header-compact .site-header--home .navbar .nav a"
);

assert.ok(tabletBlockIndex > -1, "The tablet brand header block should exist");
assert.ok(
  compactOverrideIndex > tabletBlockIndex,
  "The pinned header colours must come after the tablet block that sets the light treatment"
);

assert.match(
  brandHeaderCss.slice(compactOverrideIndex),
  /^body\.is-home-page\.is-home-header-compact[\s\S]*?color: var\(--maris-ink\);/,
  "Pinned tablet header text must flip to ink, since the bar turns cream behind it"
);

assert.match(
  brandHeaderCss,
  /body\.is-home-page\.is-home-header-compact \.site-header--home \.navbar \{\s*\n\s*background: rgba\(255, 250, 246/,
  "The pinned tablet bar needs its cream background back after the tablet block"
);
