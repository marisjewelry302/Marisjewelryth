#!/usr/bin/env node
//
// Rhino .3dm -> glTF binary, for the product 3D viewer.
//
//   node scripts/cad-to-glb.mjs <input.3dm> --sku "SR 0086 ER" [options]
//
// A jewellery .3dm holds the manufacturing model: NURBS surfaces, a render mesh
// cached alongside them, and layers named the way the bench names things. This
// reads the cached meshes, sorts them into metal and gem by layer name, cuts the
// triangle count down to something a phone will accept, and writes one .glb.
//
// Options
//   --sku "SR 0086 ER"   product code; decides the output filename
//   --out <path>         write somewhere other than assets/models/products/
//   --budget 90000       triangle ceiling for the whole piece (default 90k, about 2.3 MB)
//   --metal <name>       a metal from the MatrixGold library, or one of the
//                        shorthands yellow | rose | white | platinum
//   --gem <name>         a stone from the library (default diamond)
//   --logo <name>        dark material for separate logo geometry
//   --list-materials     print every metal and stone available, then exit
//   --gem-words a,b,c    extra layer-name keywords that mean "this is a stone"
//   --logo-words a,b,c   extra layer-name keywords that mean "this is a logo"
//   --report-only        inspect and report, write nothing
//
// It never guesses silently: every decision it makes is printed, and anything it
// had to skip is listed at the end.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { bakeVertexOcclusion } from "./vertex-ao.mjs";

import { createRequire } from "node:module";

import rhino3dm from "rhino3dm";
import { MeshoptSimplifier } from "three/examples/jsm/libs/meshopt_simplifier.module.js";

const require = createRequire(import.meta.url);

// Two libraries, each answering the half of the question it can.
//
// `jewellery-surfaces.json` holds what a material *is*: base colours computed
// from measured optical constants by scripts/make-jewellery-materials.mjs, and
// the index of refraction and Abbe number of each stone. Gold is that colour
// because gold reflects those wavelengths, and the working can be checked -
// pure gold lands within three percent of its accepted value.
//
// `jewellery-materials.json` holds what the bench *does* to it: the roughness
// of a polish, a matte, a rough finish, and whether a coating film goes over
// the top. Those are Maris's own choices out of the MatrixGold library and no
// measurement can supply them.
//
// So: physics decides the colour, the bench decides the finish.
const SURFACES = require("./data/jewellery-surfaces.json");
const FINISHES = require("./data/jewellery-materials.json");

const PRODUCT_MODEL_DIR = "assets/models/products";
const DEFAULT_TRIANGLE_BUDGET = 90000;

// The four the catalogue uses. All of them take the bench's own .mkmtl values.
//
// The computed library is still built and still checked - pure gold lands on
// its published reflectance, a flat spectrum renders neutral - but it is not
// what ships. Two reasons, and the second is the one that decided it.
//
// The measurable one: the computation is exact for elements and a first-order
// approximation for alloys, and every piece in this catalogue is an alloy.
// Mixing optical constants by volume renders 14k white gold as champagne.
//
// The one that matters more: these numbers are what Maris renders its own
// product photography with. Matching the stills is the point, and the stills
// are made with these. A physically exact gold that does not match the
// catalogue is the wrong kind of correct.
const METAL_ALIASES = {
  yellow: "gold-18k-polished",
  "yellow-14k": "gold-14k-polished",
  rose: "gold-rose-18k-polished",
  white: "gold-white-14k-polished",
  platinum: "platinum-polished"
};

const DEFAULT_FINISH = "rhodium-polished";

// The coloured Swarovski-style stones carry no index of refraction of their
// own, and no measured curve either; the MatrixGold Crystal entry is 1.8, so
// that is what they inherit rather than glTF's plastic-like default of 1.5.
const DEFAULT_GEM_IOR = 1.8;

