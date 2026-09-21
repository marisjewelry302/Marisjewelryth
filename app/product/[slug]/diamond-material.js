// A stone that behaves like a stone.
//
// three's own transmission bends a ray once, in screen space, against whatever
// happens to be drawn behind the mesh. That is enough for a window pane and
// nothing like a brilliant cut, where the look comes from light entering the
// crown, bouncing off the pavilion facets several times under total internal
// reflection, and leaving somewhere else entirely. Maverick gets this right by
// path-tracing; the MatrixGold material gives it four numbers and it does the
// rest. A rasteriser has to be told how.
//
// So: render the stone's back facets to a buffer first, then for every front
// facet refract into the stone, meet the facet on the far side, and sample the
// studio in the direction the ray leaves by. Do that three times at three
// slightly different indices of refraction and the exit directions separate
// into colour, which is the fire.
//
// The same four numbers from the .mkmtl drive all of it - index of refraction,
// Abbe number, transmission colour, specular weight - they just need a renderer
// that spends them.

const VERTEX_SHADER = /* glsl */ `
varying vec3 vWorldPosition;
varying vec3 vWorldNormal;

void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

const FRAGMENT_SHADER = /* glsl */ `
precision highp float;

uniform sampler2D uBackNormals;
uniform sampler2D uEnvironment;
uniform vec2 uResolution;
uniform vec3 uAttenuation;
uniform float uIor;
uniform float uDispersion;
uniform float uEnvIntensity;
uniform float uSpecularWeight;
uniform float uAbsorption;
uniform vec3 uCentre;
uniform vec3 uRadii;
uniform float uGeometryFactor;

varying vec3 vWorldPosition;
varying vec3 vWorldNormal;

const float GEM_PI = 3.141592653589793;
const float GEM_TWO_PI = 6.283185307179586;

// The studio is stored as one equirectangular image, so a direction is a
// latitude and a longitude and nothing more.
vec2 directionToEquirect(vec3 direction) {
  vec3 d = normalize(direction);
  return vec2(atan(d.z, d.x) / GEM_TWO_PI + 0.5, asin(clamp(d.y, -1.0, 1.0)) / GEM_PI + 0.5);
}

vec3 sampleStudio(vec3 direction) {
  return texture2D(uEnvironment, directionToEquirect(direction)).rgb * uEnvIntensity;
}

// The back facets, as rendered in the first pass. Read at this pixel, which is
// the facet directly behind the one being shaded - an approximation, and the
// one that makes the whole thing affordable.
vec3 backFacetNormal(vec2 uv) {
  vec3 packed = texture2D(uBackNormals, uv).rgb;

  if (dot(packed, packed) < 0.0001) {
    return vec3(0.0);
  }

  return normalize(packed * 2.0 - 1.0);
}

// An ellipsoid stands in for the stone while the light is inside it.
//
// This is the trick that makes several bounces affordable, and it is the one
// Cartier's viewer uses: their diamond material carries a squash factor and a
// geometry factor beside its ray-bounce count, and their stones are only a few
// hundred triangles each. Real facets decide where light enters - that is what
// draws the star - but chasing a ray through real geometry five times over
// needs an acceleration structure per stone. A ray against an ellipsoid is one
// quadratic.
//
// The maths is done in a space where the ellipsoid is a unit sphere: divide by
// the radii going in, multiply by them coming out.

struct Hit {
  vec3 point;
  vec3 normal;
  float distance;
  bool valid;
};

Hit hitProxy(vec3 origin, vec3 direction) {
  Hit hit;
  hit.valid = false;

  float b = dot(origin, direction);
  float c = dot(origin, origin) - 1.0;
  float discriminant = b * b - c;

  if (discriminant < 0.0) {
    return hit;
  }

  // The far root: the ray starts inside, so this is where it leaves.
  float t = -b + sqrt(discriminant);

  if (t <= 0.0) {
    return hit;
  }

  hit.point = origin + direction * t;
  hit.normal = normalize(hit.point / uRadii);
  hit.distance = t;
  hit.valid = true;
  return hit;
}

