// One-off: re-encode large PNG/JPEG product photos already in Supabase Storage
// as WebP and point the database at the new files.
//
//   node --env-file=.env.local scripts/compress-product-images.mjs          # dry run
//   node --env-file=.env.local scripts/compress-product-images.mjs --apply  # do it
//
// Originals are NEVER deleted or overwritten: each image gets a new sibling
// file (same path, .webp), and only the DB URL changes. Rolling back = restore
// the old URLs; deleting the originals is a separate, manual step.

import { createSupabaseAdminClient } from "../app/lib/maris-database/connection.js";
import { compressProductImage } from "../app/lib/maris-database/image-compress.js";
import { parseStorageObjectUrl } from "../app/lib/maris-database/product-media.js";

const apply = process.argv.includes("--apply");
const MIN_BYTES = 250 * 1024;
const supabase = createSupabaseAdminClient();

const targets = [
  { table: "products", column: "cover_image_url" },
  { table: "products", column: "hover_image_url" },
  { table: "product_images", column: "image_url" }
];

let before = 0;
let after = 0;
let changed = 0;

for (const { table, column } of targets) {
  const { data: rows, error } = await supabase.from(table).select(`id, ${column}`).not(column, "is", null);
  if (error) throw new Error(`${table}.${column}: ${error.message}`);

  for (const row of rows) {
    const url = row[column];
    const object = parseStorageObjectUrl(url);
    if (!object || object.bucket !== "product-images" || !/\.(png|jpe?g)$/i.test(object.path)) continue;

    const res = await fetch(url.split("?")[0]);
    if (!res.ok) { console.log(`skip (HTTP ${res.status}) ${object.path}`); continue; }
    const original = Buffer.from(await res.arrayBuffer());
    if (original.length < MIN_BYTES) continue;

    const result = await compressProductImage(original, res.headers.get("content-type"));
    if (!result.ext) { console.log(`keep ${object.path} (no gain)`); continue; }

    const newPath = object.path.replace(/\.[a-z0-9]+$/i, ".webp");
    console.log(`${table}.${column} ${object.path}: ${(original.length / 1024) | 0} KiB -> ${(result.buffer.length / 1024) | 0} KiB`);
    before += original.length;
    after += result.buffer.length;

    if (!apply) continue;

    const { error: upError } = await supabase.storage.from(object.bucket).upload(newPath, result.buffer, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: true
    });
    if (upError) { console.log(`  upload failed: ${upError.message}`); continue; }

    const publicUrl = supabase.storage.from(object.bucket).getPublicUrl(newPath).data.publicUrl;
    const { error: dbError } = await supabase.from(table).update({ [column]: `${publicUrl}?v=${Date.now()}` }).eq("id", row.id);
    if (dbError) { console.log(`  db update failed: ${dbError.message}`); continue; }
    changed += 1;
  }
}

console.log(`\n${apply ? "APPLIED" : "DRY RUN"}: ${(before / 1048576).toFixed(1)} MiB -> ${(after / 1048576).toFixed(1)} MiB` + (apply ? `, ${changed} rows updated` : ""));
