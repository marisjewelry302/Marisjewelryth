"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { isOptimizableImageSrc } from "../../lib/image-source";
import { createDiamondMaterial, fitProxyToStone, readGemSettings, splitIntoSolids } from "./diamond-material";

// A photographed studio, 1024x512, prefiltered once into an environment map.
// This is the whole difference between metal and grey plastic: what a polished
// shank shows is not the light falling on it, it is the room reflected in it,
// and a procedural room has no softboxes to reflect.
const ENVIRONMENT_URL = "/assets/env/maris-studio.hdr";

// Lighting and backdrop are two different jobs. The studio lights the piece;
// a flat neutral stands behind it, so the tile sits beside the photographs
// without a blurred room in the way.
//
// The separation only became possible once stones stopped using three's
// screen-space transmission - that needed real content behind the mesh to
// refract, and the gem shader samples the environment directly instead.
//
// The environment itself has to carry both the lamps and the room. Maverick's
// library ships `_nb` variants with the room removed, which measure as far
// higher contrast - 408x against this file's 142x - and render the piece
// almost black: the ratio climbs because the average collapses, and a polished
// metal spends most of its surface reflecting that average. Maverick uses them
// alongside a lit floor and a backplate that put the fill back. Alone, they
// are the wrong tool.
const BACKDROP = 0xe9e8e5;

// How much light the environment puts into the scene, before the tone mapper
// sees any of it.
//
// This is a different control from exposure and the difference is the whole
// reason it exists. Exposure multiplies after the lighting is gathered, so it
// drags the picture toward the top of the tone curve as one piece and the
// metal's gradations compress into white - which is what every flat-looking
// render in this project turned out to be. Lifting the environment instead puts
// more light in and leaves the curve room to separate what comes back.
//
// Cartier's own viewer ships 2.1 here with the tone mapper left at one. That
// pairs with a base metal at 0.539, far darker than the bench's gold; run 2.1
// against these materials and the gold goes pale. The two numbers move
// together, and one without the other is worse than neither.
const ENVIRONMENT_INTENSITY = 1;

// Stones do not use three's transmission at all - see ./diamond-material.js for
// why, and for the numbers that shape them.

// Three.js is around half a megabyte before a single model is fetched, so it is
// imported here only once a shopper asks for the 3D view. Cartier reaches the
// same result by hanging the whole viewer off a separate origin in an iframe:
// the product page itself never pays for the renderer it may not use.
async function loadThreeStack() {
  const [THREE, gltf, orbit, room, rgbe] = await Promise.all([
    import("three"),
    import("three/examples/jsm/loaders/GLTFLoader.js"),
    import("three/examples/jsm/controls/OrbitControls.js"),
    import("three/examples/jsm/environments/RoomEnvironment.js"),
    import("three/examples/jsm/loaders/RGBELoader.js")
  ]);

  return {
    THREE,
    GLTFLoader: gltf.GLTFLoader,
    OrbitControls: orbit.OrbitControls,
    RoomEnvironment: room.RoomEnvironment,
    RGBELoader: rgbe.RGBELoader
  };
}

