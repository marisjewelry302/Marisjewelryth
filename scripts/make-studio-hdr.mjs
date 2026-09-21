#!/usr/bin/env node
//
// Build a jewellery studio as an equirectangular HDR.
//
//   node scripts/make-studio-hdr.mjs assets/env/maris-studio.hdr
//
// Why generate one rather than ship a photograph.
//
// A polished shank is a mirror, so what it shows is the room, and the room has
// to have edges in it. The two ends of the shelf both fail: a photographed room
// carries its dark ceiling, and the metal picks up wide black bands; a wrapping
// softbox is so even that there is nothing to reflect and the metal goes flat
// and hazy. What a jewellery photograph is actually lit with sits between them -
// a few bright panels with real gaps between them, over a fill bright enough
// that the shadow side never goes black.
//
// Made here, those are three numbers instead of a search: how bright the panels
// are, how much fill sits behind them, how soft the edges fall off. It is also
// a few hundred kilobytes of our own making, with no third-party licence
// attached to it.

import { writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const DEFAULTS = {
  width: 512,
  // Bright rectangles, in degrees. `azimuth`/`elevation` place the centre,
  // `width`/`height` give the size, `intensity` is in the same linear units as
  // the fill.
  //
  // Several of them, not two or three. A shank is a curved mirror: it sweeps
  // through most of the upper hemisphere across its length, and wherever it
  // finds no source it shows a long dull stretch. What reads as polished metal
  // in a catalogue photograph is a run of separate highlights with definition
  // between them, which takes a ring of panels rather than one big soft one.
  // A tall key above the front, and a circle of narrower panels around it.
  panels: [
    { azimuth: -30, elevation: 62, width: 80, height: 46, intensity: 11 },
    { azimuth: 45, elevation: 30, width: 34, height: 46, intensity: 7 },
    { azimuth: 110, elevation: 44, width: 30, height: 38, intensity: 5.5 },
    { azimuth: 165, elevation: 22, width: 34, height: 42, intensity: 4.5 },
    { azimuth: -110, elevation: 34, width: 32, height: 44, intensity: 6 },
    { azimuth: -165, elevation: 14, width: 30, height: 34, intensity: 3.5 },
    { azimuth: 10, elevation: -34, width: 70, height: 40, intensity: 1.6 }
  ],
  // The room the panels hang in. Never zero: the underside of a ring is lit by
  // what bounces off the table, and a black floor reads as a hole.
  fillTop: 0.55,
  fillHorizon: 0.42,
  fillBottom: 0.3,
  // How far the edge of a panel takes to fade, in degrees. Sharp enough to show
  // as an edge in the metal, soft enough not to alias into a staircase.
  falloff: 9
};

function smoothstep(edge0, edge1, x) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// Shortest way round the circle, so a panel may sit across the seam.
function angleDelta(a, b) {
  let delta = ((a - b + 180) % 360 + 360) % 360 - 180;
  return Math.abs(delta);
}

function panelWeight(panel, azimuth, elevation, falloff) {
  const halfWidth = panel.width / 2;
  const halfHeight = panel.height / 2;
  const dx = angleDelta(azimuth, panel.azimuth);
  const dy = Math.abs(elevation - panel.elevation);

  const horizontal = 1 - smoothstep(halfWidth - falloff, halfWidth, dx);
  const vertical = 1 - smoothstep(halfHeight - falloff, halfHeight, dy);

  if (horizontal * vertical <= 0) {
    return 0;
  }

  // A panel is not a flat patch of one value, and this is what a flat patch
  // costs: reflect it and the metal shows a single tone, so sharpening the
  // reflection changes nothing and the shank reads as satin no matter how the
  // edges are drawn. A real softbox is brightest at its middle and falls away
  // towards the frame, and it is that gradient sliding across a curved surface
  // that draws the long highlight down a shank.
  const radial = Math.sqrt((dx / halfWidth) ** 2 + (dy / halfHeight) ** 2);
  const core = 1 - 0.55 * Math.min(1, radial) ** 1.7;

  return horizontal * vertical * core;
}

export function buildStudio(options = {}) {
  const config = { ...DEFAULTS, ...options };
  const width = config.width;
  const height = Math.round(width / 2);
  const pixels = new Float32Array(width * height * 3);

  for (let y = 0; y < height; y += 1) {
    // Equirectangular: the top row is straight up, the bottom row straight down.
    const elevation = 90 - ((y + 0.5) / height) * 180;
    const above = Math.max(0, elevation) / 90;
    const below = Math.max(0, -elevation) / 90;
    const fill = above * config.fillTop + below * config.fillBottom
      + (1 - above - below) * config.fillHorizon;

    for (let x = 0; x < width; x += 1) {
      const azimuth = ((x + 0.5) / width) * 360 - 180;
      let value = fill;

      for (const panel of config.panels) {
        value += panel.intensity * panelWeight(panel, azimuth, elevation, config.falloff);
      }

      const offset = (y * width + x) * 3;
      // Neutral by choice. A tint here would land on every piece in the
      // catalogue at once, and white metal is the hardest thing to keep honest.
      pixels[offset] = value;
      pixels[offset + 1] = value;
      pixels[offset + 2] = value;
    }
  }

  return { pixels, width, height, config };
}

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

// Radiance's adaptive run-length encoding, per channel per scanline. A
// photographed room barely compresses; a generated one is mostly smooth
// gradient and drops to a fraction of its size, which is what makes a sharp
// 1024-wide environment affordable to ship.
function encodeScanline(component, width) {
  const out = [];
  let i = 0;

  while (i < width) {
    // How far the current value repeats.
    let run = 1;
    while (i + run < width && component[i + run] === component[i] && run < 127) run += 1;

    if (run >= 4) {
      out.push(128 + run, component[i]);
      i += run;
      continue;
    }

    // Otherwise gather a literal stretch, stopping before a run worth encoding.
    let literal = 0;
    while (i + literal < width && literal < 128) {
      let ahead = 1;
      while (i + literal + ahead < width && component[i + literal + ahead] === component[i + literal] && ahead < 5) ahead += 1;
      if (ahead >= 4) break;
      literal += 1;
    }

    out.push(literal);
    for (let k = 0; k < literal; k += 1) out.push(component[i + k]);
    i += literal;
  }

  return out;
}

export function writeRadiance(pixels, width, height) {
  const header = Buffer.from(
    `#?RADIANCE
FORMAT=32-bit_rle_rgbe
SOFTWARE=maris make-studio-hdr

-Y ${height} +X ${width}
`,
    "ascii"
  );

  const scanlines = [];
  const channels = [new Uint8Array(width), new Uint8Array(width), new Uint8Array(width), new Uint8Array(width)];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 3;
      const [r, g, b, e] = encodeRgbe(pixels[offset], pixels[offset + 1], pixels[offset + 2]);
      channels[0][x] = r;
      channels[1][x] = g;
      channels[2][x] = b;
      channels[3][x] = e;
    }

    // The marker that says "this scanline is run-length encoded", then the
    // width split across two bytes.
    const line = [2, 2, (width >> 8) & 0xff, width & 0xff];
    for (const component of channels) line.push(...encodeScanline(component, width));
    scanlines.push(Buffer.from(line));
  }

  return Buffer.concat([header, ...scanlines]);
}

