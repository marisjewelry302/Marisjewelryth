import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  CLOSED_KEY,
  DISMISSED_SESSION_KEY,
  EMAIL_HANDOFF_KEY,
  ONE_DAY_MS,
  THIRTY_DAYS_MS,
  dismissPopupForSession,
  shouldSuppressPopup,
  stashSignupEmail,
  suppressPopup,
  takeSignupEmail
} from "../app/lib/signup-popup-storage.js";
import { canAutoplayHero } from "../app/lib/hero-autoplay.js";
import { IMAGE_WINDOW, getImageCenterIndex, isInImageWindow } from "../app/lib/carousel-window.js";

function createStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key)
  };
}

function createWindow() {
  return { localStorage: createStorage(), sessionStorage: createStorage() };
}

// Safari private mode and blocked site data throw on any storage access.
function createBlockedWindow() {
  const blocked = {
    getItem() { throw new DOMException("blocked", "SecurityError"); },
    setItem() { throw new DOMException("blocked", "SecurityError"); },
    removeItem() { throw new DOMException("blocked", "SecurityError"); }
  };
  return { localStorage: blocked, sessionStorage: blocked };
}

const NOW = 1_800_000_000_000;

// --- Signup popup storage -------------------------------------------------
{
  const win = createWindow();
  assert.equal(shouldSuppressPopup(win, NOW), false, "a first visit must show the popup");
}

{
  const win = createWindow();
  dismissPopupForSession(win);
  assert.equal(shouldSuppressPopup(win, NOW), true, "dismissing without the checkbox must keep the popup closed for the session");
  assert.equal(win.sessionStorage.getItem(DISMISSED_SESSION_KEY), "1");
  assert.equal(win.localStorage.getItem(CLOSED_KEY), null, "a plain dismissal must not write the long-lived key");
}

{
  const win = createWindow();
  suppressPopup(ONE_DAY_MS, win, NOW);
  assert.equal(shouldSuppressPopup(win, NOW + ONE_DAY_MS - 1), true, "the 1-day suppression holds until it expires");
  assert.equal(shouldSuppressPopup(win, NOW + ONE_DAY_MS + 1), false, "the popup returns after the 1-day suppression expires");
}

{
  const win = createWindow();
  suppressPopup(THIRTY_DAYS_MS, win, NOW);
  assert.equal(shouldSuppressPopup(win, NOW + THIRTY_DAYS_MS - 1), true, "a signup suppresses the popup for 30 days");
}

{
  const win = createBlockedWindow();
  assert.doesNotThrow(() => shouldSuppressPopup(win, NOW), "blocked storage must not throw when reading");
  assert.equal(shouldSuppressPopup(win, NOW), false, "blocked storage falls back to showing the popup");
  assert.doesNotThrow(() => dismissPopupForSession(win), "blocked storage must not throw when dismissing");
  assert.doesNotThrow(() => suppressPopup(ONE_DAY_MS, win, NOW), "blocked storage must not throw when suppressing");
  assert.doesNotThrow(() => stashSignupEmail("a@example.com", win), "blocked storage must not throw when stashing the email");
  assert.equal(takeSignupEmail(win), "", "blocked storage yields no handed-over email");
}

{
  const win = createWindow();
  stashSignupEmail("buyer@example.com", win);
  assert.equal(takeSignupEmail(win), "buyer@example.com", "the account page receives the popup email");
  assert.equal(win.sessionStorage.getItem(EMAIL_HANDOFF_KEY), null, "the handed-over email is removed after one read");
  assert.equal(takeSignupEmail(win), "", "a second read finds nothing");
}

// --- Hero autoplay --------------------------------------------------------
{
  const base = { slideCount: 3, isPaused: false, isPageHidden: false, prefersReducedMotion: false };
  assert.equal(canAutoplayHero(base), true);
  assert.equal(canAutoplayHero({ ...base, isPaused: true }), false, "the pause button stops autoplay");
  assert.equal(canAutoplayHero({ ...base, isPageHidden: true }), false, "hidden tabs do not autoplay");
  assert.equal(canAutoplayHero({ ...base, prefersReducedMotion: true }), false, "reduced-motion visitors do not autoplay");
  assert.equal(canAutoplayHero({ ...base, slideCount: 1 }), false, "a single slide has nothing to advance to");
  assert.equal(canAutoplayHero({ ...base, slideCount: 0 }), false);
}

