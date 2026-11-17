// Product photos arrive as 1+ MB PNGs. The site serves Storage files as stored
// (next.config.mjs sets images.unoptimized to stay inside Vercel's image quota),
// so the upload is the only place to make them light: re-encode to WebP and cap
// the long edge. Animated GIFs and anything sharp cannot decode pass through.

import sharp from "sharp";

const MAX_EDGE = 1600;
const WEBP_QUALITY = 82;

export async function compressProductImage(buffer, contentType) {
  const type = String(contentType || "").toLowerCase();

  if (type === "image/gif" || type === "image/webp" && buffer.length < 300 * 1024) {
    return { buffer, contentType: type || "image/jpeg", ext: null };
  }

  try {
    const output = await sharp(buffer, { failOn: "none" })
      .rotate()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();

    // Never trade a smaller original for a bigger re-encode.
    if (output.length >= buffer.length) {
      return { buffer, contentType: type || "image/jpeg", ext: null };
    }

    return { buffer: output, contentType: "image/webp", ext: "webp" };
  } catch {
    return { buffer, contentType: type || "image/jpeg", ext: null };
  }
}
