import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const ASSET_ROOT = path.resolve(process.cwd(), "assets");

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".glb": "model/gltf-binary",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8"
};

// The table is also the allowlist. Anything else under assets/ - a working
// note, a source CAD file someone parked there - is not web content and is not
// served, rather than going out as an anonymous octet-stream.
function getContentType(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || "";
}

function getCacheControl(filePath) {
  const normalized = filePath.replaceAll("\\", "/");

  if (normalized.includes("/images/")) {
    return "public, max-age=604800, stale-while-revalidate=2592000";
  }

  // A model is rebuilt whenever the piece is re-baked,
  // and it keeps its filename when it is. Held for an hour behind a fixed URL,
  // a new bake simply does not reach anyone who has already looked - which is
  // exactly what happened the first time a re-baked .glb was published. These
  // are revalidated every time instead: the ETag below turns that into a 304
  // for the unchanged case, which costs a round trip rather than 2.5 MB.
  if (normalized.includes("/models/")) {
    return "public, no-cache";
  }

  return "public, max-age=3600, stale-while-revalidate=86400";
}

// Size and modification time are enough to tell one build of a file from the
// next, and cost nothing beyond the stat already being made.
function entityTag(fileStats) {
  return `"${fileStats.size.toString(16)}-${Math.round(fileStats.mtimeMs).toString(16)}"`;
}

export async function GET(request, context) {
  const { path: pathSegments = [] } = await context.params;
  const requestedPath = path.normalize(pathSegments.join(path.sep));
  const filePath = path.resolve(ASSET_ROOT, requestedPath);

  if (!filePath.startsWith(`${ASSET_ROOT}${path.sep}`)) {
    return new Response("Not found", { status: 404 });
  }

  const contentType = getContentType(filePath);

  if (!contentType) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const fileStats = await stat(filePath);

    if (!fileStats.isFile()) {
      return new Response("Not found", { status: 404 });
    }

    const etag = entityTag(fileStats);
    const cacheControl = getCacheControl(filePath);

    if (request.headers.get("if-none-match") === etag) {
      return new Response(null, {
        status: 304,
        headers: { "Cache-Control": cacheControl, ETag: etag }
      });
    }

    const body = await readFile(filePath);

    return new Response(body, {
      headers: {
        "Cache-Control": cacheControl,
        "Content-Length": String(fileStats.size),
        "Content-Type": contentType,
        ETag: etag
      }
    });
  } catch (error) {
    return new Response("Not found", { status: 404 });
  }
}
