"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import { isOptimizableImageSrc } from "../../lib/image-source";
import { getPublicImageAltText } from "../../lib/product-display";

export default function ProductGallery({ images, productCode, productName }) {
  const galleryItems = images && images.length > 0
    ? images.map((img, index) => ({
        src: img.imageUrl,
        alt: getPublicImageAltText(img, productCode, productName, index),
        label: img.isPrimary ? "Primary View" : `View ${index + 1}`
      }))
    : [{ src: "", alt: `${productCode} ${productName}`, label: "Primary View" }];

  // The mosaic shows every image at once, so the only "active" image is the one
  // the lightbox is holding. -1 means the lightbox is closed.
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const lightboxOpen = lightboxIndex >= 0;
  const activeIndex = lightboxOpen ? lightboxIndex : 0;
  const activeItem = galleryItems[activeIndex] || galleryItems[0];

  const tileRefs = useRef([]);
  const lightboxRef = useRef(null);
  // Remembers which tile opened the lightbox so focus lands back on it - read
  // after the dialog has actually unmounted, not while it is still on screen.
  const returnFocusIndex = useRef(null);

  const stepGallery = useCallback((direction) => {
    setLightboxIndex((current) => {
      if (current < 0) return current;
      const next = current + direction;
      if (next < 0) return galleryItems.length - 1;
      if (next >= galleryItems.length) return 0;
      return next;
    });
  }, [galleryItems.length]);

  const closeLightbox = useCallback(() => setLightboxIndex(-1), []);

  useEffect(() => {
    if (lightboxOpen) {
      returnFocusIndex.current = lightboxIndex;
      return;
    }

    if (returnFocusIndex.current === null) return;

    const returnTo = returnFocusIndex.current;
    returnFocusIndex.current = null;
    tileRefs.current[returnTo]?.focus();
  }, [lightboxOpen, lightboxIndex]);

  useEffect(() => {
    function handleKeydown(event) {
      if (!lightboxOpen) return;

      if (event.key === "Escape") {
        closeLightbox();
        return;
      }

      if (event.key === "ArrowLeft") {
        stepGallery(-1);
        return;
      }

      if (event.key === "ArrowRight") {
        stepGallery(1);
        return;
      }

      if (event.key === "Tab" && lightboxRef.current) {
        const focusable = [...lightboxRef.current.querySelectorAll('button:not([disabled]), [tabindex]:not([tabindex="-1"])')];
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

    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [lightboxOpen, stepGallery, closeLightbox]);

  useEffect(() => {
    document.body.classList.toggle("is-lightbox-open", lightboxOpen);
    return () => document.body.classList.remove("is-lightbox-open");
  }, [lightboxOpen]);

  return (
    <>
      {/* One scrolling mosaic instead of a single frame plus a thumbnail rail:
          the hero leads at full column width and every other view follows in a
          two-up grid, the way a house catalogue lays a piece out. */}
      <div className="product-mosaic" data-product-gallery data-mosaic-count={galleryItems.length}>
        {galleryItems.map((item, index) => (
          <figure
            key={item.src + index}
            className={`product-mosaic-tile${index === 0 ? " is-hero" : ""}`}
          >
            <button
              type="button"
              className="product-gallery-open"
              ref={(node) => { tileRefs.current[index] = node; }}
              onClick={() => setLightboxIndex(index)}
              aria-label={`Open ${item.label.toLowerCase()} preview for ${productCode}`}
            >
              {item.src && (
                <Image
                  src={item.src}
                  alt={item.alt}
                  data-product-image={index === 0 ? "" : undefined}
                  width={1024}
                  height={1024}
                  sizes={index === 0 ? "(max-width: 900px) 100vw, 640px" : "(max-width: 900px) 50vw, 320px"}
                  preload={index === 0}
                  unoptimized={!isOptimizableImageSrc(item.src)}
                />
              )}
              <span className="product-mosaic-label">{item.label}</span>
            </button>
          </figure>
        ))}
      </div>

      {lightboxOpen && (
        <div
          className="product-lightbox"
          data-product-lightbox
          role="dialog"
          aria-modal="true"
          aria-label={`${productCode} image preview`}
          ref={lightboxRef}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeLightbox();
            }
          }}
        >
          {activeItem.src && (
            <Image src={activeItem.src} alt={`${activeItem.alt} large preview`} width={1024} height={1024} sizes="90vw" unoptimized={!isOptimizableImageSrc(activeItem.src)} />
          )}

          {galleryItems.length > 1 && (
            <>
              <button
                type="button"
                className="product-lightbox-nav is-prev"
                onClick={() => stepGallery(-1)}
                aria-label="Show previous image"
              >
                <span aria-hidden="true">‹</span>
              </button>
              <button
                type="button"
                className="product-lightbox-nav is-next"
                onClick={() => stepGallery(1)}
                aria-label="Show next image"
              >
                <span aria-hidden="true">›</span>
              </button>
              <p className="product-lightbox-count" aria-live="polite">
                {activeIndex + 1} / {galleryItems.length}
              </p>
            </>
          )}

          <button
            type="button"
            className="product-lightbox-close"
            onClick={closeLightbox}
            aria-label="Close image preview"
            autoFocus
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
