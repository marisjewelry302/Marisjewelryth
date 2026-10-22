export const CLOSED_KEY = "marisSignupPopupClosedUntil";
export const DISMISSED_SESSION_KEY = "marisSignupPopupDismissed";
// The email travels from the popup to /account through sessionStorage so it never lands in the URL.
export const EMAIL_HANDOFF_KEY = "marisSignupPopupEmail";
export const ONE_DAY_MS = 24 * 60 * 60 * 1000;
export const THIRTY_DAYS_MS = 30 * ONE_DAY_MS;

function currentWindow() {
  return typeof window === "undefined" ? undefined : window;
}

// Storage can throw (Safari private mode, blocked site data), so every access is guarded.
export function readStorage(area, key, win = currentWindow()) {
  try {
    return win[area].getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(area, key, value, win = currentWindow()) {
  try {
    win[area].setItem(key, value);
  } catch {
    // Storage unavailable: the popup simply may show again on the next visit.
  }
}

function removeStorage(area, key, win = currentWindow()) {
  try {
    win[area].removeItem(key);
  } catch {
    // Nothing to clean up when storage is unavailable.
  }
}

export function suppressPopup(durationMs, win = currentWindow(), now = Date.now()) {
  writeStorage("localStorage", CLOSED_KEY, String(now + durationMs), win);
}

// Any dismissal keeps the popup away for the rest of this browser session.
export function dismissPopupForSession(win = currentWindow()) {
  writeStorage("sessionStorage", DISMISSED_SESSION_KEY, "1", win);
}

export function shouldSuppressPopup(win = currentWindow(), now = Date.now()) {
  if (Number(readStorage("localStorage", CLOSED_KEY, win) || 0) > now) return true;
  return readStorage("sessionStorage", DISMISSED_SESSION_KEY, win) === "1";
}

export function stashSignupEmail(email, win = currentWindow()) {
  writeStorage("sessionStorage", EMAIL_HANDOFF_KEY, email, win);
}

// Reads the handed-over email once and removes it, so it does not linger in storage.
export function takeSignupEmail(win = currentWindow()) {
  const email = readStorage("sessionStorage", EMAIL_HANDOFF_KEY, win) || "";
  removeStorage("sessionStorage", EMAIL_HANDOFF_KEY, win);
  return email;
}
