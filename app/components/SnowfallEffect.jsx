"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

// Seasonal decoration. To switch it off after the holidays, remove
// <SnowfallEffect /> from app/layout.js.
//
// Three depth layers (fine and crisp far away, large and softly blurred up
// close) plus a few champagne glints, so it reads as quiet atmosphere rather
// than a particle demo. Flakes are pre-rendered sprites; nothing uses
// shadowBlur per frame.

const LAYERS = [
  // far: tiny, crisp, slow
  { share: 0.46, size: [1.8, 3.2], speed: [0.35, 0.6], opacity: [0.7, 1], soft: false, windScale: 0.6 },
  // mid
  { share: 0.3, size: [3.4, 6], speed: [0.65, 1.0], opacity: [0.6, 0.9], soft: false, windScale: 1 },
  // near: large, blurred, faint (depth of field)
  { share: 0.1, size: [14, 26], speed: [1.1, 1.7], opacity: [0.22, 0.42], soft: true, windScale: 1.5 },
  // crystals: six-armed ice crystals that slowly turn as they fall
  { share: 0.14, size: [11, 19], speed: [0.5, 0.85], opacity: [0.7, 0.95], crystal: true, windScale: 1 }
];
const CRYSTAL_VARIANTS = 3;
const MAX_FLAKES = 95;
const MIN_FLAKES = 24;
const MAX_GLINTS = 7;

function isAdminPath(pathname) {
  const normalized = (pathname || "/").replace(/\/$/, "") || "/";
  return normalized === "/admin" || normalized.startsWith("/admin/");
}

function between([min, max]) {
  return min + Math.random() * (max - min);
}

// White core with a faint cool-silver rim so flakes stay visible on ivory
// sections as well as on dark photography.
function createSprite(soft) {
  const size = 64;
  const sprite = document.createElement("canvas");
  sprite.width = size;
  sprite.height = size;
  const ctx = sprite.getContext("2d");
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  if (soft) {
    gradient.addColorStop(0, "rgba(255,255,255,0.95)");
    gradient.addColorStop(0.35, "rgba(255,255,255,0.55)");
    gradient.addColorStop(0.75, "rgba(210,222,238,0.18)");
    gradient.addColorStop(1, "rgba(210,222,238,0)");
  } else {
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.42, "rgba(255,255,255,0.96)");
    gradient.addColorStop(0.62, "rgba(205,220,238,0.5)");
    gradient.addColorStop(1, "rgba(205,220,238,0)");
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return sprite;
}

