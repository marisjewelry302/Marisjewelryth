import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { splitProductImages } from "../app/lib/product-image-roles.js";
import {
  assignAdminProductImageRole,
  reorderAdminProductImages,
  uploadAdminProductImage
} from "../app/lib/maris-database.js";

const env = {
  SUPABASE_URL: "https://maris-test.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-secret"
};

const image = (id, sortOrder, role = "", isPrimary = false) => ({ id, imageUrl: `https://example.com/${id}.png`, sortOrder, role, isPrimary });

// Legacy rows with no role: the first two cover the card, every image fills the page.
{
  const legacy = [image("a", 0, "", true), image("b", 1), image("c", 2)];
  const { coverImages, infoImages } = splitProductImages(legacy);
  assert.deepEqual(coverImages.map((item) => item.id), ["a", "b"]);
  assert.deepEqual(infoImages.map((item) => item.id), ["a", "b", "c"]);
}

// Tagged rows: covers by slot, info set excludes covers and ignores legacy primary.
{
  const tagged = [image("old", 0, "", true), image("c2", 1, "cover"), image("c1", 0, "cover"), image("i2", 5, "info"), image("i1", 1, "info")];
  const { coverImages, infoImages } = splitProductImages(tagged);
  assert.deepEqual(coverImages.map((item) => item.id), ["c1", "c2"]);
  assert.deepEqual(infoImages.map((item) => item.id), ["old", "i1", "i2"]);
}

// Only covers: the page still has photography. Only info: the card still has an image.
assert.deepEqual(splitProductImages([image("c1", 0, "cover")]).infoImages.map((item) => item.id), ["c1"]);
assert.deepEqual(splitProductImages([image("i1", 0, "info"), image("i2", 1, "info"), image("i3", 2, "info")]).coverImages.map((item) => item.id), ["i1", "i2"]);

function createImageTableClient(rows) {
  const state = { rows: rows.map((row) => ({ ...row })), inserts: [], updates: [], deletes: [] };

  function filtered(filters) {
    return state.rows.filter((row) => filters.every(([column, value]) => String(row[column]) === String(value)));
  }

  return {
    state,
    storage: {
      from: () => ({
        upload: async (path) => ({ data: { path }, error: null }),
        getPublicUrl: (path) => ({ data: { publicUrl: `https://cdn.example.com/${path}` } })
      })
    },
    from(tableName) {
      assert.equal(tableName, "product_images");

      return {
        select() {
          return { eq: async (column, value) => ({ data: filtered([[column, value]]), error: null }) };
        },
        insert(payload) {
          const row = { id: `new-${state.inserts.length + 1}`, ...payload };
          state.inserts.push(payload);
          state.rows.push(row);
          return { select: () => ({ single: async () => ({ data: row, error: null }) }) };
        },
        update(payload) {
          const filters = [];
          const query = {
            eq(column, value) {
              filters.push([column, value]);
              if (filters.length < 2) return query;
              filtered(filters).forEach((row) => Object.assign(row, payload));
              state.updates.push({ payload, filters: [...filters] });
              return Promise.resolve({ error: null });
            }
          };
          return query;
        },
        delete() {
          const filters = [];
          const query = {
            eq(column, value) {
              filters.push([column, value]);
              if (filters.length < 2) return query;
              const ids = new Set(filtered(filters).map((row) => row.id));
              state.rows = state.rows.filter((row) => !ids.has(row.id));
              state.deletes.push([...filters]);
              return Promise.resolve({ error: null });
            }
          };
          return query;
        }
      };
    }
  };
}

const row = (id, sortOrder, role, isPrimary = false) => ({
  id,
  product_id: "p-1",
  sort_order: sortOrder,
  is_primary: isPrimary,
  metadata: role ? { role } : {}
});