function materialKey(name) {
  return String(name).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function resolveMetal(requested) {
  const key = METAL_ALIASES[requested] || materialKey(requested);
  const metal = FINISHES.metals[key];

  if (!metal) {
    throw new Error(
      `Unknown metal "${requested}". Try one of ${Object.keys(METAL_ALIASES).join(", ")}, or run with --list-materials.`
    );
  }

  return {
    name: metal.name,
    baseColor: metal.baseColor,
    source: `MatrixGold: ${metal.group}`,
    roughness: metal.roughness,
    clearcoat: metal.clearcoat,
    clearcoatRoughness: metal.clearcoatRoughness,
    finish: metal.name
  };
}

function resolveGem(requested) {
  const gem = FINISHES.gems[materialKey(requested)];

  if (!gem) {
    throw new Error(`Unknown gem "${requested}". Run with --list-materials to see what is available.`);
  }

  return gem;
}

const GEM_WORDS = [
  "diamond", "diam", "gem", "stone", "cz", "sapphire", "ruby", "emerald", "topaz",
  "amethyst", "crystal", "brilliant", "เพชร", "พลอย"
];

const LOGO_WORDS = ["logo", "engraving", "maker mark", "hallmark", "ตรา", "โลโก้"];

function parseArgs(argv) {
  const args = {
    input: "",
    sku: "",
    out: "",
    budget: DEFAULT_TRIANGLE_BUDGET,
    metal: "yellow",
    gem: "diamond",
    logo: "zirconium-black-rough",
    gemWords: [],
    logoWords: [],
    reportOnly: false,
    listMaterials: false,
    // Rays per vertex for the baked occlusion. 32 is enough for jewellery,
    // where the crevices are narrow and the answer is close to all-or-nothing.
    ao: 32
  };
  const rest = [];

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];

    if (!token.startsWith("--")) {
      rest.push(token);
      continue;
    }

    const next = () => argv[(i += 1)];

    switch (token) {
      case "--sku": args.sku = next(); break;
      case "--out": args.out = next(); break;
      case "--budget": args.budget = Number(next()); break;
      case "--metal": args.metal = next(); break;
      case "--gem": args.gem = next(); break;
      case "--logo": args.logo = next(); break;
      case "--list-materials": args.listMaterials = true; break;
      case "--gem-words": args.gemWords = next().split(",").map((w) => w.trim().toLowerCase()).filter(Boolean); break;
      case "--logo-words": args.logoWords = next().split(",").map((w) => w.trim().toLowerCase()).filter(Boolean); break;
      case "--ao": args.ao = Number(next()); break;
      case "--no-ao": args.ao = 0; break;
      case "--report-only": args.reportOnly = true; break;
      default: throw new Error(`Unknown option ${token}`);
    }
  }

  args.input = rest[0] || "";
  return args;
}

export function skuToFileName(sku) {
  return String(sku)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isGemName(name, extraWords) {
  const haystack = String(name || "").toLowerCase();
  return [...GEM_WORDS, ...extraWords].some((word) => haystack.includes(word));
}

function isLogoName(name, extraWords) {
  const haystack = String(name || "").toLowerCase();
  return [...LOGO_WORDS, ...extraWords].some((word) => haystack.includes(word));
}

function geometryExtent(geometry) {
  const { position } = geometry;
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];

  for (let i = 0; i < position.length; i += 3) {
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], position[i + axis]);
      max[axis] = Math.max(max[axis], position[i + axis]);
    }
  }

  return Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
}

// A solitaire is rendered differently from its tiny accent stones. Keeping a
// clearly dominant stone separate avoids feeding a whole pave field through
// the centre-stone back-facet pass, where overlapping stones can read each
// other's normals. Equal-size stones stay together as accents.
function makeGemParts(geometries) {
  if (geometries.length === 0) return [];
  if (geometries.length === 1) return [{ name: "gem-center", geometry: geometries[0] }];

  const ranked = geometries
    .map((geometry) => ({ geometry, extent: geometryExtent(geometry) }))
    .sort((a, b) => b.extent - a.extent);

  if (ranked[0].extent > ranked[1].extent * 2.25) {
    return [
      { name: "gem-center", geometry: ranked[0].geometry },
      { name: "gem-accent", geometry: weldParts(ranked.slice(1).map((item) => item.geometry)) }
    ];
  }

  return [{ name: "gem-accent", geometry: weldParts(geometries) }];
}

// Rhino stores a mesh per Brep face, and a jewellery model is thousands of
// faces, so everything that belongs to one material is welded into one buffer
// before it is simplified - a simplifier cannot remove an edge it cannot see
// across.
function weldParts(parts) {
  const positions = [];
  const normals = [];
  const indices = [];
  const seen = new Map();

  for (const part of parts) {
    const { position, normal, index } = part;

    for (let i = 0; i < index.length; i += 1) {
      const v = index[i];
      const px = position[v * 3];
      const py = position[v * 3 + 1];
      const pz = position[v * 3 + 2];
      const nx = normal ? normal[v * 3] : 0;
      const ny = normal ? normal[v * 3 + 1] : 0;
      const nz = normal ? normal[v * 3 + 2] : 0;

      // Position and normal both take part in the key: welding on position
      // alone would round the facets off a brilliant cut.
      const key = `${px.toFixed(6)},${py.toFixed(6)},${pz.toFixed(6)},${nx.toFixed(3)},${ny.toFixed(3)},${nz.toFixed(3)}`;
      let target = seen.get(key);

      if (target === undefined) {
        target = positions.length / 3;
        seen.set(key, target);
        positions.push(px, py, pz);
        normals.push(nx, ny, nz);
      }

      indices.push(target);
    }
  }

  return {
    position: new Float32Array(positions),
    normal: new Float32Array(normals),
    index: new Uint32Array(indices)
  };
}

