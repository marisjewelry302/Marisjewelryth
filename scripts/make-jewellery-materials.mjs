#!/usr/bin/env node
//
// Derive material values from measured optical constants.
//
//   node scripts/make-jewellery-materials.mjs "<library>/Shading/IOR"
//
// The MatrixGold materials we imported first are the bench's own, and they are
// right - for Maverick. Rendered here they come out bright and warm enough to
// wash out, because a path tracer and a rasteriser spend a colour differently.
// Cartier does not use a CAD library's numbers either; their white gold is a
// flat neutral 0.539 that no jewellery software would hand you.
//
// So rather than pick numbers by eye, this computes them. The same Maverick
// library ships measured optical constants - the real n and k of gold, platinum,
// rhodium, and the dispersion curves of diamond, ruby and sapphire - and those
// determine what a material looks like. For a metal that is Fresnel reflectance
// at normal incidence, wavelength by wavelength, integrated against human colour
// response. For a stone it is the index of refraction at the sodium line and the
// Abbe number that falls out of the same curve.
//
// Nothing here is a preference. Every number can be checked against the physics,
// and the script prints the check.

import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const OUTPUT = "scripts/data/jewellery-surfaces.json";

// Where the eye is. These are the multi-lobe Gaussian fits to the CIE 1931
// colour matching functions published by Wyman, Sloan and Shirley - accurate to
// about a percent across the visible range, and a great deal shorter than the
// tables they approximate.
function piecewiseGaussian(x, peak, mu, sigmaLow, sigmaHigh) {
  const sigma = x < mu ? sigmaLow : sigmaHigh;
  const t = (x - mu) / sigma;
  return peak * Math.exp(-0.5 * t * t);
}

function colourMatching(nm) {
  return {
    x: piecewiseGaussian(nm, 1.056, 599.8, 37.9, 31.0)
      + piecewiseGaussian(nm, 0.362, 442.0, 16.0, 26.7)
      - piecewiseGaussian(nm, 0.065, 501.1, 20.4, 26.2),
    y: piecewiseGaussian(nm, 0.821, 568.8, 46.9, 40.5)
      + piecewiseGaussian(nm, 0.286, 530.9, 16.3, 31.1),
    z: piecewiseGaussian(nm, 1.217, 437.0, 11.8, 36.0)
      + piecewiseGaussian(nm, 0.681, 459.0, 26.0, 13.8)
  };
}

// The white point of the response above, integrated once. Dividing each channel
// by its own total is what guarantees that a surface reflecting everything
// equally comes out neutral.
//
// Normalising all three by the y integral instead - which is correct for the
// real CIE tables, whose three integrals are equal by construction - is not
// correct for this Gaussian fit, whose are not. Rhodium is what caught it: its
// reflectance is 0.74 to 0.80 across the whole visible range, near enough flat,
// and it was coming out pink.
function responseWhitePoint({ from = 390, to = 730, step = 5 } = {}) {
  let X = 0;
  let Y = 0;
  let Z = 0;

  for (let nm = from; nm <= to; nm += step) {
    const bar = colourMatching(nm);
    X += bar.x;
    Y += bar.y;
    Z += bar.z;
  }

  return { X, Y, Z };
}

// A perfect reflector has to come out white on screen, and getting there takes
// one more step than it looks.
//
// Normalising the tristimulus values so a perfect reflector gives X = Y = Z = 1
// puts it at equal-energy white, which is not sRGB's white. Feed (1, 1, 1)
// through the sRGB matrix and it returns 1.205, 0.948, 0.909 - a warm cast on
// everything, and on top of that the red channel leaves the representable range
// and gets clipped, which is what made gold look almost right while every flat
// metal came out pink. So the white is measured once through the same matrix
// and divided back out.
function whiteBalance() {
  const linear = xyzToLinearSrgb([1, 1, 1]);
  return linear;
}

function xyzToLinearSrgb([X, Y, Z]) {
  return [
    3.2404542 * X - 1.5371385 * Y - 0.4985314 * Z,
    -0.9692660 * X + 1.8760108 * Y + 0.0415560 * Z,
    0.0556434 * X - 0.2040259 * Y + 1.0572252 * Z
  ];
}

