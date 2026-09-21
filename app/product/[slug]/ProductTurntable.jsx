"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { isOptimizableImageSrc } from "../../lib/image-source";

// How far the pointer travels, as a fraction of the tile's width, to turn the
// piece once. A shade under a full width means a comfortable drag carries it
// most of the way round without the wrist running out.
const DRAG_TO_TURN = 0.85;

// Frames are decoded once and kept. A turntable is a few megabytes of images
// and the whole point is that the next frame is already there.
function preload(source) {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

export default function ProductTurntable({ turntable, productCode, productName, posterSrc, posterAlt, onUnavailable }) {
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  // The frames, and where the drag started. None of this belongs in React
  // state: a turn is sixty index changes a second and each one is a draw, not
  // a render.
  const framesRef = useRef([]);
  const indexRef = useRef(0);
  const dragRef = useRef(null);

  const [started, setStarted] = useState(false);
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [hasTurned, setHasTurned] = useState(false);

  const frameCount = turntable?.frames.length ?? 0;

  const reportUnavailable = useCallback(() => {
    setStatus("failed");
    onUnavailable?.();
  }, [onUnavailable]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const frame = framesRef.current[indexRef.current];

    if (!canvas || !frame) return;

    const context = canvas.getContext("2d");
    const scale = Math.min(canvas.width / frame.naturalWidth, canvas.height / frame.naturalHeight);
    const width = frame.naturalWidth * scale;
    const height = frame.naturalHeight * scale;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(frame, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
  }, []);

  useEffect(() => {
    if (!started || !turntable) {
      return undefined;
    }

    let cancelled = false;

    (async () => {
      const { frames, previewStride } = turntable;

      // A sparse pass first, so the piece can be turned within a second or so,
      // then everything else. Until a gap is filled the nearest loaded frame
      // stands in, which reads as a slightly chunky turn rather than a stall.
      const first = [];
      for (let i = 0; i < frames.length; i += previewStride) first.push(i);
      const rest = frames.map((unused, i) => i).filter((i) => !first.includes(i));
      const order = [...first, ...rest];
      let loaded = 0;

      for (const index of order) {
        if (cancelled) return;

        try {
          framesRef.current[index] = await preload(frames[index]);
        } catch {
          // One missing frame is a gap the fallback covers. A missing first
          // frame means the sequence is not there at all.
          if (index === 0) {
            if (!cancelled) reportUnavailable();
            return;
          }
        }

        loaded += 1;

        if (!cancelled) {
          setProgress(loaded / frames.length);
          if (loaded === first.length) setStatus("ready");
          draw();
        }
      }
    })();

    return () => { cancelled = true; };
  }, [started, turntable, draw, reportUnavailable]);

  // The nearest frame that has actually arrived, so a half-loaded sequence
  // still turns.
  const showFrame = useCallback((index) => {
    const count = frameCount;
    if (count === 0) return;

    let wrapped = ((index % count) + count) % count;

    if (!framesRef.current[wrapped]) {
      for (let offset = 1; offset <= count; offset += 1) {
        const before = ((wrapped - offset) % count + count) % count;
        const after = (wrapped + offset) % count;
        if (framesRef.current[before]) { wrapped = before; break; }
        if (framesRef.current[after]) { wrapped = after; break; }
      }
    }

    indexRef.current = wrapped;
    draw();
  }, [frameCount, draw]);

  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;

    if (!started || !stage || !canvas) return undefined;

    const resize = () => {
      const rect = stage.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(rect.width * ratio));
      canvas.height = Math.max(1, Math.round(rect.height * ratio));
      draw();
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(stage);

    const turnBy = (deltaX) => {
      const width = stage.getBoundingClientRect().width || 1;
      const steps = (deltaX / (width * DRAG_TO_TURN)) * frameCount;
      return turntable.reverse ? -steps : steps;
    };

    // Capturing the pointer keeps the turn alive when the cursor leaves the
    // tile, which is a convenience. Recording where the drag started is the
    // whole feature. So the convenience is not allowed to take the feature down
    // with it if the browser refuses the capture.
    const capture = (event, take) => {
      try {
        if (take) canvas.setPointerCapture?.(event.pointerId);
        else canvas.releasePointerCapture?.(event.pointerId);
      } catch {
        // No capture available for this pointer; dragging still works.
      }
    };

    const onPointerDown = (event) => {
      capture(event, true);
      dragRef.current = { x: event.clientX, index: indexRef.current };
      setHasTurned(true);
    };

    const onPointerMove = (event) => {
      if (!dragRef.current) return;
      // The drag is measured from where it started rather than accumulated
      // frame by frame, so rounding never drifts over a long turn.
      event.preventDefault();
      showFrame(Math.round(dragRef.current.index + turnBy(event.clientX - dragRef.current.x)));
    };

    const onPointerUp = (event) => {
      capture(event, false);
      dragRef.current = null;
    };

    const onKeyDown = (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      setHasTurned(true);
      showFrame(indexRef.current + (event.key === "ArrowRight" ? 1 : -1));
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("keydown", onKeyDown);

    return () => {
      observer.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("keydown", onKeyDown);
    };
  }, [started, frameCount, turntable, draw, showFrame]);

  // A short turn on arrival, so it is obvious the thing moves. It stops the
  // moment a shopper takes hold, and never runs for anyone who has asked for
  // less motion.
  useEffect(() => {
    if (status !== "ready" || hasTurned) return undefined;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return undefined;

    const startedAt = performance.now();
    let frame = 0;

    const step = () => {
      const elapsed = performance.now() - startedAt;
      if (elapsed > 1600 || dragRef.current) return;
      showFrame(Math.round((elapsed / 1600) * (frameCount / 4)));
      frame = window.requestAnimationFrame(step);
    };

    frame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frame);
  }, [status, hasTurned, frameCount, showFrame]);

  if (!turntable || status === "failed") {
    return null;
  }

  const label = `${productCode} ${productName}, turning`;

  return (
    <figure className="product-mosaic-tile is-hero product-3d product-turntable" data-product-turntable data-status={status}>
      <div className="product-3d-stage" ref={stageRef}>
        <canvas
          ref={canvasRef}
          className="product-3d-canvas product-turntable-canvas"
          tabIndex={status === "ready" ? 0 : -1}
          role="img"
          aria-label={label}
        />

        {status === "idle" && (
          <button
            type="button"
            className="product-3d-invite"
            onClick={() => { setStarted(true); setStatus("loading"); }}
            aria-label={`Load the turning view of ${productCode}`}
          >
            {posterSrc && (
              <Image
                src={posterSrc}
                alt={posterAlt || label}
                width={1024}
                height={1024}
                sizes="(max-width: 900px) 100vw, 640px"
                unoptimized={!isOptimizableImageSrc(posterSrc)}
              />
            )}
            <span className="product-3d-invite-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.1">
                <path d="M3.6 9a9 9 0 1 1-.5 5" strokeLinecap="round" />
                <path d="M3.2 4.2v5h5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Turn it
            </span>
          </button>
        )}

        {status === "loading" && (
          <div className="product-3d-loading" role="status">
            <span className="product-3d-progress" style={{ transform: `scaleX(${Math.max(0.04, progress)})` }} />
            <span className="sr-only">Loading the turning view of {productCode}</span>
          </div>
        )}
      </div>

      {status === "ready" && (
        <div className="product-3d-controls">
          <p className="product-3d-hint">Drag to turn &middot; {frameCount} views</p>
          {progress < 1 && (
            <p className="product-turntable-filling" aria-live="polite">
              {Math.round(progress * 100)}% loaded
            </p>
          )}
        </div>
      )}

      <figcaption className="sr-only">{label}</figcaption>
    </figure>
  );
}