function compact(geometry) {
  const { position, normal, index } = geometry;
  const remap = new Int32Array(position.length / 3).fill(-1);
  const positions = [];
  const normals = [];
  const indices = new Uint32Array(index.length);

  for (let i = 0; i < index.length; i += 1) {
    const source = index[i];

    if (remap[source] === -1) {
      remap[source] = positions.length / 3;
      positions.push(position[source * 3], position[source * 3 + 1], position[source * 3 + 2]);
      normals.push(normal[source * 3], normal[source * 3 + 1], normal[source * 3 + 2]);
    }

    indices[i] = remap[source];
  }

  return {
    position: new Float32Array(positions),
    normal: new Float32Array(normals),
    index: indices
  };
}

function simplifyGeometry(geometry, targetTriangles) {
  const currentTriangles = geometry.index.length / 3;

  if (targetTriangles >= currentTriangles) {
    return { geometry, error: 0, simplified: false };
  }

  const [index, error] = MeshoptSimplifier.simplify(
    geometry.index,
    geometry.position,
    3,
    Math.max(3, Math.floor(targetTriangles) * 3),
    // A generous error ceiling: the target count is what matters, and stopping
    // early on a smooth shank leaves a piece heavier than the phone can take.
    0.05,
    ["LockBorder"]
  );

  return { geometry: compact({ ...geometry, index }), error, simplified: true };
}

// Transforms are kept as a 3x4 row-major matrix - the bottom row of a Rhino
// transform is always [0,0,0,1] for the placements a jewellery file contains.
const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0];
const MAX_BLOCK_DEPTH = 8;

function transformFromRhino(xform) {
  return [
    xform.m00, xform.m01, xform.m02, xform.m03,
    xform.m10, xform.m11, xform.m12, xform.m13,
    xform.m20, xform.m21, xform.m22, xform.m23
  ];
}

function multiplyTransforms(a, b) {
  const out = new Array(12);

  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      out[row * 4 + col] =
        a[row * 4] * b[col] +
        a[row * 4 + 1] * b[4 + col] +
        a[row * 4 + 2] * b[8 + col];
    }

    out[row * 4 + 3] =
      a[row * 4] * b[3] +
      a[row * 4 + 1] * b[7] +
      a[row * 4 + 2] * b[11] +
      a[row * 4 + 3];
  }

  return out;
}

function isIdentityTransform(m) {
  return IDENTITY.every((value, index) => Math.abs(m[index] - value) < 1e-12);
}

// Normals do not survive a matrix the way points do. A pear cut placed with a
// different scale on each axis - which is exactly what this file does - needs
// the inverse transpose, or every facet lights as though it faced elsewhere.
function normalMatrix(m) {
  const [a, b, c, , d, e, f, , g, h, i] = m;
  const determinant = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);

  if (Math.abs(determinant) < 1e-20) {
    return [a, b, c, d, e, f, g, h, i];
  }

  const inverse = 1 / determinant;

  // Inverse, then transposed, written out in one step.
  return [
    (e * i - f * h) * inverse, (f * g - d * i) * inverse, (d * h - e * g) * inverse,
    (c * h - b * i) * inverse, (a * i - c * g) * inverse, (b * g - a * h) * inverse,
    (b * f - c * e) * inverse, (c * d - a * f) * inverse, (a * e - b * d) * inverse
  ];
}

function applyTransform(part, m) {
  if (isIdentityTransform(m)) {
    return part;
  }

  const { position, normal, index } = part;
  const out = new Float32Array(position.length);
  const outNormal = normal ? new Float32Array(normal.length) : null;
  const n = normalMatrix(m);

  for (let i = 0; i < position.length; i += 3) {
    const x = position[i];
    const y = position[i + 1];
    const z = position[i + 2];
    out[i] = m[0] * x + m[1] * y + m[2] * z + m[3];
    out[i + 1] = m[4] * x + m[5] * y + m[6] * z + m[7];
    out[i + 2] = m[8] * x + m[9] * y + m[10] * z + m[11];

    if (!outNormal) continue;

    const nx = normal[i];
    const ny = normal[i + 1];
    const nz = normal[i + 2];
    const tx = n[0] * nx + n[1] * ny + n[2] * nz;
    const ty = n[3] * nx + n[4] * ny + n[5] * nz;
    const tz = n[6] * nx + n[7] * ny + n[8] * nz;
    const length = Math.hypot(tx, ty, tz) || 1;
    outNormal[i] = tx / length;
    outNormal[i + 1] = ty / length;
    outNormal[i + 2] = tz / length;
  }

  return { position: out, normal: outNormal, index };
}

function meshesFromGeometry(rhino, geometry) {
  const type = geometry.objectType;
  const meshes = [];

  if (type === rhino.ObjectType.Mesh) {
    meshes.push(geometry);
    return meshes;
  }

  if (type === rhino.ObjectType.Extrusion) {
    const mesh = geometry.getMesh(rhino.MeshType.Render) || geometry.getMesh(rhino.MeshType.Any);
    if (mesh) meshes.push(mesh);
    return meshes;
  }

  if (type === rhino.ObjectType.Brep) {
    const faces = geometry.faces();

    for (let i = 0; i < faces.count; i += 1) {
      const face = faces.get(i);
      const mesh = face.getMesh(rhino.MeshType.Render) || face.getMesh(rhino.MeshType.Any);
      if (mesh) meshes.push(mesh);
    }

    return meshes;
  }

  return meshes;
}