// Six-fold ice crystal: an arm with two pairs of side branches, repeated every
// 60 degrees, over a faint cool rim so it stays visible on light backgrounds.
// Variants differ in branch length and position so they do not look stamped.
function createCrystalSprite(variant) {
  const size = 96;
  const sprite = document.createElement("canvas");
  sprite.width = size;
  sprite.height = size;
  const ctx = sprite.getContext("2d");
  const center = size / 2;
  const radius = 43;
  const shapes = [
    { branches: [[0.42, 0.3], [0.7, 0.22]], hex: true },
    { branches: [[0.35, 0.26], [0.58, 0.34], [0.8, 0.18]], hex: false },
    { branches: [[0.55, 0.38]], hex: true }
  ];
  const shape = shapes[variant % shapes.length];

  function trace() {
    ctx.beginPath();
    for (let arm = 0; arm < 6; arm += 1) {
      const angle = (arm * Math.PI) / 3;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      ctx.moveTo(center, center);
      ctx.lineTo(center + cos * radius, center + sin * radius);
      for (const [at, length] of shape.branches) {
        const bx = center + cos * radius * at;
        const by = center + sin * radius * at;
        for (const side of [-1, 1]) {
          const branchAngle = angle + side * (Math.PI / 3);
          ctx.moveTo(bx, by);
          ctx.lineTo(
            bx + Math.cos(branchAngle) * radius * length,
            by + Math.sin(branchAngle) * radius * length
          );
        }
      }
    }
    if (shape.hex) {
      for (let corner = 0; corner <= 6; corner += 1) {
        const angle = (corner * Math.PI) / 3 + Math.PI / 6;
        const px = center + Math.cos(angle) * radius * 0.2;
        const py = center + Math.sin(angle) * radius * 0.2;
        if (corner === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
    }
  }

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  trace();
  ctx.strokeStyle = "rgba(190, 208, 232, 0.55)";
  ctx.lineWidth = 10;
  ctx.stroke();
  trace();
  ctx.strokeStyle = "rgba(255, 255, 255, 1)";
  ctx.lineWidth = 5;
  ctx.stroke();
  return sprite;
}

function createFlake(layerIndex, width, height, randomY) {
  const layer = LAYERS[layerIndex];
  return {
    layer: layerIndex,
    variant: Math.floor(Math.random() * CRYSTAL_VARIANTS),
    rotation: Math.random() * Math.PI * 2,
    spin: (Math.random() < 0.5 ? -1 : 1) * (0.002 + Math.random() * 0.006),
    x: Math.random() * width,
    y: randomY ? Math.random() * height : -layer.size[1],
    size: between(layer.size),
    speed: between(layer.speed),
    opacity: between(layer.opacity),
    phase: Math.random() * Math.PI * 2,
    phaseSpeed: 0.003 + Math.random() * 0.006,
    sway: 0.15 + Math.random() * 0.35
  };
}

function createGlint(width, height) {
  return {
    x: Math.random() * width,
    y: Math.random() * height * 0.9,
    size: 7 + Math.random() * 7,
    speed: 0.25 + Math.random() * 0.25,
    phase: Math.random() * Math.PI * 2,
    phaseSpeed: 0.012 + Math.random() * 0.012
  };
}

function drawGlint(ctx, glint, alpha) {
  const { x, y, size } = glint;
  const pinch = size * 0.14;
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.quadraticCurveTo(x + pinch, y - pinch, x + size, y);
  ctx.quadraticCurveTo(x + pinch, y + pinch, x, y + size);
  ctx.quadraticCurveTo(x - pinch, y + pinch, x - size, y);
  ctx.quadraticCurveTo(x - pinch, y - pinch, x, y - size);
  ctx.closePath();
  ctx.fillStyle = `rgba(255, 238, 205, ${alpha})`;
  ctx.fill();
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

    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    const sprites = [createSprite(false), createSprite(true)];
    const crystalSprites = Array.from({ length: CRYSTAL_VARIANTS }, (_, variant) =>
      createCrystalSprite(variant)
    );
    ctx.imageSmoothingQuality = "high";

    let width = 0;
    let height = 0;
    let flakes = [];
    let glints = [];
    let wind = 0;
    let time = 0;
    let frameId = 0;

    function populate() {
      const target = Math.round(
        Math.min(MAX_FLAKES, Math.max(MIN_FLAKES, (width * height) / 15000))
      );
      const next = [];
      LAYERS.forEach((layer, index) => {
        const count = Math.max(1, Math.round(target * layer.share));
        const existing = flakes.filter((flake) => flake.layer === index).slice(0, count);
        while (existing.length < count) existing.push(createFlake(index, width, height, true));
        next.push(...existing);
      });
      flakes = next;

      const glintTarget = width < 700 ? Math.ceil(MAX_GLINTS / 2) : MAX_GLINTS;
      glints = glints.slice(0, glintTarget);
      while (glints.length < glintTarget) glints.push(createGlint(width, height));
    }

    function resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      populate();
    }

    function draw() {
      time += 1;
      // One slow breeze shared by the whole scene, so the flakes move together.
      wind = Math.sin(time * 0.0035) * 0.35 + Math.sin(time * 0.0011) * 0.25 + 0.15;

      ctx.clearRect(0, 0, width, height);

      for (const flake of flakes) {
        const layer = LAYERS[flake.layer];
        flake.phase += flake.phaseSpeed;
        flake.y += flake.speed;
        flake.x += Math.sin(flake.phase) * flake.sway + wind * layer.windScale;

        if (flake.y > height + flake.size) {
          Object.assign(flake, createFlake(flake.layer, width, height, false));
        }
        if (flake.x > width + flake.size) flake.x = -flake.size;
        else if (flake.x < -flake.size) flake.x = width + flake.size;

        ctx.globalAlpha = flake.opacity;
        if (layer.crystal) {
          flake.rotation += flake.spin;
          ctx.save();
          ctx.translate(flake.x, flake.y);
          ctx.rotate(flake.rotation);
          ctx.drawImage(
            crystalSprites[flake.variant],
            -flake.size / 2,
            -flake.size / 2,
            flake.size,
            flake.size
          );
          ctx.restore();
        } else {
          ctx.drawImage(
            sprites[layer.soft ? 1 : 0],
            flake.x - flake.size / 2,
            flake.y - flake.size / 2,
            flake.size,
            flake.size
          );
        }
      }

      for (const glint of glints) {
        glint.phase += glint.phaseSpeed;
        glint.y += glint.speed;
        glint.x += wind * 0.5;
        // Mostly dark, brief bright pulse, like light catching a facet.
        const pulse = Math.max(0, Math.sin(glint.phase));
        const alpha = Math.pow(pulse, 6) * 0.85;

        if (glint.y > height + glint.size || glint.x > width + glint.size) {
          Object.assign(glint, createGlint(width, height), { y: -glint.size });
        }
        if (alpha > 0.02) {
          ctx.globalAlpha = 1;
          drawGlint(ctx, glint, alpha);
        }
      }

      ctx.globalAlpha = 1;
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
        ctx.clearRect(0, 0, width, height);
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
