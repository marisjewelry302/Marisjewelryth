// Baked ambient occlusion, per vertex.
//
// A rasteriser shades every surface as though nothing else were nearby. The
// inside of a shank, the gap under a prong, the seam where a setting meets the
// band - all of them come back as brightly lit as the open top of the ring,
// and a piece with no shadow in its crevices reads as a plastic model of
// itself. It is the single largest thing a path tracer gives you for free.
//
// Cartier does not solve this in the browser either. Their metal carries one
// texture and one only: a 1024 x 1024 occlusion map, baked before the file ever
// reached the web. No normal map, no roughness map, nothing else.
//
// This does the same measurement without needing one. Their model is unwrapped
// and can hold a texture; a Rhino render mesh arrives with no UVs at all, so
// the occlusion is stored per vertex instead - as COLOR_0, which glTF multiplies
// into the base colour, and which every viewer understands without being asked.
//
// The measurement itself is the definition: from each vertex, look out over the
// hemisphere its normal faces, and count how much of the view is blocked by the
// rest of the piece.

// A bounding volume hierarchy over the triangles. Without one this is 52,000
// vertices times 48 rays times 90,000 triangles, which is not a number that
// finishes.
function buildBvh(positions, indices) {
  const triangleCount = indices.length / 3;
  const centroids = new Float32Array(triangleCount * 3);
  const bounds = new Float32Array(triangleCount * 6);
  const order = new Uint32Array(triangleCount);

  for (let t = 0; t < triangleCount; t += 1) {
    order[t] = t;
    let minX = Infinity; let minY = Infinity; let minZ = Infinity;
    let maxX = -Infinity; let maxY = -Infinity; let maxZ = -Infinity;

    for (let corner = 0; corner < 3; corner += 1) {
      const v = indices[t * 3 + corner] * 3;
      const x = positions[v];
      const y = positions[v + 1];
      const z = positions[v + 2];
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
    }

    bounds[t * 6] = minX; bounds[t * 6 + 1] = minY; bounds[t * 6 + 2] = minZ;
    bounds[t * 6 + 3] = maxX; bounds[t * 6 + 4] = maxY; bounds[t * 6 + 5] = maxZ;
    centroids[t * 3] = (minX + maxX) / 2;
    centroids[t * 3 + 1] = (minY + maxY) / 2;
    centroids[t * 3 + 2] = (minZ + maxZ) / 2;
  }

  const nodes = [];

  // Median split on the widest axis. Not the best tree a builder can make, but
  // it is built once, in a script, and it turns the search from linear into
  // logarithmic, which is the whole point.
  const build = (from, to) => {
    const node = {
      min: [Infinity, Infinity, Infinity],
      max: [-Infinity, -Infinity, -Infinity],
      from,
      to,
      left: -1,
      right: -1
    };

    for (let i = from; i < to; i += 1) {
      const t = order[i];
      for (let axis = 0; axis < 3; axis += 1) {
        node.min[axis] = Math.min(node.min[axis], bounds[t * 6 + axis]);
        node.max[axis] = Math.max(node.max[axis], bounds[t * 6 + 3 + axis]);
      }
    }

    const index = nodes.length;
    nodes.push(node);

    if (to - from <= 8) {
      return index;
    }

    const extent = [node.max[0] - node.min[0], node.max[1] - node.min[1], node.max[2] - node.min[2]];
    const axis = extent.indexOf(Math.max(...extent));
    const slice = Array.prototype.slice.call(order, from, to);
    slice.sort((a, b) => centroids[a * 3 + axis] - centroids[b * 3 + axis]);
    order.set(slice, from);

    const middle = (from + to) >> 1;
    node.left = build(from, middle);
    node.right = build(middle, to);
    node.from = -1;

    return index;
  };

  build(0, triangleCount);

  return { nodes, order, positions, indices };
}