function bufferFromMesh(mesh) {
  const buffers = mesh.toThreejsBuffers();

  return {
    position: new Float32Array(Object.values(buffers.position)),
    normal: buffers.normal ? new Float32Array(Object.values(buffers.normal)) : null,
    index: new Uint32Array(Object.values(buffers.index))
  };
}

// Walks one object, following block references down into their definitions.
// Stones in a Matrix file are almost always placed as blocks - a single
// Diamond_Pear definition dropped in at a dozen transforms - so a converter that
// ignores them either loses every stone or, worse, keeps the untransformed
// master sitting at the origin inside the shank.
function collectFromObject(rhino, ctx, object, transform, depth, inheritedName) {
  const attributes = object.attributes();

  // Hidden geometry is construction leftovers: cutters, old versions, guides.
  if (depth === 0 && !attributes.visible) {
    ctx.hidden += 1;
    return;
  }

  const geometry = object.geometry();
  const type = geometry.objectType;
  const layerName = ctx.layers[attributes.layerIndex] || "";
  const name = `${inheritedName} ${layerName} ${attributes.name || ""}`.trim();

  if (type === rhino.ObjectType.InstanceReference) {
    if (depth >= MAX_BLOCK_DEPTH) {
      ctx.skipped.push(`${name || "block"} (nested past ${MAX_BLOCK_DEPTH} levels)`);
      return;
    }

    const definition = ctx.definitions.get(geometry.parentIdefId);

    if (!definition) {
      ctx.skipped.push(`${name || "block"} (definition missing from the file)`);
      return;
    }

    const combined = multiplyTransforms(transform, transformFromRhino(geometry.xform));

    // Some MatrixGold files contain duplicate visible block placements at the
    // exact same transform. Keeping both writes coincident triangles, which
    // causes z-fighting and corrupts the back-facet pass used by diamonds.
    const placementKey = `${geometry.parentIdefId}|${combined.map((value) => value.toFixed(6)).join(",")}`;
    if (ctx.instancePlacements.has(placementKey)) {
      ctx.duplicates += 1;
      return;
    }
    ctx.instancePlacements.add(placementKey);
    ctx.blocks += 1;

    for (const id of definition.ids) {
      const member = ctx.objectsById.get(id);
      if (member) {
        collectFromObject(rhino, ctx, member, combined, depth + 1, definition.name || inheritedName);
      }
    }

    return;
  }

  if (type === rhino.ObjectType.Curve || type === rhino.ObjectType.Point || type === rhino.ObjectType.PointSet) {
    // Construction curves are not missing geometry, they are not geometry.
    ctx.ignored += 1;
    return;
  }

  const meshes = meshesFromGeometry(rhino, geometry);

  if (meshes.length === 0) {
    ctx.skipped.push(name || `object on ${layerName || "no layer"}`);
    return;
  }

  const bucket = isGemName(name, ctx.gemWords)
    ? "gem"
    : isLogoName(name, ctx.logoWords) ? "logo" : "metal";
  const transformed = meshes.map((mesh) => applyTransform(bufferFromMesh(mesh), transform));

  // One entry per CAD object or expanded block placement. This lets the gem
  // splitter compare whole stones rather than mistaking individual Brep faces
  // for separate stones.
  ctx.buckets[bucket].push(weldParts(transformed));
}

