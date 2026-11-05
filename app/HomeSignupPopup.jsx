"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { useLocale } from "./hooks/useLocale";
import { hasCookieConsentDecision, onCookieConsentChange } from "./lib/cookie-consent";

const CLOSED_KEY = "marisSignupPopupClosedUntil";
const DISMISSED_SESSION_KEY = "marisSignupPopupDismissed";
// The email travels to /account through sessionStorage so it never lands in the URL.
const EMAIL_HANDOFF_KEY = "marisSignupPopupEmail";
// Set only when the visitor ticked the marketing box, so the sign-up page can carry that choice over.
const CONSENT_HANDOFF_KEY = "marisSignupPopupConsent";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * ONE_DAY_MS;
const POPUP_DELAY_MS = 3000;

// Storage can throw (Safari private mode, blocked site data), so every access is guarded.
function readStorage(area, key) {
  try {
    return window[area].getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(area, key, value) {
  try {
    window[area].setItem(key, value);
  } catch {
    // Storage unavailable: the popup simply may show again on the next visit.
  }
}

function suppressPopup(durationMs) {
  writeStorage("localStorage", CLOSED_KEY, String(Date.now() + durationMs));
}

function shouldSuppressPopup() {
  if (Number(readStorage("localStorage", CLOSED_KEY) || 0) > Date.now()) return true;
  return readStorage("sessionStorage", DISMISSED_SESSION_KEY) === "1";
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function HomeSignupPopup() {
  const router = useRouter();
  const { t, href } = useLocale();
  const copy = t.popup;
  const emailId = useId();
  const titleId = useId();
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);
  // Mirrors hideToday so the Escape handler, registered once per open, never reads a stale value.
  const hideTodayRef = useRef(false);
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [hideToday, setHideToday] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (shouldSuppressPopup()) return undefined;

    let timer = null;
    function startTimer() {
      timer = window.setTimeout(() => {
        setIsOpen(true);
      }, POPUP_DELAY_MS);
    }

    // Two overlays at once is too much on a first visit: while the cookie
    // banner is still waiting for an answer, the popup waits for it.
    if (hasCookieConsentDecision()) {
      startTimer();
      return () => window.clearTimeout(timer);
    }

    const unsubscribe = onCookieConsentChange(() => {
      unsubscribe();
      if (timer === null && !shouldSuppressPopup()) startTimer();
    });

    return () => {
      unsubscribe();
      if (timer !== null) window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    previousFocusRef.current = document.activeElement;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        closePopup();
        return;
      }

      if (event.key === "Tab" && dialogRef.current) {
        const focusable = [...dialogRef.current.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')];
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [isOpen]);

  function closePopup() {
    if (hideTodayRef.current) {
      suppressPopup(ONE_DAY_MS);
    } else {
      // Any dismissal keeps the popup away for the rest of this browser session.
      writeStorage("sessionStorage", DISMISSED_SESSION_KEY, "1");
    }

    setIsOpen(false);
  }

  function handleSubmit(event) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      setMessage(copy.invalidEmail);
      return;
    }

    // The offer is a marketing offer, so it needs a clear, separate yes to marketing emails.
    if (!agreeMarketing) {
      setMessage(copy.needConsent);
      return;
    }

    suppressPopup(hideTodayRef.current ? ONE_DAY_MS : THIRTY_DAYS_MS);
    writeStorage("sessionStorage", EMAIL_HANDOFF_KEY, normalizedEmail);
    writeStorage("sessionStorage", CONSENT_HANDOFF_KEY, "1");

    router.push(href("/account?mode=signup"));
  }

  if (!isOpen) return null;

  return (
    <div className="home-signup-popup" role="presentation">
      <button className="home-signup-popup__backdrop" type="button" tabIndex={-1} aria-hidden="true" onClick={closePopup} />
      <section
        className="home-signup-popup__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={dialogRef}
      >
        <h2 id={titleId} className="sr-only">{copy.join}</h2>
        <div className="home-signup-popup__image-panel">
          <Image src="/assets/images/home/popup/popup-background.webp" alt="" aria-hidden={true} width={1024} height={1536} sizes="(max-width: 900px) 100vw, 420px" />
          <span className="home-signup-popup__image-brand">
            MARIS
            <small>JEWELRY</small>
          </span>
        </div>

        <div className="home-signup-popup__content">
          <button className="home-signup-popup__close" type="button" aria-label={copy.close} onClick={closePopup}>
            &times;
          </button>

          <p className="home-signup-popup__eyebrow">{copy.welcome}</p>
          <Image className="home-signup-popup__logo" src="/assets/images/home/popup/maris-popup-logo.png" alt="Maris Jewelry" width={1321} height={740} sizes="220px" />
          <span className="home-signup-popup__rule" aria-hidden="true" />

          <p className="home-signup-popup__intro">{copy.intro}</p>
          <p className="home-signup-popup__offer">{copy.offer}</p>
          <p className="home-signup-popup__suboffer">{copy.subOffer}</p>

          <div className="home-signup-popup__perks" aria-label={copy.perksLabel}>
            <div>
              <Image src="/assets/images/home/popup/popup-icon-tag.png" alt="" aria-hidden={true} width={355} height={369} sizes="23px" />
              <strong>{copy.perks[0].title}</strong>
              <small>{copy.perks[0].text}</small>
            </div>
            <div>
              <Image src="/assets/images/home/popup/popup-icon-clock-v2.png" alt="" aria-hidden={true} width={371} height={397} sizes="23px" />
              <strong>{copy.perks[1].title}</strong>
              <small>{copy.perks[1].text}</small>
            </div>
            <div>
              <Image src="/assets/images/home/popup/popup-icon-gift.png" alt="" aria-hidden={true} width={405} height={388} sizes="23px" />
              <strong>{copy.perks[2].title}</strong>
              <small>{copy.perks[2].text}</small>
            </div>
          </div>

          <form className="home-signup-popup__form" onSubmit={handleSubmit} noValidate>
            <label className="sr-only" htmlFor={emailId}>{copy.emailAddress}</label>
            <input
              id={emailId}
              name="email"
              type="email"
              autoComplete="email"
              placeholder={copy.emailPlaceholder}
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setMessage("");
              }}
              required
            />
            <button type="submit">{copy.submit}</button>
          </form>

          {message && <p className="home-signup-popup__message" role="alert">{message}</p>}

          <label className="home-signup-popup__remember home-signup-popup__consent">
            <input
              type="checkbox"
              checked={agreeMarketing}
              onChange={(event) => {
                setAgreeMarketing(event.target.checked);
                setMessage("");
              }}
            />
            <span>{copy.consent}</span>
          </label>

          <p className="home-signup-popup__privacy">
            {copy.privacyBefore} <a href={href("/privacy-policy")}>{copy.privacyPolicy}</a>.
          </p>

          <label className="home-signup-popup__remember">
            <input
              type="checkbox"
              checked={hideToday}
              onChange={(event) => {
                hideTodayRef.current = event.target.checked;
                setHideToday(event.target.checked);
              }}
            />
            <span>{copy.hideToday}</span>
          </label>

          <button className="home-signup-popup__decline" type="button" onClick={closePopup}>{copy.decline}</button>
        </div>
      </section>
    </div>
  );
}
