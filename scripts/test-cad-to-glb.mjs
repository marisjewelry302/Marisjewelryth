// End-to-end check for the .3dm -> .glb pipeline.
//
// A real Rhino file is not committed here, so the test builds one: a torus for
// the shank on a "Gold" layer, a sphere for the stone on a "Diamond" layer,
// and separate logo geometry, written out as a genuine .3dm through rhino3dm,
// then read back through the converter exactly as a file from the bench would
// be.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import rhino3dm from "rhino3dm";

import { convert3dm, skuToFileName } from "./cad-to-glb.mjs";
import { metalBaseColour } from "./make-jewellery-materials.mjs";

// Two libraries: measured optics decide colour, the MatrixGold set decides
// finish. See the header of scripts/cad-to-glb.mjs for why they are separate.
const surfaces = JSON.parse(await readFile(new URL("./data/jewellery-surfaces.json", import.meta.url), "utf8"));
const materials = JSON.parse(await readFile(new URL("./data/jewellery-materials.json", import.meta.url), "utf8"));

function torusMesh(rhino, ringRadius, tubeRadius, ringSegments, tubeSegments) {
  const mesh = new rhino.Mesh();
  const vertices = mesh.vertices();
  const faces = mesh.faces();

  for (let i = 0; i < ringSegments; i += 1) {
    const u = (i / ringSegments) * Math.PI * 2;

    for (let j = 0; j < tubeSegments; j += 1) {
      const v = (j / tubeSegments) * Math.PI * 2;
      const x = (ringRadius + tubeRadius * Math.cos(v)) * Math.cos(u);
      const y = (ringRadius + tubeRadius * Math.cos(v)) * Math.sin(u);
      const z = tubeRadius * Math.sin(v);
      vertices.add(x, y, z);
    }
  }

  for (let i = 0; i < ringSegments; i += 1) {
    for (let j = 0; j < tubeSegments; j += 1) {
      const a = i * tubeSegments + j;
      const b = ((i + 1) % ringSegments) * tubeSegments + j;
      const c = ((i + 1) % ringSegments) * tubeSegments + ((j + 1) % tubeSegments);
      const d = i * tubeSegments + ((j + 1) % tubeSegments);
      faces.addTriFace(a, b, c);
      faces.addTriFace(a, c, d);
    }
  }

  return mesh;
}

function sphereMesh(rhino, radius, segments, rings, offsetZ) {
  const mesh = new rhino.Mesh();
  const vertices = mesh.vertices();
  const faces = mesh.faces();

  for (let i = 0; i <= rings; i += 1) {
    const phi = (i / rings) * Math.PI;

    for (let j = 0; j < segments; j += 1) {
      const theta = (j / segments) * Math.PI * 2;
      vertices.add(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi) + offsetZ
      );
    }
  }

  for (let i = 0; i < rings; i += 1) {
    for (let j = 0; j < segments; j += 1) {
      const a = i * segments + j;
      const b = i * segments + ((j + 1) % segments);
      const c = (i + 1) * segments + ((j + 1) % segments);
      const d = (i + 1) * segments + j;
      faces.addTriFace(a, b, c);
      faces.addTriFace(a, c, d);
    }
  }

  return mesh;
}

const rhino = await rhino3dm();
const file = new rhino.File3dm();

const goldLayer = new rhino.Layer();
goldLayer.name = "Gold 18K";
const gemLayer = new rhino.Layer();
gemLayer.name = "Diamond Center";
const logoLayer = new rhino.Layer();
logoLayer.name = "Logo";
const goldIndex = file.layers().add(goldLayer);
const gemIndex = file.layers().add(gemLayer);
const logoIndex = file.layers().add(logoLayer);

const shankAttributes = new rhino.ObjectAttributes();
shankAttributes.layerIndex = goldIndex;
shankAttributes.name = "shank";
file.objects().addMesh(torusMesh(rhino, 8, 1.2, 180, 48), shankAttributes);