// One wavelength's journey: in through the facet the eye can see, around inside
// as many times as it takes, out wherever it ends up pointing.
vec3 traceStone(vec3 incident, vec3 surfaceNormal, vec2 uv, float ior) {
  vec3 entering = refract(incident, surfaceNormal, 1.0 / ior);

  if (dot(entering, entering) < 0.0001) {
    return sampleStudio(reflect(incident, surfaceNormal));
  }

  // Beer-Lambert, loosely: light that crosses a coloured stone leaves some of
  // itself behind. This is what makes a sapphire blue rather than a
  // blue-painted sphere, and does nothing at all to a colourless one.
  vec3 kept = vec3(1.0);

  vec3 spherePoint = (vWorldPosition - uCentre) / uRadii;
  vec3 sphereDirection = normalize(entering / uRadii);

  for (int bounce = 0; bounce < GEM_BOUNCES; bounce += 1) {
    Hit hit = hitProxy(spherePoint, sphereDirection);

    if (!hit.valid) {
      break;
    }

    vec3 direction = normalize(sphereDirection * uRadii);
    vec3 normal = hit.normal;

    // On the first turn the real back facet is known, and it carries the cut.
    // Blending it into the proxy keeps the pavilion's shape in the picture
    // instead of a smooth bubble; deeper bounces have no such reference and use
    // the proxy alone.
    if (bounce == 0) {
      vec3 measured = backFacetNormal(uv);

      if (dot(measured, measured) > 0.5) {
        normal = normalize(mix(normal, measured, uGeometryFactor));
      }
    }

    kept *= pow(uAttenuation, vec3(hit.distance * uAbsorption));

    vec3 leaving = refract(direction, -normal, ior);

    if (dot(leaving, leaving) > 0.0001) {
      return sampleStudio(leaving) * kept;
    }

    // Past the critical angle: it stays in and turns back. Most of what happens
    // inside a well cut stone is this, and it is why a brilliant is bright when
    // you look down into it.
    direction = reflect(direction, normal);
    sphereDirection = normalize(direction / uRadii);
    spherePoint = hit.point + sphereDirection * 0.0005;
  }

  return sampleStudio(normalize(sphereDirection * uRadii)) * kept;
}

