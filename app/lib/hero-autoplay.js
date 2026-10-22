export const HERO_AUTOPLAY_DELAY_MS = 4800;

// Moving content must be pausable (WCAG 2.2.2), so autoplay stops for the pause
// button, reduced-motion visitors, and hidden tabs.
export function canAutoplayHero({ slideCount, isPaused, isPageHidden, prefersReducedMotion }) {
  return slideCount > 1 && !isPaused && !isPageHidden && !prefersReducedMotion;
}