const stoneAttributes = new rhino.ObjectAttributes();
stoneAttributes.layerIndex = gemIndex;
stoneAttributes.name = "center stone";
file.objects().addMesh(sphereMesh(rhino, 2.4, 64, 40, 3.4), stoneAttributes);

const logoAttributes = new rhino.ObjectAttributes();
logoAttributes.layerIndex = logoIndex;
logoAttributes.name = "maker logo";
file.objects().addMesh(sphereMesh(rhino, 0.45, 32, 18, -1.1), logoAttributes);

const source = file.toByteArray();
assert.ok(source.length > 0, "the fixture .3dm should have been written");

const BUDGET = 6000;
const { glb, report } = await convert3dm(Buffer.from(source), { budget: BUDGET, metal: "white" });

// The converter read all three layers and kept each visual role separate.
assert.deepEqual(report.layers, ["Gold 18K", "Diamond Center", "Logo"]);
assert.deepEqual(report.parts.map((part) => part.name).sort(), ["gem-center", "logo", "metal"]);
assert.equal(report.skipped.length, 0);

// It cut the piece down to the budget without deleting a whole component.
assert.ok(report.before > 20000, `fixture should start heavy, got ${report.before}`);
assert.ok(report.after <= BUDGET * 1.05, `after ${report.after} should respect the ${BUDGET} budget`);
report.parts.forEach((part) => {
  assert.ok(part.triangles > 200, `${part.name} should survive simplification, got ${part.triangles}`);
  assert.ok(part.simplified, `${part.name} should have been simplified under this budget`);
});

// The file it wrote is a valid glTF binary.
const view = new DataView(glb.buffer, glb.byteOffset, glb.byteLength);
assert.equal(view.getUint32(0, true), 0x46546c67, "magic should be glTF");
assert.equal(view.getUint32(4, true), 2, "glTF 2.0");
assert.equal(view.getUint32(8, true), glb.byteLength, "declared length should match the file");

const jsonLength = view.getUint32(12, true);
assert.equal(view.getUint32(16, true), 0x4e4f534a, "first chunk should be JSON");
assert.equal(jsonLength % 4, 0, "the JSON chunk must be padded to four bytes");

const gltf = JSON.parse(new TextDecoder().decode(new Uint8Array(glb.buffer, glb.byteOffset + 20, jsonLength)));
const binLength = view.getUint32(20 + jsonLength, true);
assert.equal(view.getUint32(24 + jsonLength, true), 0x004e4942, "second chunk should be BIN");
assert.equal(binLength, gltf.buffers[0].byteLength, "buffer length should match the BIN chunk");

// Physics where physics is exact, the bench where it is not.
//
// `--metal white` is 14k white gold, an alloy. Mixing the measured optics of its
// components by volume renders champagne rather than white gold, so the colour
// comes from the bench's own entry for the alloy it casts. Elements stay
// computed - see the platinum alias, and the checks below.
const whiteGold = materials.metals["gold-white-14k-polished"];
const diamond = materials.gems.diamond;
const blackRough = materials.metals["zirconium-black-rough"];
assert.ok(whiteGold, "the MatrixGold library should carry 14k white gold");
assert.ok(diamond, "the MatrixGold library should carry Diamond");
assert.ok(blackRough, "the MatrixGold library should carry the black rough logo source");

// White gold has to read as white. Its blue channel sitting far below its red
// is what champagne looks like, and it is how the computed alloy gave itself
// away.
const whiteRatio = whiteGold.baseColor[2] / whiteGold.baseColor[0];
assert.ok(whiteRatio > 0.75, `white gold should not read warm; blue/red came out ${whiteRatio.toFixed(2)}`);

// The check on the whole computation: pure gold's accepted linear reflectance
// is about 1.00, 0.78, 0.34. If the colour pipeline ever drifts, gold says so
// first.
const gold = surfaces.metals["gold-au"];
assert.ok(Math.abs(gold.baseColor[0] - 1.0) < 0.05, `gold red ${gold.baseColor[0]}`);
assert.ok(Math.abs(gold.baseColor[1] - 0.78) < 0.05, `gold green ${gold.baseColor[1]}`);
assert.ok(Math.abs(gold.baseColor[2] - 0.34) < 0.05, `gold blue ${gold.baseColor[2]}`);

