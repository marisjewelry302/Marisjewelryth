"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const CLOSED_KEY = "marisSignupPopupClosedUntil";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
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
  const dialogRef = useRef(null);
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
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        closePopup();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
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

    if (hideToday) {
      suppressPopup(CLOSED_KEY, ONE_DAY_MS);
    }

    router.push(`/account?email=${encodeURIComponent(normalizedEmail)}&source=popup`);
  }

  if (!isOpen) return null;

  return (
    <div className="home-signup-popup" role="presentation">
      <button className="home-signup-popup__backdrop" type="button" aria-label="Close signup popup" onClick={closePopup} />
      <section
        className="home-signup-popup__dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Maris Jewelry signup offer"
        tabIndex={-1}
        ref={dialogRef}
      >
        <div className="home-signup-popup__image-panel">
          <img src="/assets/images/home/popup/popup-background.png" alt="" aria-hidden="true" />
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
          <img className="home-signup-popup__logo" src="/assets/images/home/popup/maris-popup-logo.png" alt="Maris Jewelry" />
          <span className="home-signup-popup__rule" aria-hidden="true" />

          <p className="home-signup-popup__intro">Sign up for our mailing list and enjoy</p>
          <p className="home-signup-popup__offer">10% OFF</p>
          <p className="home-signup-popup__suboffer">your first confirmed order</p>

          <div className="home-signup-popup__perks" aria-label="Member benefits">
            <div>
              <img src="/assets/images/home/popup/popup-icon-tag.png" alt="" aria-hidden="true" />
              <strong>10% OFF</strong>
              <small>your first confirmed order</small>
            </div>
            <div>
              <img src="/assets/images/home/popup/popup-icon-clock-v2.png" alt="" aria-hidden="true" />
              <strong>Early access</strong>
              <small>to new Maris pieces</small>
            </div>
            <div>
              <img src="/assets/images/home/popup/popup-icon-gift.png" alt="" aria-hidden="true" />
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
            <button type="submit">GET 10% OFF</button>
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
