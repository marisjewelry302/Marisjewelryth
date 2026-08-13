"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

const CLOSED_KEY = "marisSignupPopupClosedUntil";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * ONE_DAY_MS;
const POPUP_DELAY_MS = 3000;

function getStoredUntil(key) {
  if (typeof window === "undefined") return 0;
  return Number(window.localStorage.getItem(key) || 0);
}

function suppressPopup(key, durationMs) {
  window.localStorage.setItem(key, String(Date.now() + durationMs));
}

function shouldSuppressPopup() {
  const now = Date.now();
  return getStoredUntil(CLOSED_KEY) > now;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function HomeSignupPopup() {
  const router = useRouter();
  const emailId = useId();
  const titleId = useId();
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [hideToday, setHideToday] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (shouldSuppressPopup()) return undefined;

    const timer = window.setTimeout(() => {
      setIsOpen(true);
    }, POPUP_DELAY_MS);

    return () => window.clearTimeout(timer);
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
    if (hideToday) {
      suppressPopup(CLOSED_KEY, ONE_DAY_MS);
    }

    setIsOpen(false);
  }

  function handleSubmit(event) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      setMessage("Please enter a valid email address.");
      return;
    }

    suppressPopup(CLOSED_KEY, hideToday ? ONE_DAY_MS : THIRTY_DAYS_MS);

    router.push(`/account?mode=signup&email=${encodeURIComponent(normalizedEmail)}`);
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
        <h2 id={titleId} className="sr-only">Join Maris Jewelry</h2>
        <div className="home-signup-popup__image-panel">
          <Image src="/assets/images/home/popup/popup-background.webp" alt="" aria-hidden={true} width={1024} height={1536} sizes="(max-width: 900px) 100vw, 420px" />
          <span className="home-signup-popup__image-brand">
            MARIS
            <small>JEWELRY</small>
          </span>
        </div>

        <div className="home-signup-popup__content">
          <button className="home-signup-popup__close" type="button" aria-label="Close signup popup" onClick={closePopup}>
            &times;
          </button>

          <p className="home-signup-popup__eyebrow">Welcome to</p>
          <Image className="home-signup-popup__logo" src="/assets/images/home/popup/maris-popup-logo.png" alt="Maris Jewelry" width={1321} height={740} sizes="220px" />
          <span className="home-signup-popup__rule" aria-hidden="true" />

          <p className="home-signup-popup__intro">Sign up for our mailing list and enjoy</p>
          <p className="home-signup-popup__offer">10% OFF</p>
          <p className="home-signup-popup__suboffer">your first confirmed order</p>

          <div className="home-signup-popup__perks" aria-label="Member benefits">
            <div>
              <Image src="/assets/images/home/popup/popup-icon-tag.png" alt="" aria-hidden={true} width={355} height={369} sizes="23px" />
              <strong>10% OFF</strong>
              <small>your first confirmed order</small>
            </div>
            <div>
              <Image src="/assets/images/home/popup/popup-icon-clock-v2.png" alt="" aria-hidden={true} width={371} height={397} sizes="23px" />
              <strong>Early access</strong>
              <small>to new Maris pieces</small>
            </div>
            <div>
              <Image src="/assets/images/home/popup/popup-icon-gift.png" alt="" aria-hidden={true} width={405} height={388} sizes="23px" />
              <strong>Private offers</strong>
              <small>for Maris members</small>
            </div>
          </div>

          <form className="home-signup-popup__form" onSubmit={handleSubmit} noValidate>
            <label className="sr-only" htmlFor={emailId}>Email address</label>
            <input
              id={emailId}
              name="email"
              type="email"
              autoComplete="email"
              placeholder="Enter your email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setMessage("");
              }}
              required
            />
            <button type="submit">Get 10% Off</button>
          </form>

          {message && <p className="home-signup-popup__message" role="alert">{message}</p>}

          <p className="home-signup-popup__privacy">
            By continuing, you agree to receive Maris Jewelry updates and accept our <a href="/privacy-policy">Privacy Policy</a>.
          </p>

          <label className="home-signup-popup__remember">
            <input
              type="checkbox"
              checked={hideToday}
              onChange={(event) => setHideToday(event.target.checked)}
            />
            <span>Don't show again today</span>
          </label>

          <button className="home-signup-popup__decline" type="button" onClick={closePopup}>No, thank you</button>
        </div>
      </section>
    </div>
  );
}