// The bench's diamond, which is what ships, against the real stone: 2.417 with
// an Abbe number near 55.
assert.ok(Math.abs(diamond.ior - 2.417) < 0.01, `diamond ior ${diamond.ior}`);

// The computed library is still generated and still has to be right, even
// though it is not the source any more - it is the reference the bench values
// are judged against, and the place to go if a material is ever missing.
const computedDiamond = surfaces.gems["cubic-carbon-diamond"];
assert.ok(Math.abs(computedDiamond.ior - 2.417) < 0.01, `computed diamond ior ${computedDiamond.ior}`);
assert.ok(Math.abs(computedDiamond.abbe - 55.3) < 3, `computed diamond abbe ${computedDiamond.abbe}`);

// Karat is not a colour choice either: more alloy, paler gold.
assert.ok(
  surfaces.metals["gold-14k-yellow"].baseColor[2] > surfaces.metals["gold-18k-yellow"].baseColor[2],
  "14k should carry more blue than 18k, being further from pure gold"
);
assert.ok(
  surfaces.metals["gold-18k-rose"].baseColor[1] < surfaces.metals["gold-18k-yellow"].baseColor[1],
  "rose gold should be redder than yellow at the same karat"
);

const metalMaterial = gltf.materials.find((material) => material.name === whiteGold.name);
const gemMaterial = gltf.materials.find((material) => material.name === diamond.name);
const logoMaterial = gltf.materials.find((material) => material.name === "Logo Black Rough");
assert.ok(metalMaterial, `the glb should name its metal "${whiteGold.name}"`);
assert.ok(gemMaterial, `the glb should name its stone "${diamond.name}"`);
assert.ok(logoMaterial, "the glb should carry a separate black rough logo material");
assert.equal(metalMaterial.pbrMetallicRoughness.metallicFactor, 1);
assert.deepEqual(metalMaterial.pbrMetallicRoughness.baseColorFactor, [...whiteGold.baseColor, 1]);
assert.equal(metalMaterial.pbrMetallicRoughness.roughnessFactor, whiteGold.roughness);
assert.equal(metalMaterial.extensions.KHR_materials_clearcoat.clearcoatFactor, whiteGold.clearcoat);
assert.equal(metalMaterial.extras.marisRole, "metal");
assert.equal(gemMaterial.extras.marisRole, "gem-center");
assert.equal(logoMaterial.extras.marisRole, "logo");
assert.deepEqual(logoMaterial.pbrMetallicRoughness.baseColorFactor, [...blackRough.baseColor, 1]);
assert.ok(logoMaterial.pbrMetallicRoughness.roughnessFactor >= 0.48, "the black logo should visibly read as rough in PBR");
assert.equal(logoMaterial.extensions, undefined, "a rough logo should not inherit the polished clearcoat");

// White base colour, deliberately: in glTF the base colour of a transmissive
// material tints the light passing through it, so the library's diffuse grey
// would turn a diamond into smoked quartz.
assert.deepEqual(gemMaterial.pbrMetallicRoughness.baseColorFactor, [1, 1, 1, 1]);
assert.equal(gemMaterial.doubleSided, true, "a stone is seen through, so its back facets have to render");
assert.equal(gemMaterial.extensions.KHR_materials_transmission.transmissionFactor, 1);
assert.equal(gemMaterial.extensions.KHR_materials_ior.ior, diamond.ior);
assert.equal(gemMaterial.extensions.KHR_materials_dispersion.dispersion, diamond.dispersion);
assert.ok(gltf.extensionsUsed.includes("KHR_materials_volume"));
assert.ok(gltf.extensionsUsed.includes("KHR_materials_clearcoat"));

// Colours are linear in the library, as glTF requires. Gold is a warm metal, so
// a correctly converted entry has more red than blue by a wide margin; an sRGB
// value left unconverted would be far paler.
const yellowGold = materials.metals["gold-yellow-24-polished"];
assert.ok(yellowGold.baseColor[0] > yellowGold.baseColor[1], "gold is redder than it is green");
assert.ok(yellowGold.baseColor[1] > yellowGold.baseColor[2], "gold is greener than it is blue");
assert.ok(yellowGold.baseColor[2] < 0.3, `24k gold should have little blue in it, got ${yellowGold.baseColor[2]}`);

