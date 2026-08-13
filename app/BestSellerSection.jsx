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

  function showPrevious() {
    setWithTransition(true);
    setSlideIndex((currentIndex) => currentIndex - 1);
  }

  function showNext() {
    setWithTransition(true);
    setSlideIndex((currentIndex) => currentIndex + 1);
  }

  function handleTrackTransitionEnd() {
    if (slideIndex >= bestSellerItems.length * 2) {
      setWithTransition(false);
      setSlideIndex(realSetStart);
      return;
    }

    if (slideIndex < bestSellerItems.length) {
      setWithTransition(false);
      setSlideIndex((bestSellerItems.length * 2) - 1);
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
        <h2 id="best-seller-heading">Best Seller</h2>
        <span aria-hidden="true" />
      </div>

      <div
        className="best-seller-carousel"
        aria-label="Best seller products"
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
