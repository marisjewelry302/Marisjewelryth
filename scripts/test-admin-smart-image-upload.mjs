import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const adminHtml = await readFile(new URL("../app/admin/page.js", import.meta.url), "utf8");
const adminJs = await readFile(new URL("../assets/js/admin-page.js", import.meta.url), "utf8");
const databaseJs = await readFile(new URL("../app/lib/maris-database.js", import.meta.url), "utf8");
const parserSource = await readFile(new URL("../assets/js/admin-image-group-parser.js", import.meta.url), "utf8");

const context = {
  window: {},
  console
};
context.globalThis = context.window;

vm.runInNewContext(parserSource, context);

const parser = context.window.MARIS_ADMIN_IMAGE_GROUP;

assert.equal(typeof parser?.buildImageFileGroup, "function", "Admin image group parser should expose buildImageFileGroup");

const files = [
  { name: "Front SR 0001 Diamond Cluster Oval Illusion Ring in white Gold The One Aura Collection.png", type: "image/png", size: 100 },
  { name: "Side SR 0001 Diamond Cluster Oval Illusion Ring in white Gold The One Aura Collection.png", type: "image/png", size: 100 },
  { name: "SR 0001 Diamond Cluster Oval Illusion Ring in Rose Gold The One Aura Collection Logo.png", type: "image/png", size: 100 },
  { name: "SR 0001 Diamond Cluster Oval Illusion Ring in white Gold The One Aura Collection Logo.png", type: "image/png", size: 100 },
  { name: "SR 0001 Diamond Cluster Oval Illusion Ring in yellow Gold The One Aura Collection Logo.png", type: "image/png", size: 100 },
  { name: "Top SR 0001 Diamond Cluster Oval Illusion Ring in white Gold The One Aura Collection.png", type: "image/png", size: 100 }
];

const group = parser.buildImageFileGroup(files);

assert.equal(group.code, "SR 0001");
assert.equal(group.productName, "Diamond Cluster Oval Illusion Ring The One Aura Collection");
assert.deepEqual(Array.from(group.metalLabels), ["White Gold", "Yellow Gold", "Rose Gold"]);
assert.equal(group.shape, "Oval");
assert.equal(group.collectionKey, "rings");
assert.deepEqual(Array.from(group.orderedImages, (image) => image.file.name), [
  "SR 0001 Diamond Cluster Oval Illusion Ring in white Gold The One Aura Collection Logo.png",
  "Top SR 0001 Diamond Cluster Oval Illusion Ring in white Gold The One Aura Collection.png",
  "Front SR 0001 Diamond Cluster Oval Illusion Ring in white Gold The One Aura Collection.png",
  "Side SR 0001 Diamond Cluster Oval Illusion Ring in white Gold The One Aura Collection.png",
  "SR 0001 Diamond Cluster Oval Illusion Ring in yellow Gold The One Aura Collection Logo.png",
  "SR 0001 Diamond Cluster Oval Illusion Ring in Rose Gold The One Aura Collection Logo.png"
]);
assert.equal(group.mainImageFile.name, "SR 0001 Diamond Cluster Oval Illusion Ring in white Gold The One Aura Collection Logo.png");
assert.equal(group.galleryImageFiles.length, 5);

assert.match(adminHtml, /data-product-form/, "Admin Products tab should keep image upload inside the existing Add Product form");
assert.match(adminHtml, /Product Images[\s\S]*name="imageGroupFiles"/, "Add Product form should accept product images directly");
assert.match(adminHtml, /data-image-group-summary/, "Add Product form should show parsed image group feedback inline");
assert.doesNotMatch(adminHtml, /data-catalogue-form|Smart Catalogue Upload|Save Catalogue Product/, "Admin Products tab should not add a separate catalogue upload surface");
assert.ok(
  adminHtml.indexOf("/assets/js/admin-image-group-parser.js") > -1
    && adminHtml.indexOf("/assets/js/admin-image-group-parser.js") < adminHtml.indexOf("/assets/js/admin-page.js"),
  "Image group parser should load before admin-page.js uses it"
);

assert.match(adminJs, /buildSmartImageGroup/, "Admin page logic should read selected image groups");
assert.match(adminJs, /applyImageGroupToProductForm/, "Admin page logic should auto-fill the existing Add Product form from filenames");
assert.match(adminJs, /uploadProductImages/, "Add Product submit should upload selected product images after creating the product");
assert.match(databaseJs, /metadata:\s*product\.metadata/, "Created catalogue products should keep metadata from the smart upload form");