async function main() {
  const args = process.argv.slice(2);
  const output = args.find((a) => !a.startsWith("--")) || "assets/env/maris-studio.hdr";
  const read = (name, fallback) => {
    const index = args.indexOf(`--${name}`);
    return index >= 0 ? Number(args[index + 1]) : fallback;
  };

  const fill = read("fill", DEFAULTS.fillHorizon);
  const gain = read("gain", 1);
  // How much of the sphere the panels cover. Small and bright beats large and
  // dim: a highlight has to survive the tone mapper as a highlight.
  const spread = read("spread", 1);

  const overrides = {
    width: read("size", DEFAULTS.width),
    // One number moves the whole room up or down; the panels keep their ratio
    // to each other so the key stays the key.
    fillHorizon: fill,
    fillTop: fill * (DEFAULTS.fillTop / DEFAULTS.fillHorizon),
    fillBottom: fill * (DEFAULTS.fillBottom / DEFAULTS.fillHorizon),
    panels: DEFAULTS.panels.map((panel) => ({
      ...panel,
      width: panel.width * spread,
      height: panel.height * spread,
      intensity: panel.intensity * gain
    })),
    falloff: read("falloff", DEFAULTS.falloff)
  };

  const { pixels, width, height, config } = buildStudio(overrides);
  const hdr = writeRadiance(pixels, width, height);
  await writeFile(output, hdr);

  let peak = 0;
  let mean = 0;

  for (let i = 0; i < pixels.length; i += 3) {
    peak = Math.max(peak, pixels[i]);
    mean += pixels[i];
  }

  mean /= pixels.length / 3;

  console.log(`\n  ${path.basename(output)}`);
  console.log(`    ${width}x${height}, ${config.panels.length} panels, falloff ${config.falloff} degrees`);
  let bright = 0;
  for (let i = 0; i < pixels.length; i += 3) if (pixels[i] > 2) bright += 1;
  const coverage = (bright / (pixels.length / 3)) * 100;

  console.log(`    peak ${peak.toFixed(2)}, mean ${mean.toFixed(3)}, contrast ${(peak / mean).toFixed(0)}x, ${coverage.toFixed(2)}% over 2.0`);
  console.log("    Cartier's own map, for reference: peak 40.0, mean 0.89, contrast 45x, 3.64% over 2.0");
  console.log(`    wrote ${output} (${Math.round(hdr.length / 1024)} kB)\n`);
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  main().catch((error) => {
    console.error(`\n  ${error.message}\n`);
    process.exitCode = 1;
  });
}
