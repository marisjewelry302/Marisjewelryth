// Finds files in the product media buckets that no database row points at.
//
//   node scripts/cleanup-orphan-product-media.mjs            report only
//   node scripts/cleanup-orphan-product-media.mjs --apply    move them aside
//
// Nothing is deleted. --apply moves each orphan to _orphaned/<run>/<old path>
// in the same bucket, where it can be checked and then emptied from the
// Supabase dashboard, or moved back if something turns out to need it.
//
// A file counts as referenced when its public URL appears in
// product_images.image_url or in any of the product media columns. Rows are
// read after the bucket is listed, so an upload that lands mid-run is seen as
// referenced rather than swept.

import { readFile } from "node:fs/promises";
import { createSupabaseAdminClient } from "../app/lib/maris-database.js";

const BUCKETS = ["product-images", "product-videos"];
const QUARANTINE_PREFIX = "_orphaned";
const PRODUCT_MEDIA_COLUMNS = ["cover_image_url", "hover_image_url", "video_url", "video_poster_url"];
const PAGE_SIZE = 1000;

async function loadLocalEnv(fileName) {
  let fileBody = "";

  try {
    fileBody = await readFile(new URL(`../${fileName}`, import.meta.url), "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      return;
    }

    throw error;
  }

  for (const rawLine of fileBody.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

// "…/storage/v1/object/public/product-images/abc/1.jpg?v=2" -> ["product-images", "abc/1.jpg"]
function toStorageObject(url) {
  const match = /\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/([^?#]+)/.exec(String(url || ""));

  if (!match) {
    return null;
  }

  return [match[1], decodeURIComponent(match[2])];
}

async function listBucket(supabase, bucket, prefix = "") {
  const files = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit: PAGE_SIZE,
      offset,
      sortBy: { column: "name", order: "asc" }
    });

    if (error) {
      // A bucket the migration has not created yet has nothing to sweep.
      if (/not found/i.test(error.message || "")) {
        return files;
      }

      throw new Error(`Could not list ${bucket}/${prefix}: ${error.message}`);
    }

    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;

      // Folders come back without an id.
      if (!entry.id) {
        if (path !== QUARANTINE_PREFIX) {
          files.push(...await listBucket(supabase, bucket, path));
        }
        continue;
      }

      // Supabase keeps a zero-byte placeholder in folders made from the dashboard.
      if (entry.name === ".emptyFolderPlaceholder") {
        continue;
      }

      files.push({ path, size: Number(entry.metadata?.size) || 0 });
    }

    if (data.length < PAGE_SIZE) {
      return files;
    }
  }
}

async function readReferencedPaths(supabase) {
  const referenced = new Set();
  const add = (url) => {
    const object = toStorageObject(url);

    if (object) {
      referenced.add(object.join("/"));
    }
  };

  const images = await supabase.from("product_images").select("image_url");

  if (images.error) {
    throw new Error(`Could not read product_images: ${images.error.message}`);
  }

  images.data.forEach((row) => add(row.image_url));

  const products = await supabase.from("products").select(PRODUCT_MEDIA_COLUMNS.join(", "));

  if (products.error) {
    // Before the product media migration there are no such columns, and so
    // nothing in them to protect.
    if (!/does not exist/i.test(products.error.message || "")) {
      throw new Error(`Could not read products: ${products.error.message}`);
    }
  } else {
    for (const row of products.data) {
      PRODUCT_MEDIA_COLUMNS.forEach((column) => add(row[column]));
    }
  }

  return referenced;
}

function formatMegabytes(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function main() {
  await loadLocalEnv(".env.local");
  await loadLocalEnv(".env");

  const apply = process.argv.includes("--apply");
  const supabase = createSupabaseAdminClient(process.env);
  const listed = [];

  for (const bucket of BUCKETS) {
    for (const file of await listBucket(supabase, bucket)) {
      listed.push({ bucket, ...file });
    }
  }

  const referenced = await readReferencedPaths(supabase);
  const orphans = listed.filter((file) => !referenced.has(`${file.bucket}/${file.path}`));
  const run = new Date().toISOString().replace(/[:.]/g, "-");

  for (const bucket of BUCKETS) {
    const inBucket = listed.filter((file) => file.bucket === bucket);
    const orphaned = orphans.filter((file) => file.bucket === bucket);
    const orphanBytes = orphaned.reduce((total, file) => total + file.size, 0);

    console.log(
      `${bucket}: ${inBucket.length} files, ${orphaned.length} orphaned (${formatMegabytes(orphanBytes)})`
    );
  }

  for (const file of orphans) {
    console.log(`  ${file.bucket}/${file.path}`);
  }

  if (!apply) {
    console.log(orphans.length ? "\nReport only. Re-run with --apply to move these aside." : "\nNothing to clean up.");
    return;
  }

  let moved = 0;

  for (const file of orphans) {
    const target = `${QUARANTINE_PREFIX}/${run}/${file.path}`;
    const { error } = await supabase.storage.from(file.bucket).move(file.path, target);

    if (error) {
      console.error(`  could not move ${file.bucket}/${file.path}: ${error.message}`);
      continue;
    }

    moved += 1;
  }

  console.log(`\nMoved ${moved} of ${orphans.length} to ${QUARANTINE_PREFIX}/${run}/ in their buckets.`);

  if (moved !== orphans.length) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
