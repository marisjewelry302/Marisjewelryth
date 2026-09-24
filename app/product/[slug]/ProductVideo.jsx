"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { isOptimizableImageSrc } from "../../lib/image-source";

// How much of the video has to be on screen before it plays. The gallery track
// clips its slides, so a slide scrolled sideways out of view counts as off
// screen exactly like one scrolled vertically past.
const VISIBLE_THRESHOLD = 0.6;

function prefersReducedMotion() {
  return typeof window !== "undefined"
    && typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// The square turntable video. It plays, muted and looping, while its slide is
// in view and stops when it leaves. Nothing loads until then (preload="none"),
// so a shopper who never reaches it pays only for the poster. A shopper who
// asks for reduced motion gets the poster and a play button instead, and one
// who pauses it keeps it paused until they press play again.
export default function ProductVideo({ src, poster, fallbackSrc, label }) {
  const videoRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoplayAllowed, setAutoplayAllowed] = useState(true);
  const [userPaused, setUserPaused] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setAutoplayAllowed(false);
    }

    // The server-rendered <video> can fail before React is listening for it.
    if (videoRef.current?.error) {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;

    if (!video || failed || typeof IntersectionObserver === "undefined") {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting && entry.intersectionRatio >= VISIBLE_THRESHOLD),
      { threshold: [0, VISIBLE_THRESHOLD, 1] }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, [failed]);

  const play = useCallback(() => {
    const video = videoRef.current;

    if (!video) return;

    const attempt = video.play();

    // A browser that still refuses (low-power mode, a data saver) leaves the
    // poster up with the play button showing.
    if (attempt && typeof attempt.catch === "function") {
      attempt.catch(() => setIsPlaying(false));
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;

    if (!video || failed) return;

    if (isVisible && autoplayAllowed && !userPaused) {
      play();
    } else if (!video.paused) {
      video.pause();
    }
  }, [isVisible, autoplayAllowed, userPaused, failed, play]);

  // The browser pauses a silent video in a background tab on its own. Coming
  // back to the tab, pick up where it left off if the slide is still in view.
  useEffect(() => {
    if (failed || !isVisible || !autoplayAllowed || userPaused) return undefined;

    function handleVisibilityChange() {
      if (document.visibilityState === "visible" && videoRef.current?.paused) {
        play();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isVisible, autoplayAllowed, userPaused, failed, play]);

  const toggle = useCallback(() => {
    const video = videoRef.current;

    if (!video) return;

    if (video.paused) {
      setUserPaused(false);
      setAutoplayAllowed(true);
      play();
    } else {
      setUserPaused(true);
      video.pause();
    }
  }, [play]);

  const stillSrc = poster || fallbackSrc;

  if (failed) {
    return stillSrc ? (
      <Image
        className="product-video-still"
        src={stillSrc}
        alt={label}
        width={1024}
        height={1024}
        sizes="(max-width: 1023px) 100vw, 640px"
        unoptimized={!isOptimizableImageSrc(stillSrc)}
      />
    ) : null;
  }

  return (
    <div className="product-video" data-product-video>
      <video
        ref={videoRef}
        className="product-video-media"
        src={src}
        poster={stillSrc || undefined}
        muted
        loop
        playsInline
        preload="none"
        disablePictureInPicture
        aria-label={label}
        onPlaying={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onError={() => setFailed(true)}
      />
      <button
        type="button"
        className={`product-video-toggle${isPlaying ? " is-playing" : ""}`}
        onClick={toggle}
        aria-label={isPlaying ? "Pause 360° video" : "Play 360° video"}
      >
        <span aria-hidden="true">{isPlaying ? "❚❚" : "▶"}</span>
      </button>
    </div>
  );
}
