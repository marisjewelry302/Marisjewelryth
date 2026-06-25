"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const BEST_SELLER_ITEMS = Array.from({ length: 7 }, (_, index) => ({
  id: `best-seller-${index + 1}`,
  label: `Best Seller ${index + 1}`,
  imageSrc: "",
  imageAlt: ""
}));

const LOOP_SET_COUNT = 3;
const REAL_SET_START = BEST_SELLER_ITEMS.length;
const INITIAL_FOCUS_INDEX = REAL_SET_START + 1;

export default function BestSellerSection() {
  const trackRef = useRef(null);
  const carouselRef = useRef(null);
  const [slideIndex, setSlideIndex] = useState(INITIAL_FOCUS_INDEX);
  const [slideStep, setSlideStep] = useState(0);
  const [centerOffset, setCenterOffset] = useState(0);
  const [withTransition, setWithTransition] = useState(false);
  const loopItems = useMemo(() => {
    return Array.from({ length: LOOP_SET_COUNT }, () => BEST_SELLER_ITEMS).flat();
  }, []);

  const measureCarousel = useCallback(() => {
    const track = trackRef.current;
    const carousel = carouselRef.current;

    if (!track || !carousel) {
      return;
    }

    const firstCard = track.querySelector(".best-seller-card");
    const secondCard = firstCard?.nextElementSibling;

    if (!firstCard) {
      return;
    }

    const trackStyle = window.getComputedStyle(track);
    const carouselStyle = window.getComputedStyle(carousel);
    const gap = Number.parseFloat(trackStyle.columnGap || trackStyle.gap || "0") || 0;
    const carouselPaddingLeft = Number.parseFloat(carouselStyle.paddingLeft || "0") || 0;
    const cardWidth = firstCard.offsetWidth;
    const measuredStep = secondCard ? secondCard.offsetLeft - firstCard.offsetLeft : cardWidth + gap;
    const carouselWidth = carousel.getBoundingClientRect().width;
    setSlideStep(measuredStep || cardWidth + gap);
    setCenterOffset(((carouselWidth - cardWidth) / 2) - carouselPaddingLeft);
  }, []);

  useEffect(() => {
    measureCarousel();
    window.addEventListener("resize", measureCarousel);

    return () => {
      window.removeEventListener("resize", measureCarousel);
    };
  }, [measureCarousel]);

  function showPrevious() {
    setWithTransition(true);
    setSlideIndex((currentIndex) => currentIndex - 1);
  }

  function showNext() {
    setWithTransition(true);
    setSlideIndex((currentIndex) => currentIndex + 1);
  }

  function handleTrackTransitionEnd() {
    if (slideIndex >= BEST_SELLER_ITEMS.length * 2) {
      setWithTransition(false);
      setSlideIndex(REAL_SET_START);
      return;
    }

    if (slideIndex < BEST_SELLER_ITEMS.length) {
      setWithTransition(false);
      setSlideIndex((BEST_SELLER_ITEMS.length * 2) - 1);
    }
  }

  useEffect(() => {
    if (withTransition) {
      return;
    }

    const transitionFrame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setWithTransition(true);
      });
    });

    return () => {
      window.cancelAnimationFrame(transitionFrame);
    };
  }, [withTransition, slideIndex]);

  const trackStyle = {
    "--best-seller-translate": `${(slideIndex * slideStep) - centerOffset}px`
  };

  return (
    <section className="best-seller-section" aria-labelledby="best-seller-heading">
      <div className="best-seller-head">
        <p className="section-kicker">Maris selection</p>
        <h2 id="best-seller-heading">Best Seller</h2>
      </div>

      <div
        className="best-seller-carousel"
        aria-label="Best seller product placeholders"
        ref={carouselRef}
      >
        <div
          className={`best-seller-track${withTransition ? "" : " is-jump-reset"}`}
          onTransitionEnd={handleTrackTransitionEnd}
          ref={trackRef}
          style={trackStyle}
        >
          {loopItems.map((item, index) => {
            const distanceFromCenter = Math.abs(index - slideIndex);
            const focusState = distanceFromCenter === 0 ? "center" : distanceFromCenter === 1 ? "side" : "away";

            return (
            <article
              className="best-seller-card"
              data-slot-id={item.id}
              data-focus={focusState}
              aria-hidden={index < REAL_SET_START || index >= REAL_SET_START + BEST_SELLER_ITEMS.length ? "true" : undefined}
              key={`${item.id}-${index}`}
            >
              <div className="best-seller-image-frame">
                {item.imageSrc ? (
                  <img
                    src={item.imageSrc}
                    alt={item.imageAlt || item.label}
                    width="814"
                    height="814"
                    loading="lazy"
                    
                  />
                ) : (
                  <span className="best-seller-empty-label">{item.label}</span>
                )}
              </div>
            </article>
            );
          })}
        </div>
      </div>

      <div className="best-seller-controls" aria-label="Best seller carousel controls">
        <button
          type="button"
          className="best-seller-arrow best-seller-arrow--previous"
          aria-label="Previous best seller"
          onClick={showPrevious}
        >
          <span aria-hidden="true">&larr;</span>
        </button>
        <button
          type="button"
          className="best-seller-arrow best-seller-arrow--next"
          aria-label="Next best seller"
          onClick={showNext}
        >
          <span aria-hidden="true">&rarr;</span>
        </button>
      </div>
    </section>
  );
}
