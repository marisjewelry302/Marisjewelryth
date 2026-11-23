"use client";

import { openCookieSettings } from "../lib/cookie-consent";

// Inline control for policy text: reopens the cookie panel, same as the footer link.
export default function CookieSettingsButton({ children }) {
  return (
    <button type="button" className="policy-inline-button" onClick={openCookieSettings}>
      {children}
    </button>
  );
}
