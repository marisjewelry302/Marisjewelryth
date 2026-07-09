"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const DESIGN_RING_DRAFT_KEY = "maris-design-your-ring-draft-v1";
const PRODUCT_CODE = "DESIGN-YOUR-RING";
const SIGNIN_PATH = "/account?mode=signin&next=/design-your-ring";
const SIGNUP_PATH = "/account?mode=signup&next=/design-your-ring";
const OPTION_IMAGE_BASE = "/assets/images/design-your-ring/options";
const PREVIEW_IMAGE_BASE = "/assets/images/design-your-ring/preview";
const MODEL_ASSET_BASE = "/assets/models/design-your-ring";
const STONE_MODEL_SOURCE = `${MODEL_ASSET_BASE}/stones/diamond.glb`;

function optionImage(name) {
  return `${OPTION_IMAGE_BASE}/${name}.webp`;
}

function previewImage(name) {
  return `${PREVIEW_IMAGE_BASE}/${name}.svg`;
}

const STEPS = [
  { id: "metal", label: "Metal", hint: "Choose your metal type" },
  { id: "stone", label: "Stone", hint: "Choose the center stone" },
  { id: "band", label: "Band", hint: "Shape the ring profile" },
  { id: "engrave", label: "Engrave", hint: "Add personal details" },
  { id: "review", label: "Review", hint: "See your ring details" }
];

const RING_STYLES = ["Solitaire", "Pavé", "Halo", "Hidden Halo", "Side Stone", "Natural"];
const STONE_OPTIONS = [
  { value: "Round", imageSrc: optionImage("stone-round") },
  { value: "Oval", imageSrc: optionImage("stone-oval") },
  { value: "Pear", imageSrc: optionImage("stone-pear") },
  { value: "Emerald", imageSrc: optionImage("stone-emerald") },
  { value: "Princess", imageSrc: optionImage("stone-princess") },
  { value: "Marquise", imageSrc: optionImage("stone-marquise") },
  { value: "Heart", imageSrc: optionImage("stone-heart") },
  { value: "Radiant", imageSrc: optionImage("stone-radiant") },
  { value: "Cushion", imageSrc: optionImage("stone-cushion") },
  { value: "Baguette", imageSrc: optionImage("stone-baguette") }
];
const STONE_SHAPES = STONE_OPTIONS.map((stone) => stone.value);
const STONE_COLORS = ["D", "E", "F", "G", "H", "I", "J"];
const STONE_CLARITIES = ["VVS1", "VVS2", "VS1", "VS2", "SI1", "SI2"];
const STONE_CUTS = ["Excellent", "Very Good", "Good", "Fair"];
const ORIGINS = ["Lab-grown", "Natural"];
const GOLD_METALS = new Set(["WG", "YG", "RG"]);
const METALS = [
  { value: "PN", label: "Platinum", shortLabel: "Platinum", swatch: "platinum", imageSrc: optionImage("metal-platinum") },
  { value: "WG", label: "White Gold", shortLabel: "White gold", swatch: "white-gold", imageSrc: optionImage("metal-white-gold") },
  { value: "YG", label: "Yellow Gold", shortLabel: "Yellow gold", swatch: "yellow-gold", imageSrc: optionImage("metal-yellow-gold") },
  { value: "RG", label: "Rose Gold", shortLabel: "Rose gold", swatch: "rose-gold", imageSrc: optionImage("metal-rose-gold") },
  { value: "Pd", label: "Palladium", shortLabel: "Palladium", swatch: "palladium", imageSrc: optionImage("metal-palladium") }
];

const BAND_OPTIONS = [
  { value: "Solitaire", label: "Classic", detail: "2.0 mm", profile: "Soft court", imageSrc: optionImage("band-classic") },
  { value: "Pavé", label: "Pavé", detail: "1.8 mm", profile: "Fine diamond line", imageSrc: optionImage("band-pave") },
  { value: "Halo", label: "Halo", detail: "2.2 mm", profile: "Framed center", imageSrc: optionImage("band-halo") },
  { value: "Hidden Halo", label: "Hidden Halo", detail: "2.0 mm", profile: "Low sparkle", imageSrc: optionImage("band-hidden-halo") },
  { value: "Side Stone", label: "Side Stone", detail: "2.3 mm", profile: "Balanced detail", imageSrc: optionImage("band-side-stone") },
  { value: "Natural", label: "Organic", detail: "2.1 mm", profile: "Soft contour", imageSrc: optionImage("band-organic") }
];

const SETTING_OPTIONS = ["Four Prong", "Six Prong", "Bezel", "Cathedral"];

const DEFAULT_DESIGN = {
  style: "Solitaire",
  stone_shape: "Round",
  carat: "1.00",
  colour: "D",
  clarity: "VS1",
  cut: "Excellent",
  origin: "Lab-grown",
  metal: "PN",
  metal_purity: "",
  setting: "Four Prong",
  ring_size: "6.0",
  engraving_enabled: true,
  engraving_text: "Forever & Always",
  contact_number: ""
};

function getSafeDraft(value) {
  if (!value || typeof value !== "object") {
    return DEFAULT_DESIGN;
  }

  return {
    ...DEFAULT_DESIGN,
    ...Object.fromEntries(
      Object.entries(value).filter(([, item]) => (
        typeof item === "string" || typeof item === "number" || typeof item === "boolean"
      ))
    )
  };
}

function getMetalLabel(value) {
  return METALS.find((metal) => metal.value === value)?.label || value;
}

function getMetalShortLabel(value) {
  return METALS.find((metal) => metal.value === value)?.shortLabel || getMetalLabel(value);
}

function getBandOption(value) {
  return BAND_OPTIONS.find((band) => band.value === value) || BAND_OPTIONS[0];
}

function getStoneOption(value) {
  return STONE_OPTIONS.find((stone) => stone.value === value) || STONE_OPTIONS[0];
}

function getPhoneDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function getStepIndex(stepId) {
  return STEPS.findIndex((step) => step.id === stepId);
}

