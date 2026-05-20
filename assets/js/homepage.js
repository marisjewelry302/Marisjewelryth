(() => {
  const hero = document.querySelector(".hero");
  const heroSlides = Array.from(document.querySelectorAll(".hero-slide"));
  const heroDots = Array.from(document.querySelectorAll(".hero-slide-dot"));
  const categoryCards = Array.from(document.querySelectorAll(".category-card"));
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
})();