void main() {
  vec3 normal = normalize(vWorldNormal);
  vec3 incident = normalize(vWorldPosition - cameraPosition);
  vec2 uv = gl_FragCoord.xy / uResolution;

  vec3 refracted = traceStone(incident, normal, uv, uIor);

  // Fire, when it is asked for: the same journey at two more indices of
  // refraction, taking one channel from each. Off by default - see below.
  if (uDispersion > 0.0005) {
    refracted = vec3(
      traceStone(incident, normal, uv, uIor * (1.0 - uDispersion)).r,
      refracted.g,
      traceStone(incident, normal, uv, uIor * (1.0 + uDispersion)).b
    );
  }

  // What did not go in, came off the surface. Schlick, with the stone's own
  // index of refraction deciding how much that is.
  float f0 = pow((uIor - 1.0) / (uIor + 1.0), 2.0);
  float fresnel = f0 + (1.0 - f0) * pow(1.0 - max(dot(-incident, normal), 0.0), 5.0);
  vec3 reflected = sampleStudio(reflect(incident, normal));

  vec3 colour = mix(refracted, reflected, fresnel * uSpecularWeight);

  gl_FragColor = vec4(colour, 1.0);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const BACKFACE_FRAGMENT_SHADER = /* glsl */ `
precision highp float;
varying vec3 vWorldNormal;

void main() {
  // Packed into 0..1 so an ordinary colour buffer can hold it.
  gl_FragColor = vec4(normalize(vWorldNormal) * 0.5 + 0.5, 1.0);
}
`;

// Off, deliberately.
//
// Cartier's own diamond material, read out of the glb their viewer loads, sets
// dispersion to 1.04e-10 - zero in all but type - while turning up ray bounces
// to five. That is the trade: what makes a stone convincing is light going
// round inside it several times, not colour fringing, and fringing added on top
// of a single bounce reads as a plastic pinwheel rather than as fire. Near the
// critical angle the exit direction swings hard for a tiny change in index, so
// the three channels land on quite different parts of the studio - one on a
// lamp, one on the dark between them - and the stone fills with flat pink and
// yellow wedges even under a perfectly white environment.
//
// The machinery stays: raise this once the trace does more than one bounce, or
// for a stone whose Abbe number is genuinely low.
const DISPERSION_GAIN = 0;

// The studio's own brightness, unscaled. It was tempting to lift this - looking
// down into the stone the light has bounced off the dark ceiling and comes back
// dim, and a brighter setting flatters that angle. It ruins every other one:
// seen from the side a stone looks straight through to the white cove, and
// anything above 1 clips it to a plain white pebble. The dark facets are meant
// to be dark; that contrast is what a cut stone looks like.
const DEFAULT_ENV_INTENSITY = 1;

// Five, the number Cartier's diamond material ships. Light entering the crown
// of a brilliant is meant to meet the pavilion two or three times before it
// leaves; at one bounce a stone renders as a faceted glass pebble, and past
// five the picture stops changing.
const RAY_BOUNCES = 5;

// A stone is not its bounding box. Pulling the proxy in a little keeps the
// bounces inside the body of the cut rather than out at the girdle corners.
// Cartier calls the same idea squashFactor and ships 0.98.
const SQUASH_FACTOR = 0.9;

// How much real facet to keep on the first internal turn. Cartier ships 0.5;
// here the whole of it earns its place. The first turn is the one the eye can
// still trace back to a facet it can see, so taking the measured normal keeps
// the pavilion's star crisp, and the proxy takes over for the turns after it
// where there is nothing to be faithful to.
const GEOMETRY_FACTOR = 1;

/**
 * Build the pair of materials a stone needs: one that records its back facets,
 * and one that reads them back and traces light through the stone.
 *
 * The ray is followed through one crossing of the stone, with a single turn
 * back if it meets the far side past the critical angle. The back-facet buffer
 * holds one sample per pixel, so a second bounce would only meet the same facet
 * again and flatten the stone out rather than deepen it.
 */
export function createDiamondMaterial(THREE, { environment, gem = {} }) {
  const uniforms = {
    uBackNormals: { value: null },
    uEnvironment: { value: environment },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uAttenuation: { value: new THREE.Vector3(...(gem.attenuationColor || [1, 1, 1])) },
    uIor: { value: gem.ior || 2.418 },
    // Straight from the Abbe number in the material file, scaled to be visible
    // at the size a stone is actually looked at.
    uDispersion: { value: (gem.dispersion || 0.4) * DISPERSION_GAIN },
    uEnvIntensity: { value: gem.envIntensity ?? DEFAULT_ENV_INTENSITY },
    uSpecularWeight: { value: gem.specularWeight ?? 1 },
    // The stand-in shape, in world space. Set per stone once the model is in.
    uCentre: { value: new THREE.Vector3() },
    uRadii: { value: new THREE.Vector3(1, 1, 1) },
    // How much of the real back facet to mix into the proxy on the first turn.
    // Cartier's own material calls this geometryFactor and ships it at 0.5.
    uGeometryFactor: { value: gem.geometryFactor ?? GEOMETRY_FACTOR },
    // How quickly a coloured stone takes the light. Colourless stones set an
    // attenuation of white, where this has no effect at all.
    uAbsorption: { value: gem.absorption ?? 0.6 }
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    defines: { GEM_BOUNCES: RAY_BOUNCES },
    side: THREE.FrontSide
  });

  const backfaceMaterial = new THREE.ShaderMaterial({
    vertexShader: VERTEX_SHADER,
    fragmentShader: BACKFACE_FRAGMENT_SHADER,
    side: THREE.BackSide
  });

  return { material, backfaceMaterial, uniforms };
}

/**
 * Fit the stand-in ellipsoid to a stone and hand it to its material. Called once
 * the geometry is in and positioned, since the proxy is held in world space.
 */