export async function convert3dm(buffer, options = {}) {
  const {
    budget = DEFAULT_TRIANGLE_BUDGET,
    metal = "yellow",
    gem = "diamond",
    logo = "zirconium-black-rough",
    gemWords = [],
    logoWords = [],
    ao = 32
  } = options;

  const metalMaterial = resolveMetal(metal);
  const gemMaterial = resolveGem(gem);
  const logoMaterial = resolveMetal(logo);

  const rhino = await rhino3dm();
  await MeshoptSimplifier.ready;

  const file = rhino.File3dm.fromByteArray(new Uint8Array(buffer));

  if (!file) {
    throw new Error("That file could not be read as a Rhino .3dm document.");
  }

  const layers = [];
  const layerTable = file.layers();

  for (let i = 0; i < layerTable.count; i += 1) {
    layers.push(layerTable.get(i).name);
  }

  const objects = file.objects();
  const ctx = {
    layers,
    gemWords,
    logoWords,
    buckets: { metal: [], gem: [], logo: [] },
    definitions: new Map(),
    objectsById: new Map(),
    instancePlacements: new Set(),
    skipped: [],
    ignored: 0,
    hidden: 0,
    blocks: 0,
    duplicates: 0
  };

  const definitionTable = file.instanceDefinitions();

  for (let i = 0; i < definitionTable.count; i += 1) {
    const definition = definitionTable.get(i);
    ctx.definitions.set(definition.id, { name: definition.name, ids: definition.getObjectIds() });
  }

  const definitionMemberIds = new Set();
  ctx.definitions.forEach((definition) => definition.ids.forEach((id) => definitionMemberIds.add(id)));

  for (let i = 0; i < objects.count; i += 1) {
    ctx.objectsById.set(objects.get(i).attributes().id, objects.get(i));
  }

  for (let i = 0; i < objects.count; i += 1) {
    const object = objects.get(i);
    const attributes = object.attributes();

    // A block's master geometry also sits in the object table. Drawing it there
    // would put an untransformed copy of every stone at the origin.
    if (attributes.isInstanceDefinitionObject || definitionMemberIds.has(attributes.id)) {
      continue;
    }

    collectFromObject(rhino, ctx, object, IDENTITY, 0, "");
  }

  const { buckets, skipped } = ctx;

  const parts = [];

  for (const [name, list] of Object.entries(buckets)) {
    if (list.length === 0) continue;
    if (name === "gem") {
      parts.push(...makeGemParts(list));
    } else {
      parts.push({ name, geometry: weldParts(list) });
    }
  }

  if (parts.length === 0) {
    throw new Error(
      "No meshes found. The .3dm holds surfaces but no cached render mesh - re-save it from Rhino with 'Save small' turned OFF, or export .obj instead."
    );
  }

  const totalTriangles = parts.reduce((sum, part) => sum + part.geometry.index.length / 3, 0);
  const report = {
    layers,
    skipped,
    ignored: ctx.ignored,
    hidden: ctx.hidden,
    blocks: ctx.blocks,
    duplicates: ctx.duplicates,
    before: totalTriangles,
    parts: []
  };

  // Stones are a small share of the triangles and most of what the eye goes to,
  // so they are not cut down in proportion to the shank. They keep what they
  // have until they alone would take a quarter of the budget.
  const gemParts = parts.filter((part) => part.name.startsWith("gem-"));
  const gemTriangles = gemParts.reduce((sum, part) => sum + part.geometry.index.length / 3, 0);
  const gemBudget = Math.min(gemTriangles, budget * 0.25);
  const metalBudget = Math.max(budget - gemBudget, budget * 0.5);

  // No component is cut below this, or a maker's mark simplifies away to a
  // smear. The floor has to come out of the budget rather than be added on top
  // of it: three components each rescued to the floor is how a 6,000 triangle
  // ceiling quietly became 6,318.
  const FLOOR = 600;
  const wanted = parts.map((part) => {
    const isGem = part.name.startsWith("gem-");
    const triangles = part.geometry.index.length / 3;
    const share = isGem
      ? triangles / Math.max(gemTriangles, 1)
      : triangles / Math.max(totalTriangles - gemTriangles, 1);
    return { part, triangles, target: isGem ? gemBudget * share : metalBudget * share };
  });

  // Anything already at or under the floor keeps what it has and is settled;
  // the rest divide what is left of the budget between them.
  const settled = wanted.filter((entry) => entry.target < FLOOR || entry.triangles <= FLOOR);
  const settledTotal = settled.reduce((sum, entry) => sum + Math.min(entry.triangles, FLOOR), 0);
  const flexible = wanted.filter((entry) => !settled.includes(entry));
  const flexibleWanted = flexible.reduce((sum, entry) => sum + entry.target, 0);
  const remaining = Math.max(0, budget - settledTotal);

  for (const entry of wanted) {
    const target = settled.includes(entry)
      ? Math.min(entry.triangles, FLOOR)
      : (flexibleWanted > 0 ? (entry.target / flexibleWanted) * remaining : entry.target);

    const result = simplifyGeometry(entry.part.geometry, target);
    entry.part.geometry = result.geometry;
    report.parts.push({
      name: entry.part.name,
      triangles: result.geometry.index.length / 3,
      vertices: result.geometry.position.length / 3,
      simplified: result.simplified,
      error: result.error
    });
  }

  // Centre the piece and normalise it to about one unit across. The viewer fits
  // the camera to whatever it is given, but a model saved in metres sits inside
  // the near plane, and one saved in thousandths of an inch sits outside the far
  // one. Normalising removes the whole class of problem.
  let min = [Infinity, Infinity, Infinity];
  let max = [-Infinity, -Infinity, -Infinity];

  for (const part of parts) {
    const { position } = part.geometry;

    for (let i = 0; i < position.length; i += 3) {
      for (let axis = 0; axis < 3; axis += 1) {
        min[axis] = Math.min(min[axis], position[i + axis]);
        max[axis] = Math.max(max[axis], position[i + axis]);
      }
    }
  }

  const sourceSize = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  const center = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  const largest = Math.max(...sourceSize) || 1;
  const scale = 1 / largest;

  for (const part of parts) {
    const { position } = part.geometry;

    for (let i = 0; i < position.length; i += 3) {
      position[i] = (position[i] - center[0]) * scale;
      position[i + 1] = (position[i + 1] - center[1]) * scale;
      position[i + 2] = (position[i + 2] - center[2]) * scale;
    }
  }

  report.sourceSize = sourceSize;
  report.after = parts.reduce((sum, part) => sum + part.geometry.index.length / 3, 0);

  report.materials = {
    metal: metalMaterial.name,
    gem: gemMaterial.name,
    ...(parts.some((part) => part.name === "logo") ? { logo: logoMaterial.name } : {})
  };

  // Baked ambient occlusion, measured now that the piece is at its final size.
  //
  // Nothing in a browser will work out that the underside of a prong is buried
  // in metal, so the shading there comes back as bright as the open top of the
  // piece and the whole thing reads as a plastic model. Cartier ship a baked
  // occlusion map on their metal and nothing else, and this is that measurement
  // without the texture: the Rhino render mesh arrives with no UVs, so it is
  // stored per vertex as COLOR_0, which glTF multiplies into the base colour.
  //
  // Stones are shaded by their own material and light passes through them, so
  // they are not darkened - but they still block, because a stone does cast
  // shade on the setting beneath it.
  if (ao > 0) {
    const shaded = parts.filter((part) => !part.name.startsWith("gem-"));

    if (shaded.length) {
      const startedAt = Date.now();
      const baked = bakeVertexOcclusion(
        shaded.map((part) => part.geometry),
        parts.map((part) => part.geometry),
        { rays: ao }
      );

      let darkest = 1;
      let total = 0;
      let count = 0;

      shaded.forEach((part, index) => {
        part.geometry.color = baked.occlusion[index];
        for (const value of baked.occlusion[index]) {
          darkest = Math.min(darkest, value);
          total += value;
          count += 1;
        }
      });

      report.ao = {
        rays: ao,
        vertices: count,
        mean: total / count,
        darkest,
        seconds: (Date.now() - startedAt) / 1000
      };
    }
  }

  return { glb: writeGlb(parts, metalMaterial, gemMaterial, logoMaterial), report };
}