function hitsBox(node, origin, direction, inverse, maxDistance) {
  let near = 0;
  let far = maxDistance;

  for (let axis = 0; axis < 3; axis += 1) {
    const t0 = (node.min[axis] - origin[axis]) * inverse[axis];
    const t1 = (node.max[axis] - origin[axis]) * inverse[axis];
    near = Math.max(near, Math.min(t0, t1));
    far = Math.min(far, Math.max(t0, t1));
    if (far < near) return false;
  }

  return true;
}

// Moller-Trumbore. Any hit inside the ray's reach is enough - this is a
// visibility question, not a shading one, so the nearest hit does not matter.
function hitsTriangle(positions, indices, triangle, origin, direction, maxDistance) {
  const a = indices[triangle * 3] * 3;
  const b = indices[triangle * 3 + 1] * 3;
  const c = indices[triangle * 3 + 2] * 3;

  const e1x = positions[b] - positions[a];
  const e1y = positions[b + 1] - positions[a + 1];
  const e1z = positions[b + 2] - positions[a + 2];
  const e2x = positions[c] - positions[a];
  const e2y = positions[c + 1] - positions[a + 1];
  const e2z = positions[c + 2] - positions[a + 2];

  const px = direction[1] * e2z - direction[2] * e2y;
  const py = direction[2] * e2x - direction[0] * e2z;
  const pz = direction[0] * e2y - direction[1] * e2x;
  const determinant = e1x * px + e1y * py + e1z * pz;

  if (Math.abs(determinant) < 1e-12) return false;

  const inverse = 1 / determinant;
  const tx = origin[0] - positions[a];
  const ty = origin[1] - positions[a + 1];
  const tz = origin[2] - positions[a + 2];
  const u = (tx * px + ty * py + tz * pz) * inverse;

  if (u < 0 || u > 1) return false;

  const qx = ty * e1z - tz * e1y;
  const qy = tz * e1x - tx * e1z;
  const qz = tx * e1y - ty * e1x;
  const v = (direction[0] * qx + direction[1] * qy + direction[2] * qz) * inverse;

  if (v < 0 || u + v > 1) return false;

  const distance = (e2x * qx + e2y * qy + e2z * qz) * inverse;

  return distance > 1e-5 && distance < maxDistance;
}

function occluded(bvh, origin, direction, maxDistance) {
  const inverse = [1 / direction[0], 1 / direction[1], 1 / direction[2]];
  const stack = [0];

  while (stack.length) {
    const node = bvh.nodes[stack.pop()];

    if (!hitsBox(node, origin, direction, inverse, maxDistance)) continue;

    if (node.left < 0) {
      for (let i = node.from; i < node.to; i += 1) {
        if (hitsTriangle(bvh.positions, bvh.indices, bvh.order[i], origin, direction, maxDistance)) {
          return true;
        }
      }
      continue;
    }

    stack.push(node.left, node.right);
  }

  return false;
}

// Cosine-weighted directions over the hemisphere, from a Hammersley sequence.
// An even spread matters more than a random one when there are only a few dozen
// rays to spend: random sampling at this count leaves visible blotches.
function hemisphereDirections(count) {
  const directions = [];

  for (let i = 0; i < count; i += 1) {
    // Radical inverse, base 2.
    let bits = i;
    bits = ((bits << 16) | (bits >>> 16)) >>> 0;
    bits = (((bits & 0x55555555) << 1) | ((bits & 0xaaaaaaaa) >>> 1)) >>> 0;
    bits = (((bits & 0x33333333) << 2) | ((bits & 0xcccccccc) >>> 2)) >>> 0;
    bits = (((bits & 0x0f0f0f0f) << 4) | ((bits & 0xf0f0f0f0) >>> 4)) >>> 0;
    bits = (((bits & 0x00ff00ff) << 8) | ((bits & 0xff00ff00) >>> 8)) >>> 0;

    const u = i / count;
    const v = bits * 2.3283064365386963e-10;
    const phi = 2 * Math.PI * u;
    const cosTheta = Math.sqrt(1 - v);
    const sinTheta = Math.sqrt(v);

    directions.push([Math.cos(phi) * sinTheta, Math.sin(phi) * sinTheta, cosTheta]);
  }

  return directions;
}

