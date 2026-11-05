"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import {
  COOKIE_SETTINGS_EVENT,
  readCookieConsent,
  saveCookieConsent
} from "../lib/cookie-consent";

const CATEGORIES = [
  {
    key: "necessary",
    title: "Strictly necessary",
    text: "Keep you signed in, protect forms, and remember this choice. The site cannot work without them, so they are always on.",
    locked: true
  },
  {
    key: "analytics",
    title: "Analytics",
    text: "Help us understand which pages and pieces visitors look at, so we can improve the catalogue. No data is sold."
  },
  {
    key: "marketing",
    title: "Marketing",
    text: "Let us measure our social media and advertising campaigns and show you more relevant Maris pieces elsewhere."
  }
];

function isAdminPath(pathname) {
  const normalized = (pathname || "/").replace(/\/$/, "") || "/";
  return normalized === "/admin" || normalized.startsWith("/admin/");
}

export default function CookieConsent() {
  const pathname = usePathname();
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef(null);
  // Closed until mounted: the cookie is only readable in the browser, and
  // rendering nothing on the server keeps hydration identical.
  const [isOpen, setIsOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [choices, setChoices] = useState({ analytics: false, marketing: false });
  const [focusOnOpen, setFocusOnOpen] = useState(false);

  useEffect(() => {
    if (!readCookieConsent()) {
      setIsOpen(true);
    }

    function handleOpenSettings() {
      const saved = readCookieConsent();
      setChoices({ analytics: Boolean(saved?.analytics), marketing: Boolean(saved?.marketing) });
      setShowDetails(true);
      setFocusOnOpen(true);
      setIsOpen(true);
    }

    window.addEventListener(COOKIE_SETTINGS_EVENT, handleOpenSettings);
    return () => window.removeEventListener(COOKIE_SETTINGS_EVENT, handleOpenSettings);
  }, []);

  useEffect(() => {
    if (isOpen && focusOnOpen) {
      panelRef.current?.focus();
      setFocusOnOpen(false);
    }
  }, [isOpen, focusOnOpen]);

  if (!isOpen || isAdminPath(pathname)) return null;

  function finish(nextChoices) {
    saveCookieConsent(nextChoices);
    setIsOpen(false);
    setShowDetails(false);
  }

  return (
    <section
      ref={panelRef}
      className={`cookie-consent${showDetails ? " is-expanded" : ""}`}
      role="region"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      tabIndex={-1}
    >
      <div className="cookie-consent__inner">
        <div className="cookie-consent__copy">
          <p className="cookie-consent__eyebrow">Your privacy</p>
          <h2 id={titleId} className="cookie-consent__title">We use cookies</h2>
          <p id={descriptionId} className="cookie-consent__text">
            Maris Jewelry uses essential cookies to run this site. With your permission we would also
            like to use optional cookies for analytics and marketing. You can change your choice at
            any time from &ldquo;Cookie settings&rdquo; in the footer.{" "}
            <Link href="/privacy-policy" className="cookie-consent__link">Privacy policy</Link>
          </p>
        </div>

        {showDetails && (
          <fieldset className="cookie-consent__categories">
            <legend className="sr-only">Cookie categories</legend>
            {CATEGORIES.map((category) => {
              const inputId = `${titleId}-${category.key}`;
              const checked = category.locked ? true : choices[category.key];

              return (
                <div className="cookie-consent__category" key={category.key}>
                  <div className="cookie-consent__category-copy">
                    <label htmlFor={inputId} className="cookie-consent__category-title">
                      {category.title}
                      {category.locked && <span className="cookie-consent__badge">Always on</span>}
                    </label>
                    <p className="cookie-consent__category-text">{category.text}</p>
                  </div>
                  <input
                    id={inputId}
                    className="cookie-consent__switch"
                    type="checkbox"
                    role="switch"
                    checked={checked}
                    disabled={category.locked}
                    aria-checked={checked}
                    onChange={(event) => {
                      const { checked: nextChecked } = event.target;
                      setChoices((current) => ({ ...current, [category.key]: nextChecked }));
                    }}
                  />
                </div>
              );
            })}
          </fieldset>
        )}

        <div className="cookie-consent__actions">
          {showDetails ? (
            <button type="button" className="cookie-consent__button is-secondary" onClick={() => finish(choices)}>
              Save preferences
            </button>
          ) : (
            <button type="button" className="cookie-consent__button is-ghost" onClick={() => setShowDetails(true)}>
              Customize
            </button>
          )}
          <button
            type="button"
            className="cookie-consent__button is-secondary"
            onClick={() => finish({ analytics: false, marketing: false })}
          >
            Necessary only
          </button>
          <button
            type="button"
            className="cookie-consent__button is-primary"
            onClick={() => finish({ analytics: true, marketing: true })}
          >
            Accept all
          </button>
        </div>
      </div>
    </section>
  );
}
