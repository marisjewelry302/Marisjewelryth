"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { useCustomerSession } from "./hooks/useCustomerSession";
import { useLocale } from "./hooks/useLocale";
import { hasCookieConsentDecision, onCookieConsentChange } from "./lib/cookie-consent";

const CLOSED_KEY = "marisSignupPopupClosedUntil";
// The email travels to /account through sessionStorage so it never lands in the URL.
const EMAIL_HANDOFF_KEY = "marisSignupPopupEmail";
// Set only when the visitor ticked the marketing box, so the sign-up page can carry that choice over.
const CONSENT_HANDOFF_KEY = "marisSignupPopupConsent";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * ONE_DAY_MS;
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
  return Number(readStorage("localStorage", CLOSED_KEY) || 0) > Date.now();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function HomeSignupPopup() {
  const router = useRouter();
  const { t, href } = useLocale();
  const copy = t.popup;
  const emailId = useId();
  const messageId = useId();
  const emailRef = useRef(null);
  const consentRef = useRef(null);
  // Signed-in customers already have an account, so the offer is not shown to them.
  const { isLoggedIn, isLoading: sessionLoading } = useCustomerSession();
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
  // Which field the current message is about, so aria-invalid points at the right one.
  const [errorField, setErrorField] = useState("");

  useEffect(() => {
    if (sessionLoading || isLoggedIn || shouldSuppressPopup()) return undefined;

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
  }, [sessionLoading, isLoggedIn]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    previousFocusRef.current = document.activeElement;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        closePopup(false);
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

  // An explicit "No, thank you" is a firm answer (30 days). Closing with the
  // x, Escape or the backdrop may be a slip, so the popup returns sooner (7 days),
  // or after one day when "Don't show again today" is ticked.
  function closePopup(declined) {
    if (declined) {
      suppressPopup(THIRTY_DAYS_MS);
    } else {
      suppressPopup(hideTodayRef.current ? ONE_DAY_MS : SEVEN_DAYS_MS);
    }

    setIsOpen(false);
  }

  function showError(field, text) {
    setErrorField(field);
    setMessage(text);
    (field === "email" ? emailRef : consentRef).current?.focus();
  }

  function handleSubmit(event) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      showError("email", copy.invalidEmail);
      return;
    }

    // The offer is a marketing offer, so it needs a clear, separate yes to marketing emails.
    if (!agreeMarketing) {
      showError("consent", copy.needConsent);
      return;
    }

    suppressPopup(THIRTY_DAYS_MS);
    writeStorage("sessionStorage", EMAIL_HANDOFF_KEY, normalizedEmail);
    writeStorage("sessionStorage", CONSENT_HANDOFF_KEY, "1");

    router.push(href("/account?mode=signup"));
  }

  if (!isOpen) return null;

  return (
    <div className="home-signup-popup" role="presentation">
      <button className="home-signup-popup__backdrop" type="button" tabIndex={-1} aria-hidden="true" onClick={() => closePopup(false)} />
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
          <button className="home-signup-popup__close" type="button" aria-label={copy.close} onClick={() => closePopup(false)}>
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

          <form className="home-signup-popup__signup" onSubmit={handleSubmit} noValidate>
            {/* The consent is required, so it comes before the button that submits it. */}
            <label className="home-signup-popup__remember home-signup-popup__consent">
              <input
                ref={consentRef}
                type="checkbox"
                checked={agreeMarketing}
                aria-invalid={errorField === "consent" ? "true" : undefined}
                aria-describedby={errorField === "consent" ? messageId : undefined}
                onChange={(event) => {
                  setAgreeMarketing(event.target.checked);
                  setMessage("");
                  setErrorField("");
                }}
              />
              <span>{copy.consent}</span>
            </label>

            <div className="home-signup-popup__form">
              <label className="sr-only" htmlFor={emailId}>{copy.emailAddress}</label>
              <input
                ref={emailRef}
                id={emailId}
                name="email"
                type="email"
                autoComplete="email"
                placeholder={copy.emailPlaceholder}
                value={email}
                aria-invalid={errorField === "email" ? "true" : undefined}
                aria-describedby={errorField === "email" ? messageId : undefined}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setMessage("");
                  setErrorField("");
                }}
                required
              />
              <button type="submit">{copy.submit}</button>
            </div>

            <p className="home-signup-popup__note">{copy.accountNote}</p>
            {/* Always mounted with a reserved height, so an error never shifts the layout. */}
            <p id={messageId} className="home-signup-popup__message" role="alert">{message}</p>
          </form>

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

          <button className="home-signup-popup__decline" type="button" onClick={() => closePopup(true)}>{copy.decline}</button>
        </div>
      </section>
    </div>
  );
}