export function fitProxyToStone(THREE, uniforms, mesh) {
  mesh.updateWorldMatrix(true, false);

  const box = new THREE.Box3().setFromObject(mesh);
  const centre = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());

  uniforms.uCentre.value.copy(centre);
  uniforms.uRadii.value.set(
    Math.max(size.x * 0.5 * SQUASH_FACTOR, 1e-6),
    Math.max(size.y * 0.5 * SQUASH_FACTOR, 1e-6),
    Math.max(size.z * 0.5 * SQUASH_FACTOR, 1e-6)
  );
}

/**
 * Reads the settings the converter wrote into the glTF material, so the stone
 * is still described by the MatrixGold file rather than by numbers typed here.
 */
export function readGemSettings(material) {
  return {
    ior: material.ior,
    dispersion: material.dispersion || 0,
    specularWeight: material.specularIntensity ?? 1,
    attenuationColor: material.attenuationColor
      ? [material.attenuationColor.r, material.attenuationColor.g, material.attenuationColor.b]
      : [1, 1, 1]
  };
}

/**
 * Split one geometry into its separate solids.
 *
 * The converter welds every stone in a piece into a single mesh, which is right
 * for a material and wrong for this shader: a proxy fitted to twenty pavé
 * stones at once is an ellipsoid the size of the shank, and light traced inside
 * it comes out of nowhere near the stone it entered. Cartier ships each stone as
 * its own mesh for the same reason - twenty-three of them on one ring.
 *
 * Triangles that share a vertex belong to the same stone. That is all it takes.
 */
export function splitIntoSolids(THREE, geometry) {
  const index = geometry.getIndex();
  const position = geometry.getAttribute("position");
  const normal = geometry.getAttribute("normal");

  if (!index) {
    return [geometry];
  }

  const parent = new Int32Array(position.count);
  for (let i = 0; i < parent.length; i += 1) parent[i] = i;

  const find = (value) => {
    let root = value;
    while (parent[root] !== root) root = parent[root];
    // Path compression, or a pavé band of a few thousand vertices crawls.
    while (parent[value] !== root) {
      const next = parent[value];
      parent[value] = root;
      value = next;
    }
    return root;
  };

  const union = (a, b) => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent[rootB] = rootA;
  };

  // Two vertices in the same place are the same point of the same stone, even
  // when the converter kept them apart to hold a facet edge sharp. Joining on
  // position first is the difference between finding stones and finding facets.
  const atPosition = new Map();

  for (let v = 0; v < position.count; v += 1) {
    const key = `${position.getX(v).toFixed(5)},${position.getY(v).toFixed(5)},${position.getZ(v).toFixed(5)}`;
    const first = atPosition.get(key);

    if (first === undefined) {
      atPosition.set(key, v);
    } else {
      union(first, v);
    }
  }

  const triangles = index.count / 3;

  for (let t = 0; t < triangles; t += 1) {
    const a = index.getX(t * 3);
    const b = index.getX(t * 3 + 1);
    const c = index.getX(t * 3 + 2);
    union(a, b);
    union(b, c);
  }

  const groups = new Map();

  for (let t = 0; t < triangles; t += 1) {
    const root = find(index.getX(t * 3));
    let group = groups.get(root);
    if (!group) {
      group = [];
      groups.set(root, group);
    }
    group.push(t);
  }

  if (groups.size <= 1) {
    return [geometry];
  }

  return [...groups.values()].map((group) => {
    const remap = new Map();
    const positions = [];
    const normals = [];
    const indices = [];

    for (const t of group) {
      for (let corner = 0; corner < 3; corner += 1) {
        const source = index.getX(t * 3 + corner);
        let target = remap.get(source);

        if (target === undefined) {
          target = positions.length / 3;
          remap.set(source, target);
          positions.push(position.getX(source), position.getY(source), position.getZ(source));
          if (normal) normals.push(normal.getX(source), normal.getY(source), normal.getZ(source));
        }

        indices.push(target);
      }
    }

    const solid = new THREE.BufferGeometry();
    solid.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    if (normal) solid.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    solid.setIndex(indices);
    return solid;
  });
}