function alignTo4(value) {
  return (value + 3) & ~3;
}

function writeGlb(parts, metalMaterial, gemMaterial, logoMaterial) {
  const bufferViews = [];
  const accessors = [];
  const chunks = [];
  let offset = 0;

  const pushView = (typedArray, target) => {
    const bytes = new Uint8Array(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength);
    const padded = alignTo4(bytes.byteLength);
    chunks.push({ bytes, padded });
    bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.byteLength, target });
    offset += padded;
    return bufferViews.length - 1;
  };

  // Accessors are numbered as they are pushed rather than by a fixed stride per
  // part, because not every part carries the same attributes: the metal has
  // baked occlusion and the stones do not.
  const pushAccessor = (accessor) => accessors.push(accessor) - 1;

  const primitives = parts.map((part, index) => {
    const { position, normal, index: indices, color } = part.geometry;

    const indexView = pushView(indices, 34963);
    const positionView = pushView(position, 34962);
    const normalView = pushView(normal, 34962);

    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];

    for (let i = 0; i < position.length; i += 3) {
      for (let axis = 0; axis < 3; axis += 1) {
        min[axis] = Math.min(min[axis], position[i + axis]);
        max[axis] = Math.max(max[axis], position[i + axis]);
      }
    }

    const indexAccessor = pushAccessor({ bufferView: indexView, componentType: 5125, count: indices.length, type: "SCALAR" });
    const attributes = {
      POSITION: pushAccessor({ bufferView: positionView, componentType: 5126, count: position.length / 3, type: "VEC3", min, max }),
      NORMAL: pushAccessor({ bufferView: normalView, componentType: 5126, count: normal.length / 3, type: "VEC3" })
    };

    if (color) {
      // Occlusion is one number per vertex, but glTF only carries vertex colour
      // as VEC3 or VEC4. VEC4 of normalised bytes is the one whose elements land
      // on four-byte boundaries without padding, and eight bits is as fine as
      // the occlusion map Cartier ship. Alpha stays opaque so the multiply into
      // baseColorFactor leaves it alone.
      const packed = new Uint8Array(color.length * 4);

      for (let i = 0; i < color.length; i += 1) {
        const value = Math.max(0, Math.min(255, Math.round(color[i] * 255)));
        packed[i * 4] = value;
        packed[i * 4 + 1] = value;
        packed[i * 4 + 2] = value;
        packed[i * 4 + 3] = 255;
      }

      attributes.COLOR_0 = pushAccessor({
        bufferView: pushView(packed, 34962),
        componentType: 5121,
        normalized: true,
        count: color.length,
        type: "VEC4"
      });
    }

    return { attributes, indices: indexAccessor, material: index };
  });

  const materials = parts.map((part) => {
    if (part.name.startsWith("gem-")) {
      const extensions = {
        // A stone is not a coloured surface, it is a lens. Transmission plus the
        // stone's own index of refraction is what makes it read as one.
        KHR_materials_transmission: { transmissionFactor: 1 },
        KHR_materials_ior: { ior: gemMaterial.ior || DEFAULT_GEM_IOR },
        KHR_materials_volume: {
          thicknessFactor: 0.35,
          attenuationDistance: 2,
          // A sapphire is blue because light loses its reds crossing the stone,
          // not because its surface is painted blue. Attenuation is where that
          // belongs, and it is what the library's transmission_color means.
          attenuationColor: gemMaterial.attenuationColor || [1, 1, 1]
        }
      };

      // Dispersion is the fire - white light splitting into colour inside the
      // stone. Only the entries that carry an Abbe number get it.
      if (gemMaterial.dispersion) {
        extensions.KHR_materials_dispersion = { dispersion: gemMaterial.dispersion };
      }

      if (gemMaterial.specularWeight != null) {
        extensions.KHR_materials_specular = { specularFactor: gemMaterial.specularWeight };
      }

      return {
        name: gemMaterial.name,
        extras: { marisRole: part.name },
        pbrMetallicRoughness: {
          // White, deliberately. In glTF the base colour of a transmissive
          // material tints the light passing through it, so the library's
          // diffuse grey (0.63 linear) would swallow a third of the light and
          // turn a diamond into smoked quartz - which is exactly what it did.
          // The stone's colour belongs in attenuation, above, and nowhere else.
          baseColorFactor: [1, 1, 1, 1],
          metallicFactor: 0,
          roughnessFactor: 0
        },
        // A stone seen from the front is also seen through: without the back
        // facets there is nothing inside it to catch the light.
        doubleSided: true,
        extensions
      };
    }

    const isLogo = part.name === "logo";
    const sourceMaterial = isLogo ? logoMaterial : metalMaterial;
    const material = {
      name: isLogo ? "Logo Black Rough" : sourceMaterial.name,
      extras: { marisRole: part.name },
      pbrMetallicRoughness: {
        baseColorFactor: [...sourceMaterial.baseColor, 1],
        metallicFactor: 1,
        // The source library's Rough group still expects Maverick's metal
        // model. A small black logo needs a visibly broad highlight in PBR or
        // it reads as glossy paint, so enforce the requested rough finish.
        roughnessFactor: isLogo ? Math.max(sourceMaterial.roughness, 0.48) : sourceMaterial.roughness
      },
      doubleSided: false
    };

    // The polished sets are a coating film over the metal, which is what keeps
    // a high polish from reading as plain low roughness.
    if (!isLogo && sourceMaterial.clearcoat) {
      material.extensions = {
        KHR_materials_clearcoat: {
          clearcoatFactor: sourceMaterial.clearcoat,
          clearcoatRoughnessFactor: Math.max(sourceMaterial.clearcoatRoughness, 0.025)
        }
      };
    }

    return material;
  });

  const usesGem = parts.some((part) => part.name.startsWith("gem-"));
  const usesMetalClearcoat = parts.some((part) => part.name === "metal") && metalMaterial.clearcoat;
  const extensionsUsed = [
    ...(usesMetalClearcoat ? ["KHR_materials_clearcoat"] : []),
    ...(usesGem
      ? ["KHR_materials_transmission", "KHR_materials_ior", "KHR_materials_volume",
         ...(gemMaterial.dispersion ? ["KHR_materials_dispersion"] : []),
         ...(gemMaterial.specularWeight != null ? ["KHR_materials_specular"] : [])]
      : [])
  ];

  const gltf = {
    asset: { version: "2.0", generator: "maris cad-to-glb" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    // Rhino is Z-up, glTF is Y-up. One rotation on the root node fixes it for
    // every consumer rather than rewriting every vertex.
    nodes: [{ mesh: 0, rotation: [-Math.SQRT1_2, 0, 0, Math.SQRT1_2], name: "piece" }],
    meshes: [{ primitives }],
    materials,
    accessors,
    bufferViews,
    buffers: [{ byteLength: offset }],
    ...(extensionsUsed.length ? { extensionsUsed } : {})
  };

  const binary = new Uint8Array(offset);
  let cursor = 0;

  for (const chunk of chunks) {
    binary.set(chunk.bytes, cursor);
    cursor += chunk.padded;
  }

  const jsonText = JSON.stringify(gltf);
  const jsonBytes = new TextEncoder().encode(jsonText);
  const jsonPadded = alignTo4(jsonBytes.byteLength);
  const json = new Uint8Array(jsonPadded).fill(0x20);
  json.set(jsonBytes);

  const total = 12 + 8 + json.byteLength + 8 + binary.byteLength;
  const glb = new Uint8Array(total);
  const view = new DataView(glb.buffer);

  view.setUint32(0, 0x46546c67, true); // "glTF"
  view.setUint32(4, 2, true);
  view.setUint32(8, total, true);
  view.setUint32(12, json.byteLength, true);
  view.setUint32(16, 0x4e4f534a, true); // "JSON"
  glb.set(json, 20);
  view.setUint32(20 + json.byteLength, binary.byteLength, true);
  view.setUint32(24 + json.byteLength, 0x004e4942, true); // "BIN"
  glb.set(binary, 28 + json.byteLength);

  return glb;
}