function getDesignSlug(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatMetalSummary(design) {
  const metalLabel = getMetalLabel(design.metal);
  return [design.metal_purity, metalLabel].filter(Boolean).join(" ");
}

function ToolIcon({ id }) {
  return <span className={`design-ring-tool-icon is-${id}`} aria-hidden="true" />;
}

function ToolRail({ activeStep, onStepChange }) {
  return (
    <nav className="design-ring-tool-rail" aria-label="Design tools">
      {STEPS.map((step) => (
        <button
          key={step.id}
          className={activeStep === step.id ? "is-active" : ""}
          type="button"
          aria-pressed={activeStep === step.id}
          aria-label={`${step.label}: ${step.hint}`}
          data-tooltip={step.hint}
          onClick={() => onStepChange(step.id)}
        >
          <ToolIcon id={step.id} />
          <span>{step.label}</span>
        </button>
      ))}
    </nav>
  );
}

const THREE_METAL_COLORS = {
  platinum: 0xf2efe8,
  "white-gold": 0xfff8ea,
  "yellow-gold": 0xf0bd4f,
  "rose-gold": 0xe4a08d,
  palladium: 0xd8d8d2
};

const THREE_STONE_TRANSFORMS = {
  round: { scale: [1, 1, 0.7] },
  oval: { scale: [0.72, 1.25, 0.62] },
  pear: { scale: [0.74, 1.24, 0.62], rotationZ: Math.PI },
  emerald: { scale: [0.72, 1.12, 0.5], box: true },
  princess: { scale: [0.9, 0.9, 0.5], box: true },
  marquise: { scale: [0.56, 1.42, 0.52] },
  heart: { scale: [1, 1, 0.55], heart: true },
  radiant: { scale: [0.78, 1.14, 0.5], box: true },
  cushion: { scale: [0.9, 0.9, 0.52], box: true },
  baguette: { scale: [0.5, 1.36, 0.44], box: true }
};

const PREVIEW_BAND_LAYER_SLUGS = {
  solitaire: "classic",
  pave: "pave",
  halo: "halo",
  "hidden-halo": "hidden-halo",
  "side-stone": "side-stone",
  natural: "organic"
};

function getPreviewBandLayer(bandSlug, metalSwatch) {
  const layerBand = PREVIEW_BAND_LAYER_SLUGS[bandSlug] || "classic";
  return previewImage(`band-${layerBand}-${metalSwatch || "platinum"}`);
}

function getPreviewStoneLayer(stoneSlug) {
  return previewImage(`stone-${stoneSlug || "round"}`);
}

function getPreviewSettingLayer(metalSwatch) {
  return previewImage(`setting-${metalSwatch || "platinum"}`);
}

function createCurveTube(points, radius, material, options = {}) {
  const curve = new THREE.CatmullRomCurve3(
    points,
    Boolean(options.closed),
    "centripetal",
    0.42
  );
  const geometry = new THREE.TubeGeometry(
    curve,
    options.segments || 96,
    radius,
    options.radialSegments || 24,
    Boolean(options.closed)
  );
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createTaperedCylinderBetween(start, end, radiusTop, radiusBottom, material) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, direction.length(), 32);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createSmallDiamond(x, y, z, radius, material, edgeMaterial) {
  const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(radius, 2), material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(0.24, 0.2, 0.1);
  mesh.castShadow = true;

  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), edgeMaterial);
  edges.position.copy(mesh.position);
  edges.rotation.copy(mesh.rotation);

  const group = new THREE.Group();
  group.add(mesh, edges);
  return group;
}

function createBrilliantStone(options, material, edgeMaterial) {
  const group = new THREE.Group();
  const profile = [
    new THREE.Vector2(0.018, -0.31),
    new THREE.Vector2(0.24, -0.14),
    new THREE.Vector2(0.36, 0.02),
    new THREE.Vector2(0.29, 0.13),
    new THREE.Vector2(0.17, 0.19)
  ];
  const crownGeometry = new THREE.LatheGeometry(profile, 32);
  const crown = new THREE.Mesh(crownGeometry, material);
  crown.castShadow = true;
  crown.receiveShadow = true;

  const table = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.18, 0.018, 32), material);
  table.position.y = 0.19;
  table.castShadow = true;

  const facetLines = new THREE.LineSegments(new THREE.EdgesGeometry(crownGeometry, 16), edgeMaterial);
  group.add(crown, table, facetLines);
  group.scale.set(...options.scale);
  group.rotation.z = options.rotationZ || 0;
  return group;
}

function createStepCutStone(options, material, edgeMaterial) {
  const group = new THREE.Group();
  const bodyGeometry = new THREE.BoxGeometry(0.48, 0.5, 0.24, 4, 4, 1);
  const body = new THREE.Mesh(bodyGeometry, material);
  body.castShadow = true;

  const table = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.32, 0.03, 2, 2, 1), material);
  table.position.z = 0.13;
  table.castShadow = true;

  const stepLines = new THREE.LineSegments(new THREE.EdgesGeometry(bodyGeometry, 18), edgeMaterial);
  group.add(body, table, stepLines);
  group.scale.set(...options.scale);
  return group;
}

function createHeartStone(material, edgeMaterial) {
  const group = new THREE.Group();
  const lobeGeometry = new THREE.SphereGeometry(0.15, 32, 20);
  const pointGeometry = new THREE.ConeGeometry(0.25, 0.34, 7);
  const left = new THREE.Mesh(lobeGeometry, material);
  const right = new THREE.Mesh(lobeGeometry, material);
  const point = new THREE.Mesh(pointGeometry, material);
  left.position.set(-0.1, 0.06, 0);
  right.position.set(0.1, 0.06, 0);
  point.position.set(0, -0.1, 0);
  point.rotation.z = Math.PI;
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(pointGeometry, 18), edgeMaterial);
  edges.position.copy(point.position);
  edges.rotation.copy(point.rotation);
  group.add(left, right, point, edges);
  group.scale.set(1, 1, 0.58);
  return group;
}

function createStoneModel(stoneSlug, material, edgeMaterial) {
  const options = THREE_STONE_TRANSFORMS[stoneSlug] || THREE_STONE_TRANSFORMS.round;
  const group = options.heart
    ? createHeartStone(material, edgeMaterial)
    : options.box
      ? createStepCutStone(options, material, edgeMaterial)
      : createBrilliantStone(options, material, edgeMaterial);

  group.name = "center-stone-group";
  group.position.set(0, 0.46, 0.12);
  group.rotation.x = -0.3;
  return group;
}

function createImportedStoneMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: 0xf8fdff,
    metalness: 0,
    roughness: 0.005,
    transmission: 0.9,
    thickness: 0.46,
    transparent: true,
    opacity: 0.86,
    ior: 2.42,
    clearcoat: 1,
    reflectivity: 1,
    envMapIntensity: 3.6,
    attenuationColor: new THREE.Color(0xe7fbff),
    attenuationDistance: 1.55,
    side: THREE.DoubleSide
  });
}

function disposeThreeObject(object) {
  object.traverse((child) => {
    if (child.geometry) {
      child.geometry.dispose();
    }
    if (child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => material.dispose());
    }
  });
}

function createImportedStoneModel(sourceScene, stoneSlug) {
  let sourceMesh = null;
  sourceScene.traverse((child) => {
    if (!sourceMesh && child.isMesh && child.geometry?.attributes?.position) {
      sourceMesh = child;
    }
  });
  if (!sourceMesh) {
    return null;
  }

  const geometry = sourceMesh.geometry.clone();
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  bounds.getCenter(center);
  bounds.getSize(size);
  geometry.translate(-center.x, -center.y, -center.z);

  const mesh = new THREE.Mesh(geometry, createImportedStoneMaterial());
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const orientedStone = new THREE.Group();
  orientedStone.rotation.x = Math.PI / 2;
  orientedStone.add(mesh);

  const model = new THREE.Group();
  const options = THREE_STONE_TRANSFORMS[stoneSlug] || THREE_STONE_TRANSFORMS.round;
  const topDiameter = Math.max(size.x, size.z, 0.01);
  const importedScale = 0.66 / topDiameter;
  model.name = "center-stone-group";
  model.add(orientedStone);
  model.scale.set(
    importedScale * options.scale[0],
    importedScale * options.scale[1],
    importedScale * Math.max(options.scale[2], 0.52)
  );
  model.position.set(0, 0.46, 0.13);
  model.rotation.z = options.rotationZ || 0;
  model.userData.source = STONE_MODEL_SOURCE;
  return model;
}

function addHalo(group, material, edgeMaterial, radius = 0.4, count = 18) {
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2;
    group.add(createSmallDiamond(
      Math.cos(angle) * radius,
      0.42 + Math.sin(angle) * radius * 0.8,
      0.04,
      0.035,
      material,
      edgeMaterial
    ));
  }
}

function addPaveShoulders(group, material, edgeMaterial) {
  for (let index = 0; index < 8; index += 1) {
    const t = index / 7;
    const x = 0.36 + t * 0.72;
    const y = 0.28 - t * 0.28;
    const z = 0.13;
    group.add(createSmallDiamond(-x, y, z, 0.03, material, edgeMaterial));
    group.add(createSmallDiamond(x, y, z, 0.03, material, edgeMaterial));
  }
}

function createOvalLoop(width, height, centerY, z, radius, material) {
  const points = Array.from({ length: 18 }, (_, index) => {
    const angle = (index / 18) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(angle) * width, centerY + Math.sin(angle) * height, z);
  });
  return createCurveTube(points, radius, material, { closed: true, segments: 120, radialSegments: 18 });
}