// A .ior file is a header line - kind, start, end, count - then that many pairs
// of n and k. Metals are indexed in electron volts, stones in nanometres, which
// is what the leading number distinguishes.
export function parseIor(text) {
  const numbers = text.trim().split(/\s+/).map(Number);
  const [kind, start, end, count] = numbers;
  const samples = [];

  for (let i = 0; i < count; i += 1) {
    const n = numbers[4 + i * 2];
    const k = numbers[5 + i * 2];

    if (!Number.isFinite(n)) break;

    const t = count > 1 ? i / (count - 1) : 0;
    const position = start + (end - start) * t;
    // 1239.841984 eV·nm is the photon energy of one nanometre of wavelength.
    const nm = kind === 1 ? 1239.841984 / position : position;
    samples.push({ nm, n, k: Number.isFinite(k) ? k : 0 });
  }

  return { kind, unit: kind === 1 ? "eV" : "nm", samples: samples.sort((a, b) => a.nm - b.nm) };
}

function sampleAt(samples, nm) {
  if (nm <= samples[0].nm) return samples[0];
  if (nm >= samples[samples.length - 1].nm) return samples[samples.length - 1];

  for (let i = 1; i < samples.length; i += 1) {
    if (samples[i].nm >= nm) {
      const a = samples[i - 1];
      const b = samples[i];
      const t = (nm - a.nm) / (b.nm - a.nm);
      return { nm, n: a.n + (b.n - a.n) * t, k: a.k + (b.k - a.k) * t };
    }
  }

  return samples[samples.length - 1];
}

/**
 * The colour of a metal: Fresnel reflectance at normal incidence, per
 * wavelength, through the eye's response. This is the whole of what makes gold
 * yellow, and it is measured rather than chosen.
 */
export function metalBaseColour(samples, { from = 390, to = 730, step = 5 } = {}) {
  let X = 0;
  let Y = 0;
  let Z = 0;

  for (let nm = from; nm <= to; nm += step) {
    const { n, k } = sampleAt(samples, nm);
    const reflectance = ((n - 1) ** 2 + k * k) / ((n + 1) ** 2 + k * k);
    const bar = colourMatching(nm);

    X += reflectance * bar.x;
    Y += reflectance * bar.y;
    Z += reflectance * bar.z;
  }

  const white = responseWhitePoint({ from, to, step });
  const balance = whiteBalance();
  const linear = xyzToLinearSrgb([X / white.X, Y / white.Y, Z / white.Z])
    .map((c, i) => c / balance[i]);

  return linear.map((c) => Number(Math.min(1, Math.max(0, c)).toFixed(5)));
}

// The three wavelengths the optical industry measures a stone at.
const LINE_F = 486.1;
const LINE_D = 589.3;
const LINE_C = 656.3;

/**
 * A stone's index of refraction and its Abbe number, both straight off the
 * curve. The Abbe number is what decides how much fire the stone has, and it
 * has a definition rather than a taste: how far the blue and red indices sit
 * apart, relative to how far the middle one sits above air.
 */
