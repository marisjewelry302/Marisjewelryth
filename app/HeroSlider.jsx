"use client";

import { useState, useRef, useCallback, useEffect } from "react";

const AUTOPLAY_DELAY_MS = 4800;

export default function HeroSlider({ slides }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isPageHidden, setIsPageHidden] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const timerRef = useRef(null);
  const touchStartXRef = useRef(0);

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

  function handleTouchStart(event) {
    touchStartXRef.current = event.touches[0].clientX;
  }

  function handleTouchEnd(event) {
    const distance = event.changedTouches[0].clientX - touchStartXRef.current;
    if (Math.abs(distance) > 40) {
      moveSlide(distance > 0 ? -1 : 1);
    }
  }

  if (!slides.length) {
    return null;
  }

  return (
    <div className="hero-slider" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
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
        aria-label="Next slide"
        onClick={() => moveSlide(1)}
      />
      <button
        type="button"
        className="hero-hit hero-hit-right"
        aria-label="Previous slide"
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
              {slide.label || `Slide ${index + 1}`}
            </button>
          ))}
          {!prefersReducedMotion && (
            <button
              type="button"
              className="hero-slide-toggle"
              aria-pressed={isPaused}
              aria-label={isPaused ? "Play slideshow" : "Pause slideshow"}
              onClick={() => setIsPaused((paused) => !paused)}
            >
              {isPaused ? "Play" : "Pause"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