/**
 * Measure how much of each vertex's sky is blocked by the rest of the piece.
 *
 * `parts` are the pieces to shade; `occluders` is what blocks them, which is
 * everything - a prong shadows the stone it holds, and the stone shadows the
 * shank under it, whichever list each happens to be in.
 *
 * Returns one Float32Array of occlusion per part, in the same order, where 1 is
 * open sky and 0 is fully enclosed.
 */
export function bakeVertexOcclusion(parts, occluders, options = {}) {
  const {
    rays = 32,
    // How far a ray looks, as a fraction of the whole piece. Occlusion is a
    // local effect: let it reach too far and the inside of a ring shadows the
    // outside of it, and the piece goes uniformly grey instead of gaining
    // creases.
    reach = 0.18,
    // Lifts the ray off the surface it starts on, so a vertex does not shadow
    // itself on the triangles it belongs to.
    bias = 0.0015,
    // How dark a fully enclosed vertex is allowed to get. Real crevices are not
    // black; they are lit by whatever bounces in.
    floor = 0.35
  } = options;

  // One buffer holding every triangle in the piece, so a ray from any part can
  // hit any other.
  let vertexTotal = 0;
  let indexTotal = 0;
  for (const part of occluders) {
    vertexTotal += part.position.length / 3;
    indexTotal += part.index.length;
  }

  const positions = new Float32Array(vertexTotal * 3);
  const indices = new Uint32Array(indexTotal);
  let vertexOffset = 0;
  let indexOffset = 0;

  for (const part of occluders) {
    positions.set(part.position, vertexOffset * 3);
    for (let i = 0; i < part.index.length; i += 1) {
      indices[indexOffset + i] = part.index[i] + vertexOffset;
    }
    vertexOffset += part.position.length / 3;
    indexOffset += part.index.length;
  }

  let min = [Infinity, Infinity, Infinity];
  let max = [-Infinity, -Infinity, -Infinity];

  for (let i = 0; i < positions.length; i += 3) {
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], positions[i + axis]);
      max[axis] = Math.max(max[axis], positions[i + axis]);
    }
  }

  const diagonal = Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
  const maxDistance = diagonal * reach;
  const offset = diagonal * bias;

  const bvh = buildBvh(positions, indices);
  const directions = hemisphereDirections(rays);
  const results = [];

  for (const part of parts) {
    const count = part.position.length / 3;
    const occlusion = new Float32Array(count);

    for (let v = 0; v < count; v += 1) {
      const nx = part.normal[v * 3];
      const ny = part.normal[v * 3 + 1];
      const nz = part.normal[v * 3 + 2];

      // A frame around the normal, so the sample pattern is oriented the same
      // way relative to the surface everywhere.
      const up = Math.abs(nz) < 0.9 ? [0, 0, 1] : [1, 0, 0];
      let tx = up[1] * nz - up[2] * ny;
      let ty = up[2] * nx - up[0] * nz;
      let tz = up[0] * ny - up[1] * nx;
      const tLength = Math.hypot(tx, ty, tz) || 1;
      tx /= tLength; ty /= tLength; tz /= tLength;
      const bx = ny * tz - nz * ty;
      const by = nz * tx - nx * tz;
      const bz = nx * ty - ny * tx;

      const origin = [
        part.position[v * 3] + nx * offset,
        part.position[v * 3 + 1] + ny * offset,
        part.position[v * 3 + 2] + nz * offset
      ];

      let blocked = 0;

      for (const direction of directions) {
        const dx = tx * direction[0] + bx * direction[1] + nx * direction[2];
        const dy = ty * direction[0] + by * direction[1] + ny * direction[2];
        const dz = tz * direction[0] + bz * direction[1] + nz * direction[2];

        if (occluded(bvh, origin, [dx, dy, dz], maxDistance)) blocked += 1;
      }

      const open = 1 - blocked / rays;
      occlusion[v] = floor + (1 - floor) * open;
    }

    results.push(occlusion);
  }

  return { occlusion: results, maxDistance, triangles: indices.length / 3 };
}
