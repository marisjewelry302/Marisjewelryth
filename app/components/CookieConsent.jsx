"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { useLocale } from "../hooks/useLocale";
import {
  COOKIE_SETTINGS_EVENT,
  readCookieConsent,
  saveCookieConsent
} from "../lib/cookie-consent";

function isAdminPath(pathname) {
  const normalized = (pathname || "/").replace(/\/$/, "") || "/";
  return normalized === "/admin" || normalized.startsWith("/admin/");
}

export default function CookieConsent() {
  const pathname = usePathname();
  const { t, href } = useLocale();
  const copy = t.cookie;
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
          <p className="cookie-consent__eyebrow">{copy.eyebrow}</p>
          <h2 id={titleId} className="cookie-consent__title">{copy.title}</h2>
          <p id={descriptionId} className="cookie-consent__text">
            {copy.textBefore}{" "}
            <Link href={href("/privacy-policy")} className="cookie-consent__link">{copy.privacyPolicy}</Link>
          </p>
        </div>

        {showDetails && (
          <fieldset className="cookie-consent__categories">
            <legend className="sr-only">{copy.legend}</legend>
            {copy.categories.map((category) => {
              const inputId = `${titleId}-${category.key}`;
              const checked = category.locked ? true : choices[category.key];

              return (
                <div className="cookie-consent__category" key={category.key}>
                  <div className="cookie-consent__category-copy">
                    <label htmlFor={inputId} className="cookie-consent__category-title">
                      {category.title}
                      {category.locked && <span className="cookie-consent__badge">{copy.alwaysOn}</span>}
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
              {copy.save}
            </button>
          ) : (
            <button type="button" className="cookie-consent__button is-ghost" onClick={() => setShowDetails(true)}>
              {copy.customize}
            </button>
          )}
          <button
            type="button"
            className="cookie-consent__button is-secondary"
            onClick={() => finish({ analytics: false, marketing: false })}
          >
            {copy.necessaryOnly}
          </button>
          <button
            type="button"
            className="cookie-consent__button is-primary"
            onClick={() => finish({ analytics: true, marketing: true })}
          >
            {copy.acceptAll}
          </button>
        </div>
      </div>
    </section>
  );
}