function disposeObject3D(object) {
  object.traverse((child) => {
    child.geometry?.dispose();

    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      if (!material) return;

      Object.values(material).forEach((value) => {
        if (value && value.isTexture) {
          value.dispose();
        }
      });

      material.dispose();
    });
  });
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export default function Product3DViewer({ model, productCode, productName, posterSrc, posterAlt, onUnavailable }) {
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  // The imperative half of the viewer lives outside React: a render loop that
  // re-rendered the component on every frame would cost more than the scene does.
  const sceneRef = useRef(null);
  // `started` drives the effect and never goes back; `status` is only what the
  // UI shows. Keeping them apart matters - if the effect depended on the status
  // it sets, reaching "ready" would tear the scene down again.
  const [started, setStarted] = useState(false);
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  // "studio" once the photographed environment is in, "fallback" when it could
  // not be fetched. Surfaced on the element so the difference is visible from
  // the outside instead of having to be inferred from how the metal looks.
  const [envSource, setEnvSource] = useState("pending");

  const views = model?.views || [];
  const [activeView, setActiveView] = useState(views[0]?.id || "");

  const reportUnavailable = useCallback(() => {
    setStatus("failed");
    onUnavailable?.();
  }, [onUnavailable]);

  useEffect(() => {
    if (!started) {
      return undefined;
    }

    const stage = stageRef.current;
    const canvas = canvasRef.current;

    if (!stage || !canvas) {
      return undefined;
    }

    let disposed = false;
    const teardown = [];

    (async () => {
      let THREE;
      let GLTFLoader;
      let OrbitControls;
      let RoomEnvironment;
      let RGBELoader;

      try {
        ({ THREE, GLTFLoader, OrbitControls, RoomEnvironment, RGBELoader } = await loadThreeStack());
      } catch {
        if (!disposed) reportUnavailable();
        return;
      }

      if (disposed) return;

      let renderer;

      try {
        renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
      } catch {
        // No WebGL - an old machine, a locked-down browser, a driver blacklist.
        // The gallery keeps its photographs and says nothing about it.
        if (!disposed) reportUnavailable();
        return;
      }

      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = model.exposure;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(BACKDROP);
      scene.environmentIntensity = ENVIRONMENT_INTENSITY;
      const pmremGenerator = new THREE.PMREMGenerator(renderer);

      // Where the softboxes fall on the piece is a styling choice, so it is per
      // model rather than fixed here.
      scene.environmentRotation.y = model.envRotation || 0;

      let environment = null;

      // Started now and awaited later: the studio and the model download side by
      // side rather than one after the other.
      const environmentReady = new RGBELoader()
        .loadAsync(ENVIRONMENT_URL)
        .then((texture) => {
          const prefiltered = pmremGenerator.fromEquirectangular(texture).texture;
          // The equirectangular original stays: PMREM blurs by roughness, and a
          // stone needs the studio sharp to have anything to break into colour.
          return { texture: prefiltered, equirect: texture, source: "studio" };
        })
        .catch(() => {
          // The studio is what makes the metal, but losing it should cost the
          // reflections, not the viewer. three's procedural room still lights
          // the piece well enough to be worth looking at.
          const roomEnvironment = new RoomEnvironment();
          const fallback = pmremGenerator.fromScene(roomEnvironment, 0.04).texture;
          roomEnvironment.dispose?.();
          return { texture: fallback, equirect: null, source: "fallback" };
        });

      const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 1000);
      camera.position.set(0, 0, 6);

      // The environment map does the lighting now. This one lamp is here for the
      // contact shadow - a ShadowMaterial needs something to cast onto it - and
      // is kept dim so it does not compete with the studio's own reflections.
      const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
      keyLight.position.set(-2.4, 3.4, 3.2);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.radius = 6;
      scene.add(keyLight);

      // The contact shadow is what stops a piece from looking like it is
      // floating in a void. Cartier bakes theirs at load time from a randomised
      // light; a soft shadow-catching plane buys most of that for nothing.
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(60, 60),
        new THREE.ShadowMaterial({ opacity: 0.22 })
      );
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      scene.add(ground);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;
      controls.enablePan = false;
      controls.rotateSpeed = 0.85;
      controls.zoomSpeed = 0.7;

      const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches || false;
      controls.autoRotate = !reduceMotion;
      controls.autoRotateSpeed = 0.9;

      // The turn is an invitation, not a carousel. The moment a shopper takes
      // hold of the piece it stops and stays where they put it.
      const stopAutoRotate = () => { controls.autoRotate = false; };
      renderer.domElement.addEventListener("pointerdown", stopAutoRotate);
      renderer.domElement.addEventListener("wheel", stopAutoRotate, { passive: true });
      teardown.push(() => {
        renderer.domElement.removeEventListener("pointerdown", stopAutoRotate);
        renderer.domElement.removeEventListener("wheel", stopAutoRotate);
      });

      let fitDistance = 6;
      let needsRender = true;
      let tween = null;
      let loaded = false;
      let inView = true;
      let studioEquirect = null;
      // The stones, once the model is in: each keeps the mesh, the shader that
      // traces light through it, and the plain material that records its back
      // facets for that shader to read.
      const stones = [];
      let backNormalTarget = null;

      // Two passes per frame, and only while there is a stone on screen. The
      // first draws the stone's far side into a buffer; the second shades its
      // near side by walking rays through that buffer.
      const renderStones = () => {
        if (stones.length === 0) return;

        // Drawing-buffer pixels, not CSS pixels. `gl_FragCoord` in the gem
        // shader counts the former, so measuring in the latter divides the
        // lookup by the device pixel ratio and sends it off the stone
        // entirely - the shader then finds no back facet and shades a flat
        // straight-through sample, which is exactly what a milky white stone
        // looks like.
        const { width, height } = renderer.getDrawingBufferSize(new THREE.Vector2());

        if (!backNormalTarget) {
          backNormalTarget = new THREE.WebGLRenderTarget(width, height, { depthBuffer: true });
          teardown.push(() => backNormalTarget.dispose());
        } else if (backNormalTarget.width !== width || backNormalTarget.height !== height) {
          backNormalTarget.setSize(width, height);
        }

        const background = scene.background;
        scene.background = null;

        // Everything that is not a stone steps out of the way, so the buffer
        // holds back facets and nothing else.
        const hidden = [];
        scene.traverse((child) => {
          if (child.isMesh && !stones.some((stone) => stone.mesh === child) && child.visible) {
            hidden.push(child);
            child.visible = false;
          }
        });

        stones.forEach((stone) => {
          stone.mesh.material = stone.backfaceMaterial;
          stone.uniforms.uResolution.value.set(width, height);
          stone.uniforms.uBackNormals.value = backNormalTarget.texture;
        });

        renderer.setRenderTarget(backNormalTarget);
        renderer.clear();
        renderer.render(scene, camera);
        renderer.setRenderTarget(null);

        stones.forEach((stone) => { stone.mesh.material = stone.material; });
        hidden.forEach((child) => { child.visible = true; });
        scene.background = background;
      };

      // The shader needs the studio, and the studio arrives on its own
      // schedule; whichever lands second sets the stones up.
      const applyGemShader = () => {
        if (!studioEquirect || stones.length > 0) return;

        gemCandidates.forEach(({ mesh, settings }) => {
          // One mesh per stone. The shader fits a stand-in shape to each, and a
          // single shape over a whole pavé band would send light out of the far
          // side of the ring.
          const solids = splitIntoSolids(THREE, mesh.geometry);
          const parent = mesh.parent;

          solids.forEach((geometry) => {
            const { material, backfaceMaterial, uniforms } = createDiamondMaterial(THREE, {
              environment: studioEquirect,
              gem: settings
            });

            const stone = new THREE.Mesh(geometry, material);
            stone.applyMatrix4(mesh.matrix);
            stone.name = `${mesh.name || "stone"}-solid-${stones.length}`;
            parent.add(stone);
            fitProxyToStone(THREE, uniforms, stone);

            stones.push({ mesh: stone, material, backfaceMaterial, uniforms });
            teardown.push(() => {
              parent.remove(stone);
              if (geometry !== mesh.geometry) geometry.dispose();
              material.dispose();
              backfaceMaterial.dispose();
            });
          });

          // The merged original steps aside; its pieces are the stones now.
          mesh.visible = false;
          teardown.push(() => { mesh.visible = true; });
        });

        requestRender();
      };

      const gemCandidates = [];

      // A frame is the back-facet pass and then the scene. Anything that draws
      // only the second half gets stones with nothing inside them.
      const drawFrame = () => {
        renderStones();
        renderer.render(scene, camera);
      };

      const requestRender = () => { needsRender = true; };
      controls.addEventListener("change", requestRender);

      // Coming back to a backgrounded tab, the drawing buffer may have been
      // dropped. An idle viewer would sit there blank until someone dragged it,
      // so ask for one frame the moment the page is looked at again.
      const handleVisibility = () => {
        if (!document.hidden) requestRender();
      };
      document.addEventListener("visibilitychange", handleVisibility);
      teardown.push(() => document.removeEventListener("visibilitychange", handleVisibility));

      // A lost context leaves a dead grey square behind. Better to hand the
      // gallery back to photography than to show one.
      const handleContextLost = (event) => {
        event.preventDefault();
        if (!disposed) reportUnavailable();
      };
      renderer.domElement.addEventListener("webglcontextlost", handleContextLost);
      teardown.push(() => renderer.domElement.removeEventListener("webglcontextlost", handleContextLost));

      const resize = () => {
        const rect = stage.getBoundingClientRect();
        const width = Math.max(240, Math.round(rect.width));
        const height = Math.max(240, Math.round(rect.height));
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        requestRender();
      };

      resize();
      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(stage);
      teardown.push(() => resizeObserver.disconnect());

      // Auto-rotation would otherwise keep a scrolled-past viewer redrawing all
      // the way down the page. Off screen, the loop stops entirely.
      const viewportObserver = new IntersectionObserver(([entry]) => {
        inView = entry.isIntersecting;

        if (!loaded) return;

        renderer.setAnimationLoop(inView ? renderLoop : null);
        if (inView) requestRender();
      }, { threshold: 0.01 });
      viewportObserver.observe(stage);
      teardown.push(() => viewportObserver.disconnect());

      const applyView = (view, animate) => {
        const spherical = new THREE.Spherical(fitDistance * (view.distance || 1), view.phi, view.theta);
        const destination = new THREE.Vector3().setFromSpherical(spherical);

        if (!animate || reduceMotion) {
          camera.position.copy(destination);
          controls.update();
          requestRender();
          return;
        }

        tween = { from: camera.position.clone(), to: destination, start: performance.now(), duration: 620 };
      };

      // Everything the React half is allowed to ask of the scene.
      sceneRef.current = { applyView, stopAutoRotate };

      // Tuning a piece means looking at it: exposure, environment rotation and
      // roughness are judged by eye, not read off a number. In development the
      // scene is reachable so a render can be forced and captured without
      // waiting on the animation loop. It is not exposed in production.
      if (process.env.NODE_ENV !== "production") {
        window.__marisViewer = {
          renderer,
          scene,
          camera,
          controls,
          render: () => drawFrame()
        };
        teardown.push(() => { delete window.__marisViewer; });
      }

      const renderLoop = () => {
        if (tween) {
          const elapsed = performance.now() - tween.start;
          const t = Math.min(1, elapsed / tween.duration);
          camera.position.lerpVectors(tween.from, tween.to, easeInOutCubic(t));
          if (t >= 1) tween = null;
          needsRender = true;
        }

        // OrbitControls reports whether damping or auto-rotation actually moved
        // the camera, so an untouched viewer costs one boolean per frame instead
        // of a full redraw. This is the plain version of the progressive
        // renderer a commercial viewer would run.
        const moved = controls.update();

        if (moved || needsRender) {
          needsRender = false;
          drawFrame();
        }
      };

      environmentReady.then(({ texture, equirect, source }) => {
        if (disposed) {
          texture.dispose();
          equirect?.dispose();
          return;
        }

        environment = texture;
        studioEquirect = equirect;
        scene.environment = texture;
        setEnvSource(source);
        applyGemShader();
        requestRender();
      });

      const loader = new GLTFLoader();

      loader.load(
        model.url,
        (gltf) => {
          if (disposed) {
            disposeObject3D(gltf.scene);
            return;
          }

          const piece = gltf.scene;
          piece.traverse((child) => {
            if (!child.isMesh) return;

            child.castShadow = true;

            // Anything the converter marked as transmissive is a stone, and
            // gets the tracing shader instead of the stock material. Its
            // settings still come from the MatrixGold file, by way of the glTF.
            if (child.material?.transmission > 0) {
              gemCandidates.push({ mesh: child, settings: readGemSettings(child.material) });
              child.castShadow = false;
            }
          });

          // Models arrive in whatever scale and origin the artist saved them in,
          // so the viewer measures the piece and frames it rather than trusting
          // it to sit at the origin at a sensible size.
          const box = new THREE.Box3().setFromObject(piece);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());
          const radius = Math.max(size.length() / 2, 0.0001);

          piece.position.sub(center);
          scene.add(piece);
          teardown.push(() => {
            scene.remove(piece);
            disposeObject3D(piece);
          });

          ground.position.y = -(size.y / 2) - radius * 0.06;

          const verticalFov = (camera.fov * Math.PI) / 180;
          const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
          fitDistance = (radius / Math.sin(Math.min(verticalFov, horizontalFov) / 2)) * 1.08;

          controls.target.set(0, 0, 0);
          controls.minDistance = radius * 1.15;
          controls.maxDistance = fitDistance * 2.2;

          applyView(views[0] || { theta: 0.72, phi: 1.16, distance: 1 }, false);

          applyGemShader();

          loaded = true;
          if (inView) {
            renderer.setAnimationLoop(renderLoop);
          }
          teardown.push(() => renderer.setAnimationLoop(null));

          setStatus("ready");
        },
        (event) => {
          if (disposed || !event.total) return;
          setProgress(Math.min(1, event.loaded / event.total));
        },
        () => {
          if (!disposed) reportUnavailable();
        }
      );

      teardown.push(() => {
        controls.removeEventListener("change", requestRender);
        controls.dispose();
        environment?.dispose();
        pmremGenerator.dispose();
        ground.geometry.dispose();
        ground.material.dispose();
        renderer.dispose();
      });
    })();

    return () => {
      disposed = true;
      sceneRef.current = null;
      teardown.forEach((fn) => fn());
    };
  }, [started, model, views, reportUnavailable]);

  if (!model || status === "failed") {
    return null;
  }

  const label = `${productCode} ${productName} in 3D`;

  return (
    <figure className="product-mosaic-tile is-hero product-3d" data-product-3d data-status={status} data-env={envSource}>
      <div className="product-3d-stage" ref={stageRef}>
        <canvas ref={canvasRef} className="product-3d-canvas" aria-hidden="true" />

        {status === "idle" && (
          <button
            type="button"
            className="product-3d-invite"
            onClick={() => { setStarted(true); setStatus("loading"); }}
            aria-label={`Load the interactive 3D view of ${productCode}`}
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
                <path d="M12 2.6 21 7.3v9.4L12 21.4 3 16.7V7.3z" strokeLinejoin="round" />
                <path d="M3 7.3 12 12l9-4.7M12 12v9.4" strokeLinejoin="round" />
              </svg>
              View in 3D
            </span>
          </button>
        )}

        {status === "loading" && (
          <div className="product-3d-loading" role="status">
            <span className="product-3d-progress" style={{ transform: `scaleX(${Math.max(0.04, progress)})` }} />
            <span className="sr-only">Loading the 3D view of {productCode}</span>
          </div>
        )}
      </div>

      {status === "ready" && views.length > 0 && (
        <div className="product-3d-controls">
          <div className="product-3d-views" role="group" aria-label={`Camera angles for ${productCode}`}>
            {views.map((view) => (
              <button
                key={view.id}
                type="button"
                className={`product-3d-view${view.id === activeView ? " is-active" : ""}`}
                aria-pressed={view.id === activeView}
                onClick={() => {
                  setActiveView(view.id);
                  sceneRef.current?.stopAutoRotate();
                  sceneRef.current?.applyView(view, true);
                }}
              >
                {view.label}
              </button>
            ))}
          </div>
          <p className="product-3d-hint">Drag to rotate &middot; scroll to zoom</p>
        </div>
      )}

      <figcaption className="sr-only">{label}</figcaption>
    </figure>
  );
}
