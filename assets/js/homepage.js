(() => {
  const hero = document.querySelector(".hero");
  const heroSlides = Array.from(document.querySelectorAll(".hero-slide"));
  const heroDots = Array.from(document.querySelectorAll(".hero-slide-dot"));
  const categoryCards = Array.from(document.querySelectorAll(".category-card"));
  const atelierReveal = document.querySelector("[data-atelier-reveal]");
  const atelierStatus = document.querySelector("[data-atelier-status]");
  const atelierFocus = document.querySelector("[data-atelier-focus]");
  const atelierProducts = document.querySelector("[data-atelier-products]");
  const heroLeft = document.querySelector(".hero-hit-left");
  const heroRight = document.querySelector(".hero-hit-right");
  let currentHeroSlide = 0;
  let heroTimer;
  let isHeroMoving = false;

  function resetHeroSlideClasses(slide) {
    slide.classList.remove(
      "is-active",
      "enter-from-left",
      "enter-from-right",
      "exit-to-left",
      "exit-to-right"
    );
  }

  function updateHeroDots() {
    heroDots.forEach((dot, index) => {
      const isActive = index === currentHeroSlide;
      dot.classList.toggle("is-active", isActive);
      dot.setAttribute("aria-current", isActive ? "true" : "false");
    });
  }

  function showHeroSlide(index, slideDirection = "left") {
    if (heroSlides.length === 0 || isHeroMoving) {
      return;
    }

    const nextHeroSlide = (index + heroSlides.length) % heroSlides.length;

    if (nextHeroSlide === currentHeroSlide) {
      return;
    }

    isHeroMoving = true;

    const currentSlide = heroSlides[currentHeroSlide];
    const nextSlide = heroSlides[nextHeroSlide];
    const isSlidingLeft = slideDirection === "left";

    heroSlides.forEach((slide) => {
      if (slide !== currentSlide && slide !== nextSlide) {
        resetHeroSlideClasses(slide);
      }
    });

    resetHeroSlideClasses(nextSlide);
    nextSlide.classList.add(isSlidingLeft ? "enter-from-right" : "enter-from-left");
    nextSlide.offsetHeight;

    currentSlide.classList.remove("is-active");
    currentSlide.classList.add(isSlidingLeft ? "exit-to-left" : "exit-to-right");

    nextSlide.classList.remove(isSlidingLeft ? "enter-from-right" : "enter-from-left");
    nextSlide.classList.add("is-active");

    currentHeroSlide = nextHeroSlide;
    updateHeroDots();

    window.setTimeout(() => {
      resetHeroSlideClasses(currentSlide);
      isHeroMoving = false;
    }, 760);
  }

  function moveHeroSlide(direction, slideDirection) {
    showHeroSlide(currentHeroSlide + direction, slideDirection);
    restartHeroTimer();
  }

  function restartHeroTimer() {
    window.clearInterval(heroTimer);

    if (heroSlides.length > 1) {
      heroTimer = window.setInterval(() => {
        showHeroSlide(currentHeroSlide + 1, "left");
      }, 4800);
    }
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatProductTitle(product) {
    return product.title || product.name || product.nameEn || product.productCode || product.code || "Maris piece";
  }

  function formatCollection(product) {
    return product.collectionKey || product.collection || product.category || "Maris";
  }

  function renderAtelierUnavailable(message = "Catalogue preview is unavailable right now.") {
    if (!atelierReveal || !atelierFocus || !atelierProducts || !atelierStatus) {
      return;
    }

    atelierReveal.dataset.atelierState = "unavailable";
    atelierFocus.innerHTML = `
      <p class="atelier-reveal__status" data-atelier-status>Preview unavailable</p>
      <h3>Selected pieces are not available yet.</h3>
      <p>${escapeHtml(message)}</p>
    `;
    atelierProducts.innerHTML = `
      <article class="atelier-product atelier-unavailable">
        <span>Preview</span>
        <strong>Pieces coming soon</strong>
        <p>Enquire with Maris for current pieces.</p>
      </article>
    `;
  }

  function renderAtelierProducts(products) {
    if (!atelierReveal || !atelierFocus || !atelierProducts || !atelierStatus) {
      return;
    }

    const visibleProducts = products
      .filter((product) => product && (product.image || product.title || product.name || product.code))
      .slice(0, 3);

    if (visibleProducts.length === 0) {
      renderAtelierUnavailable("No selected pieces are published yet.");
      return;
    }

    const featuredProduct = visibleProducts[0];
    const featuredTitle = formatProductTitle(featuredProduct);
    const featuredCollection = formatCollection(featuredProduct);

    atelierReveal.dataset.atelierState = "ready";
    atelierFocus.innerHTML = `
      <p class="atelier-reveal__status" data-atelier-status>${visibleProducts.length} catalogue piece${visibleProducts.length === 1 ? "" : "s"}</p>
      <p class="atelier-reveal__label">${escapeHtml(featuredCollection)}</p>
      <h3>${escapeHtml(featuredTitle)}</h3>
      <p>${escapeHtml(featuredProduct.price || "Price on request.")}</p>
    `;
    atelierProducts.innerHTML = visibleProducts.map((product, index) => {
      const title = formatProductTitle(product);
      const collection = formatCollection(product);
      const image = product.image || product.hover || "";
      const productSlug = product.slug || product.code || title;
      const collectionKey = product.collectionKey || "";
      const href = `pages/product.html?product=${encodeURIComponent(productSlug)}&collection=${encodeURIComponent(collectionKey)}`;

      return `
        <a class="atelier-product${image ? "" : " atelier-product--fallback"}" href="${href}" style="--atelier-delay: ${index * 90}ms">
          ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" loading="lazy" decoding="async">` : "<span class=\"atelier-product__image-fallback\" aria-hidden=\"true\">Catalogue</span>"}
          <span>${escapeHtml(collection)}</span>
          <strong>${escapeHtml(title)}</strong>
          <p>${escapeHtml(product.stockState === "available" ? "Available to enquire" : "Confirm availability")}</p>
        </a>
      `;
    }).join("");
  }

  async function loadAtelierReveal() {
    if (!atelierReveal || !atelierStatus) {
      return;
    }

    try {
      const response = await fetch("/api/catalogue/products", {
        headers: {
          "Accept": "application/json"
        },
        cache: "no-store"
      });
      const payload = await response.json();

      if (!response.ok || payload.status === "unavailable") {
        renderAtelierUnavailable("Current pieces are being refreshed.");
        return;
      }

      renderAtelierProducts(Array.isArray(payload.products) ? payload.products : []);
    } catch (error) {
      renderAtelierUnavailable("Current pieces are being refreshed.");
    }
  }

  if (atelierReveal && "IntersectionObserver" in window) {
    const atelierObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          atelierReveal.classList.add("is-atelier-visible");
          atelierObserver.disconnect();
        }
      });
    }, { threshold: 0.28 });

    atelierObserver.observe(atelierReveal);
  } else if (atelierReveal) {
    atelierReveal.classList.add("is-atelier-visible");
  }

  if (hero && heroLeft && heroRight) {
    heroLeft.addEventListener("click", () => moveHeroSlide(1, "left"));
    heroRight.addEventListener("click", () => moveHeroSlide(-1, "right"));

    let touchStartX = 0;

    hero.addEventListener("touchstart", (event) => {
      touchStartX = event.touches[0].clientX;
    }, { passive: true });

    hero.addEventListener("touchend", (event) => {
      const touchEndX = event.changedTouches[0].clientX;
      const touchDistance = touchEndX - touchStartX;

      if (Math.abs(touchDistance) > 40) {
        moveHeroSlide(touchDistance > 0 ? -1 : 1, touchDistance > 0 ? "right" : "left");
      }
    });
  }

  heroDots.forEach((dot) => {
    dot.addEventListener("click", () => {
      const nextIndex = Number(dot.dataset.heroSlide);

      if (Number.isNaN(nextIndex) || nextIndex === currentHeroSlide) {
        return;
      }

      moveHeroSlide(nextIndex - currentHeroSlide, nextIndex > currentHeroSlide ? "left" : "right");
    });
  });

  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    categoryCards.forEach((card) => {
      let bounds = null;
      let glintFrame = 0;
      let nextX = 62;
      let nextY = 64;

      card.addEventListener("pointerenter", () => {
        bounds = card.getBoundingClientRect();
      });

      card.addEventListener("pointermove", (event) => {
        if (!bounds) {
          bounds = card.getBoundingClientRect();
        }

        nextX = ((event.clientX - bounds.left) / bounds.width) * 100;
        nextY = ((event.clientY - bounds.top) / bounds.height) * 100;

        if (glintFrame) {
          return;
        }

        glintFrame = window.requestAnimationFrame(() => {
          card.style.setProperty("--card-glint-x", `${nextX.toFixed(1)}%`);
          card.style.setProperty("--card-glint-y", `${nextY.toFixed(1)}%`);
          glintFrame = 0;
        });
      });

      card.addEventListener("pointerleave", () => {
        bounds = null;

        if (glintFrame) {
          window.cancelAnimationFrame(glintFrame);
          glintFrame = 0;
        }
      });
    });
  }

  updateHeroDots();
  restartHeroTimer();
  loadAtelierReveal();
})();