function buildRingScene({ bandSlug, metalSwatch, stoneSlug }) {
  const group = new THREE.Group();
  const metalColor = THREE_METAL_COLORS[metalSwatch] || THREE_METAL_COLORS.platinum;
  const metalMaterial = new THREE.MeshPhysicalMaterial({
    color: metalColor,
    metalness: 1,
    roughness: 0.19,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.85,
    reflectivity: 0.98
  });
  const diamondMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xf8fdff,
    metalness: 0,
    roughness: 0.01,
    transmission: 0.84,
    thickness: 0.42,
    transparent: true,
    opacity: 0.82,
    ior: 2.42,
    clearcoat: 1,
    reflectivity: 1,
    envMapIntensity: 3.2,
    attenuationColor: new THREE.Color(0xe7fbff),
    attenuationDistance: 1.8,
    side: THREE.DoubleSide
  });
  const edgeMaterial = new THREE.LineBasicMaterial({
    color: 0xc6e0ea,
    transparent: true,
    opacity: 0.13
  });

  const bandTube = bandSlug === "side-stone" ? 0.072 : 0.062;
  const naturalLift = bandSlug === "natural" ? 0.04 : 0;

  // Shared join points so the shank, shoulders, and gallery connect exactly
  // (previously these used mismatched coordinates, leaving visible gaps).
  const shoulderJoinLeft = new THREE.Vector3(-1.04, -0.02 + naturalLift, 0.05);
  const shoulderJoinRight = new THREE.Vector3(1.04, -0.02 - naturalLift, 0.05);
  const galleryJoinLeft = new THREE.Vector3(-0.29, 0.4, 0.07);
  const galleryJoinRight = new THREE.Vector3(0.29, 0.4, 0.07);

  // The shank is an OPEN arc (finger-side only). It used to close into a
  // second loop over the back of the setting, which produced the stray
  // "double band" artifact.
  const band = createCurveTube([
    shoulderJoinLeft,
    new THREE.Vector3(-1.08, -0.34, 0.02),
    new THREE.Vector3(-0.62, -0.72 - naturalLift, 0.04),
    new THREE.Vector3(0, -0.84, 0.06),
    new THREE.Vector3(0.62, -0.72 + naturalLift, 0.04),
    new THREE.Vector3(1.08, -0.34, 0.02),
    shoulderJoinRight
  ], bandTube, metalMaterial, { closed: false, segments: 160, radialSegments: 28 });
  group.add(band);

  const leftShoulder = createCurveTube([
    shoulderJoinLeft,
    new THREE.Vector3(-0.76, 0.12, 0.1),
    new THREE.Vector3(-0.48, 0.29, 0.14),
    galleryJoinLeft
  ], bandTube * 0.72, metalMaterial, { segments: 90, radialSegments: 22 });
  const rightShoulder = createCurveTube([
    shoulderJoinRight,
    new THREE.Vector3(0.76, 0.12, 0.1),
    new THREE.Vector3(0.48, 0.29, 0.14),
    galleryJoinRight
  ], bandTube * 0.72, metalMaterial, { segments: 90, radialSegments: 22 });
  group.add(leftShoulder, rightShoulder);

  // Fillet spheres at every join hide the seams between separate tube
  // meshes so the shank/shoulders/gallery read as one fused piece, the
  // same trick already used for the prong tips below.
  const shankJointRadius = bandTube * 1.05;
  const galleryJointRadius = bandTube * 0.72 * 1.15;
  [
    [shoulderJoinLeft, shankJointRadius],
    [shoulderJoinRight, shankJointRadius],
    [galleryJoinLeft, galleryJointRadius],
    [galleryJoinRight, galleryJointRadius]
  ].forEach(([point, radius]) => {
    const joint = new THREE.Mesh(new THREE.SphereGeometry(radius, 20, 16), metalMaterial);
    joint.position.copy(point);
    joint.castShadow = true;
    joint.receiveShadow = true;
    group.add(joint);
  });

  const setting = createOvalLoop(0.32, 0.23, 0.42, 0.04, 0.024, metalMaterial);
  group.add(setting);

  for (const [x, y] of [[-0.24, 0.54], [0.24, 0.54], [-0.24, 0.3], [0.24, 0.3]]) {
    const prong = createTaperedCylinderBetween(
      new THREE.Vector3(x, y - 0.16, 0.04),
      new THREE.Vector3(x * 0.9, y + 0.1, 0.12),
      0.017,
      0.03,
      metalMaterial
    );
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.045, 20, 16), metalMaterial);
    tip.position.set(x * 0.9, y + 0.11, 0.12);
    group.add(prong, tip);
  }

  const stone = createStoneModel(stoneSlug, diamondMaterial, edgeMaterial);
  group.add(stone);

  if (bandSlug === "pave" || bandSlug === "halo") {
    addPaveShoulders(group, diamondMaterial, edgeMaterial);
  }

  if (bandSlug === "halo") {
    addHalo(group, diamondMaterial, edgeMaterial, 0.37, 20);
  }

  if (bandSlug === "hidden-halo") {
    addHalo(group, diamondMaterial, edgeMaterial, 0.32, 16);
    group.children.slice(-16).forEach((child) => {
      child.position.y -= 0.1;
      child.position.z -= 0.08;
      child.scale.setScalar(0.74);
    });
  }

  if (bandSlug === "side-stone") {
    group.add(createSmallDiamond(-0.5, 0.34, 0.13, 0.115, diamondMaterial, edgeMaterial));
    group.add(createSmallDiamond(0.5, 0.34, 0.13, 0.115, diamondMaterial, edgeMaterial));
  }

  if (bandSlug === "natural") {
    const contour = createCurveTube([
      new THREE.Vector3(-1.0, -0.18, -0.05),
      new THREE.Vector3(-0.54, -0.55, -0.02),
      new THREE.Vector3(0.08, -0.64, 0.02),
      new THREE.Vector3(0.58, -0.48, -0.02),
      new THREE.Vector3(1.0, -0.16, -0.05)
    ], 0.026, metalMaterial, { segments: 110, radialSegments: 16 });
    group.add(contour);
  }

  group.position.y = 0.1;
  group.rotation.set(-0.22, 0.1, 0);
  group.scale.setScalar(0.94);
  return group;
}

function PhotorealRingPreview({
  bandSlug,
  metalSwatch,
  stoneSlug,
  isHidden,
  onLayerError
}) {
  return (
    <div
      className={`design-ring-photoreal-preview ${isHidden ? "is-hidden" : ""}`}
      data-metal={metalSwatch}
      data-stone={stoneSlug}
      data-band={bandSlug}
      aria-hidden="true"
    >
      <img
        className="design-ring-preview-layer design-ring-preview-shadow-image"
        src={previewImage("shadow-soft")}
        alt=""
        width="1200"
        height="760"
        decoding="async"
        draggable="false"
        onError={onLayerError}
      />
      <img
        className="design-ring-preview-layer design-ring-preview-band-image"
        src={getPreviewBandLayer(bandSlug, metalSwatch)}
        alt=""
        width="1200"
        height="760"
        decoding="async"
        draggable="false"
        onError={onLayerError}
      />
      <img
        className="design-ring-preview-layer design-ring-preview-stone-image"
        src={getPreviewStoneLayer(stoneSlug)}
        alt=""
        width="1200"
        height="760"
        decoding="async"
        draggable="false"
        onError={onLayerError}
      />
      <img
        className="design-ring-preview-layer design-ring-preview-setting-image"
        src={getPreviewSettingLayer(metalSwatch)}
        alt=""
        width="1200"
        height="760"
        decoding="async"
        draggable="false"
        onError={onLayerError}
      />
      <span className="design-ring-preview-light" />
    </div>
  );
}

