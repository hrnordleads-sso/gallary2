(() => {
  const SCRUB = 0.5;

  function heroScrollTrigger() {
    return {
      trigger: ".hero",
      start: "top top",
      end: "bottom top",
      scrub: SCRUB,
    };
  }

  // Desktop product travel continues through menu into Favorites — continuity, not a hard drop.
  function heroTravelTrigger() {
    return {
      trigger: ".hero",
      start: "top top",
      endTrigger: ".favorites",
      end: "top 28%",
      scrub: SCRUB,
    };
  }

  function clockScrollTrigger() {
    return {
      trigger: ".clock-sec",
      start: "top 70%",
      end: "bottom top",
      scrub: SCRUB,
    };
  }

  function favoritesScrollTrigger() {
    return {
      trigger: ".favorites",
      start: "top 92%",
      end: "center 55%",
      scrub: SCRUB,
    };
  }

  function cityScrollTrigger() {
    return {
      trigger: ".city-sec",
      start: "top bottom",
      end: "bottom top",
      scrub: SCRUB,
    };
  }

  function bindSmoothScroll() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return null;
    }
    // Phone scroll stays native — Lenis fights touch scrolling.
    if (window.matchMedia("(max-width: 760px)").matches || window.matchMedia("(pointer: coarse)").matches) {
      return null;
    }
    if (typeof Lenis === "undefined" || typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      return null;
    }

    const lenis = new Lenis({
      duration: 1.05,
      easing: (t) => Math.min(1, 1.001 - 2 ** (-10 * t)),
      smoothWheel: true,
      syncTouch: false,
      wheelMultiplier: 0.9,
    });

    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    return lenis;
  }

  window.BrewnnsScroll = {
    SCRUB,
    heroScrollTrigger,
    heroTravelTrigger,
    clockScrollTrigger,
    favoritesScrollTrigger,
    cityScrollTrigger,
    bindSmoothScroll,
    revision: "web2-m4",
  };
})();
