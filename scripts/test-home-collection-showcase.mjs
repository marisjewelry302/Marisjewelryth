import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch (error) {
    return false;
  }
}

const ringImagePath = "assets/images/home/collections/cover-rings-collection.webp";
const pendantImagePath = "assets/images/home/collections/cover-pendants-collection.webp";

const [homepage, siteCss, hasRingImage, hasPendantImage] = await Promise.all([
  readFile("app/page.js", "utf8"),
  readFile("assets/css/style.css", "utf8"),
  fileExists(ringImagePath),
  fileExists(pendantImagePath)
]);

const heroIndex = homepage.indexOf('<section className="hero">');
const showcaseIndex = homepage.indexOf('<section className="home-collection-showcase"');
const atelierIndex = homepage.indexOf('<section className="atelier-reveal"');

assert.ok(heroIndex >= 0, "homepage must render the hero section");
assert.ok(showcaseIndex > heroIndex, "collection showcase must sit directly after the hero section");
assert.ok(atelierIndex > showcaseIndex, "collection showcase must appear before the atelier reveal section");

assert.match(
  homepage,
  /href="\/category\/rings"[\s\S]*Signature Rings[\s\S]*\/assets\/images\/home\/collections\/cover-rings-collection\.webp/,
  "showcase must link the rings tile to the Rings collection with the provided ring cover image"
);

assert.match(
  homepage,
  /href="\/category\/necklaces-pendants"[\s\S]*Elegant Pendants[\s\S]*\/assets\/images\/home\/collections\/cover-pendants-collection\.webp/,
  "showcase must link the pendant tile to the Necklaces and Pendants collection with the provided pendant cover image"
);

assert.doesNotMatch(homepage, /home-collection-card__(brand|caption|note)/, "showcase must keep the original simple tile layout without IG-style post furniture");
assert.equal(hasRingImage, true, "ring showcase image must exist");
assert.equal(hasPendantImage, true, "pendant showcase image must exist");
assert.match(siteCss, /\.home-collection-showcase\s*\{/, "showcase section styles must exist");
assert.match(siteCss, /\.home-collection-showcase\s*\{[\s\S]*background:\s*oklch\(96\.5%\s+0\.014\s+78\)/, "showcase must use a warm editorial surface while keeping the existing layout");
assert.match(siteCss, /\.home-collection-grid\s*\{[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/, "showcase must use a two-column grid on desktop");
assert.match(siteCss, /\.home-collection-card__title\s*\{[\s\S]*font-family:\s*var\(--maris-font-display\)/, "showcase titles must use the current Maris display typography token");
assert.match(siteCss, /@media\s*\(max-width:\s*820px\)[\s\S]*\.home-collection-grid\s*\{[\s\S]*grid-template-columns:\s*1fr/, "showcase must stack to one column on narrow mobile and tablet viewports");

console.log("Home collection showcase contract is valid.");
