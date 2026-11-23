import { stat } from "node:fs/promises";
import path from "node:path";

// /assets/js/* is served with a one hour browser cache, so admin scripts need a
// version stamp or managers keep running the previous build after a deploy.
export async function buildAdminScriptSrc(src) {
  try {
    const fileStats = await stat(path.join(process.cwd(), "assets", src.replace(/^\/assets\//, "")));
    return `${src}?v=${Math.trunc(fileStats.mtimeMs)}`;
  } catch {
    return src;
  }
}
