(() => {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const phoneQuery = window.matchMedia("(max-width: 760px)");
  let isPhone = phoneQuery.matches;
  const lowPower =
    isPhone
    || window.matchMedia("(prefers-reduced-data: reduce)").matches
    || (navigator.hardwareConcurrency || 8) <= 4;
  if (lowPower) document.documentElement.dataset.lowPower = "true";

  const nav = document.querySelector(".nav");
  const menuBtn = document.querySelector(".menu-btn");
  const momentWord = document.getElementById("momentWord");
  const clockFace = document.getElementById("clockFace");
  const clockTicks = document.getElementById("clockTicks");
  const loader = document.getElementById("loader");
  const loaderCount = document.getElementById("loaderCount");
  const loaderFill = document.getElementById("loaderFill");

  const required = { nav, menuBtn, momentWord, clockFace, clockTicks, loader, loaderCount, loaderFill };
  const missing = Object.entries(required).filter(([, node]) => !node).map(([name]) => name);
  if (missing.length) {
    throw new Error(`Site 02 required markup is missing: ${missing.join(", ")}`);
  }

  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);

  const setMenu = (open) => {
    nav.classList.toggle("open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("nav-lock", open && isPhone);
  };

  menuBtn.addEventListener("click", () => setMenu(!nav.classList.contains("open")));
  nav.querySelectorAll(".links a, .order").forEach((link) => {
    link.addEventListener("click", () => setMenu(false));
  });
  phoneQuery.addEventListener("change", (event) => {
    isPhone = event.matches;
    if (!isPhone) setMenu(false);
  });

  for (let hour = 1; hour <= 12; hour += 1) {
    const mark = document.createElement("span");
    mark.className = "clock-num";
    mark.textContent = String(hour);
    const angle = (hour / 12) * Math.PI * 2 - Math.PI / 2;
    mark.style.left = `${50 + Math.cos(angle) * 46}%`;
    mark.style.top = `${50 + Math.sin(angle) * 46}%`;
    mark.style.transform = "translate(-50%, -50%)";
    clockFace.append(mark);
  }
  for (let i = 0; i < 60; i += 1) {
    if (i % 5 === 0) continue;
    const tick = document.createElement("span");
    tick.className = "clock-tick";
    const angle = (i / 60) * Math.PI * 2 - Math.PI / 2;
    const radius = Math.max(clockFace.offsetWidth, 280) * 0.46;
    tick.style.transform = `translate(-50%, -50%) translate(${Math.cos(angle) * radius}px, ${Math.sin(angle) * radius}px)`;
    clockTicks.append(tick);
  }

  const typeWord = (word) => {
    momentWord.textContent = "";
    [...word].forEach((letter, index) => {
      window.setTimeout(() => {
        momentWord.textContent += letter;
      }, index * 42);
    });
  };

  const setNavTheme = () => {
    // Probe below the sticky nav so the nav itself does not steal the hit.
    const probeY = Math.min(window.innerHeight - 8, Math.max(88, nav.getBoundingClientRect().bottom + 12));
    const sample = document.elementsFromPoint(window.innerWidth / 2, probeY);
    const light = sample.find((node) => node instanceof Element && node.closest(".light"))?.closest(".light");
    nav.dataset.theme = light ? "light" : "dark";
    if (nav.classList.contains("open") && isPhone) nav.dataset.theme = "dark";
  };

  if (prefersReduced) {
    momentWord.textContent = "moment";
    loader.remove();
    const roast = document.querySelector(".tip-roast");
    if (roast) roast.style.opacity = "1";
    setNavTheme();
    window.addEventListener("scroll", () => {
      setNavTheme();
      nav.classList.toggle("is-solid", window.scrollY > 24);
    }, { passive: true });
    document.querySelectorAll(".fav-item").forEach((item) => {
      item.addEventListener("click", () => {
        document.querySelectorAll(".fav-item").forEach((el) => el.classList.toggle("is-active", el === item));
        document.querySelectorAll(".fav-fallbacks .fallback-shot").forEach((shot) => {
          shot.classList.toggle("is-active", shot.dataset.product === item.dataset.product);
        });
        const cap = document.getElementById("favCapName");
        const name = item.querySelector(".fi-name")?.textContent?.trim();
        if (cap && name) cap.textContent = name;
      });
    });
    document.querySelectorAll(".loc-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".loc-btn").forEach((el) => el.classList.toggle("is-active", el === btn));
        document.querySelectorAll(".loc-shot").forEach((shot) => {
          shot.classList.toggle("is-active", shot.dataset.loc === btn.dataset.loc);
        });
      });
    });
    return;
  }

  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    throw new Error("GSAP or ScrollTrigger failed to load.");
  }

  gsap.registerPlugin(ScrollTrigger);

  const SCRUB = window.BrewnnsScroll?.SCRUB ?? 0.5;
  const heroScrub = window.BrewnnsScroll?.heroScrollTrigger?.() ?? {
    trigger: ".hero",
    start: "top top",
    end: "bottom top",
    scrub: SCRUB,
  };
  const lenis = window.BrewnnsScroll?.bindSmoothScroll?.() ?? null;
  if (lenis) lenis.stop();

  document.body.style.overflow = "hidden";
  const intro = gsap.timeline({
    defaults: { ease: "power2.out" },
    onComplete: () => {
      document.body.style.overflow = "";
      if (lenis) {
        lenis.scrollTo(0, { immediate: true });
        lenis.start();
      } else {
        window.scrollTo(0, 0);
      }
      ScrollTrigger.refresh();
    },
  });
  const loadProxy = { n: 0 };
  intro.to(loadProxy, {
    n: 100,
    duration: 0.32,
    ease: "power1.inOut",
    onUpdate: () => {
      loaderCount.textContent = String(Math.round(loadProxy.n));
    },
  }, 0);
  intro.to(loaderFill, { height: "100%", duration: 0.32, ease: "power1.inOut" }, 0);
  intro.to(loader, { yPercent: -110, duration: 0.24, ease: "power3.inOut" }, "+=0.02");
  intro.set(loader, { display: "none" });

  // Staged hero entrance (~1s). Mobile uses ~50% travel distances.
  const introY = isPhone ? 9 : 18;
  gsap.set(".nav", { y: isPhone ? -6 : -12, opacity: 0 });
  gsap.set(".hero-copy > *", { y: introY, opacity: 0 });
  gsap.set(".hero-copy h1 span, .hero-copy h1 em", { yPercent: 105 });
  gsap.set(".hero-meta span", { y: isPhone ? 5 : 8, opacity: 0 });
  gsap.set(".hero-steam", { opacity: 0 });
  intro.to(".nav", { y: 0, opacity: 1, duration: isPhone ? 0.28 : 0.35, ease: "power3.out" }, "-=0.08");
  intro.to(".eyebrow", { y: 0, opacity: 1, duration: 0.2, ease: "power3.out" }, "-=0.16");
  intro.to(".hero-copy h1", { y: 0, opacity: 1, duration: 0.01 }, "-=0.1");
  intro.to(".hero-copy h1 span", {
    yPercent: 0,
    duration: isPhone ? 0.3 : 0.38,
    stagger: isPhone ? 0.05 : 0.07,
    ease: "power3.out",
  }, "-=0.08");
  intro.to(".hero-copy h1 em", { yPercent: 0, duration: isPhone ? 0.28 : 0.36, ease: "power3.out" }, "-=0.2");
  intro.add(() => typeWord("moment"), "<0.04");
  intro.to(".lede", { y: 0, opacity: 1, duration: isPhone ? 0.22 : 0.28, ease: "power3.out" }, "-=0.14");
  intro.to(".text-link", { y: 0, opacity: 1, duration: isPhone ? 0.2 : 0.24, ease: "power3.out" }, "-=0.12");
  if (!isPhone) intro.to(".hero-steam", { opacity: 1, duration: 0.4, ease: "power1.out" }, "-=0.12");
  intro.to(".tip-roast", { opacity: 1, y: 0, duration: isPhone ? 0.22 : 0.28, ease: "power2.out" }, "-=0.06");
  intro.to(".hero-meta span", {
    y: 0,
    opacity: 1,
    duration: isPhone ? 0.2 : 0.26,
    stagger: 0.035,
    ease: "power2.out",
  }, "-=0.1");

  // Restrained scroll-out — connect to menu without fading the hero away.
  gsap.to(".hero-copy h1", { scrollTrigger: heroScrub, y: isPhone ? -6 : -10, ease: "none" });
  gsap.to(".hero-copy .lede, .hero-copy .text-link, .hero-copy .eyebrow", {
    scrollTrigger: { ...heroScrub, end: "center top" },
    y: isPhone ? -8 : -12,
    opacity: 0.62,
    ease: "none",
  });
  gsap.to(".hero-meta", {
    scrollTrigger: { ...heroScrub, end: "35% top" },
    y: -6,
    opacity: 0,
    ease: "none",
  });
  gsap.to(".spot", {
    scrollTrigger: heroScrub,
    scale: 1.04,
    opacity: 0.42,
    ease: "none",
  });
  gsap.to(".tip-roast", {
    scrollTrigger: { ...heroScrub, end: "40% top" },
    opacity: 0,
    y: -8,
    ease: "none",
  });

  const favorites = document.querySelector(".favorites");
  const favLines = document.querySelectorAll(".fav-copy h2 span");
  const favCopy = document.querySelector(".fav-copy p");
  const favItems = [...document.querySelectorAll(".fav-item")];
  const favCanvas = document.getElementById("favCanvas");
  const favFallbacks = [...document.querySelectorAll(".fav-fallbacks .fallback-shot")];
  const favCapName = document.getElementById("favCapName");
  if (!favorites || !favLines.length || !favCopy || favItems.length !== 4 || !favCanvas) {
    throw new Error("Favorites section markup is missing.");
  }

  const setFavorite = (product) => {
    favItems.forEach((item) => {
      const on = item.dataset.product === product;
      item.classList.toggle("is-active", on);
      item.closest('[role="option"]')?.setAttribute("aria-selected", on ? "true" : "false");
    });
    favFallbacks.forEach((shot) => {
      shot.classList.toggle("is-active", shot.dataset.product === product);
    });
    if (favCapName) {
      const active = favItems.find((item) => item.dataset.product === product);
      const name = active?.querySelector(".fi-name")?.textContent?.trim();
      if (name) favCapName.textContent = name;
    }
    const favIndex = document.getElementById("favIndex");
    const activeBtn = favItems.find((item) => item.dataset.product === product);
    if (favIndex && activeBtn?.dataset.index != null) {
      favIndex.textContent = String(Number(activeBtn.dataset.index) + 1).padStart(2, "0");
    }
    document.querySelector(".fav-preview")?.classList.toggle("is-dom-product", product === "roll");
    window.BrewnnsFavorites?.setProduct?.(product);
  };

  favItems.forEach((item) => {
    const activate = () => setFavorite(item.dataset.product);
    item.addEventListener("click", activate);
    item.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activate();
      }
    });
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      item.addEventListener("pointerenter", activate);
    }
  });

  const favScroll = window.BrewnnsScroll?.favoritesScrollTrigger?.() ?? {
    trigger: ".favorites",
    start: "top 92%",
    end: "center 55%",
    scrub: SCRUB,
  };

  const favTl = gsap.timeline({ scrollTrigger: favScroll });
  favTl.from(favLines, { y: 18, ease: "none", duration: 0.28, stagger: 0.04 }, 0);
  favTl.from(favCopy, { y: 12, ease: "none", duration: 0.22 }, 0.06);
  favTl.from(".fav-all", { y: 8, ease: "none", duration: 0.18 }, 0.08);
  favTl.from(favItems, { y: 16, ease: "none", duration: 0.28, stagger: 0.04 }, 0.1);
  favTl.from(".fav-preview", { y: 20, opacity: 0.35, ease: "none", duration: 0.32 }, 0.08);

  const wireFavorites3d = (attempt = 0) => {
    const favWire = window.BrewnnsFavorites;
    if (favWire?.wireTimeline) {
      favWire.wireTimeline(favTl);
      return;
    }
    if (attempt > 90) {
      throw new Error("Favorites 3D scroll choreography failed to initialize.");
    }
    window.requestAnimationFrame(() => wireFavorites3d(attempt + 1));
  };
  wireFavorites3d();

  gsap.fromTo(".menu-strip-label", { y: 12, opacity: 0 }, {
    y: 0,
    opacity: 1,
    scrollTrigger: { trigger: ".menu-strip", start: "top 88%", toggleActions: "play none none none" },
    duration: 0.4,
    ease: "power2.out",
  });
  gsap.fromTo(".menu-strip-track a", { y: 14, opacity: 0 }, {
    y: 0,
    opacity: 1,
    scrollTrigger: { trigger: ".menu-strip", start: "top 85%", toggleActions: "play none none none" },
    duration: 0.4,
    stagger: 0.03,
    ease: "power2.out",
  });

  gsap.fromTo(
    ".favorites .watermark",
    { x: 48 },
    {
      scrollTrigger: { trigger: favorites, start: "top 82%", end: "center center", scrub: SCRUB },
      x: 0,
      ease: "none",
    }
  );

  gsap.fromTo(".clock-kicker", { opacity: 0, x: -16 }, {
    opacity: 1,
    x: 0,
    scrollTrigger: { trigger: ".clock-sec", start: "top 78%", toggleActions: "play none none none" },
    duration: 0.4,
    ease: "power2.out",
  });
  gsap.fromTo(".clock-num", { opacity: 0, scale: 0.86 }, {
    opacity: 1,
    scale: 1,
    scrollTrigger: { trigger: ".clock-sec", start: "top 70%", toggleActions: "play none none none" },
    duration: 0.28,
    stagger: { each: 0.028, from: "start" },
    ease: "power2.out",
  });
  gsap.fromTo(".clock-tick", { opacity: 0 }, {
    opacity: 0.55,
    scrollTrigger: { trigger: ".clock-sec", start: "top 68%", toggleActions: "play none none none" },
    duration: 0.22,
    stagger: { each: 0.008, from: "start" },
    ease: "power1.out",
  });
  gsap.fromTo(".loc-btn", { y: 14, opacity: 0 }, {
    y: 0,
    opacity: 1,
    scrollTrigger: { trigger: ".clock-sec", start: "top 72%", toggleActions: "play none none none" },
    duration: 0.4,
    stagger: 0.06,
    ease: "power2.out",
  });
  gsap.fromTo(".clock-aside", { y: 14, opacity: 0 }, {
    y: 0,
    opacity: 1,
    scrollTrigger: { trigger: ".clock-sec", start: "top 68%", toggleActions: "play none none none" },
    duration: 0.45,
    ease: "power2.out",
  });

  const clockHand = document.querySelector(".clock-hand");
  const locAngles = { "0": 18, "1": 72, "2": -28 };
  const locBtns = [...document.querySelectorAll(".loc-btn")];
  const locShots = [...document.querySelectorAll(".loc-shot")];
  if (locBtns.length && locShots.length) {
    const setLoc = (id) => {
      locBtns.forEach((btn) => btn.classList.toggle("is-active", btn.dataset.loc === id));
      locShots.forEach((shot) => shot.classList.toggle("is-active", shot.dataset.loc === id));
      if (clockHand && locAngles[id] != null) {
        gsap.to(clockHand, { rotation: locAngles[id], duration: 0.45, ease: "power2.out" });
      }
      window.BrewnnsClock?.setLocation?.(id);
    };
    locBtns.forEach((btn) => {
      const go = () => setLoc(btn.dataset.loc);
      btn.addEventListener("click", go);
      btn.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          go();
        }
      });
      if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
        btn.addEventListener("pointerenter", go);
      }
    });
  }

  const cityMotion = isPhone ? 0.28 : 1;
  gsap.fromTo(".city-sec h2 span", { y: 28 * cityMotion }, {
    y: 0,
    stagger: isPhone ? 0.04 : 0.05,
    scrollTrigger: { trigger: ".city-sec", start: "top 90%", end: "top 40%", scrub: SCRUB },
    ease: "none",
  });
  gsap.fromTo(".city-note", { y: 16 * cityMotion, opacity: 0.15 }, {
    y: 0,
    opacity: 1,
    scrollTrigger: { trigger: ".city-sec", start: "top 82%", end: "top 46%", scrub: SCRUB },
    ease: "none",
  });
  // Soft depth: heading vs note at different rates while leaving City toward Right Now.
  gsap.to(".city-sec h2", {
    y: -18 * cityMotion,
    ease: "none",
    scrollTrigger: { trigger: ".city-sec", start: "center center", end: "bottom top", scrub: SCRUB },
  });
  gsap.to(".city-note", {
    y: -10 * cityMotion,
    opacity: isPhone ? 0.75 : 0.55,
    ease: "none",
    scrollTrigger: { trigger: ".city-sec", start: "center center", end: "bottom top", scrub: SCRUB },
  });

  const orderStage = document.querySelector(".crn-stage");
  const crnSection = document.getElementById("coffee-right-now");
  if (!orderStage || !crnSection || !document.querySelector(".crn-drink") || !document.querySelector(".crn-pastry") || !document.querySelector(".receipt")) {
    throw new Error("Coffee for Right Now section markup is missing.");
  }
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    orderStage.addEventListener("pointermove", (event) => {
      const box = orderStage.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width - 0.5;
      const y = (event.clientY - box.top) / box.height - 0.5;
      orderStage.style.setProperty("--px", `${(x * 5).toFixed(2)}px`);
      orderStage.style.setProperty("--py", `${(y * 3.5).toFixed(2)}px`);
    });
    orderStage.addEventListener("pointerleave", () => {
      orderStage.style.setProperty("--px", "0px");
      orderStage.style.setProperty("--py", "0px");
    });
  }
  if (isPhone) {
    gsap.fromTo(".crn-kicker", { y: 8, opacity: 0 }, {
      y: 0, opacity: 1, duration: 0.35, ease: "power2.out",
      scrollTrigger: { trigger: crnSection, start: "top 88%", toggleActions: "play none none none" },
    });
    gsap.fromTo(".crn-title span", { y: "100%" }, {
      y: "0%", duration: 0.48, stagger: 0.05, ease: "power2.out",
      scrollTrigger: { trigger: crnSection, start: "top 86%", toggleActions: "play none none none" },
    });
    gsap.fromTo(".receipt", {
      "--ry": "30px", "--rr": "4.4deg", "--rs": 0.96, "--ro": 0.3,
    }, {
      "--ry": "0px", "--rr": "0deg", "--rs": 1, "--ro": 1,
      duration: 0.6, ease: "power2.out",
      scrollTrigger: { trigger: crnSection, start: "top 82%", toggleActions: "play none none none" },
    });
    gsap.fromTo(".crn-drink", {
      "--rx": "-15px", "--ry": "12px", "--rr": "-1.5deg", "--rs": 0.92, "--ro": 0.3,
    }, {
      "--rx": "0px", "--ry": "0px", "--rr": "0deg", "--rs": 1, "--ro": 1,
      duration: 0.55, ease: "power2.out",
      scrollTrigger: { trigger: crnSection, start: "top 78%", toggleActions: "play none none none" },
    });
    gsap.fromTo(".crn-pastry", {
      "--rx": "15px", "--ry": "14px", "--rr": "1.5deg", "--rs": 0.94, "--ro": 0.3,
    }, {
      "--rx": "0px", "--ry": "0px", "--rr": "0deg", "--rs": 1, "--ro": 1,
      duration: 0.55, ease: "power2.out",
      scrollTrigger: { trigger: crnSection, start: "top 76%", toggleActions: "play none none none" },
    });
    gsap.fromTo(".crn-copy", { y: 12, opacity: 0.3 }, {
      y: 0, opacity: 1, duration: 0.4, ease: "power2.out",
      scrollTrigger: { trigger: crnSection, start: "top 72%", toggleActions: "play none none none" },
    });
    gsap.fromTo(".crn-cta", { y: 8, opacity: 0.3 }, {
      y: 0, opacity: 1, duration: 0.35, ease: "power2.out",
      scrollTrigger: { trigger: crnSection, start: "top 70%", toggleActions: "play none none none" },
    });
  } else {
    const nowReveal = {
      trigger: crnSection,
      start: "top 88%",
      end: "top 32%",
      scrub: SCRUB,
    };
    const nowTl = gsap.timeline({ scrollTrigger: nowReveal });
    nowTl.fromTo(".crn-kicker", { y: 12, opacity: 0.15 }, { y: 0, opacity: 1, ease: "none", duration: 0.2 }, 0);
    nowTl.fromTo(".crn-title span", { y: "105%" }, { y: "0%", ease: "none", stagger: 0.045, duration: 0.3 }, 0.04);
    nowTl.fromTo(".receipt", {
      "--ry": "70px", "--rr": "4.4deg", "--rs": 0.96, "--ro": 0.1,
    }, {
      "--ry": "0px", "--rr": "0deg", "--rs": 1, "--ro": 1, ease: "none", duration: 0.42,
    }, 0.06);
    nowTl.fromTo(".crn-drink", {
      "--rx": "-45px", "--ry": "24px", "--rr": "-1.5deg", "--rs": 0.92, "--ro": 0.12,
    }, {
      "--rx": "0px", "--ry": "0px", "--rr": "0deg", "--rs": 1, "--ro": 1, ease: "none", duration: 0.36,
    }, 0.12);
    nowTl.fromTo(".crn-pastry", {
      "--rx": "45px", "--ry": "28px", "--rr": "1.5deg", "--rs": 0.94, "--ro": 0.12,
    }, {
      "--rx": "0px", "--ry": "0px", "--rr": "0deg", "--rs": 1, "--ro": 1, ease: "none", duration: 0.36,
    }, 0.16);
    nowTl.fromTo(".crn-copy", { y: 16, opacity: 0.15 }, { y: 0, opacity: 1, ease: "none", duration: 0.24 }, 0.34);
    nowTl.fromTo(".crn-cta", { y: 12, opacity: 0.15 }, { y: 0, opacity: 1, ease: "none", duration: 0.2 }, 0.4);

    gsap.fromTo(".receipt", { "--ps": "0px" }, {
      "--ps": "-16px",
      ease: "none",
      scrollTrigger: { trigger: crnSection, start: "top 50%", end: "bottom top", scrub: SCRUB },
    });
    gsap.fromTo(".crn-drink", { "--ps": "0px" }, {
      "--ps": "-22px",
      ease: "none",
      scrollTrigger: { trigger: crnSection, start: "top 50%", end: "bottom top", scrub: SCRUB },
    });
    gsap.fromTo(".crn-pastry", { "--ps": "0px" }, {
      "--ps": "-14px",
      ease: "none",
      scrollTrigger: { trigger: crnSection, start: "top 50%", end: "bottom top", scrub: SCRUB },
    });
  }
  const heroStage = document.getElementById("heroStage");
  const heroFloat = document.getElementById("heroFloat");
  if (!heroStage || !heroFloat) {
    throw new Error("Hero stage markup is missing.");
  }
  // No long hero pin — scroll exit is handled by product travel scrub only.

  gsap.fromTo(".clock-hand", { rotation: -50 }, {
    rotation: locAngles["0"],
    duration: 0.8,
    ease: "power2.out",
    scrollTrigger: { trigger: ".clock-sec", start: "top 70%", toggleActions: "play none none none" },
  });

  ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate: (self) => {
      setNavTheme();
      nav.classList.toggle("is-solid", self.scroll() > 24);
    },
  });

  window.addEventListener("load", () => ScrollTrigger.refresh());
  window.addEventListener("resize", () => ScrollTrigger.refresh());
})();