export function gemOptics(samples) {
  const nF = sampleAt(samples, LINE_F).n;
  const nD = sampleAt(samples, LINE_D).n;
  const nC = sampleAt(samples, LINE_C).n;
  const spread = nF - nC;
  const rawAbbe = Math.abs(spread) > 1e-9 ? (nD - 1) / spread : null;

  // The Abbe number is a small difference between two close numbers, and these
  // curves are sampled every ten nanometres or so. For a stone with real
  // dispersion - a diamond separates its blue and red indices by about 0.025 -
  // that is plenty. For a sapphire, where the gap is a third of that, sampling
  // noise can swamp it and the arithmetic returns a negative or an absurd
  // number. Every gemstone in use sits between about 10 and 90, so anything
  // outside that is reported as unmeasurable rather than passed off as a value.
  const abbe = rawAbbe !== null && rawAbbe >= 10 && rawAbbe <= 90 ? rawAbbe : null;
  const abbeNote = abbe === null && rawAbbe !== null
    ? `computed ${rawAbbe.toFixed(1)}, outside the plausible 10-90 range - the curve is too coarsely sampled for this stone`
    : null;

  // What the stone keeps of the light crossing it. The extinction coefficient
  // is an absorption per unit length; over a millimetre of stone it is what
  // turns a colourless crystal into a ruby.
  let X = 0;
  let Y = 0;
  let Z = 0;
  const millimetre = 1e6;

  for (let nm = 390; nm <= 730; nm += 5) {
    const { k } = sampleAt(samples, nm);
    const alpha = (4 * Math.PI * k) / nm;
    const transmitted = Math.exp(-alpha * millimetre);
    const bar = colourMatching(nm);

    X += transmitted * bar.x;
    Y += transmitted * bar.y;
    Z += transmitted * bar.z;
  }

  const white = responseWhitePoint();
  const balance = whiteBalance();
  const attenuation = xyzToLinearSrgb([X / white.X, Y / white.Y, Z / white.Z])
    .map((c, i) => Number(Math.min(1, Math.max(0, c / balance[i])).toFixed(5)));

  const saturated = attenuation.some((c) => c <= 0.001);

  return {
    ior: Number(nD.toFixed(4)),
    abbe: abbe ? Number(abbe.toFixed(1)) : null,
    abbeNote,
    // KHR_materials_dispersion states its strength as 20 / Abbe number.
    dispersion: abbe ? Number((20 / abbe).toFixed(4)) : null,
    attenuationColor: attenuation,
    // Absorption is quoted here over one millimetre of stone. A real piece is
    // several millimetres across and the colour deepens with the path, so this
    // is a starting point to scale rather than a finished value - and where a
    // channel has already gone to zero the millimetre was too long to tell us
    // anything.
    attenuationPathMm: 1,
    attenuationSaturated: saturated,
    colourless: attenuation.every((c) => c > 0.97)
  };
}

// Karat gold is an alloy, and the library only measures pure elements. Mixing
// the optical constants by volume fraction and then taking Fresnel of the
// result is an effective-medium approximation - not the exact answer a
// Bruggeman model would give, but it moves in the right direction for the right
// reason, and it is checkable: 18k comes out paler than 24k, rose comes out
// redder, both by the amount the copper and silver in them would suggest.
//
// The recipes are the ordinary trade ones. A bench that alloys differently
// should edit them here rather than nudge a colour later.
const ALLOYS = {
  "gold-24k": { label: "Gold 24k", mix: { "gold-au": 1 } },
  "gold-18k-yellow": { label: "Gold 18k Yellow", mix: { "gold-au": 0.75, "silver-ag": 0.125, "copper-cu": 0.125 } },
  "gold-18k-rose": { label: "Gold 18k Rose", mix: { "gold-au": 0.75, "copper-cu": 0.205, "silver-ag": 0.045 } },
  "gold-14k-yellow": { label: "Gold 14k Yellow", mix: { "gold-au": 0.585, "silver-ag": 0.2, "copper-cu": 0.215 } },
  "gold-14k-rose": { label: "Gold 14k Rose", mix: { "gold-au": 0.585, "copper-cu": 0.325, "silver-ag": 0.09 } },
  // White gold is alloyed with palladium, and then almost always rhodium
  // plated. What a customer sees is the plating, so `rodium-rh` is the honest
  // surface for a finished white piece; this is the bare alloy, for the rare
  // piece that is not plated.
  "gold-18k-white": { label: "Gold 18k White (unplated)", mix: { "gold-au": 0.75, "palladium-pd": 0.25 } },
  "gold-14k-white": { label: "Gold 14k White (unplated)", mix: { "gold-au": 0.585, "palladium-pd": 0.415 } }
};

function mixSamples(elements, mix, { from = 390, to = 730, step = 5 }) {
  const samples = [];

  for (let nm = from; nm <= to; nm += step) {
    let n = 0;
    let k = 0;

    for (const [element, fraction] of Object.entries(mix)) {
      const source = elements[element];
      if (!source) throw new Error(`Alloy needs ${element}, which is not in the library`);
      const at = sampleAt(source, nm);
      n += at.n * fraction;
      k += at.k * fraction;
    }

    samples.push({ nm, n, k });
  }

  return samples;
}

