"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { isOptimizableImageSrc } from "./lib/image-source";

const BEST_SELLER_SLOT_COUNT = 7;
const FALLBACK_BEST_SELLER_ITEMS = Array.from({ length: BEST_SELLER_SLOT_COUNT }, (_, index) => ({
  id: `best-seller-${index + 1}`,
  label: `Best Seller ${index + 1}`,
  imageSrc: "",
  imageAlt: "",
  href: ""
}));

const LOOP_SET_COUNT = 3;
const AUTOPLAY_DELAY_MS = 3200;
// Pointer travel before a press counts as a drag and swallows the link click.
const DRAG_CLICK_THRESHOLD_PX = 8;
// Fraction of a card the pointer must travel to commit to the next card.
const DRAG_COMMIT_RATIO = 0.18;

function normalizeBestSellerItems(items) {
  const normalizedItems = (Array.isArray(items) ? items : [])
    .map((item, index) => {
      const productPath = item?.slug || item?.sku || "";
      const productLabel = item?.name || item?.sku || `Best Seller ${index + 1}`;
      const imageSrc = item?.primaryImageUrl || item?.images?.[0]?.imageUrl || "";

      return {
        id: item?.id || item?.sku || `best-seller-product-${index + 1}`,
        label: productLabel,
        imageSrc,
        imageAlt: item?.images?.[0]?.altText || productLabel,
        href: productPath ? `/product/${encodeURIComponent(productPath)}` : ""
      };
    })
    .filter((item) => item.id);

  return normalizedItems.length
    ? normalizedItems.slice(0, BEST_SELLER_SLOT_COUNT)
    : FALLBACK_BEST_SELLER_ITEMS;
}