function InteractiveRingPreview({
  design,
  selectedMetal,
  selectedBand,
  isRotating = true,
  isZoomed = false,
  frameRef
}) {
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const isRotatingRef = useRef(isRotating);
  const stoneSlug = getDesignSlug(design.stone_shape);
  const bandSlug = getDesignSlug(selectedBand.value);
  const metalSwatch = selectedMetal?.swatch || "platinum";
  const [previewLayerFailed, setPreviewLayerFailed] = useState(false);

  useEffect(() => {
    isRotatingRef.current = isRotating;
  }, [isRotating]);
  const engravingText = design.engraving_enabled && design.engraving_text
    ? design.engraving_text
    : "Maris private atelier";

  useEffect(() => {
    setPreviewLayerFailed(false);
  }, [bandSlug, metalSwatch, stoneSlug]);

  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) {
      return undefined;
    }

    let disposed = false;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.debug.checkShaderErrors = false;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    const scene = new THREE.Scene();
    const roomEnvironment = new RoomEnvironment();
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const environment = pmremGenerator.fromScene(roomEnvironment, 0.04).texture;
    scene.environment = environment;
    roomEnvironment.dispose?.();

    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 0.12, 4.1);

    scene.add(new THREE.AmbientLight(0xffffff, 0.68));
    scene.add(new THREE.HemisphereLight(0xffffff, 0xd8ccb6, 0.72));
    const keyLight = new THREE.DirectionalLight(0xffffff, 4.2);
    keyLight.position.set(-2.6, 3.2, 4.2);
    keyLight.castShadow = true;
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0xd7ecf2, 2.1);
    rimLight.position.set(2.8, 1.8, 2.5);
    scene.add(rimLight);
    const warmLight = new THREE.DirectionalLight(0xffe2b8, 1.55);
    warmLight.position.set(0, -1.4, 3.5);
    scene.add(warmLight);

    const ringGroup = buildRingScene({ bandSlug, metalSwatch, stoneSlug });
    scene.add(ringGroup);

    const resize = () => {
      const rect = stage.getBoundingClientRect();
      const width = Math.max(300, Math.round(rect.width));
      const height = Math.max(260, Math.round(rect.height));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    let animationFrame = 0;
    let startedAt = performance.now();

    const render = () => {
      const elapsed = performance.now() - startedAt;
      if (!reduceMotion && isRotatingRef.current) {
        ringGroup.rotation.y = 0.12 + Math.sin(elapsed * 0.0007) * 0.22;
        ringGroup.rotation.x = -0.16 + Math.sin(elapsed * 0.00045) * 0.035;
      }
      renderer.render(scene, camera);
      if (!reduceMotion) {
        animationFrame = window.requestAnimationFrame(render);
      }
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(stage);
    render();

    const loader = new GLTFLoader();
    loader.load(
      STONE_MODEL_SOURCE,
      (gltf) => {
        if (disposed) {
          disposeThreeObject(gltf.scene);
          return;
        }

        const importedStone = createImportedStoneModel(gltf.scene, stoneSlug);
        disposeThreeObject(gltf.scene);
        if (!importedStone || disposed) {
          return;
        }

        const previousStone = ringGroup.getObjectByName("center-stone-group");
        if (previousStone) {
          ringGroup.remove(previousStone);
          disposeThreeObject(previousStone);
        }
        ringGroup.add(importedStone);
        renderer.render(scene, camera);
      },
      undefined,
      () => {
        renderer.render(scene, camera);
      }
    );

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      disposeThreeObject(scene);
      environment.dispose();
      pmremGenerator.dispose();
      renderer.dispose();
      startedAt = 0;
    };
  }, [bandSlug, metalSwatch, stoneSlug]);

  return (
    <figure
      ref={frameRef}
      className={`design-ring-preview-frame ${isZoomed ? "is-zoomed" : ""}`}
      aria-label={`${formatMetalSummary(design)} ${design.stone_shape} ${selectedBand.label} ring preview`}
    >
      <PhotorealRingPreview
        bandSlug={bandSlug}
        metalSwatch={metalSwatch}
        stoneSlug={stoneSlug}
        isHidden={previewLayerFailed}
        onLayerError={() => setPreviewLayerFailed(true)}
      />
      <div
        ref={stageRef}
        className={`design-ring-3d-preview ${previewLayerFailed ? "is-visible-fallback" : ""}`}
        data-metal={selectedMetal?.swatch || "platinum"}
        data-stone={stoneSlug}
        data-band={bandSlug}
        aria-hidden="true"
      >
        <canvas ref={canvasRef} className="design-ring-3d-canvas" />
        <span className="design-ring-3d-sheen" />
      </div>
      <figcaption className="design-ring-engraving-preview" aria-live="polite">
        {engravingText}
      </figcaption>
    </figure>
  );
}

function RingPreviewStudio({ design, selectedBand, onStepChange }) {
  const selectedMetal = METALS.find((metal) => metal.value === design.metal) || METALS[0];
  const frameRef = useRef(null);
  const [isRotating, setIsRotating] = useState(true);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  function toggleFullscreen() {
    const node = frameRef.current;
    if (!node) {
      return;
    }
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      node.requestFullscreen?.();
    }
  }

  return (
    <section className="design-ring-preview-studio" aria-labelledby="design-ring-title">
      <div className="design-ring-studio-heading">
        <p className="design-ring-kicker">Design first, consult next</p>
        <h1 id="design-ring-title">Design Your Ring</h1>
        <p>Create a private ring brief for a Maris consultation.</p>
      </div>

      <InteractiveRingPreview
        design={design}
        selectedMetal={selectedMetal}
        selectedBand={selectedBand}
        isRotating={isRotating}
        isZoomed={isZoomed}
        frameRef={frameRef}
      />

      <div className="design-ring-preview-meta" aria-label="Current preview">
        <span>{getMetalShortLabel(design.metal)}</span>
        <span>{design.stone_shape} brilliant</span>
        <span>{selectedBand.label} band</span>
      </div>

      <div className="design-ring-view-controls" aria-label="Preview controls">
        <button
          type="button"
          className={isRotating ? "is-active" : ""}
          aria-pressed={isRotating}
          aria-label={isRotating ? "Pause 360 degree rotation" : "Resume 360 degree rotation"}
          onClick={() => setIsRotating((current) => !current)}
        >
          <span aria-hidden="true">360</span>
        </button>
        <button
          type="button"
          className={isZoomed ? "is-active" : ""}
          aria-pressed={isZoomed}
          aria-label={isZoomed ? "Zoom out preview" : "Zoom in preview"}
          onClick={() => setIsZoomed((current) => !current)}
        >
          Zoom
        </button>
        <button
          type="button"
          className={isFullscreen ? "is-active" : ""}
          aria-pressed={isFullscreen}
          aria-label={isFullscreen ? "Exit fullscreen preview" : "Open preview fullscreen"}
          onClick={toggleFullscreen}
        >
          {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        </button>
        <button type="button" onClick={() => onStepChange("review")}>Review</button>
      </div>
    </section>
  );
}

function SummaryItem({ label, value, swatch, icon, imageSrc }) {
  return (
    <div className="design-ring-summary-item">
      <span className={`design-ring-summary-mark ${swatch ? `is-${swatch}` : ""}`} aria-hidden="true">
        {imageSrc ? (
          <img src={imageSrc} alt="" width="42" height="42" loading="eager" />
        ) : (
          icon || ""
        )}
      </span>
      <div>
        <span>{label}</span>
        <strong>{value || "-"}</strong>
      </div>
    </div>
  );
}