function toKey(name) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function main() {
  const root = process.argv[2];

  if (!root) {
    console.error('Usage: node scripts/make-jewellery-materials.mjs "<library>/Shading/IOR"');
    process.exitCode = 1;
    return;
  }

  const metals = {};
  const gems = {};

  for (const file of await readdir(path.join(root, "Elements"))) {
    if (!file.endsWith(".ior")) continue;
    const name = file.replace(/\.ior$/, "");
    const { samples, unit } = parseIor(await readFile(path.join(root, "Elements", file), "latin1"));
    if (samples.length < 8) continue;

    metals[toKey(name)] = {
      name,
      source: `Shading/IOR/Elements/${file} (${samples.length} samples, ${unit})`,
      baseColor: metalBaseColour(samples),
      metallic: 1
    };
  }

  // Alloys, mixed from the elements just read.
  const elementSamples = {};

  for (const file of await readdir(path.join(root, "Elements"))) {
    if (!file.endsWith(".ior")) continue;
    const { samples } = parseIor(await readFile(path.join(root, "Elements", file), "latin1"));
    if (samples.length >= 8) elementSamples[toKey(file.replace(/\.ior$/, ""))] = samples;
  }

  for (const [key, alloy] of Object.entries(ALLOYS)) {
    const samples = mixSamples(elementSamples, alloy.mix, { from: 390, to: 730, step: 5 });
    metals[key] = {
      name: alloy.label,
      source: `mixed from ${Object.entries(alloy.mix).map(([e, f]) => `${Math.round(f * 100)}% ${e}`).join(", ")}`,
      baseColor: metalBaseColour(samples),
      metallic: 1,
      alloy: alloy.mix
    };
  }

  for (const file of await readdir(path.join(root, "Gemstones"))) {
    if (!file.endsWith(".ior")) continue;
    const name = file.replace(/\.ior$/, "");
    const { samples, unit } = parseIor(await readFile(path.join(root, "Gemstones", file), "latin1"));
    if (samples.length < 8) continue;

    gems[toKey(name)] = {
      name,
      source: `Shading/IOR/Gemstones/${file} (${samples.length} samples, ${unit})`,
      ...gemOptics(samples)
    };
  }

  await mkdir(path.dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, `${JSON.stringify({
    note: "Computed by scripts/make-jewellery-materials.mjs from measured optical constants. Colours are linear.",
    metals,
    gems
  }, null, 2)}\n`);

  const show = (v) => v.map((c) => c.toFixed(3)).join(", ");
  console.log(`\n  metals ${Object.keys(metals).length}, gems ${Object.keys(gems).length} -> ${OUTPUT}\n`);
  console.log("  metal                       linear base colour        ratio to red");

  for (const key of ["gold-au", "gold-18k-yellow", "gold-14k-yellow", "gold-18k-rose", "gold-14k-rose", "silver-ag", "platinum-pt", "palladium-pd", "rodium-rh", "copper-cu"]) {
    const metal = metals[key];
    if (!metal) continue;
    const [r, g, b] = metal.baseColor;
    console.log(`    ${metal.name.padEnd(22)} ${show(metal.baseColor)}     1 : ${(g / r).toFixed(2)} : ${(b / r).toFixed(2)}`);
  }

  console.log("\n  Gold's accepted linear reflectance is about 1.00, 0.78, 0.34 - the check on all of this.\n");
  console.log("  stone                       ior      abbe    dispersion  attenuation");

  for (const gem of Object.values(gems)) {
    const flag = gem.abbeNote ? "  <- abbe unusable" : (gem.attenuationSaturated ? "  <- absorption saturated at 1 mm" : "");
    console.log(`    ${gem.name.padEnd(24)} ${String(gem.ior).padEnd(8)} ${String(gem.abbe ?? "-").padEnd(7)} ${String(gem.dispersion ?? "-").padEnd(11)} ${show(gem.attenuationColor)}${flag}`);
  }

  console.log("");
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  main().catch((error) => {
    console.error(`\n  ${error.message}\n`);
    process.exitCode = 1;
  });
}