function listMaterials() {
  const rows = (entries) => Object.entries(entries)
    .sort(([, a], [, b]) => `${a.group}${a.name}`.localeCompare(`${b.group}${b.name}`))
    .map(([key, value]) => `    ${key.padEnd(30)} ${value.name}`);

  const shorthand = Object.entries(METAL_ALIASES)
    .map(([alias, key]) => `${alias} = ${key}`)
    .join(", ");

  console.log(`\n  metals (--metal <key>)   ${Object.keys(FINISHES.metals).length} from the MatrixGold library`);
  console.log(`    shorthand: ${shorthand}\n`);
  console.log(rows(FINISHES.metals).join("\n"));

  console.log(`\n  gems (--gem <key>)   ${Object.keys(FINISHES.gems).length} from the MatrixGold library\n`);
  console.log(rows(FINISHES.gems).join("\n"));

  console.log(`\n  scripts/data/jewellery-surfaces.json also holds ${Object.keys(SURFACES.metals).length} surfaces and`);
  console.log(`  ${Object.keys(SURFACES.gems).length} stones computed from measured optics, for comparison. They are not used.`);
  console.log("");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.listMaterials) {
    listMaterials();
    return;
  }

  if (!args.input) {
    console.error("Usage: node scripts/cad-to-glb.mjs <input.3dm> --sku \"SR 0086 ER\" [--metal white] [--budget 150000]");
    process.exitCode = 1;
    return;
  }

  if (!args.sku && !args.out && !args.reportOnly) {
    console.error("Give the piece a --sku so the output can be named after it, or pass --out.");
    process.exitCode = 1;
    return;
  }

  const buffer = await readFile(args.input);
  const { glb, report } = await convert3dm(buffer, args);

  const [width, height, depth] = report.sourceSize.map((n) => n.toFixed(2));
  console.log(`\n${path.basename(args.input)}`);
  console.log(`  layers      ${report.layers.length ? report.layers.join(", ") : "(none)"}`);
  console.log(`  size        ${width} x ${height} x ${depth} in file units`);
  console.log(`  triangles   ${report.before.toLocaleString()} -> ${report.after.toLocaleString()}`);
  console.log(`  materials   ${[report.materials.metal, report.materials.gem, report.materials.logo].filter(Boolean).join(" / ")}`);

  for (const part of report.parts) {
    const note = part.simplified ? `simplified, error ${part.error.toFixed(4)}` : "kept whole";
    console.log(`    ${part.name.padEnd(6)} ${String(part.triangles).padStart(8)} tris  (${note})`);
  }

  if (report.ao) {
    const { rays, vertices, mean, darkest, seconds } = report.ao;
    console.log(`  occlusion   ${rays} rays over ${vertices.toLocaleString()} vertices, mean ${mean.toFixed(3)}, darkest ${darkest.toFixed(3)} (${seconds.toFixed(1)}s)`);
  }

  const notes = [];
  if (report.blocks) notes.push(`${report.blocks} block placement(s) expanded`);
  if (report.duplicates) notes.push(`${report.duplicates} duplicate block placement(s) removed`);
  if (report.hidden) notes.push(`${report.hidden} hidden object(s) left out`);
  if (report.ignored) notes.push(`${report.ignored} curve/point object(s) ignored`);
  if (notes.length) console.log(`  notes       ${notes.join(", ")}`);

  if (report.skipped.length) {
    console.log(`  WARNING     ${report.skipped.length} solid(s) had no render mesh and were LOST: ${report.skipped.slice(0, 6).join(", ")}${report.skipped.length > 6 ? " ..." : ""}`);
    console.log("              re-save the .3dm from Rhino with 'Save Small' turned off to keep them.");
  }

  if (args.reportOnly) {
    console.log("\n  --report-only, nothing written.\n");
    return;
  }

  const outPath = args.out || path.join(PRODUCT_MODEL_DIR, `${skuToFileName(args.sku)}.glb`);
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, glb);

  const kb = Math.round(glb.byteLength / 1024);
  console.log(`\n  wrote       ${outPath} (${kb} kB)`);

  if (args.sku) {
    console.log("\n  Add this row to PRODUCT_MODELS in app/lib/product-3d-models.js:");
    console.log(`    "${args.sku.toUpperCase()}": { file: "${path.basename(outPath)}", exposure: 1.12 },\n`);
  }
}

// Only run when invoked directly, so the test can import convert3dm.
if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  main().catch((error) => {
    console.error(`\n  ${error.message}\n`);
    process.exitCode = 1;
  });
}