// --- Best Seller image window ---------------------------------------------
{
  assert.equal(isInImageWindow(10, 10), true);
  assert.equal(isInImageWindow(10 + IMAGE_WINDOW, 10), true, "the window edge still renders an image");
  assert.equal(isInImageWindow(10 + IMAGE_WINDOW + 1, 10), false, "cards past the window stay empty frames");
  assert.equal(isInImageWindow(10 - IMAGE_WINDOW - 1, 10), false);

  // The loop renders 3 sets of 7; the window must never cover more than one set of images.
  const loopLength = 21;
  for (let center = 0; center < loopLength; center += 1) {
    const rendered = Array.from({ length: loopLength }, (_, index) => index).filter((index) => isInImageWindow(index, center));
    assert.ok(rendered.length <= 2 * IMAGE_WINDOW + 1, `window around ${center} renders at most ${2 * IMAGE_WINDOW + 1} images`);
  }

  assert.equal(getImageCenterIndex({ slideIndex: 8, dragOffset: -999, slideStep: 300, isDragging: false }), 8, "the window follows slideIndex when not dragging");
  assert.equal(getImageCenterIndex({ slideIndex: 8, dragOffset: -300, slideStep: 300, isDragging: true }), 9, "dragging left leads the window to the next card");
  assert.equal(getImageCenterIndex({ slideIndex: 8, dragOffset: 900, slideStep: 300, isDragging: true }), 5, "dragging right leads the window back");
  assert.equal(getImageCenterIndex({ slideIndex: 8, dragOffset: 900, slideStep: 0, isDragging: true }), 8, "an unmeasured step keeps the window on slideIndex");
}

// --- Source contracts for the components ---------------------------------
const [popup, hero, carousel, account, css] = await Promise.all([
  readFile(new URL("../app/HomeSignupPopup.jsx", import.meta.url), "utf8"),
  readFile(new URL("../app/HeroSlider.jsx", import.meta.url), "utf8"),
  readFile(new URL("../app/BestSellerSection.jsx", import.meta.url), "utf8"),
  readFile(new URL("../app/account/AccountClient.jsx", import.meta.url), "utf8"),
  readFile(new URL("../assets/css/style.css", import.meta.url), "utf8")
]);

assert.doesNotMatch(popup, /router\.push\([^)]*email/, "the popup must not put the email in the URL");
assert.match(popup, /stashSignupEmail\(/, "the popup hands the email over through storage");
assert.match(popup, /if \(hideTodayRef\.current\)/, "the close handler must read the ref, not the stale hideToday state");
assert.match(popup, /suppressPopup\(hideTodayRef\.current \? ONE_DAY_MS : THIRTY_DAYS_MS\)/, "a signup must honour the checkbox through the ref");
assert.doesNotMatch(popup, /if \(hideToday\)|suppressPopup\(hideToday /, "no handler may read the stale hideToday state");
assert.doesNotMatch(popup, /localStorage\.|sessionStorage\./, "the popup must reach storage only through the guarded helpers");
assert.match(account, /takeSignupEmail\(\)/, "the account page reads the handed-over email");

assert.doesNotMatch(hero, /setDirection|\[direction/, "the unused direction state must stay removed");
assert.match(hero, /className="hero-slide-toggle"/, "the hero needs a pause control");
assert.match(hero, /aria-pressed=\{isPaused\}/);
assert.match(hero, /Pause slideshow/);
assert.match(hero, /Play slideshow/);
assert.match(hero, /className="hero-hit hero-hit-left"[\s\S]*?aria-label="Next slide"[\s\S]*?onClick=\{\(\) => moveSlide\(1\)\}/, "the left click area advances, so its label says Next");
assert.match(hero, /className="hero-hit hero-hit-right"[\s\S]*?aria-label="Previous slide"[\s\S]*?onClick=\{\(\) => moveSlide\(-1\)\}/, "the right click area goes back, so its label says Previous");

assert.match(carousel, /isInImageWindow\(index, imageCenterIndex\)/, "the carousel renders images only inside the window");

assert.doesNotMatch(
  css,
  /\.hero-slide-control\s*\{\s*display:\s*none;?\s*\}/,
  "the hero control must stay visible on phones so autoplay can be paused"
);
assert.match(
  css,
  /\.hero-slide-control \.hero-slide-dot\s*\{\s*display:\s*none;/,
  "phones hide the slide dots but keep the pause button"
);
assert.match(css, /\.hero-slide-toggle\s*\{[\s\S]*?min-height:\s*44px;/, "the phone pause button needs a 44px touch target");

console.log("PASS: popup storage, hero autoplay and pause control, and carousel image window behave as specified.");
