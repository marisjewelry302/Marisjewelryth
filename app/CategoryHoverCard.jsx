"use client";

import { useRef, useCallback } from "react";
import Image from "next/image";
import { isOptimizableImageSrc } from "./lib/image-source";

export default function CategoryHoverCard({ href, className, imageSrc, imageAlt, order, title, ctaLabel }) {
  const cardRef = useRef(null);
  const boundsRef = useRef(null);
  const frameRef = useRef(0);

  const handlePointerEnter = useCallback(() => {
    boundsRef.current = cardRef.current?.getBoundingClientRect() || null;
  }, []);

  const handlePointerMove = useCallback((event) => {
    if (!cardRef.current) return;

    if (!boundsRef.current) {
      boundsRef.current = cardRef.current.getBoundingClientRect();
    }

    const bounds = boundsRef.current;
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;

    if (frameRef.current) return;

    frameRef.current = requestAnimationFrame(() => {
      if (cardRef.current) {
        cardRef.current.style.setProperty("--card-glint-x", `${x.toFixed(1)}%`);
        cardRef.current.style.setProperty("--card-glint-y", `${y.toFixed(1)}%`);
      }
      frameRef.current = 0;
    });
  }, []);

  const handlePointerLeave = useCallback(() => {
    boundsRef.current = null;
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    }
  }, []);

  return (
    <a
      ref={cardRef}
      href={href}
      className={className}
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {imageSrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <Image src={imageSrc} alt={imageAlt} width={1024} height={1024} sizes="(max-width: 900px) 50vw, 25vw" unoptimized={!isOptimizableImageSrc(imageSrc)} />
      )}
      <div className="category-card-overlay" />
      <div className="category-card-meta">
        <span className="category-card-order">{order}</span>
        <div className="category-card-copy">
          <strong className="category-card-title">{title}</strong>
          <span className="category-card-cta">{ctaLabel}</span>
        </div>
      </div>
    </a>
  );
}
