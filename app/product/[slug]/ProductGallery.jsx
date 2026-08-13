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

  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const thumbnailsRef = useRef(null);
  const galleryButtonRef = useRef(null);
  const lightboxRef = useRef(null);

  const activeItem = galleryItems[activeIndex];

  const stepGallery = useCallback((direction) => {
    setActiveIndex((current) => {
      const next = current + direction;
      if (next < 0) return galleryItems.length - 1;
      if (next >= galleryItems.length) return 0;
      return next;
    });
  }, [galleryItems.length]);

  useEffect(() => {
    function handleKeydown(event) {
      if (event.key === "Escape" && lightboxOpen) {
        setLightboxOpen(false);
        window.requestAnimationFrame(() => galleryButtonRef.current?.focus());
        return;
      }

      if (event.key === "ArrowLeft" && lightboxOpen) {
        stepGallery(-1);
        return;
      }

      if (event.key === "ArrowRight" && lightboxOpen) {
        stepGallery(1);
        return;
      }

      if (event.key === "Tab" && lightboxOpen && lightboxRef.current) {
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
  }, [lightboxOpen, stepGallery]);

  useEffect(() => {
    document.body.classList.toggle("is-lightbox-open", lightboxOpen);
    return () => document.body.classList.remove("is-lightbox-open");
  }, [lightboxOpen]);

  function handleGalleryKeydown(event) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      stepGallery(-1);
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      stepGallery(1);
      return;
    }

  }

  function closeLightbox() {
    setLightboxOpen(false);
    window.requestAnimationFrame(() => galleryButtonRef.current?.focus());
  }

  function scrollThumbnailRail(direction) {
    if (!thumbnailsRef.current) return;
    thumbnailsRef.current.scrollBy({
      left: direction * Math.max(220, thumbnailsRef.current.clientWidth * 0.72),
      behavior: "smooth"
    });
  }

  return (
    <>
      <div className="product-gallery" data-product-gallery>
        <button
          type="button"
          className="product-gallery-open"
          ref={galleryButtonRef}
          onClick={() => setLightboxOpen(true)}
          onKeyDown={handleGalleryKeydown}
          aria-label={`Open ${activeItem.label.toLowerCase()} preview for ${productCode}`}
        >
          {activeItem.src && (
            <Image src={activeItem.src} alt={activeItem.alt} data-product-image width={1024} height={1024} sizes="(max-width: 900px) 100vw, 620px" priority unoptimized={!isOptimizableImageSrc(activeItem.src)} />
          )}
        </button>

        {galleryItems.length > 1 && (
          <>
            <button
              type="button"
              className="product-gallery-nav is-prev"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                stepGallery(-1);
              }}
            >
              <span className="product-gallery-nav-label">Previous image</span>
            </button>
            <button
              type="button"
              className="product-gallery-nav is-next"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                stepGallery(1);
              }}
            >
              <span className="product-gallery-nav-label">Next image</span>
            </button>
          </>
        )}

        <p className="product-gallery-copy" data-product-image-label>{activeItem.label}</p>
      </div>

      {galleryItems.length > 1 && (
        <div className="product-thumbnails-shell">
          <button
            type="button"
            className="product-thumbnails-nav is-prev"
            onClick={() => scrollThumbnailRail(-1)}
            aria-label="Scroll thumbnails backward"
          >
            <span aria-hidden="true">‹</span>
          </button>

          <div className="product-thumbnails" ref={thumbnailsRef} data-product-thumbnails>
            {galleryItems.map((item, index) => (
              <button
                key={item.src + index}
                type="button"
                className={`product-thumbnail${index === activeIndex ? " is-active" : ""}`}
                onClick={() => setActiveIndex(index)}
                aria-label={`Show ${item.label}`}
                aria-pressed={index === activeIndex}
              >
                <Image src={item.src} alt={item.alt} width={1024} height={1024} sizes="96px" unoptimized={!isOptimizableImageSrc(item.src)} />
                <span className="product-thumbnail-label">{item.label}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            className="product-thumbnails-nav is-next"
            onClick={() => scrollThumbnailRail(1)}
            aria-label="Scroll thumbnails forward"
          >
            <span aria-hidden="true">›</span>
          </button>
        </div>
      )}

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
