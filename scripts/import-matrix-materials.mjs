#!/usr/bin/env node
//
// MatrixGold / Maverick Render material libraries -> one JSON the converter can
// read.
//
//   node scripts/import-matrix-materials.mjs cad-source/Metal-*.zip cad-source/Gemstone-*.zip
//
// A .mkmtl is a Maverick "rooted subgraph": plain text, a node graph, and a
// base85 swatch render that makes up 99% of the file size and is of no use
// here. What matters is a handful of numbers in the root node, and they are the
// bench's own values - the gold Maris actually renders with, rather than a
// colour picked to look like gold.
//
// Only self-contained materials are imported. The Damaged/Dirty/Brushed sets
// reference .jpg maps by absolute path on a drive that is not here, so they are
// counted and skipped rather than half-imported.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const OUTPUT = "scripts/data/jewellery-materials.json";

// The .mkmtl files name their textures by absolute path on the machine that
// authored them - `Z:\RandomControl---library\...\Shading\Materials\...`. The same
// tree exists in any Maverick install, so everything from `Shading` onwards is
// the part that travels. Point --library at the local copy and the maps that
// looked missing turn out to be present.
function resolveLibraryPath(reference, libraryRoot) {
  if (!libraryRoot) return null;

  const normalised = String(reference).replace(/\\+/g, "/");
  const index = normalised.toLowerCase().lastIndexOf("/shading/");

  if (index < 0) return null;

  return path.join(libraryRoot, normalised.slice(index + 1));
}