function DesignSummary({
  design,
  selectedBand,
  status,
  authRequired,
  submitting,
  accountLoading,
  onSave,
  onRequestConsultation
}) {
  const selectedMetal = METALS.find((metal) => metal.value === design.metal);
  const selectedStone = getStoneOption(design.stone_shape);
  const engravingText = design.engraving_enabled
    ? (design.engraving_text || "Inside band")
    : "No engraving";

  return (
    <aside className="design-ring-summary-panel" aria-labelledby="design-ring-summary-title">
      <div className="design-ring-summary-head">
        <p className="design-ring-kicker">Private brief</p>
        <h2 id="design-ring-summary-title">Your Design</h2>
      </div>
      <p className="design-ring-summary-note">
        Saved locally until you request consultation. Maris receives this as a private custom brief.
      </p>

      <div className="design-ring-summary-list">
        <SummaryItem
          label="Metal"
          value={formatMetalSummary(design)}
          swatch={selectedMetal?.swatch}
          imageSrc={selectedMetal?.imageSrc}
        />
        <SummaryItem
          label="Stone"
          value={`${design.stone_shape} Brilliant · ${design.carat} ct`}
          imageSrc={selectedStone.imageSrc}
        />
        <SummaryItem
          label="Band"
          value={`${selectedBand.label} · ${selectedBand.detail}`}
          imageSrc={selectedBand.imageSrc}
        />
        <SummaryItem
          label="Setting"
          value={design.setting}
          icon="⌁"
        />
        <SummaryItem
          label="Engraving"
          value={engravingText}
          icon="Aa"
        />
        <SummaryItem
          label="Ring Size"
          value={`US ${design.ring_size}`}
          icon="↔"
        />
      </div>

      <div className="design-ring-summary-actions">
        <button type="button" onClick={onSave}>
          Save Design
        </button>
        <button type="button" onClick={onRequestConsultation} disabled={submitting || accountLoading}>
          {submitting ? "Sending..." : "Request Consultation"}
        </button>
      </div>

      {authRequired && (
        <div className="design-ring-auth-note" role="status">
          <p>Sign in to send this design to Maris.</p>
          <div>
            <a href={SIGNIN_PATH}>Sign In</a>
            <a href={SIGNUP_PATH}>Create Account</a>
          </div>
        </div>
      )}

      {status.message && (
        <p
          className={`design-ring-message is-${status.type || "info"}`}
          role={status.type === "error" ? "alert" : "status"}
          aria-live="polite"
        >
          {status.message}
        </p>
      )}
    </aside>
  );
}

