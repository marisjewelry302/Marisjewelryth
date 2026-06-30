"use client";

import { useState, useRef, useCallback, useEffect } from "react";
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
  const galleryRef = useRef(null);

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
        return;
      }

      if (event.key === "ArrowLeft" && lightboxOpen) {
        stepGallery(-1);
        return;
      }

      if (event.key === "ArrowRight" && lightboxOpen) {
        stepGallery(1);
      }
    }

    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [lightboxOpen, stepGallery]);

  useEffect(() => {
    document.body.classList.toggle("is-lightbox-open", lightboxOpen);
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

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setLightboxOpen(true);
    }
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
      <div
        className="product-gallery"
        data-product-gallery
        tabIndex={0}
        role="button"
        ref={galleryRef}
        onClick={() => setLightboxOpen(true)}
        onKeyDown={handleGalleryKeydown}
        aria-label={`Open ${activeItem.label.toLowerCase()} preview for ${productCode}`}
      >
        {activeItem.src && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={activeItem.src} alt={activeItem.alt} data-product-image />
        )}

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
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.src} alt={item.alt} />
                <span className="product-thumbnail-label">{item.label}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            className="product-thumbnails-nav is-next"
            onClick={() => scrollThumbnailRail(1)}
          >
            <span aria-hidden="true">›</span>
          </button>
        </div>
      )}

      {lightboxOpen && (
        <div
          className="product-lightbox"
          data-product-lightbox
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setLightboxOpen(false);
            }
          }}
        >
          {activeItem.src && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={activeItem.src} alt={`${activeItem.alt} large preview`} />
          )}
          <button
            type="button"
            className="product-lightbox-close"
            onClick={() => setLightboxOpen(false)}
            autoFocus
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
