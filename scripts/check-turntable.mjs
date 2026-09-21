#!/usr/bin/env node
//
// Check a rendered turntable before it goes near the site.
//
//   npm run check:turntable -- sr-0084
//
// A turntable fails in ways that are obvious in motion and invisible in a
// folder listing: a frame missing from the middle, one frame exported at a
// different size, a sequence that does not close because it went 350 degrees
// instead of 360. This reads the headers of every frame and says so.

import { readdir, stat, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const TURNTABLE_DIR = "assets/turntable";

// Enough of each container to find the dimensions. Nothing here decodes pixels.
function readDimensions(bytes) {
  // PNG: an IHDR chunk right after the signature.
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { format: "png", width: view.getUint32(16), height: view.getUint32(20) };
  }

  // WebP: RIFF....WEBP, then a VP8/VP8L/VP8X chunk that each store size
  // differently.
  if (String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") {
    const chunk = String.fromCharCode(...bytes.slice(12, 16));

    if (chunk === "VP8X") {
      const width = 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16));
      const height = 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16));
      return { format: "webp", width, height };
    }

    if (chunk === "VP8 ") {
      const width = (bytes[26] | (bytes[27] << 8)) & 0x3fff;
      const height = (bytes[28] | (bytes[29] << 8)) & 0x3fff;
      return { format: "webp", width, height };
    }

    if (chunk === "VP8L") {
      const bits = bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24);
      return { format: "webp", width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }

    return { format: "webp", width: null, height: null };
  }

  // JPEG: walk the segments to the start-of-frame.
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let i = 2;

    while (i < bytes.length - 9) {
      if (bytes[i] !== 0xff) { i += 1; continue; }

      const marker = bytes[i + 1];
      const length = (bytes[i + 2] << 8) | bytes[i + 3];

      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { format: "jpeg", height: (bytes[i + 5] << 8) | bytes[i + 6], width: (bytes[i + 7] << 8) | bytes[i + 8] };
      }

      i += 2 + length;
    }
  }

  return { format: "unknown", width: null, height: null };
}

async function main() {
  const sku = process.argv[2];

  if (!sku) {
    console.error("Usage: npm run check:turntable -- sr-0084");
    process.exitCode = 1;
    return;
  }

  const folder = path.join(TURNTABLE_DIR, sku);
  let entries;

  try {
    entries = (await readdir(folder)).filter((name) => /\.(webp|png|jpe?g)$/i.test(name)).sort();
  } catch {
    console.error(`\n  No folder at ${folder}. Render the frames there first.\n`);
    process.exitCode = 1;
    return;
  }

  if (entries.length === 0) {
    console.error(`\n  ${folder} has no images in it.\n`);
    process.exitCode = 1;
    return;
  }

  const problems = [];
  const sizes = new Set();
  const formats = new Set();
  let bytesTotal = 0;
  let largest = { name: null, bytes: 0 };

  for (const name of entries) {
    const file = path.join(folder, name);
    const info = await stat(file);
    const head = new Uint8Array(await readFile(file));
    const { format, width, height } = readDimensions(head.slice(0, 4096));

    bytesTotal += info.size;
    formats.add(format);
    if (width && height) sizes.add(`${width}x${height}`);
    if (info.size > largest.bytes) largest = { name, bytes: info.size };
    if (width && height && width !== height) problems.push(`${name} is ${width}x${height}, not square`);
  }

  // The numbering has to be an unbroken run, or a frame is missing from the
  // middle and the piece will jump as it passes.
  const numbers = entries
    .map((name) => Number((name.match(/(\d+)/) || [])[1]))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);

  const first = numbers[0];
  const last = numbers[numbers.length - 1];

  if (numbers.length !== entries.length) {
    problems.push("some filenames have no number in them");
  } else {
    for (let i = 0; i < numbers.length; i += 1) {
      if (numbers[i] !== first + i) {
        problems.push(`the run breaks at ${numbers[i]} - expected ${first + i}, so a frame is missing`);
        break;
      }
    }
  }

  if (sizes.size > 1) {
    problems.push(`frames are not all the same size: ${[...sizes].join(", ")}`);
  }

  if (formats.size > 1) {
    problems.push(`mixed formats: ${[...formats].join(", ")}`);
  }

  // Read the padding off the filename, not off the parsed number - `0001`
  // parses to 1, and reporting pad 1 would send the viewer looking for `1.png`.
  const pad = ((entries[0].match(/(\d+)/) || [])[1] || "").length;
  const format = [...formats][0];
  const perFrame = bytesTotal / entries.length;

  console.log(`\n  ${folder}`);
  console.log(`    frames      ${entries.length}  (${entries[0]} to ${entries[entries.length - 1]}, ${(360 / entries.length).toFixed(1)} degrees apart)`);
  console.log(`    size        ${[...sizes][0] || "unreadable"}, ${format}`);
  console.log(`    weight      ${(bytesTotal / 1048576).toFixed(2)} MB total, ${Math.round(perFrame / 1024)} kB a frame`);
  console.log(`    largest     ${largest.name} at ${Math.round(largest.bytes / 1024)} kB`);

  if (perFrame > 200 * 1024) {
    console.log("    NOTE        over 200 kB a frame. Export smaller or at lower quality;");
    console.log("                the whole set has to come down a phone connection.");
  }

  if (problems.length) {
    console.log("\n  problems:");
    for (const problem of problems) console.log(`    - ${problem}`);
    console.log("");
    process.exitCode = 1;
    return;
  }

  console.log("\n  Sequence is complete and even. Add this to PRODUCT_TURNTABLES in");
  console.log("  app/lib/product-turntables.js:");
  console.log(`    "${sku.replace(/-/g, " ").toUpperCase()}": { frames: ${entries.length}, format: "${format === "jpeg" ? "jpg" : format}", pad: ${pad} },\n`);
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  main().catch((error) => {
    console.error(`\n  ${error.message}\n`);
    process.exitCode = 1;
  });
}