function OptionButton({ selected, children, onClick, className = "" }) {
  return (
    <button
      className={`design-ring-option-button ${selected ? "is-selected" : ""} ${className}`}
      type="button"
      aria-pressed={selected}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function MetalSwatch({ metal, selected, onClick }) {
  return (
    <button
      className={`design-ring-metal-swatch is-${metal.swatch} ${selected ? "is-selected" : ""}`}
      type="button"
      aria-pressed={selected}
      onClick={onClick}
    >
      <img
        className="design-ring-option-media"
        src={metal.imageSrc}
        alt=""
        width="64"
        height="64"
        loading="eager"
      />
      <strong>{metal.shortLabel}</strong>
    </button>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <label className={`design-ring-field ${className}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function MetalOptions({ design, updateDesign }) {
  return (
    <div className="design-ring-option-zone">
      <div className="design-ring-zone-title">
        <h2>Metal</h2>
        <p>{formatMetalSummary(design)}</p>
      </div>
      <div className="design-ring-metal-list">
        {METALS.map((metal) => (
          <MetalSwatch
            key={metal.value}
            metal={metal}
            selected={design.metal === metal.value}
            onClick={() => updateDesign("metal", metal.value)}
          />
        ))}
      </div>
      {GOLD_METALS.has(design.metal) && (
        <div className="design-ring-segmented" aria-label="Gold purity">
          {["9K", "14K", "18K"].map((purity) => (
            <OptionButton
              key={purity}
              selected={design.metal_purity === purity}
              onClick={() => updateDesign("metal_purity", purity)}
            >
              {purity}
            </OptionButton>
          ))}
        </div>
      )}
    </div>
  );
}

function StoneOptions({ design, updateDesign }) {
  return (
    <div className="design-ring-option-zone">
      <div className="design-ring-zone-title">
        <h2>Stone</h2>
        <p>{design.stone_shape} Brilliant · {design.carat} ct</p>
      </div>
      <div className="design-ring-stone-list">
        {STONE_OPTIONS.map((stone) => (
          <OptionButton
            key={stone.value}
            className="design-ring-stone-option"
            selected={design.stone_shape === stone.value}
            onClick={() => updateDesign("stone_shape", stone.value)}
          >
            <img
              className="design-ring-option-media"
              src={stone.imageSrc}
              alt=""
              width="64"
              height="64"
              loading="eager"
            />
            {stone.value}
          </OptionButton>
        ))}
      </div>
      <div className="design-ring-field-row">
        <Field label="Carat">
          <input
            type="number"
            min="0.2"
            max="5"
            step="0.05"
            value={design.carat}
            onChange={(event) => updateDesign("carat", event.target.value)}
          />
        </Field>
        <Field label="Colour">
          <select value={design.colour} onChange={(event) => updateDesign("colour", event.target.value)}>
            {STONE_COLORS.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </Field>
        <Field label="Clarity">
          <select value={design.clarity} onChange={(event) => updateDesign("clarity", event.target.value)}>
            {STONE_CLARITIES.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </Field>
        <Field label="Cut">
          <select value={design.cut} onChange={(event) => updateDesign("cut", event.target.value)}>
            {STONE_CUTS.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </Field>
        <Field label="Origin">
          <select value={design.origin} onChange={(event) => updateDesign("origin", event.target.value)}>
            {ORIGINS.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </Field>
      </div>
    </div>
  );
}

function BandOptions({ design, updateDesign }) {
  return (
    <div className="design-ring-option-zone">
      <div className="design-ring-zone-title">
        <h2>Band</h2>
        <p>{getBandOption(design.style).label} · {getBandOption(design.style).detail}</p>
      </div>
      <div className="design-ring-band-list">
        {BAND_OPTIONS.map((band) => (
          <OptionButton
            key={band.value}
            className="design-ring-band-option"
            selected={design.style === band.value}
            onClick={() => updateDesign("style", band.value)}
          >
            <img
              className="design-ring-option-media"
              src={band.imageSrc}
              alt=""
              width="88"
              height="64"
              loading="eager"
            />
            <strong>{band.label}</strong>
            <small>{band.profile}</small>
          </OptionButton>
        ))}
      </div>
      <div className="design-ring-segmented" aria-label="Setting">
        {SETTING_OPTIONS.map((setting) => (
          <OptionButton
            key={setting}
            selected={design.setting === setting}
            onClick={() => updateDesign("setting", setting)}
          >
            {setting}
          </OptionButton>
        ))}
      </div>
    </div>
  );
}

function EngraveOptions({ design, updateDesign }) {
  return (
    <div className="design-ring-option-zone">
      <div className="design-ring-zone-title">
        <h2>Engrave</h2>
        <p>Inside band</p>
      </div>
      <div className="design-ring-field-row is-engrave">
        <label className="design-ring-toggle">
          <input
            type="checkbox"
            checked={design.engraving_enabled}
            onChange={(event) => updateDesign("engraving_enabled", event.target.checked)}
          />
          <span>Add engraving</span>
        </label>
        <Field label="Engraving text" className="is-wide">
          <input
            name="engraving_text"
            type="text"
            maxLength={40}
            value={design.engraving_text}
            disabled={!design.engraving_enabled}
            onChange={(event) => updateDesign("engraving_text", event.target.value)}
          />
        </Field>
        <Field label="Ring size">
          <input
            type="number"
            min="5"
            max="16"
            step="0.5"
            value={design.ring_size}
            onChange={(event) => updateDesign("ring_size", event.target.value)}
          />
        </Field>
      </div>
    </div>
  );
}

function ReviewOptions({
  design,
  customer,
  accountLoading,
  contactNumber,
  status,
  submitting,
  updateDesign,
  onSave,
  onSubmit
}) {
  return (
    <div className="design-ring-option-zone is-review">
      <div className="design-ring-zone-title">
        <h2>Review</h2>
        <p>See your ring details before the Maris team reviews them.</p>
      </div>

      <div className="design-ring-review-grid">
        <div>
          <span>Stone specification</span>
          <strong>{design.stone_shape}, {design.carat} ct, {design.colour} {design.clarity} {design.cut}</strong>
        </div>
        <div>
          <span>Atelier handoff</span>
          <strong>{accountLoading ? "Checking account..." : customer ? customer.email : "Sign in required at request"}</strong>
        </div>
        <Field label="Contact number" className="is-wide">
          <input
            type="tel"
            value={contactNumber}
            placeholder="+66"
            onChange={(event) => updateDesign("contact_number", event.target.value)}
          />
        </Field>
      </div>
      <p className="design-ring-review-note">
        Requesting consultation sends this brief to Maris for atelier review. It does not create a confirmed order.
      </p>

      <div className="design-ring-review-actions">
        <button type="button" onClick={onSave}>Save Design</button>
        <button type="button" onClick={onSubmit} disabled={submitting || accountLoading}>
          {submitting ? "Sending..." : "Request Consultation"}
        </button>
      </div>

      {status.requestId && <strong className="design-ring-request-id">Request ID: {status.requestId}</strong>}
      {!contactNumber && customer && <p className="design-ring-muted">Add a contact number before requesting consultation.</p>}
    </div>
  );
}

function BottomOptionTray({
  activeStep,
  design,
  customer,
  accountLoading,
  contactNumber,
  status,
  submitting,
  updateDesign,
  onStepChange,
  onSave,
  onSubmit
}) {
  const activeIndex = getStepIndex(activeStep);
  const activeStepDetails = STEPS[activeIndex] || STEPS[0];
  const nextStep = STEPS[Math.min(activeIndex + 1, STEPS.length - 1)]?.id || "review";

  return (
    <section className="design-ring-bottom-tray" aria-label="Design options">
      <div className="design-ring-tray-current">
        <span>Now editing</span>
        <strong>{activeStepDetails.label}</strong>
        <p>{activeStepDetails.hint}</p>
      </div>

      <div className="design-ring-tray-tabs" role="tablist" aria-label="Design option zones">
        {STEPS.map((step) => (
          <button
            key={step.id}
            className={activeStep === step.id ? "is-active" : ""}
            type="button"
            role="tab"
            aria-selected={activeStep === step.id}
            onClick={() => onStepChange(step.id)}
          >
            <span>{step.label}</span>
            <small className="design-ring-tab-hint">{step.hint}</small>
          </button>
        ))}
      </div>

      <div className="design-ring-tray-body">
        {activeStep === "metal" && <MetalOptions design={design} updateDesign={updateDesign} />}
        {activeStep === "stone" && <StoneOptions design={design} updateDesign={updateDesign} />}
        {activeStep === "band" && <BandOptions design={design} updateDesign={updateDesign} />}
        {activeStep === "engrave" && <EngraveOptions design={design} updateDesign={updateDesign} />}
        {activeStep === "review" && (
          <ReviewOptions
            design={design}
            customer={customer}
            accountLoading={accountLoading}
            contactNumber={contactNumber}
            status={status}
            submitting={submitting}
            updateDesign={updateDesign}
            onSave={onSave}
            onSubmit={onSubmit}
          />
        )}
      </div>

      <button
        className="design-ring-next-zone"
        type="button"
        onClick={() => onStepChange(nextStep)}
        aria-label={activeStep === "review" ? "Stay on review" : `Continue to ${nextStep}`}
      >
        <span aria-hidden="true">›</span>
      </button>
    </section>
  );
}

export default function DesignYourRingClient() {
  const [activeStep, setActiveStep] = useState("metal");
  const [design, setDesign] = useState(DEFAULT_DESIGN);
  const [customer, setCustomer] = useState(null);
  const [accountLoading, setAccountLoading] = useState(true);
  const [draftReady, setDraftReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "", requestId: "" });
  const [authRequired, setAuthRequired] = useState(false);

  useEffect(() => {
    try {
      const draft = window.localStorage.getItem(DESIGN_RING_DRAFT_KEY);
      if (draft) {
        setDesign(getSafeDraft(JSON.parse(draft)));
      }
    } catch {
      setDesign(DEFAULT_DESIGN);
    } finally {
      setDraftReady(true);
    }

    fetch("/api/account/me", { credentials: "same-origin" })
      .then((response) => response.json())
      .then((payload) => setCustomer(payload.customer || false))
      .catch(() => setCustomer(false))
      .finally(() => setAccountLoading(false));
  }, []);

  useEffect(() => {
    if (!draftReady) {
      return;
    }

    localStorage.setItem(DESIGN_RING_DRAFT_KEY, JSON.stringify({
      ...design,
      updatedAt: new Date().toISOString()
    }));
  }, [design, draftReady]);

  const selectedBand = useMemo(() => getBandOption(design.style), [design.style]);
  const contactNumber = String(design.contact_number || customer?.phone || "").trim();
  const phoneDigits = getPhoneDigits(contactNumber);
  const currentStep = STEPS.find((step) => step.id === activeStep) || STEPS[0];

  function updateDesign(key, value) {
    setStatus({ type: "", message: "", requestId: "" });
    setAuthRequired(false);
    setDesign((current) => {
      const next = { ...current, [key]: value };

      if (key === "metal") {
        next.metal_purity = GOLD_METALS.has(value) ? (current.metal_purity || "18K") : "";
      }

      if (key === "engraving_enabled" && !value) {
        next.engraving_text = "";
      }

      return next;
    });
  }

  function saveDesign() {
    localStorage.setItem(DESIGN_RING_DRAFT_KEY, JSON.stringify({
      ...design,
      updatedAt: new Date().toISOString()
    }));
    setStatus({ type: "success", message: "Your design is saved.", requestId: "" });
    setAuthRequired(false);
  }

  function validateBeforeSubmit() {
    if (design.engraving_enabled && !String(design.engraving_text || "").trim()) {
      setStatus({ type: "error", message: "Engraving text is required when engraving is selected.", requestId: "" });
      setActiveStep("engrave");
      return false;
    }

    return true;
  }

  async function submitDesign() {
    setStatus({ type: "", message: "", requestId: "" });
    setAuthRequired(false);

    if (!validateBeforeSubmit()) {
      return;
    }

    if (!customer) {
      saveDesign();
      setAuthRequired(true);
      setActiveStep("review");
      return;
    }

    if (phoneDigits.length < 9 || phoneDigits.length > 15) {
      setStatus({ type: "error", message: "Add a contact number with 9 to 15 digits before requesting consultation.", requestId: "" });
      setActiveStep("review");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/custom-order-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          product_code: PRODUCT_CODE,
          full_name: customer.fullName || "Maris Client",
          company_name: "",
          email: customer.email,
          contact_number: contactNumber,
          custom_options: {
            metal: design.metal,
            metal_purity: GOLD_METALS.has(design.metal) ? design.metal_purity : "",
            ring_size: design.ring_size,
            choose_stone: {
              carat: design.carat,
              color: design.colour,
              clarity: design.clarity,
              cut: design.cut
            },
            origin: design.origin,
            ring_design: {
              style: design.style,
              stone_shape: design.stone_shape,
              setting: design.setting,
              engraving_enabled: design.engraving_enabled,
              engraving_text: design.engraving_enabled ? design.engraving_text.trim() : ""
            }
          }
        })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok && payload.status !== "email_failed") {
        const fieldMessage = Array.isArray(payload.errors) && payload.errors[0]?.message
          ? payload.errors[0].message
          : payload.error;
        setStatus({ type: "error", message: fieldMessage || "Consultation request could not be sent.", requestId: "" });
        return;
      }

      localStorage.removeItem(DESIGN_RING_DRAFT_KEY);
      setActiveStep("review");
      setStatus({
        type: payload.status === "email_failed" ? "warning" : "success",
        message: payload.status === "email_failed"
          ? "Your design was saved. The team notification email needs manual follow-up."
          : "Your design request has been sent to Maris.",
        requestId: payload.requestId || ""
      });
    } catch {
      setStatus({ type: "error", message: "Consultation request could not be sent. Please try again.", requestId: "" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="site-main design-ring-page">
      <div className="design-ring-configurator">
        <header className="design-ring-topbar">
          <div className="design-ring-topbar-copy">
            <span className="design-ring-atelier-mark" aria-hidden="true">M</span>
            <div>
              <span>Custom Design / Ring</span>
              <strong>Maris Jewelry</strong>
            </div>
          </div>
          <div className="design-ring-topbar-actions">
            <span className="design-ring-mobile-progress">
              Step {getStepIndex(activeStep) + 1} of {STEPS.length}: {currentStep.label}
            </span>
            <button type="button" onClick={submitDesign} disabled={submitting || accountLoading}>
              {submitting ? "Sending..." : "Request Consultation"}
            </button>
          </div>
        </header>

        <ToolRail activeStep={activeStep} onStepChange={setActiveStep} />

        <RingPreviewStudio
          design={design}
          selectedBand={selectedBand}
          onStepChange={setActiveStep}
        />

        <DesignSummary
          design={design}
          selectedBand={selectedBand}
          status={status}
          authRequired={authRequired}
          submitting={submitting}
          accountLoading={accountLoading}
          onSave={saveDesign}
          onRequestConsultation={submitDesign}
        />

        <BottomOptionTray
          activeStep={activeStep}
          design={design}
          customer={customer}
          accountLoading={accountLoading}
          contactNumber={contactNumber}
          status={status}
          submitting={submitting}
          updateDesign={updateDesign}
          onStepChange={setActiveStep}
          onSave={saveDesign}
          onSubmit={submitDesign}
        />
      </div>
    </main>
  );
}
