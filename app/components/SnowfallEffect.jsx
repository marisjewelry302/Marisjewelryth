"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

// Seasonal decoration. To switch it off after the holidays, remove
// <SnowfallEffect /> from app/layout.js.
const MAX_FLAKES = 110;
const MIN_FLAKES = 35;

function isAdminPath(pathname) {
  const normalized = (pathname || "/").replace(/\/$/, "") || "/";
  return normalized === "/admin" || normalized.startsWith("/admin/");
}

function createFlake(width, height, randomY) {
  return {
    x: Math.random() * width,
    y: randomY ? Math.random() * height : -10,
    radius: 1 + Math.random() * 2.6,
    speed: 0.5 + Math.random() * 1.1,
    drift: Math.random() * Math.PI * 2,
    driftSpeed: 0.004 + Math.random() * 0.012,
    sway: 0.3 + Math.random() * 0.7,
    opacity: 0.45 + Math.random() * 0.45
  };
}

export default function SnowfallEffect() {
  const pathname = usePathname();
  const canvasRef = useRef(null);
  const disabled = isAdminPath(pathname);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (disabled || !canvas) return undefined;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionQuery.matches) return undefined;

    const context = canvas.getContext("2d");
    if (!context) return undefined;

    let width = 0;
    let height = 0;
    let flakes = [];
    let frameId = 0;

    function resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      const target = Math.round(Math.min(MAX_FLAKES, Math.max(MIN_FLAKES, (width * height) / 14000)));
      while (flakes.length < target) flakes.push(createFlake(width, height, true));
      flakes.length = Math.min(flakes.length, target);
    }

    function draw() {
      context.clearRect(0, 0, width, height);
      for (const flake of flakes) {
        flake.drift += flake.driftSpeed;
        flake.y += flake.speed;
        flake.x += Math.sin(flake.drift) * flake.sway;

        if (flake.y > height + 10) {
          Object.assign(flake, createFlake(width, height, false));
        }
        if (flake.x > width + 10) flake.x = -10;
        else if (flake.x < -10) flake.x = width + 10;

        context.beginPath();
        context.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
        context.fillStyle = `rgba(255, 255, 255, ${flake.opacity})`;
        context.shadowColor = "rgba(120, 150, 190, 0.55)";
        context.shadowBlur = 3;
        context.fill();
      }
      frameId = window.requestAnimationFrame(draw);
    }

    function start() {
      if (!frameId) frameId = window.requestAnimationFrame(draw);
    }

    function stop() {
      window.cancelAnimationFrame(frameId);
      frameId = 0;
    }

    function handleVisibility() {
      if (document.hidden) stop();
      else start();
    }

    function handleMotionChange() {
      if (motionQuery.matches) {
        stop();
        context.clearRect(0, 0, width, height);
      } else {
        start();
      }
    }

    resize();
    start();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", handleVisibility);
    motionQuery.addEventListener("change", handleMotionChange);

    return () => {
      stop();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibility);
      motionQuery.removeEventListener("change", handleMotionChange);
    };
  }, [disabled]);

  if (disabled) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 1001
      }}
    />
  );
}