// A coloured stone is coloured by absorption, not by a painted surface.
const sapphire = materials.gems["gem-sapphire"];
assert.ok(sapphire.attenuationColor, "a coloured stone needs an attenuation colour");
assert.ok(sapphire.attenuationColor[2] > sapphire.attenuationColor[0], "sapphire absorbs its way to blue");

// Anything whose finish came from maps the importer cannot reproduce is left
// out rather than imported as a plain polished metal.
assert.equal(Object.values(materials.metals).some((metal) => /brushed|dirty|damaged/i.test(metal.name)), false);
for (const metal of Object.values(materials.metals)) {
  assert.ok(["Polished", "Matte", "Rough"].includes(metal.group), `unexpected finish group ${metal.group}`);
  assert.ok(metal.roughness >= 0 && metal.roughness <= 1, `${metal.name} roughness out of range`);
  assert.equal(metal.baseColor.length, 3);
}

// Every accessor the spec requires a range for has one, and views stay aligned.
gltf.accessors.forEach((accessor, index) => {
  if (accessor.type === "VEC3" && accessor.min) {
    assert.equal(accessor.min.length, 3, `accessor ${index} min should be a vec3`);
    assert.equal(accessor.max.length, 3, `accessor ${index} max should be a vec3`);
  }
});
gltf.bufferViews.forEach((bufferView, index) => {
  assert.equal(bufferView.byteOffset % 4, 0, `bufferView ${index} should start on a four-byte boundary`);
});
assert.ok(gltf.accessors.some((accessor) => accessor.min && accessor.max), "POSITION accessors carry min/max");

// Z-up to Y-up: a quarter turn about X on the root node.
assert.equal(gltf.nodes.length, 1);
assert.ok(Math.abs(gltf.nodes[0].rotation[0] + Math.SQRT1_2) < 1e-9, "root node should rotate Rhino's Z-up into glTF's Y-up");

// The piece is centred and normalised, so the viewer's near plane is never an issue.
const positionAccessors = gltf.accessors.filter((accessor) => accessor.min && accessor.max);
const min = [Infinity, Infinity, Infinity];
const max = [-Infinity, -Infinity, -Infinity];
positionAccessors.forEach((accessor) => {
  for (let axis = 0; axis < 3; axis += 1) {
    min[axis] = Math.min(min[axis], accessor.min[axis]);
    max[axis] = Math.max(max[axis], accessor.max[axis]);
  }
});
const size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
assert.ok(Math.abs(Math.max(...size) - 1) < 1e-5, `longest axis should normalise to 1, got ${Math.max(...size)}`);
for (let axis = 0; axis < 3; axis += 1) {
  assert.ok(Math.abs(min[axis] + max[axis]) < 1e-5, `axis ${axis} should be centred on the origin`);
}

// The report keeps the real dimensions, which normalising would otherwise lose.
assert.ok(Math.abs(report.sourceSize[0] - 18.4) < 0.2, `source width should be the torus diameter, got ${report.sourceSize[0]}`);

// Naming, so a SKU lands on a predictable file.
assert.equal(skuToFileName("SR 0086 ER"), "sr-0086-er");
assert.equal(skuToFileName("  sr/0086--er "), "sr-0086-er");

// A file with no meshes in it fails loudly, with the fix in the message.
const emptyFile = new rhino.File3dm();
emptyFile.objects().addPointXYZ(0, 0, 0);
await assert.rejects(
  () => convert3dm(Buffer.from(emptyFile.toByteArray()), {}),
  /no cached render mesh|No meshes found/i,
  "an empty document should explain what to do about it"
);

