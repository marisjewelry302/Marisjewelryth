// Product media shared by the catalogue reader and the product page gallery.

// products.video_position: which slide of the gallery the turntable video is,
// counting from 0. 0 is first and 1 (the default) is right after the cover. A
// number past the last photo puts it last, so VIDEO_POSITION_LAST means "at the
// end, however many photos a metal's set has".
export const VIDEO_POSITION_FIRST = 0;
export const VIDEO_POSITION_AFTER_COVER = 1;
export const VIDEO_POSITION_LAST = 99;

export function normalizeVideoPosition(value) {
  if (value === null || value === undefined || value === "") {
    return VIDEO_POSITION_AFTER_COVER;
  }

  const position = Number(value);

  if (!Number.isInteger(position) || position < 0) {
    return VIDEO_POSITION_AFTER_COVER;
  }

  return Math.min(position, VIDEO_POSITION_LAST);
}

// The gallery's slides, in the order both layouts show them: the cover, the
// turntable video (after the cover unless admin moved it to another slot), then
// every gallery view in sort order. A gallery image that is the cover itself is not
// shown twice, and a piece with no video has no video slide at all.
//
// `images` are { src, alt } in gallery order; `video` is { src, poster,
// position } or null.
export function buildProductMediaSlides({ images = [], coverImageUrl = "", video = null, fallbackAlt = "" } = {}) {
  const gallery = images
    .map((image) => ({ src: String(image?.src || "").trim(), alt: image?.alt || fallbackAlt }))
    .filter((image) => image.src);
  const cover = String(coverImageUrl || "").trim();
  const photos = cover
    ? [
        { src: cover, alt: gallery.find((image) => image.src === cover)?.alt || fallbackAlt },
        ...gallery.filter((image) => image.src !== cover)
      ]
    : gallery;
  const slides = photos.map((photo, index) => ({
    type: "image",
    key: `image-${index}-${photo.src}`,
    label: index === 0 ? "Primary view" : `View ${index + 1}`,
    ...photo
  }));
  const videoSrc = String(video?.src || "").trim();

  if (videoSrc) {
    const at = Math.min(normalizeVideoPosition(video.position), slides.length);

    slides.splice(at, 0, {
      type: "video",
      key: "video",
      label: "360° view",
      src: videoSrc,
      poster: String(video.poster || "").trim(),
      alt: `${fallbackAlt} 360° turntable video`.trim()
    });
  }

  if (!slides.length) {
    slides.push({ type: "image", key: "empty", label: "Primary view", src: "", alt: fallbackAlt });
  }

  return slides;
}
