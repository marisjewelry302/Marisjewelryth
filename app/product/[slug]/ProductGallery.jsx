"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import { isOptimizableImageSrc } from "../../lib/image-source";
import { getProductImageMetal, getProductImageView, getPublicImageAltText } from "../../lib/product-display";
import { buildProductMediaSlides } from "../../lib/product-media";
import ProductVideo from "./ProductVideo";
import { useProductMetal } from "./ProductMetalContext";

export default function ProductGallery({ imageSets, coverImageUrl, video, productCode, productName }) {
  const { selectedKey } = useProductMetal();
  const activeSet = imageSets.find((set) => set.key === selectedKey) || imageSets[0];
  const images = activeSet?.images || [];
  // The card cover leads only the metal set it was shot in; a cover that names
  // no metal (or is not a gallery image at all) leads every set.
  const coverImage = imageSets.flatMap((set) => set.images).find((image) => image.imageUrl === coverImageUrl);
  const coverMetal = getProductImageMetal(coverImage)?.key;
  const setCoverImageUrl = !coverMetal || coverMetal === activeSet?.key ? coverImageUrl : "";
  const viewLabels = new Map(images.map((image) => [image.imageUrl, getProductImageView(image)?.label]));
  const slides = buildProductMediaSlides({
    images: images.map((image, index) => ({
      src: image.imageUrl,
      alt: getPublicImageAltText(image, productCode, productName, index)
    })),
    coverImageUrl: setCoverImageUrl,
    video,
    fallbackAlt: `${productCode} ${productName}`
  }).map((slide) => (
    slide.type === "image" && viewLabels.get(slide.src) ? { ...slide, label: viewLabels.get(slide.src) } : slide
  ));
  const imageSlides = slides.filter((slide) => slide.type === "image" && slide.src);
  // Whatever stands in for the cover when the video has no poster of its own.
  const firstPhoto = imageSlides[0]?.src || "";

  const trackRef = useRef(null);
  const slideRefs = useRef([]);
  const [activeSlide, setActiveSlide] = useState(0);

  // The track is one horizontal scroller in both layouts - swiped on a phone,
  // driven by the thumbnails on desktop - so whichever slide fills most of it
  // is the active one.
  useEffect(() => {
    const track = trackRef.current;

    if (!track || typeof IntersectionObserver === "undefined") return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
            const index = slideRefs.current.indexOf(entry.target);

            if (index >= 0) setActiveSlide(index);
          }
        }
      },
      { root: track, threshold: [0.55] }
    );

    slideRefs.current.forEach((slide) => slide && observer.observe(slide));
    return () => observer.disconnect();
  }, [slides.length, activeSet?.key]);

  const goToSlide = useCallback((index) => {
    const track = trackRef.current;
    const slide = slideRefs.current[index];

    if (!track || !slide) return;

    const reduceMotion = typeof window.matchMedia === "function"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // The observer above marks the slide active once it arrives.
    track.scrollTo({ left: slide.offsetLeft - track.offsetLeft, behavior: reduceMotion ? "auto" : "smooth" });
  }, []);

  // The lightbox holds photographs only; -1 means it is closed.
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const lightboxOpen = lightboxIndex >= 0;
  const activeItem = imageSlides[lightboxOpen ? lightboxIndex : 0] || imageSlides[0];

  const openButtonRefs = useRef([]);
  const lightboxRef = useRef(null);
  // Remembers which slide opened the lightbox so focus lands back on it - read
  // after the dialog has actually unmounted, not while it is still on screen.
  const returnFocusIndex = useRef(null);

  const stepGallery = useCallback((direction) => {
    setLightboxIndex((current) => {
      if (current < 0) return current;
      const next = current + direction;
      if (next < 0) return imageSlides.length - 1;
      if (next >= imageSlides.length) return 0;
      return next;
    });
  }, [imageSlides.length]);

  const closeLightbox = useCallback(() => setLightboxIndex(-1), []);

  // Switching metal swaps every slide, so start the new set from its first
  // view with the lightbox closed.
  const [shownSetKey, setShownSetKey] = useState(activeSet?.key);
  if (shownSetKey !== activeSet?.key) {
    setShownSetKey(activeSet?.key);
    setLightboxIndex(-1);
    setActiveSlide(0);
  }

  useEffect(() => {
    trackRef.current?.scrollTo({ left: 0 });
  }, [activeSet?.key]);

  useEffect(() => {
    if (lightboxOpen) {
      returnFocusIndex.current = lightboxIndex;
      return;
    }

    if (returnFocusIndex.current === null) return;

    const returnTo = returnFocusIndex.current;
    returnFocusIndex.current = null;
    openButtonRefs.current[returnTo]?.focus({ preventScroll: true });
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

  let photoIndex = -1;

  return (
    <>
      {/* One square frame for every slide, photograph or video, so nothing
          jumps when the shopper moves between them. */}
      <section
        className="product-media"
        data-product-gallery
        data-product-metal={activeSet?.key || undefined}
        aria-roledescription="carousel"
        aria-label={`${productCode} images`}
      >
        <div className="product-media-track" ref={trackRef}>
          {slides.map((slide, index) => {
            const isPhoto = slide.type === "image";
            const lightboxAt = isPhoto && slide.src ? (photoIndex += 1) : -1;

            return (
              <div
                key={slide.key}
                className={`product-media-slide is-${slide.type}`}
                ref={(node) => { slideRefs.current[index] = node; }}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${slides.length}: ${slide.label}`}
              >
                {isPhoto ? (
                  <button
                    type="button"
                    className="product-gallery-open"
                    ref={(node) => { if (lightboxAt >= 0) openButtonRefs.current[lightboxAt] = node; }}
                    onClick={() => lightboxAt >= 0 && setLightboxIndex(lightboxAt)}
                    disabled={lightboxAt < 0}
                    tabIndex={index === activeSlide ? 0 : -1}
                    aria-label={`Open ${slide.label.toLowerCase()} preview for ${productCode}`}
                  >
                    {slide.src && (
                      <Image
                        src={slide.src}
                        alt={slide.alt}
                        data-product-image={lightboxAt === 0 ? "" : undefined}
                        width={1024}
                        height={1024}
                        sizes="(max-width: 1023px) 100vw, 640px"
                        preload={lightboxAt === 0}
                        loading={lightboxAt === 0 ? undefined : "lazy"}
                        unoptimized={!isOptimizableImageSrc(slide.src)}
                      />
                    )}
                  </button>
                ) : (
                  <ProductVideo src={slide.src} poster={slide.poster} fallbackSrc={firstPhoto} label={slide.alt} />
                )}
              </div>
            );
          })}
        </div>

        {slides.length > 1 && (
          <>
            <div className="product-media-thumbs" aria-label="Choose a view">
              {slides.map((slide, index) => {
                const thumbSrc = slide.type === "video" ? slide.poster || firstPhoto : slide.src;

                return (
                  <button
                    key={slide.key}
                    type="button"
                    className={`product-media-thumb is-${slide.type}`}
                    onClick={() => goToSlide(index)}
                    aria-label={`Show ${slide.label.toLowerCase()}`}
                    aria-current={index === activeSlide ? "true" : undefined}
                  >
                    {thumbSrc && (
                      <Image
                        src={thumbSrc}
                        alt=""
                        width={160}
                        height={160}
                        sizes="96px"
                        loading="lazy"
                        unoptimized={!isOptimizableImageSrc(thumbSrc)}
                      />
                    )}
                    {slide.type === "video" && (
                      <span className="product-media-thumb-badge" aria-hidden="true">
                        <span className="product-media-thumb-play">▶</span>
                        360°
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="product-media-dots">
              {slides.map((slide, index) => (
                <button
                  key={slide.key}
                  type="button"
                  className="product-media-dot"
                  onClick={() => goToSlide(index)}
                  aria-label={`Go to slide ${index + 1}: ${slide.label}`}
                  aria-current={index === activeSlide ? "true" : undefined}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {lightboxOpen && activeItem && (
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
          <Image src={activeItem.src} alt={`${activeItem.alt} large preview`} width={1024} height={1024} sizes="90vw" unoptimized={!isOptimizableImageSrc(activeItem.src)} />

          {imageSlides.length > 1 && (
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
                {lightboxIndex + 1} / {imageSlides.length}
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
