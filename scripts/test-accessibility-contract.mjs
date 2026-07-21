import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const files = Object.fromEntries(await Promise.all(
  Object.entries({
    header: "../app/components/SiteHeader.jsx",
    footer: "../app/components/SiteFooter.jsx",
    popup: "../app/HomeSignupPopup.jsx",
    account: "../app/account/AccountClient.jsx",
    gallery: "../app/product/[slug]/ProductGallery.jsx",
    productPage: "../app/product/[slug]/product-slug-page.js",
    category: "../app/category/[collection]/CategoryProducts.jsx"
  }).map(async ([key, path]) => [key, await readFile(new URL(path, import.meta.url), "utf8")])
));

assert.match(files.header, /aria-controls="maris-primary-navigation"/);
assert.match(files.header, /inert=\{isMobile && !isOpen\}/);
assert.match(files.header, /event\.key === "Escape"/);
assert.match(files.footer, /aria-expanded=\{isOpen\}/);
assert.match(files.footer, /const emailId = useId\(\)/, "Repeated newsletter forms need unique label targets");
assert.doesNotMatch(files.footer, /id="footer-email"/);
assert.match(files.popup, /aria-labelledby=\{titleId\}/);
assert.match(files.popup, /event\.key === "Tab"/, "Signup dialog must trap keyboard focus");
assert.doesNotMatch(files.account, /role="tablist"/, "Plain account toggles must not claim an incomplete tab pattern");
assert.match(files.account, /aria-pressed=\{mode === "signin"\}/);
assert.match(files.gallery, /className="product-gallery-open"/);
assert.match(files.gallery, /role="dialog"/);
assert.match(files.gallery, /aria-modal="true"/);
assert.match(files.gallery, /aria-label="Close image preview"/);
assert.doesNotMatch(files.gallery, /tabIndex=\{0\}[\s\S]*?role="button"/);
assert.match(files.productPage, /<main className="product-page">/);
assert.match(files.category, /<h2 className="sr-only">Available/);