export default function BestSellerSection({ items = [] }) {
  const trackRef = useRef(null);
  const carouselRef = useRef(null);
  const bestSellerItems = useMemo(() => normalizeBestSellerItems(items), [items]);
  const realSetStart = bestSellerItems.length;
  const initialFocusIndex = realSetStart + (bestSellerItems.length > 1 ? 1 : 0);
  const [slideIndex, setSlideIndex] = useState(initialFocusIndex);
  const [slideStep, setSlideStep] = useState(0);
  const [centerOffset, setCenterOffset] = useState(0);
  const [withTransition, setWithTransition] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isPageHidden, setIsPageHidden] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const dragRef = useRef(null);
  const suppressClickRef = useRef(false);
  const loopItems = useMemo(() => {
    return Array.from({ length: LOOP_SET_COUNT }, () => bestSellerItems).flat();
  }, [bestSellerItems]);

  useEffect(() => {
    setWithTransition(false);
    setSlideIndex(initialFocusIndex);
  }, [initialFocusIndex]);

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

  // Advance right-to-left one card at a time. Keyed on slideIndex so a manual
  // drag restarts the full delay instead of jumping again right after release.
  const canAutoplay = bestSellerItems.length > 1
    && !isPaused
    && !isDragging
    && !isPageHidden
    && !prefersReducedMotion;

  useEffect(() => {
    if (!canAutoplay) {
      return;
    }

    const timer = window.setTimeout(() => {
      // A hidden tab can skip transitionend, leaving the index on a clone set;
      // snap back silently first so autoplay never runs off the rendered cards.
      const wrappedIndex = wrapIntoMiddleSet(slideIndex);

      if (wrappedIndex !== slideIndex) {
        setWithTransition(false);
        setSlideIndex(wrappedIndex);
        return;
      }

      setWithTransition(true);
      setSlideIndex(slideIndex + 1);
    }, AUTOPLAY_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [canAutoplay, slideIndex]);

  // Keep the index inside the middle copy so a drag of up to one full set
  // either way still lands on rendered cards.
  function wrapIntoMiddleSet(index) {
    const setLength = bestSellerItems.length;

    if (index >= setLength * 2) {
      return index - setLength;
    }

    if (index < setLength) {
      return index + setLength;
    }

    return index;
  }

  function handleTrackTransitionEnd(event) {
    // Card scale/opacity transitions bubble up here too; only the track move counts.
    if (event.target !== event.currentTarget) {
      return;
    }

    const wrappedIndex = wrapIntoMiddleSet(slideIndex);

    if (wrappedIndex !== slideIndex) {
      setWithTransition(false);
      setSlideIndex(wrappedIndex);
    }
  }

  function handlePointerDown(event) {
    if (bestSellerItems.length < 2 || (event.pointerType === "mouse" && event.button !== 0)) {
      return;
    }

    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, moved: false };
    suppressClickRef.current = false;
    setSlideIndex((currentIndex) => wrapIntoMiddleSet(currentIndex));
    setDragOffset(0);
    setIsDragging(true);
  }

  useEffect(() => {
    if (!isDragging) {
      return;
    }

    function handlePointerMove(event) {
      const drag = dragRef.current;

      if (!drag || event.pointerId !== drag.pointerId) {
        return;
      }

      const deltaX = event.clientX - drag.startX;

      if (Math.abs(deltaX) > DRAG_CLICK_THRESHOLD_PX) {
        drag.moved = true;
      }

      setDragOffset(deltaX);
    }

    function handlePointerEnd(event) {
      const drag = dragRef.current;

      if (!drag || event.pointerId !== drag.pointerId) {
        return;
      }

      const deltaX = event.type === "pointercancel" ? 0 : event.clientX - drag.startX;
      const step = slideStep || 1;
      let cardShift = Math.round(-deltaX / step);

      if (cardShift === 0 && Math.abs(deltaX) > step * DRAG_COMMIT_RATIO) {
        cardShift = deltaX < 0 ? 1 : -1;
      }

      const maxShift = bestSellerItems.length - 1;
      cardShift = Math.max(-maxShift, Math.min(maxShift, cardShift));

      suppressClickRef.current = drag.moved;
      dragRef.current = null;
      setWithTransition(true);
      setSlideIndex((currentIndex) => currentIndex + cardShift);
      setDragOffset(0);
      setIsDragging(false);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerEnd);
    window.addEventListener("pointercancel", handlePointerEnd);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerEnd);
    };
  }, [isDragging, slideStep, bestSellerItems.length]);

  function handleClickCapture(event) {
    if (suppressClickRef.current) {
      event.preventDefault();
      event.stopPropagation();
      suppressClickRef.current = false;
    }
  }

  function handleBlur(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsPaused(false);
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
    "--best-seller-translate": `${(slideIndex * slideStep) - centerOffset - dragOffset}px`
  };

  return (
    <section className="best-seller-section" aria-labelledby="best-seller-heading">
      <div className="best-seller-head">
        <h2 id="best-seller-heading">Best Seller</h2>
        <span aria-hidden="true" />
      </div>

      <div
        className={`best-seller-carousel${isDragging ? " is-dragging" : ""}`}
        aria-label="Best seller products"
        ref={carouselRef}
        onPointerDown={handlePointerDown}
        onClickCapture={handleClickCapture}
        onDragStart={(event) => event.preventDefault()}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocus={() => setIsPaused(true)}
        onBlur={handleBlur}
      >
        <div
          className={`best-seller-track${withTransition && !isDragging ? "" : " is-jump-reset"}`}
          onTransitionEnd={handleTrackTransitionEnd}
          ref={trackRef}
          style={trackStyle}
        >
          {loopItems.map((item, index) => {
            const distanceFromCenter = Math.abs(index - slideIndex);
            const focusState = distanceFromCenter === 0 ? "center" : distanceFromCenter === 1 ? "side" : "away";
            const isClone = index < realSetStart || index >= realSetStart + bestSellerItems.length;

            return (
              <article
                className="best-seller-card"
                data-slot-id={item.id}
                data-focus={focusState}
                aria-hidden={isClone ? "true" : undefined}
                key={`${item.id}-${index}`}
              >
                {item.href ? (
                  <a
                    className="best-seller-image-frame"
                    href={item.href}
                    aria-label={item.label}
                    tabIndex={isClone ? -1 : undefined}
                  >
                    {item.imageSrc ? (
                      <Image
                        src={item.imageSrc}
                        alt={item.imageAlt || item.label}
                        width={814}
                        height={814}
                        sizes="(max-width: 900px) 100vw, 33vw"
                        unoptimized={!isOptimizableImageSrc(item.imageSrc)}
                        draggable={false}
                      />
                    ) : (
                      <span className="best-seller-empty-label">{item.label}</span>
                    )}
                  </a>
                ) : (
                  <div className="best-seller-image-frame">
                    {item.imageSrc ? (
                      <Image
                        src={item.imageSrc}
                        alt={item.imageAlt || item.label}
                        width={814}
                        height={814}
                        sizes="(max-width: 900px) 100vw, 33vw"
                        unoptimized={!isOptimizableImageSrc(item.imageSrc)}
                        draggable={false}
                      />
                    ) : (
                      <span className="best-seller-empty-label">{item.label}</span>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