// Baked ambient occlusion rides along as COLOR_0.
//
// Nothing in a browser works out that the underside of a prong is buried in
// metal, so without this the crevices come back as bright as the open top of
// the piece. Cartier ship a baked occlusion map on their metal and nothing
// else; a Rhino render mesh has no UVs to hang a texture on, so it is measured
// per vertex instead. glTF multiplies COLOR_0 into the base colour, which for a
// metal is its reflectance, so the crevices dim without a line of shader code.
const glbMeshes = gltf.meshes.flatMap((mesh) => mesh.primitives);
const metalPrimitive = glbMeshes.find((primitive) => primitive.material === gltf.materials.indexOf(metalMaterial));
const gemPrimitive = glbMeshes.find((primitive) => primitive.material === gltf.materials.indexOf(gemMaterial));

assert.ok(metalPrimitive.attributes.COLOR_0 !== undefined, "the metal should carry baked occlusion");
assert.equal(gemPrimitive.attributes.COLOR_0, undefined, "a stone is lit through, not shaded in its creases");

const occlusionAccessor = gltf.accessors[metalPrimitive.attributes.COLOR_0];
// VEC4 of normalised bytes is the only vertex-colour layout whose elements land
// on four-byte boundaries with no padding, and eight bits is as fine as the map
// Cartier ship.
assert.equal(occlusionAccessor.type, "VEC4");
assert.equal(occlusionAccessor.componentType, 5121);
assert.equal(occlusionAccessor.normalized, true);
assert.equal(
  occlusionAccessor.count,
  gltf.accessors[metalPrimitive.attributes.POSITION].count,
  "one occlusion value per vertex"
);

// It has to have measured something. An all-white attribute would pass every
// check above while doing nothing at all.
const occlusionView = gltf.bufferViews[occlusionAccessor.bufferView];
const binaryStart = glb.byteOffset + 28 + jsonLength;
const occlusionBytes = new Uint8Array(glb.buffer, binaryStart + occlusionView.byteOffset, occlusionView.byteLength);
let darkest = 255;
let brightest = 0;
for (let i = 0; i < occlusionAccessor.count; i += 1) {
  darkest = Math.min(darkest, occlusionBytes[i * 4]);
  brightest = Math.max(brightest, occlusionBytes[i * 4]);
  assert.equal(occlusionBytes[i * 4 + 3], 255, "alpha stays opaque so the multiply leaves it alone");
}
assert.ok(brightest === 255, `an open surface should be left alone, brightest was ${brightest}`);
assert.ok(darkest < 250, `nothing was shaded - darkest vertex was ${darkest}`);

assert.ok(report.ao.vertices > 0);
assert.ok(report.ao.mean > 0 && report.ao.mean < 1, `occlusion mean out of range: ${report.ao.mean}`);

// And it can be turned off, for a piece where the bake is not wanted or a
// converter run that only needs the geometry.
const plain = await convert3dm(Buffer.from(source), { budget: BUDGET, metal: "white", ao: 0 });
const plainJsonLength = new DataView(plain.glb.buffer, plain.glb.byteOffset, plain.glb.byteLength).getUint32(12, true);
const plainGltf = JSON.parse(
  new TextDecoder().decode(new Uint8Array(plain.glb.buffer, plain.glb.byteOffset + 20, plainJsonLength))
);
assert.ok(
  plainGltf.meshes.flatMap((mesh) => mesh.primitives).every((primitive) => primitive.attributes.COLOR_0 === undefined),
  "--no-ao should leave the colour attribute off entirely"
);
assert.equal(plain.report.ao, undefined);

// The viewer's model table and the converter agree on where files go.
const models = await readFile(new URL("../app/lib/product-3d-models.js", import.meta.url), "utf8");
const converter = await readFile(new URL("./cad-to-glb.mjs", import.meta.url), "utf8");
assert.match(models, /const PRODUCT_MODEL_BASE = "\/assets\/models\/products"/);
assert.match(converter, /const PRODUCT_MODEL_DIR = "assets\/models\/products"/);

console.log(`CAD to glTF pipeline checks passed (${report.before.toLocaleString()} -> ${report.after.toLocaleString()} triangles, ${Math.round(glb.byteLength / 1024)} kB).`);
