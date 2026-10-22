// Only cards this close to the focused card render an <Image>; the other loop clones stay
// empty frames, so the markup carries about one set of images instead of three.
export const IMAGE_WINDOW = 3;

// While dragging, the card under the viewport centre leads the image window.
export function getImageCenterIndex({ slideIndex, dragOffset, slideStep, isDragging }) {
  if (!isDragging || !slideStep) return slideIndex;
  return Math.round(slideIndex - dragOffset / slideStep);
}

export function isInImageWindow(index, centerIndex, windowSize = IMAGE_WINDOW) {
  return Math.abs(index - centerIndex) <= windowSize;
}
