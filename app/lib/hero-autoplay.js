export const HERO_AUTOPLAY_DELAY_MS = 4800;

// Autoplay stops for reduced-motion visitors and hidden tabs.
export function canAutoplayHero({ slideCount, isPageHidden, prefersReducedMotion }) {
  return slideCount > 1 && !isPageHidden && !prefersReducedMotion;
}