// Uploading cover 1 replaces the old cover 1 and takes primary from legacy rows.
{
  const client = createImageTableClient([row("legacy", 0, "", true), row("cover-1", 0, "cover", true), row("info-1", 0, "info")]);
  const uploaded = await uploadAdminProductImage({
    productId: "p-1",
    fileName: "cover.png",
    contentType: "image/png",
    buffer: Buffer.from("x"),
    role: "cover",
    slot: "0"
  }, { env, client });

  assert.equal(uploaded.role, "cover");
  assert.deepEqual(client.state.inserts[0].metadata, { role: "cover" });
  assert.equal(client.state.inserts[0].is_primary, true);
  assert.ok(!client.state.rows.some((item) => item.id === "cover-1"), "old cover 1 should be replaced");
  assert.deepEqual(client.state.rows.filter((item) => item.is_primary).map((item) => item.id), [uploaded.id]);
}

// Info uploads never claim primary.
{
  const client = createImageTableClient([]);
  await uploadAdminProductImage({
    productId: "p-1",
    fileName: "info.png",
    contentType: "image/png",
    buffer: Buffer.from("x"),
    sortOrder: 3,
    isPrimary: true,
    role: "info"
  }, { env, client });
  assert.equal(client.state.inserts[0].is_primary, false);
  assert.equal(client.state.inserts[0].sort_order, 3);
}

// Promoting an info image into an occupied slot sends the old cover back to info.
{
  const client = createImageTableClient([row("c1", 0, "cover", true), row("c2", 1, "cover"), row("i1", 0, "info"), row("i2", 1, "info")]);
  await assignAdminProductImageRole({ productId: "p-1", imageId: "i2", role: "cover", slot: 1 }, { env, client });
  const byId = Object.fromEntries(client.state.rows.map((item) => [item.id, item]));
  assert.equal(byId.i2.metadata.role, "cover");
  assert.equal(byId.i2.sort_order, 1);
  assert.equal(byId.c2.metadata.role, "info");
  assert.ok(byId.c2.sort_order > byId.i1.sort_order, "displaced cover should join the end of the info set");
  assert.equal(byId.c1.is_primary, true);
}

// Swapping covers moves primary with cover 1.
{
  const client = createImageTableClient([row("c1", 0, "cover", true), row("c2", 1, "cover")]);
  await assignAdminProductImageRole({ productId: "p-1", imageId: "c1", role: "cover", slot: 1 }, { env, client });
  const byId = Object.fromEntries(client.state.rows.map((item) => [item.id, item]));
  assert.equal(byId.c1.sort_order, 1);
  assert.equal(byId.c1.is_primary, false);
  assert.equal(byId.c2.sort_order, 0);
  assert.equal(byId.c2.is_primary, true);
}

// Reordering the info set leaves primary alone.
{
  const client = createImageTableClient([row("i1", 0, "info"), row("i2", 1, "info")]);
  await reorderAdminProductImages({ productId: "p-1", imageIds: ["i2", "i1"], role: "info" }, { env, client });
  assert.deepEqual(client.state.updates.map((update) => update.payload), [{ sort_order: 0 }, { sort_order: 1 }]);
}

await assert.rejects(
  () => assignAdminProductImageRole({ productId: "p-1", imageId: "i1", role: "hero" }, { env, client: createImageTableClient([]) }),
  (error) => error.statusCode === 400
);

const productCard = await readFile(new URL("../app/components/ProductCard.jsx", import.meta.url), "utf8");
const adminPage = await readFile(new URL("../app/admin/page.js", import.meta.url), "utf8");
const adminJs = await readFile(new URL("../assets/js/admin-page.js", import.meta.url), "utf8");

assert.match(productCard, /product\.coverImages/, "Catalogue card hover should come from the second cover image");
assert.match(adminPage, /name="coverImageFiles"/, "Add Product should accept cover images separately");
assert.match(adminJs, /id="modal-cover-grid"/, "Edit modal should manage the two cover slots");
assert.match(adminJs, /action: "assign-role"/, "Edit modal should move images between cover and info");

console.log("product image roles: ok");
