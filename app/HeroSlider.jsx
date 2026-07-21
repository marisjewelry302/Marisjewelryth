"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export default function HeroSlider({ slides }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState("left");
  const timerRef = useRef(null);
  const touchStartXRef = useRef(0);

  const moveSlide = useCallback((delta, slideDirection) => {
    setDirection(slideDirection);
    setActiveIndex((current) => (current + delta + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return;

    function restart() {
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setDirection("left");
        setActiveIndex((current) => (current + 1) % slides.length);
      }, 4800);
    }

    restart();
    return () => clearInterval(timerRef.current);
  }, [slides.length, activeIndex]);

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
      moveSlide(distance > 0 ? -1 : 1, distance > 0 ? "right" : "left");
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

      <button
        type="button"
        className="hero-hit hero-hit-left"
        aria-label="Previous slide"
        onClick={() => moveSlide(1, "left")}
      />
      <button
        type="button"
        className="hero-hit hero-hit-right"
        aria-label="Next slide"
        onClick={() => moveSlide(-1, "right")}
      />

      {slides.length > 1 && (
        <div className="hero-slide-control">
          {slides.map((slide, index) => (
            <button
              key={slide.id || index}
              type="button"
              className={`hero-slide-dot${index === activeIndex ? " is-active" : ""}`}
              aria-current={index === activeIndex ? "true" : "false"}
              onClick={() => {
                if (index === activeIndex) return;
                setDirection(index > activeIndex ? "left" : "right");
                setActiveIndex(index);
              }}
            >
              <span aria-hidden="true" />
              {slide.label || `Slide ${index + 1}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
