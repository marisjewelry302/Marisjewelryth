#!/usr/bin/env node
//
// OpenEXR -> Radiance HDR, downsampled.
//
//   node scripts/exr-to-hdr.mjs <input.exr> <output.hdr> [--size 1024]
//
// Maverick ships its lighting as 4096x2048 EXR. On disk that is small - a
// softbox is mostly black and DWAB compresses it to a few hundred kilobytes -
// but decoded it is around 67 MB of float in memory, which is not something to
// hand a phone. The viewer wants one prefiltered environment anyway, so the
// honest size is 1k, and Radiance HDR is what RGBELoader already reads.
//
// Both formats hold real high dynamic range, so nothing is clipped on the way
// through: a softbox that is 40x brighter than its surround stays 40x brighter.

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { FloatType } from "three";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";

// Radiance's shared-exponent encoding: one mantissa byte per channel plus one
// exponent byte for all three, which is how a float image fits in four bytes a
// pixel without losing its range.
function encodeRgbe(r, g, b) {
  const peak = Math.max(r, g, b);

  if (peak < 1e-32) {
    return [0, 0, 0, 0];
  }

  const exponent = Math.ceil(Math.log2(peak));
  const scale = 255.9999 / 2 ** exponent;

  return [
    Math.max(0, Math.min(255, Math.floor(r * scale))),
    Math.max(0, Math.min(255, Math.floor(g * scale))),
    Math.max(0, Math.min(255, Math.floor(b * scale))),
    exponent + 128
  ];
}

// Box filter. A light source a few pixels across has to keep its total energy
// when the image shrinks, and averaging is what does that - point sampling
// would drop half the softboxes on the floor.
function downsample(source, sourceWidth, sourceHeight, channels, width, height) {
  const out = new Float32Array(width * height * 3);
  const blockX = sourceWidth / width;
  const blockY = sourceHeight / height;

  for (let y = 0; y < height; y += 1) {
    const y0 = Math.floor(y * blockY);
    const y1 = Math.max(y0 + 1, Math.floor((y + 1) * blockY));

    for (let x = 0; x < width; x += 1) {
      const x0 = Math.floor(x * blockX);
      const x1 = Math.max(x0 + 1, Math.floor((x + 1) * blockX));
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;

      for (let sy = y0; sy < y1; sy += 1) {
        for (let sx = x0; sx < x1; sx += 1) {
          const i = (sy * sourceWidth + sx) * channels;
          r += source[i];
          g += source[i + 1];
          b += source[i + 2];
          n += 1;
        }
      }

      const o = (y * width + x) * 3;
      out[o] = r / n;
      out[o + 1] = g / n;
      out[o + 2] = b / n;
    }
  }

  return out;
}

function writeRadiance(pixels, width, height) {
  const header = Buffer.from(
    `#?RADIANCE\nFORMAT=32-bit_rle_rgbe\nSOFTWARE=maris exr-to-hdr\n\n-Y ${height} +X ${width}\n`,
    "ascii"
  );
  // Flat, uncompressed scanlines. A 1k environment is 2 MB before gzip and the
  // route serves it compressed; RLE would save little and risk more.
  const body = Buffer.alloc(width * height * 4);

  for (let i = 0; i < width * height; i += 1) {
    const [r, g, b, e] = encodeRgbe(pixels[i * 3], pixels[i * 3 + 1], pixels[i * 3 + 2]);
    body[i * 4] = r;
    body[i * 4 + 1] = g;
    body[i * 4 + 2] = b;
    body[i * 4 + 3] = e;
  }

  return Buffer.concat([header, body]);
}

export async function exrToHdr(buffer, targetWidth = 1024) {
  // Ask for real floats. Left to itself the loader returns half-float bit
  // patterns in a Uint16Array, and reading those as numbers gives a picture
  // where every pixel is about as bright as every other - which is how this
  // was caught.
  const loader = new EXRLoader().setDataType(FloatType);
  const image = loader.parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));

  const channels = image.data.length / (image.width * image.height);

  if (!(image.data instanceof Float32Array)) {
    throw new Error(`Expected float pixels from the EXR, got ${image.data.constructor.name}`);
  }

  const source = image.data;

  const width = Math.min(targetWidth, image.width);
  const height = Math.max(1, Math.round((width / image.width) * image.height));
  const pixels = downsample(source, image.width, image.height, channels, width, height);

  let peak = 0;
  let mean = 0;

  for (let i = 0; i < pixels.length; i += 3) {
    const luminance = 0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2];
    peak = Math.max(peak, luminance);
    mean += luminance;
  }

  mean /= pixels.length / 3;

  return {
    hdr: writeRadiance(pixels, width, height),
    report: {
      source: `${image.width}x${image.height}`,
      output: `${width}x${height}`,
      channels,
      peakLuminance: peak,
      meanLuminance: mean,
      // How far the brightest light stands above the average. A softbox studio
      // wants this high - that gap is what a facet catches.
      contrastRatio: mean > 0 ? peak / mean : 0
    }
  };
}

async function main() {
  const args = process.argv.slice(2);
  const sizeIndex = args.indexOf("--size");
  const size = sizeIndex >= 0 ? Number(args[sizeIndex + 1]) : 1024;
  const files = args.filter((arg, index) => !arg.startsWith("--") && index !== sizeIndex + 1);

  if (files.length < 2) {
    console.error("Usage: node scripts/exr-to-hdr.mjs <input.exr> <output.hdr> [--size 1024]");
    process.exitCode = 1;
    return;
  }

  const [input, output] = files;
  const { hdr, report } = await exrToHdr(await readFile(input), size);
  await writeFile(output, hdr);

  console.log(`\n  ${path.basename(input)}`);
  console.log(`    ${report.source} -> ${report.output}, ${report.channels} channels`);
  console.log(`    peak ${report.peakLuminance.toFixed(1)}, mean ${report.meanLuminance.toFixed(3)}, contrast ${report.contrastRatio.toFixed(0)}x`);
  console.log(`    wrote ${output} (${Math.round(hdr.length / 1024)} kB)\n`);
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  main().catch((error) => {
    console.error(`\n  ${error.message}\n`);
    process.exitCode = 1;
  });
}