// glTF wants linear; Maverick's colours are picked in sRGB. Two things in the
// files settle it rather than leaving it a guess: the same libraries write some
// colours as `int 250 157 19` and others as `float 0.94424 0.86612 0.31585`,
// which is the same 0-255 scale normalised, and the sRGB reading of the gold
// entries lands on gold's real hue while the linear reading does not.
function srgbToLinear(value) {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function readColor(body, key) {
  const match = body.match(new RegExp(`${key}\\s+(float|int)\\s+([\\d.]+)\\s+([\\d.]+)\\s+([\\d.]+)`));

  if (!match) return null;

  const scale = match[1] === "int" ? 255 : 1;
  return [Number(match[2]) / scale, Number(match[3]) / scale, Number(match[4]) / scale]
    .map((channel) => Number(srgbToLinear(channel).toFixed(5)));
}

function readNumber(body, key) {
  const match = body.match(new RegExp(`${key}\\s+([\\d.]+)`));
  return match ? Number(match[1]) : null;
}

function toKey(name) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function parseMaterial(text) {
  // Every swatch payload is one enormous line; dropping long lines leaves the
  // graph itself, which is a few dozen short ones.
  const source = text.split("\n").filter((line) => line.length <= 200).join("\n");
  const root = source.match(/^root\s+(\S+)/m);

  if (!root) return null;

  const block = source.match(new RegExp(`^(\\w+)\\s+${root[1].replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\s*\\n\\{([\\s\\S]*?)^\\}`, "m"));

  if (!block) return null;

  return {
    kind: block[1],
    body: block[2],
    usesExternalTextures: /filetex\s+\w+/.test(source),
    // `<- Node o` wires another node into a slot. The Brushed set does its whole
    // finish that way - a procedural bump and roughness map feeding a plain
    // metal root - so importing just the root would quietly turn brushed
    // zirconium into polished zirconium. Better to leave it out and say so.
    usesInputMaps: /^\s*<-\s+\S+/m.test(block[2])
  };
}

export async function importLibraries(zipPaths, { libraryRoot = null } = {}) {
  // AdmZip is not a dependency; Node can read a zip's central directory with
  // nothing but fflate, which three already ships for its own loaders.
  const { unzipSync, strFromU8 } = require("three/examples/jsm/libs/fflate.module.js");

  const metals = {};
  const gems = {};
  const skipped = [];
  const textured = [];

  for (const zipPath of zipPaths) {
    const archive = unzipSync(new Uint8Array(await readFile(zipPath)));

    for (const [entry, bytes] of Object.entries(archive)) {
      if (!entry.toLowerCase().endsWith(".mkmtl")) continue;

      const parsed = parseMaterial(strFromU8(bytes));

      if (!parsed) {
        skipped.push({ entry, reason: "no root node" });
        continue;
      }

      const { kind, body, usesExternalTextures, usesInputMaps } = parsed;
      const name = (body.match(/alias\s+"([^"]+)"/) || [])[1] || path.basename(entry, ".mkmtl");
      const group = path.dirname(entry).split("/").slice(1).join("/") || "root";

      if (usesExternalTextures) {
        // Where the maps actually are, if a library root was given. These
        // materials are not importable as flat values - their whole character
        // is in the maps - but knowing they are available is the difference
        // between "cannot have" and "not wired up yet".
        const references = [...strFromU8(bytes).matchAll(/filename\s+"([^"]+)"/g)].map((m) => m[1]);
        const resolved = [];

        for (const reference of references) {
          const local = resolveLibraryPath(reference, libraryRoot);
          if (local && existsSync(local)) resolved.push(path.relative(libraryRoot, local).replace(/\\/g, "/"));
        }

        if (resolved.length && resolved.length === references.length) {
          textured.push({ entry, name, group, maps: resolved });
          skipped.push({ entry, reason: "textured - every map found, but maps are not wired into the glb yet" });
        } else {
          skipped.push({ entry, reason: "needs image maps that are not in the archive" });
        }

        continue;
      }

      if (usesInputMaps) {
        skipped.push({ entry, reason: "finish comes from procedural maps this importer does not reproduce" });
        continue;
      }

      if (kind === "metal") {
        const baseColor = readColor(body, "diffuse_color");

        if (!baseColor) {
          skipped.push({ entry, reason: "no diffuse_color" });
          continue;
        }

        metals[toKey(name)] = {
          name,
          group,
          baseColor,
          roughness: readNumber(body, "specular_roughness") ?? 0.1,
          // The polished sets carry a coating film over the metal. Clearcoat is
          // the same idea in glTF, and it is what keeps a high polish from
          // reading as bare roughness.
          clearcoat: /coating_film_enable\s+yes/.test(body) ? 1 : 0,
          clearcoatRoughness: readNumber(body, "coating_roughness") ?? 0
        };
        continue;
      }

      if (kind === "gemstone") {
        const abbe = readNumber(body, "transmission_abbe");
        const ior = readNumber(body, "specular_ior");

        gems[toKey(name)] = {
          name,
          group,
          baseColor: readColor(body, "diffuse_color") || [0.628, 0.628, 0.628],
          // A coloured stone is not a coloured surface: the colour comes from
          // light being absorbed on its way through the stone. That is exactly
          // what attenuation models, so transmission_color belongs there.
          attenuationColor: readColor(body, "transmission_color"),
          ior,
          abbe,
          // Jet and Garnet dim their own surface reflection to half. glTF has
          // the same control in KHR_materials_specular.
          specularWeight: readNumber(body, "specular_weight"),
          // KHR_materials_dispersion defines its strength as 20 / Abbe number.
          // Diamond's 50 gives 0.4, and dispersion is the fire in the stone.
          dispersion: abbe ? Number((20 / abbe).toFixed(4)) : null
        };
        continue;
      }

      skipped.push({ entry, reason: `unsupported root node type "${kind}"` });
    }
  }

  return { metals, gems, skipped, textured };
}

async function main() {
  const inputs = process.argv.slice(2);

  if (inputs.length === 0) {
    console.error("Usage: node scripts/import-matrix-materials.mjs <library.zip> [more.zip ...]");
    process.exitCode = 1;
    return;
  }

  const libraryIndex = process.argv.indexOf("--library");
  const libraryRoot = libraryIndex >= 0 ? process.argv[libraryIndex + 1] : null;
  const { metals, gems, skipped, textured } = await importLibraries(
    inputs.filter((input) => input !== "--library" && input !== libraryRoot),
    { libraryRoot }
  );

  const library = {
    generatedFrom: inputs.map((input) => path.basename(input)),
    note: "Generated by scripts/import-matrix-materials.mjs. Colours are linear, ready for glTF.",
    metals,
    gems
  };

  await mkdir(path.dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, `${JSON.stringify(library, null, 2)}\n`);

  const reasons = skipped.reduce((counts, item) => {
    counts[item.reason] = (counts[item.reason] || 0) + 1;
    return counts;
  }, {});

  console.log(`\n  metals   ${Object.keys(metals).length}`);
  console.log(`  gems     ${Object.keys(gems).length}`);

  for (const [reason, count] of Object.entries(reasons)) {
    console.log(`  skipped  ${count} - ${reason}`);
  }

  if (textured.length) {
    console.log(`\n  ${textured.length} textured material(s) have every map present in the library:`);
    for (const item of textured.slice(0, 3)) {
      console.log(`    ${item.name}`);
      for (const map of item.maps) console.log(`      ${map}`);
    }
    if (textured.length > 3) console.log(`    ...and ${textured.length - 3} more`);
    console.log("    Not imported: their character is in the maps, and the converter");
    console.log("    does not embed textures into the glb yet.");
  }
  console.log(`\n  wrote    ${OUTPUT}\n`);
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  main().catch((error) => {
    console.error(`\n  ${error.message}\n`);
    process.exitCode = 1;
  });
}
