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
  ".txt": "text/plain; charset=utf-8"
};

function getContentType(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

function getCacheControl(filePath) {
  const normalized = filePath.replaceAll("\\", "/");

  if (normalized.includes("/images/")) {
    return "public, max-age=604800, stale-while-revalidate=2592000";
  }

  return "public, max-age=3600, stale-while-revalidate=86400";
}

export async function GET(_request, context) {
  const { path: pathSegments = [] } = await context.params;
  const requestedPath = path.normalize(pathSegments.join(path.sep));
  const filePath = path.resolve(ASSET_ROOT, requestedPath);

  if (!filePath.startsWith(`${ASSET_ROOT}${path.sep}`)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const fileStats = await stat(filePath);

    if (!fileStats.isFile()) {
      return new Response("Not found", { status: 404 });
    }

    const body = await readFile(filePath);

    return new Response(body, {
      headers: {
        "Cache-Control": getCacheControl(filePath),
        "Content-Length": String(fileStats.size),
        "Content-Type": getContentType(filePath)
      }
    });
  } catch (error) {
    return new Response("Not found", { status: 404 });
  }
}
