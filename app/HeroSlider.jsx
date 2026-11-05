"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useLocale } from "./hooks/useLocale";

const AUTOPLAY_DELAY_MS = 4800;

export default function HeroSlider({ slides }) {
  const { t } = useLocale();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isPageHidden, setIsPageHidden] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const timerRef = useRef(null);
  const swipeRef = useRef(null);
  const suppressClickRef = useRef(false);

  const moveSlide = useCallback((delta) => {
    setActiveIndex((current) => (current + delta + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => setPrefersReducedMotion(motionQuery.matches);
    const syncVisibility = () => setIsPageHidden(document.hidden);

    syncMotion();
    syncVisibility();
    motionQuery.addEventListener("change", syncMotion);
    document.addEventListener("visibilitychange", syncVisibility);

    return () => {
      motionQuery.removeEventListener("change", syncMotion);
      document.removeEventListener("visibilitychange", syncVisibility);
    };
  }, []);

  // Moving content must be pausable (WCAG 2.2.2), so autoplay stops for the pause
  // button, reduced-motion visitors, and hidden tabs.
  const canAutoplay = slides.length > 1 && !isPaused && !isPageHidden && !prefersReducedMotion;

  useEffect(() => {
    if (!canAutoplay) return undefined;

    // Keyed on activeIndex so a manual change restarts the full delay.
    timerRef.current = setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, AUTOPLAY_DELAY_MS);
    return () => clearInterval(timerRef.current);
  }, [canAutoplay, slides.length, activeIndex]);

  useEffect(() => {
    if (slides.length <= 1) return undefined;

    const nextImage = slides[(activeIndex + 1) % slides.length]?.image;
    if (!nextImage) return undefined;

    const preload = () => {
      const image = new Image();
      image.src = nextImage;
    };
    const idleId = "requestIdleCallback" in window
      ? window.requestIdleCallback(preload, { timeout: 1500 })
      : window.setTimeout(preload, 750);

    return () => {
      if ("cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      } else {
        window.clearTimeout(idleId);
      }
    };
  }, [activeIndex, slides]);

  // Pointer events cover finger and mouse alike; touch-action: pan-y in the CSS
  // keeps vertical page scrolling while the horizontal swipe reaches this handler.
  function handlePointerDown(event) {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    swipeRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY };
    suppressClickRef.current = false;
  }

  function handlePointerUp(event) {
    const swipe = swipeRef.current;

    if (!swipe || swipe.pointerId !== event.pointerId) return;

    swipeRef.current = null;
    const distanceX = event.clientX - swipe.startX;
    const distanceY = event.clientY - swipe.startY;

    if (Math.abs(distanceX) > 40 && Math.abs(distanceX) > Math.abs(distanceY)) {
      suppressClickRef.current = true;
      moveSlide(distanceX > 0 ? -1 : 1);
    }
  }

  function handleClickCapture(event) {
    // A swipe that ends on a half-width hit button must not also count as a tap.
    if (suppressClickRef.current) {
      event.preventDefault();
      event.stopPropagation();
      suppressClickRef.current = false;
    }
  }

  if (!slides.length) {
    return null;
  }

  return (
    <div className="hero-slider" onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => { swipeRef.current = null; }}
      onClickCapture={handleClickCapture}>
      {slides.map((slide, index) => {
        let stateClass = "";
        if (index === activeIndex) {
          stateClass = "is-active";
        }

        return (
          <div
            key={slide.id || index}
            className={`hero-slide ${stateClass}`}
            style={{
              backgroundImage: index === activeIndex && slide.image ? `url(${slide.image})` : undefined,
              "--hero-position-start": slide.positionStart,
              "--hero-position-end": slide.positionEnd,
              "--hero-size-start": slide.sizeStart,
              "--hero-size-end": slide.sizeEnd
            }}
          />
        );
      })}

      {/* The left half advances and the right half goes back, so each label names what the click does. */}
      <button
        type="button"
        className="hero-hit hero-hit-left"
        aria-label={t.hero.next}
        onClick={() => moveSlide(1)}
      />
      <button
        type="button"
        className="hero-hit hero-hit-right"
        aria-label={t.hero.previous}
        onClick={() => moveSlide(-1)}
      />

      {slides.length > 1 && (
        <div className="hero-slide-control">
          {slides.map((slide, index) => (
            <button
              key={slide.id || index}
              type="button"
              className={`hero-slide-dot${index === activeIndex ? " is-active" : ""}`}
              aria-current={index === activeIndex ? "true" : "false"}
              onClick={() => setActiveIndex(index)}
            >
              <span aria-hidden="true" />
              {slide.label || `${t.hero.slide} ${index + 1}`}
            </button>
          ))}
          {!prefersReducedMotion && (
            <button
              type="button"
              className="hero-slide-toggle"
              aria-pressed={isPaused}
              aria-label={isPaused ? t.hero.play : t.hero.pause}
              onClick={() => setIsPaused((paused) => !paused)}
            >
              {isPaused ? t.hero.playShort : t.hero.pauseShort}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
