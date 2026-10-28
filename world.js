import * as THREE from "three";

const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (prefersReduced) {
  document.documentElement.dataset.webgl = "off";
} else {
  bootWorld();
}

function bootWorld() {
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    throw new Error("GSAP or ScrollTrigger failed to load before the WebGL world.");
  }
  gsap.registerPlugin(ScrollTrigger);

  const viewport = window.innerWidth;
  const narrow = viewport < 760;
  const tablet = viewport >= 760 && viewport < 1100;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const lowPower =
    viewport < 980
    || coarse
    || window.matchMedia("(prefers-reduced-data: reduce)").matches
    || (navigator.hardwareConcurrency || 8) <= 4;
  const segments = lowPower ? 24 : narrow ? 28 : 36;

  const heroCanvas = document.getElementById("heroCanvas");
  const clockCanvas = document.getElementById("clockCanvas");
  const cityCanvas = document.getElementById("cityCanvas");
  const favCanvas = document.getElementById("favCanvas");
  if (!heroCanvas || !clockCanvas || !cityCanvas || !favCanvas) {
    throw new Error("A required WebGL canvas is missing.");
  }

  document.documentElement.dataset.webgl = "on";

  const mats = sharedMaterials();

  // —— HERO ——
  // Closer camera + larger settle scale so product reads as second focal point.
  // Keep full cup silhouette in frame (no lid/base clip).
  const hero = createStage(heroCanvas, {
    fov: narrow ? 36 : tablet ? 36 : 34,
    z: narrow ? 5.95 : tablet ? 5.95 : 5.55,
    lowPower,
  });
  const cup = makeCup(mats, segments, { sleeve: true });
  const bag = makeBag(mats);
  const cardA = makePackCard(mats, 0.92);
  const cardB = makePackCard(mats, 0.78);
  const cupHome = narrow
    ? { x: -0.04, y: 0.22, z: 0.3 }
    : tablet
      ? { x: -0.12, y: -0.06, z: 0.3 }
      : { x: -0.32, y: -0.04, z: 0.34 };
  const bagHome = narrow
    ? { x: 0.34, y: 0.28, z: -0.36 }
    : tablet
      ? { x: 0.42, y: 0.14, z: -0.44 }
      : { x: 0.4, y: 0.16, z: -0.46 };
  cup.position.set(cupHome.x, cupHome.y, cupHome.z);
  cup.rotation.set(0.02, -0.12, -0.01);
  bag.position.set(bagHome.x, bagHome.y, bagHome.z);
  // Packaging tilt ~−3° to +4° — stays behind cup, no intersection.
  bag.rotation.set(0.035, 0.22, 0.055);
  cardA.position.set(bagHome.x - 0.34, bagHome.y + 0.08, bagHome.z - 0.28);
  cardA.rotation.set(0.02, 0.38, -0.05);
  cardB.position.set(bagHome.x + 0.26, bagHome.y - 0.18, bagHome.z - 0.42);
  cardB.rotation.set(-0.04, -0.16, 0.07);
  // Mobile: keep cup + bag only — fewer draw calls, cleaner crop.
  if (narrow) {
    cardA.visible = false;
    cardB.visible = false;
  }
  const heroLights = makeHeroLights(narrow ? 0.96 : 1.08);
  const cupShadow = floorShadow(cupHome.x, narrow ? -0.92 : -1.02, narrow ? 1.65 : 2.0);
  const bagShadow = floorShadow(bagHome.x + 0.08, narrow ? -0.72 : -0.78, narrow ? 1.35 : 1.55);
  hero.scene.add(heroLights.group, cup, bag, cardA, cardB, cupShadow, bagShadow);
  hero.group = { cup, bag, cardA, cardB };
  hero.baseCam = {
    x: narrow ? 0 : tablet ? -0.06 : -0.14,
    y: narrow ? -0.08 : 0.03,
    z: narrow ? 5.95 : tablet ? 5.95 : 5.55,
  };
  hero.camera.position.set(hero.baseCam.x, hero.baseCam.y, hero.baseCam.z);

  // —— CLOCK ——
  const clock = createStage(clockCanvas, {
    fov: narrow ? 34 : 32,
    z: narrow ? 5.6 : tablet ? 5.4 : 5.0,
    lowPower,
  });
  const iced = makeIcedDrink(mats, segments, { flavor: "coffee" });
  iced.position.y = narrow ? -0.08 : -0.35;
  iced.scale.setScalar(narrow ? 1.02 : 0.92);
  const icedPivot = new THREE.Group();
  icedPivot.add(iced);
  clock.scene.add(warmLights(1.12), icedPivot, floorShadow(0, -1.05));
  clock.group = { iced, icedPivot };

  // —— CITY ——
  const city = createStage(cityCanvas, {
    fov: narrow ? 36 : tablet ? 36 : 34,
    z: narrow ? 6.8 : tablet ? 8.0 : 7.4,
    lowPower,
  });
  city.camera.position.x = narrow ? 0 : tablet ? 0.12 : 0.42;
  city.camera.lookAt(narrow ? 0 : 0.18, narrow ? -0.2 : -0.32, 0);
  const cityCup = makeCup(mats, segments, { sleeve: true });
  const cityHome = narrow
    ? { x: 0, y: -0.28, s: 1.18, z: 0.18 }
    : tablet
      ? { x: 0.42, y: -0.52, s: 1.14, z: 0.12 }
      : { x: 1.18, y: -0.5, s: 1.4, z: 0.1 };
  cityCup.scale.setScalar(cityHome.s * (narrow ? 0.94 : 0.86));
  cityCup.position.set(
    cityHome.x + (narrow ? 0.05 : 0.28),
    cityHome.y - (narrow ? 0.02 : 0.12),
    cityHome.z + (narrow ? 0.25 : 0.9)
  );
  cityCup.rotation.set(narrow ? 0.05 : 0.1, narrow ? -0.95 : -0.32, narrow ? -0.02 : -0.05);
  const beanCount = narrow ? 2 : tablet ? 5 : 6;
  const beans = makeBeans(beanCount, cityHome);
  city.scene.add(cityLights(), cityCup, floorShadow(cityHome.x, cityHome.y - 0.95), beans.mesh);
  city.group = { cityCup, beans };

  // —— FAVORITES (single canvas) ——
  const favMotion = setupFavorites({
    canvas: favCanvas,
    mats,
    segments,
    lowPower,
  });

  const cupSettle = {
    x: cupHome.x,
    y: narrow ? 0.2 : tablet ? -0.04 : -0.05,
    z: cupHome.z,
    rx: 0.02,
    // Face brand toward camera; stay upright (no lean).
    ry: narrow ? -1.05 : -0.98,
    rz: -0.01,
    s: narrow ? 1.28 : tablet ? 1.3 : 1.3,
  };
  const bagSettle = {
    x: bagHome.x,
    y: narrow ? 0.26 : tablet ? 0.14 : 0.16,
    z: bagHome.z,
    rx: 0.035,
    ry: narrow ? 0.26 : 0.22,
    rz: 0.055,
    s: narrow ? 1.12 : tablet ? 1.28 : 1.36,
  };
  // Entrance starts lower / deeper — mobile uses ~50% travel.
  const cupPose = {
    x: cupSettle.x + (narrow ? 0.02 : 0.08),
    y: cupSettle.y - (narrow ? 0.12 : 0.28),
    z: cupSettle.z - (narrow ? 0.04 : 0.08),
    rx: cupSettle.rx,
    ry: cupSettle.ry - (narrow ? 0.04 : 0.08),
    rz: cupSettle.rz,
    s: cupSettle.s * (narrow ? 0.94 : 0.82),
  };
  const bagPose = {
    x: bagSettle.x + (narrow ? 0.1 : 0.32),
    y: bagSettle.y - (narrow ? 0.04 : 0.1),
    z: bagSettle.z - (narrow ? 0.12 : 0.35),
    rx: bagSettle.rx,
    ry: bagSettle.ry + (narrow ? 0.06 : 0.12),
    rz: bagSettle.rz,
    s: bagSettle.s * (narrow ? 0.94 : 0.78),
  };
  const cardPose = {
    aY: cardA.position.y - (narrow ? 0.18 : 0.36),
    bY: cardB.position.y - (narrow ? 0.2 : 0.42),
    aS: 0.72,
    bS: 0.68,
  };
  const idle = { cupZ: 0, bagZ: 0, cupY: 0, bagY: 0, camX: 0, camY: 0 };
  const mouse = { x: 0, y: 0 };
  const pointer = { x: 0, y: 0 };
  const scrollFx = { cupY: 0, bagY: 0, camZ: 0 };
  const DEG = Math.PI / 180;

  // Premium hero open (~1s after loader) — packaging from depth, cup settles, no spin.
  const intro = gsap.timeline({ delay: 0.28, defaults: { ease: "power3.out" } });
  intro.to(bagPose, {
    x: bagSettle.x,
    y: bagSettle.y,
    z: bagSettle.z,
    s: bagSettle.s,
    ry: bagSettle.ry,
    duration: narrow ? 0.48 : 0.55,
  }, 0.02);
  intro.to(cardPose, { aY: cardA.position.y, aS: 1, duration: 0.5 }, 0.06);
  intro.to(cardPose, { bY: cardB.position.y, bS: 1, duration: 0.52 }, 0.1);
  intro.to(cupPose, {
    x: cupSettle.x,
    y: cupSettle.y,
    z: cupSettle.z,
    s: cupSettle.s,
    ry: cupSettle.ry,
    duration: narrow ? 0.5 : 0.55,
  }, 0.08);
  // One soft light sweep across packaging during entrance.
  intro.fromTo(
    heroLights.sweep,
    { intensity: 0 },
    { intensity: narrow ? 0.55 : 0.85, duration: 0.28, ease: "power1.out" },
    0.18
  );
  intro.to(heroLights.sweep, { intensity: 0.12, duration: 0.42, ease: "power2.inOut" }, 0.46);

  // Extremely subtle idle (~2–3px). Mobile intensity ~45%.
  if (!prefersReduced) {
    const idleAmp = narrow ? 0.45 : 1;
    gsap.to(idle, { cupY: -0.018 * idleAmp, cupZ: -0.01 * idleAmp, duration: 6.2, yoyo: true, repeat: -1, ease: "sine.inOut" });
    gsap.to(idle, { bagY: 0.016 * idleAmp, bagZ: 0.014 * idleAmp, duration: 7.1, yoyo: true, repeat: -1, ease: "sine.inOut" });
    gsap.to(idle, { camX: 0.012 * idleAmp, camY: -0.008 * idleAmp, duration: 7.8, yoyo: true, repeat: -1, ease: "sine.inOut" });
  }

  const heroStage = document.getElementById("heroStage");
  if (!heroStage) throw new Error("Hero stage markup is missing.");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (finePointer && !prefersReduced) {
    heroStage.addEventListener("pointermove", (event) => {
      const box = heroStage.getBoundingClientRect();
      // Normalized −1…1 target; applied via lerp + ±1° cup / stronger bag.
      mouse.x = ((event.clientX - box.left) / box.width - 0.5) * 2;
      mouse.y = ((event.clientY - box.top) / box.height - 0.5) * 2;
    });
    heroStage.addEventListener("pointerleave", () => {
      mouse.x = 0;
      mouse.y = 0;
    });
  }

  const SCRUB = window.BrewnnsScroll?.SCRUB ?? 0.5;
  const heroTravel = window.BrewnnsScroll?.heroTravelTrigger?.() ?? {
    trigger: ".hero",
    start: "top top",
    endTrigger: ".favorites",
    end: "top 28%",
    scrub: SCRUB,
  };
  const heroTravelTweens = [];
  if (!narrow && !tablet) {
    heroTravelTweens.push(gsap.to(cupPose, {
      scrollTrigger: { ...heroTravel },
      y: 0.85,
      x: cupSettle.x + 0.28,
      ry: -0.55,
      rz: -0.04,
      s: 0.98,
      ease: "none",
    }));
    heroTravelTweens.push(gsap.to(bagPose, {
      scrollTrigger: { ...heroTravel },
      y: 1.05,
      x: bagSettle.x - 0.28,
      ry: 0.42,
      rz: 0.05,
      s: 1.18,
      ease: "none",
    }));
    heroTravelTweens.push(gsap.to(cardPose, {
      scrollTrigger: { ...heroTravel },
      aY: cardA.position.y + 0.55,
      bY: cardB.position.y + 0.7,
      aS: 0.88,
      bS: 0.82,
      ease: "none",
    }));
  }

  // First-portion hero exit parallax (DOM scroll is separate) — no hijacking.
  const heroExit = window.BrewnnsScroll?.heroScrollTrigger?.() ?? {
    trigger: ".hero",
    start: "top top",
    end: "bottom top",
    scrub: SCRUB,
  };
  gsap.to(scrollFx, {
    scrollTrigger: { ...heroExit },
    cupY: narrow ? -0.05 : -0.12,
    bagY: narrow ? -0.03 : -0.08,
    camZ: narrow ? 0.04 : 0.1,
    ease: "none",
  });

  // Clock iced: rise once, then restrained scrub — location interaction via BrewnnsClock.
  const icedHomeY = iced.position.y;
  gsap.fromTo(
    iced.position,
    { y: icedHomeY - 0.42 },
    {
      y: icedHomeY,
      ease: "power2.out",
      duration: 0.9,
      scrollTrigger: { trigger: ".clock-sec", start: "top 72%", toggleActions: "play none none none" },
    }
  );
  const clockScrub = window.BrewnnsScroll?.clockScrollTrigger?.() ?? {
    trigger: ".clock-sec",
    start: "top 55%",
    end: "bottom top",
    scrub: SCRUB,
  };
  gsap.fromTo(
    iced.rotation,
    { x: 0.04, y: 0.06 },
    {
      scrollTrigger: { ...clockScrub, start: "center 48%", end: "bottom top" },
      x: narrow ? 0.08 : 0.42,
      y: narrow ? -0.1 : -0.22,
      z: narrow ? 0.03 : 0.08,
      ease: "none",
    }
  );
  window.BrewnnsClock = {
    setLocation(id) {
      const map = { "0": 0, "1": 0.2, "2": -0.18 };
      const target = map[id] ?? 0;
      gsap.to(icedPivot.rotation, { y: target, z: target * 0.2, duration: 0.48, ease: "power2.out" });
    },
  };

  // City: cinematic enter from depth → settle → exit toward Right Now (down/out).
  const cityScrub = window.BrewnnsScroll?.cityScrollTrigger?.() ?? {
    trigger: ".city-sec",
    start: "top bottom",
    end: "bottom top",
    scrub: SCRUB,
  };
  const cityCupY = cityCup.rotation.y;
  const cityDepthIn = narrow ? 0.35 : 1.1;
  const cityExitY = narrow ? -0.35 : -1.05;
  const cityExitX = narrow ? 0.06 : 0.18;
  gsap.timeline({ scrollTrigger: { ...cityScrub } })
    .fromTo(
      cityCup.position,
      {
        x: cityHome.x + (narrow ? 0.08 : 0.32),
        y: cityHome.y - (narrow ? 0.04 : 0.1),
        z: cityHome.z + cityDepthIn,
      },
      { x: cityHome.x, y: cityHome.y + 0.04, z: cityHome.z, ease: "none", duration: 0.48 },
      0
    )
    .fromTo(
      cityCup.scale,
      {
        x: cityHome.s * (narrow ? 0.94 : 0.86),
        y: cityHome.s * (narrow ? 0.94 : 0.86),
        z: cityHome.s * (narrow ? 0.94 : 0.86),
      },
      { x: cityHome.s, y: cityHome.s, z: cityHome.s, ease: "none", duration: 0.48 },
      0
    )
    .fromTo(
      cityCup.rotation,
      {
        z: narrow ? -0.03 : -0.08,
        x: narrow ? 0.06 : 0.12,
        y: cityCupY - (narrow ? 0.05 : 0.12),
      },
      { z: narrow ? -0.01 : -0.03, x: narrow ? 0.03 : 0.05, y: cityCupY, ease: "none", duration: 0.48 },
      0
    )
    .to(
      cityCup.position,
      {
        x: cityHome.x + cityExitX,
        y: cityHome.y + cityExitY,
        z: cityHome.z - (narrow ? 0.12 : 0.35),
        ease: "none",
        duration: 0.52,
      },
      0.48
    )
    .to(
      cityCup.rotation,
      { y: cityCupY + (narrow ? 0.04 : 0.1), x: narrow ? 0.04 : 0.08, ease: "none", duration: 0.52 },
      0.48
    );

  if (!narrow) {
    gsap.to(beans.mesh.position, {
      y: 0.42,
      x: -0.12,
      scrollTrigger: { ...cityScrub },
      ease: "none",
    });
  }

  const stages = [hero, clock, city, favMotion.stage];
  const clockObj = new THREE.Clock();
  let frameId = 0;
  let running = true;
  let favInView = true;

  function tick() {
    if (!running) return;
    const t = clockObj.getElapsedTime();
    // Lerp pointer — never bind raw coords to transforms.
    pointer.x += (mouse.x - pointer.x) * 0.075;
    pointer.y += (mouse.y - pointer.y) * 0.075;
    const cupTiltX = pointer.x * DEG; // ±1°
    const cupTiltY = pointer.y * DEG;
    const bagTiltX = pointer.x * DEG * 1.55;
    const bagTiltY = pointer.y * DEG * 1.35;

    cup.position.set(
      cupPose.x,
      cupPose.y + idle.cupY + scrollFx.cupY,
      cupPose.z
    );
    cup.rotation.set(
      cupPose.rx - cupTiltY,
      cupPose.ry + cupTiltX,
      cupPose.rz + idle.cupZ
    );
    cup.scale.setScalar(cupPose.s);

    bag.position.set(
      bagPose.x,
      bagPose.y + idle.bagY + scrollFx.bagY,
      bagPose.z
    );
    bag.rotation.set(
      bagPose.rx - bagTiltY,
      bagPose.ry + bagTiltX,
      bagPose.rz + idle.bagZ
    );
    bag.scale.setScalar(bagPose.s);

    cardA.position.y = cardPose.aY + idle.bagY * 0.35 + scrollFx.bagY * 0.4;
    cardA.scale.setScalar(cardPose.aS);
    cardB.position.y = cardPose.bY + idle.bagY * 0.22 + scrollFx.bagY * 0.3;
    cardB.scale.setScalar(cardPose.bS);

    // Almost imperceptible camera drift + tiny pointer depth.
    hero.camera.position.x = hero.baseCam.x + idle.camX + pointer.x * 0.028;
    hero.camera.position.y = hero.baseCam.y + idle.camY - pointer.y * 0.02;
    hero.camera.position.z = hero.baseCam.z + scrollFx.camZ;
    hero.camera.lookAt(0.05, -0.05, 0);

    cupShadow.position.x = cup.position.x;
    bagShadow.position.x = bag.position.x + 0.08;

    if (city.visible) beans.update(t);
    if (favInView) favMotion.update(t);

    stages.forEach((stage) => {
      if (stage.visible) stage.render();
    });
    frameId = requestAnimationFrame(tick);
  }

  const visibility = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const stage = stages.find((item) => item.canvas === entry.target);
        if (stage) stage.visible = entry.isIntersecting;
        if (entry.target.classList?.contains("fav-preview")) {
          favInView = entry.isIntersecting;
          favMotion.stage.visible = entry.isIntersecting;
        }
      });
      running = (stages.some((stage) => stage.visible) || favInView) && !document.hidden;
      if (running) tick();
      else cancelAnimationFrame(frameId);
    },
    { rootMargin: "10% 0px", threshold: 0.01 }
  );
  [heroCanvas, clockCanvas, cityCanvas].forEach((el) => visibility.observe(el));
  const favPreview = document.querySelector(".fav-preview");
  if (favPreview) visibility.observe(favPreview);

  document.addEventListener("visibilitychange", () => {
    running = !document.hidden && (stages.some((stage) => stage.visible) || favInView);
    if (running) tick();
    else cancelAnimationFrame(frameId);
  });

  stages.forEach((stage) => { stage.visible = true; });
  tick();

  const frameHero = () => {
    const width = window.innerWidth;
    const isNarrow = width < 760;
    const isTablet = width >= 760 && width < 1100;
    if (isNarrow || isTablet) {
      heroTravelTweens.splice(0).forEach((tween) => {
        tween.scrollTrigger?.kill();
        tween.kill();
      });
      if (isNarrow) {
        Object.assign(cupPose, {
          x: -0.04, y: 0.2, z: 0.3, s: 1.28, ry: -1.05, rx: 0.02, rz: -0.01,
        });
        Object.assign(bagPose, {
          x: 0.34, y: 0.26, z: -0.36, s: 1.12, ry: 0.26, rx: 0.035, rz: 0.055,
        });
        hero.camera.fov = 36;
        hero.baseCam = { x: 0, y: -0.08, z: 5.95 };
      } else {
        Object.assign(cupPose, {
          x: -0.12, y: -0.02, z: 0.3, s: 1.3, ry: -0.98, rx: 0.02, rz: -0.01,
        });
        Object.assign(bagPose, {
          x: 0.42, y: 0.14, z: -0.44, s: 1.28, ry: 0.22, rx: 0.035, rz: 0.055,
        });
        hero.camera.fov = 36;
        hero.baseCam = { x: -0.06, y: 0.02, z: 5.75 };
      }
    } else {
      hero.camera.fov = 34;
      hero.baseCam = { x: -0.14, y: 0.03, z: 5.55 };
    }
    hero.camera.position.set(hero.baseCam.x, hero.baseCam.y, hero.baseCam.z);
    hero.camera.lookAt(0.05, -0.05, 0);
    hero.camera.updateProjectionMatrix();
    hero.fit();
  };

  const frameCity = () => {
    const width = window.innerWidth;
    const n = width < 760;
    const t = width >= 760 && width < 1100;
    city.camera.fov = n ? 36 : t ? 36 : 34;
    city.camera.position.z = n ? 6.8 : t ? 8.0 : 7.4;
    city.camera.position.x = n ? 0 : t ? 0.12 : 0.42;
    city.camera.lookAt(n ? 0 : 0.18, n ? -0.2 : -0.32, 0);
    city.camera.updateProjectionMatrix();
    city.fit();
  };

  frameHero();
  frameCity();
  window.addEventListener("resize", () => {
    frameHero();
    frameCity();
    favMotion.resize();
  });
  window.addEventListener("load", () => ScrollTrigger.refresh());
}

function setupFavorites({ canvas, mats, segments, lowPower }) {
  const favSeg = Math.max(20, Math.floor(segments * 0.85));
  const favNarrow = window.innerWidth < 760;
  const stage = createStage(canvas, {
    fov: favNarrow ? 36 : 34,
    z: favNarrow ? 5.35 : 5.0,
    lowPower,
  });
  stage.baseCamZ = favNarrow ? 4.9 : 5.0;

  // Composed still-lifes only — never exploded / disconnected geometry.
  // Roll uses premium DOM still-life (QUALITY > forced 3D). Drinks stay in WebGL.
  const products = {
    cappuccino: makeEspressoShot(mats, favSeg),
    latte: makeCup(mats, favSeg, { sleeve: true, lidTone: "cream" }),
    matcha: makeIcedDrink(mats, favSeg, { flavor: "matcha" }),
  };
  const layout = {
    cappuccino: { scale: favNarrow ? 1.18 : 1.28, y: favNarrow ? -0.02 : -0.08, ry: -0.28, rz: 0.02, rotX: favNarrow ? 0.04 : 0.08 },
    latte: { scale: favNarrow ? 1.1 : 1.18, y: favNarrow ? 0 : -0.06, ry: -0.26, rz: 0.02, rotX: favNarrow ? 0.04 : 0.08 },
    matcha: { scale: favNarrow ? 1.16 : 1.26, y: favNarrow ? 0.02 : -0.02, ry: -0.2, rz: -0.03, rotX: favNarrow ? 0.03 : 0.06 },
  };

  const root = new THREE.Group();
  Object.entries(products).forEach(([key, mesh]) => {
    const settle = layout[key];
    mesh.userData.kind = key;
    mesh.userData.settle = settle;
    mesh.visible = key === "cappuccino";
    mesh.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material = child.material.clone();
        child.material.transparent = true;
        child.material.opacity = key === "cappuccino" ? 1 : 0;
        child.material.depthWrite = key === "cappuccino";
      }
    });
    const s = settle.scale;
    mesh.scale.setScalar(s);
    mesh.position.set(0, settle.y, 0);
    mesh.rotation.set(settle.rotX, settle.ry, settle.rz);
    root.add(mesh);
  });
  stage.scene.add(warmLights(favNarrow ? 1.02 : 1.12), root, floorShadow(0, favNarrow ? -0.95 : -1.08));
  stage.camera.position.set(0, favNarrow ? 0.08 : 0.15, favNarrow ? 4.9 : 4.6);
  stage.baseCamZ = favNarrow ? 4.9 : 4.6;

  let active = "cappuccino";
  let switchTween = null;
  const tilt = { x: 0, y: 0 };
  const reveal = { ...layout.cappuccino, scale: layout.cappuccino.scale, z: 0 };

  const setOpacity = (mesh, opacity) => {
    mesh.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material.opacity = opacity;
        child.material.depthWrite = opacity > 0.62;
        child.material.needsUpdate = true;
      }
    });
  };

  const syncDomFallback = (kind) => {
    const preview = canvas.closest(".fav-preview");
    preview?.classList.toggle("is-dom-product", kind === "roll");
    document.querySelectorAll(".fav-fallbacks .fallback-shot").forEach((shot) => {
      shot.classList.toggle("is-active", shot.dataset.product === kind);
    });
  };

  const hideAllMeshes = () => {
    Object.values(products).forEach((mesh) => {
      mesh.visible = false;
      setOpacity(mesh, 0);
    });
  };

  const setProduct = (kind) => {
    if (kind === active) return;
    if (switchTween) switchTween.kill();
    syncDomFallback(kind);

    // DOM still-life for pastry — avoid broken torus 3D.
    if (kind === "roll") {
      const prev = products[active];
      if (prev) {
        gsap.to({ t: 1 }, {
          t: 0,
          duration: 0.28,
          ease: "power2.out",
          onUpdate() {
            /* opacity handled by CSS transition on DOM */
          },
          onComplete: hideAllMeshes,
        });
      } else {
        hideAllMeshes();
      }
      active = kind;
      return;
    }

    if (!products[kind]) return;
    const next = products[kind];
    const settle = layout[kind];
    const prev = products[active];
    const prevSettle = layout[active] || settle;

    hideAllMeshes();
    next.visible = true;
    setOpacity(next, 0);
    next.scale.setScalar(settle.scale * 0.96);
    next.rotation.set(settle.rotX, settle.ry, settle.rz);
    next.position.set(0, settle.y + 0.08, 0);

    const state = { out: prev ? 1 : 0, inn: 0 };
    if (prev && prev !== next) {
      prev.visible = true;
      setOpacity(prev, 1);
    }
    switchTween = gsap.to(state, {
      out: 0,
      inn: 1,
      duration: 0.36,
      ease: "power2.out",
      onUpdate: () => {
        if (prev && prev !== next) {
          setOpacity(prev, state.out);
          prev.scale.setScalar(prevSettle.scale * (0.96 + 0.04 * state.out));
          prev.position.y = prevSettle.y + 0.08 * (1 - state.out);
        }
        setOpacity(next, state.inn);
        next.scale.setScalar(settle.scale * (0.96 + 0.04 * state.inn));
        next.position.y = settle.y + 0.08 * (1 - state.inn);
      },
      onComplete: () => {
        if (prev && prev !== next) {
          prev.visible = false;
          setOpacity(prev, 0);
        }
        setOpacity(next, 1);
        next.scale.setScalar(settle.scale);
        next.position.set(0, settle.y, 0);
        next.rotation.set(settle.rotX, settle.ry, settle.rz);
        active = kind;
        Object.assign(reveal, settle, { z: 0 });
      },
    });
  };

  window.BrewnnsFavorites = {
    setProduct,
    wireTimeline(timeline) {
      if (!timeline) throw new Error("Favorites DOM timeline is required for 3D wiring.");
      const settle = layout.cappuccino;
      const depth = window.innerWidth < 760 ? 0.45 : 1;
      timeline.fromTo(
        reveal,
        {
          y: settle.y - 0.32 * depth,
          z: -0.1 * depth,
          scale: settle.scale * (0.9 + 0.06 * (1 - depth)),
          rotX: 0.28 * depth,
          ry: settle.ry - 0.28 * depth,
          rz: -0.06 * depth,
        },
        {
          y: settle.y,
          z: 0,
          scale: settle.scale,
          rotX: settle.rotX,
          ry: settle.ry,
          rz: settle.rz,
          ease: "none",
          duration: 0.4,
        },
        0.1
      );
    },
  };

  const preview = canvas.closest(".fav-preview");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (preview && finePointer) {
    preview.addEventListener("pointermove", (event) => {
      const box = preview.getBoundingClientRect();
      tilt.y = ((event.clientX - box.left) / box.width - 0.5) * 0.35;
      tilt.x = ((event.clientY - box.top) / box.height - 0.5) * -0.25;
    });
    preview.addEventListener("pointerleave", () => {
      tilt.x = 0;
      tilt.y = 0;
    });
  }

  return {
    stage,
    resize() {
      stage.fit();
    },
    update(time) {
      if (active === "roll") return;
      const mesh = products[active];
      if (!mesh || !mesh.visible) return;
      const settle = layout[active];
      // Tiny idle only — no spinning product.
      const bob = Math.sin(time * 0.7) * 0.01;
      mesh.position.set(0, reveal.y + bob, reveal.z);
      mesh.scale.setScalar(reveal.scale);
      mesh.rotation.set(
        reveal.rotX + tilt.x * 0.55,
        reveal.ry + tilt.y * 0.55,
        reveal.rz
      );
      const pop = THREE.MathUtils.clamp(
        (reveal.scale - settle.scale * 0.84) / (settle.scale * 0.2),
        0,
        1
      );
      stage.camera.position.z = stage.baseCamZ + (1 - pop) * 0.55;
      stage.camera.position.y = 0.12 + (1 - pop) * -0.08;
      stage.camera.lookAt(0, reveal.y * 0.2, 0);
    },
  };
}

function createStage(canvas, { fov, z, lowPower }) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 40);
  camera.position.set(0, 0, z);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: !lowPower,
    powerPreference: lowPower ? "low-power" : "high-performance",
  });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;
  renderer.shadowMap.enabled = false;

  const fit = () => {
    const width = canvas.clientWidth || canvas.parentElement?.clientWidth || 1;
    const height = canvas.clientHeight || canvas.parentElement?.clientHeight || 1;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const dpr = capDpr(width, lowPower);
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
  };
  fit();
  new ResizeObserver(fit).observe(canvas.parentElement || canvas);

  return {
    canvas,
    scene,
    camera,
    renderer,
    visible: true,
    fit,
    render() {
      renderer.render(scene, camera);
    },
  };
}

function capDpr(width, lowPower) {
  const dpr = window.devicePixelRatio || 1;
  if (width < 760) return Math.min(dpr, 1.25);
  if (width < 1100 || lowPower) return Math.min(dpr, 1.5);
  return Math.min(dpr, 2);
}

function sharedMaterials() {
  return {
    paper: new THREE.MeshStandardMaterial({ color: 0xf3eee6, roughness: 0.64, metalness: 0.03 }),
    wall: new THREE.MeshStandardMaterial({ color: 0xf6f3ee, roughness: 0.76, metalness: 0.02 }),
    inner: new THREE.MeshStandardMaterial({ color: 0xe7e1d6, side: THREE.BackSide, roughness: 0.86 }),
    black: new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.34, metalness: 0.18 }),
    cream: new THREE.MeshStandardMaterial({ color: 0xf4f1ec, roughness: 0.48, metalness: 0.02 }),
    coffee: new THREE.MeshStandardMaterial({ color: 0x2a1608, roughness: 0.36, metalness: 0.04 }),
    crema: new THREE.MeshStandardMaterial({ color: 0xc9a06a, roughness: 0.5 }),
    matcha: new THREE.MeshStandardMaterial({ color: 0x86c96f, roughness: 0.36 }),
    latte: new THREE.MeshStandardMaterial({ color: 0xc49a68, roughness: 0.36 }),
    dough: new THREE.MeshStandardMaterial({ color: 0xf3d7a6, roughness: 0.58 }),
    spice: new THREE.MeshStandardMaterial({ color: 0xb87333, roughness: 0.72 }),
    ice: new THREE.MeshStandardMaterial({ color: 0xf7f4ef, roughness: 0.18, transparent: true, opacity: 0.84 }),
    sleeve: new THREE.MeshStandardMaterial({
      map: sleeveTexture(),
      roughness: 0.82,
      metalness: 0,
      transparent: true,
      depthWrite: false,
    }),
    bagArt: new THREE.MeshStandardMaterial({ map: bagTexture(), roughness: 0.7 }),
  };
}

function warmLights(intensity = 1) {
  const group = new THREE.Group();
  group.add(new THREE.AmbientLight(0xffe6c8, 0.4 * intensity));
  const key = new THREE.DirectionalLight(0xffd7a8, 1.28 * intensity);
  key.position.set(3.0, 4.0, 3.4);
  const fill = new THREE.DirectionalLight(0xc8d4e8, 0.24 * intensity);
  fill.position.set(-3.2, 0.5, 2.0);
  const rim = new THREE.PointLight(0xffb978, 1.15 * intensity, 12);
  rim.position.set(0.35, 1.7, -2.2);
  group.add(key, fill, rim);
  return group;
}

function makeHeroLights(intensity = 1) {
  const group = new THREE.Group();
  group.add(new THREE.AmbientLight(0xffe2c0, 0.32 * intensity));
  const key = new THREE.DirectionalLight(0xffd4a0, 1.42 * intensity);
  key.position.set(2.6, 3.8, 3.2);
  const fill = new THREE.DirectionalLight(0xb8c4d8, 0.28 * intensity);
  fill.position.set(-3.4, 0.8, 2.4);
  const rim = new THREE.DirectionalLight(0xffc08a, 0.72 * intensity);
  rim.position.set(1.8, 2.2, -2.6);
  const kick = new THREE.PointLight(0xffb070, 0.55 * intensity, 10);
  kick.position.set(-0.2, 0.6, 1.8);
  const sweep = new THREE.PointLight(0xffe0b8, 0, 8);
  sweep.position.set(0.85, 1.1, -0.15);
  group.add(key, fill, rim, kick, sweep);
  return { group, sweep, key, fill, rim };
}

function cityLights() {
  const group = new THREE.Group();
  // Readable silhouette: warm rim + restrained front fill (still cinematic, not bright).
  group.add(new THREE.AmbientLight(0x2e241c, 0.55));
  const key = new THREE.DirectionalLight(0xffd8ae, 1.45);
  key.position.set(2.8, 4.2, 3.2);
  const fill = new THREE.DirectionalLight(0x8a7358, 0.42);
  fill.position.set(-2.4, 1.4, 2.6);
  const rim = new THREE.DirectionalLight(0xffc48a, 0.85);
  rim.position.set(2.6, 2.8, -2.8);
  const kick = new THREE.PointLight(0xffb070, 0.7, 10);
  kick.position.set(1.1, 0.4, 1.6);
  group.add(key, fill, rim, kick);
  return group;
}

function makeCup(mats, segments, { sleeve = false, lidTone = "black" } = {}) {
  const group = new THREE.Group();
  const lidMat = lidTone === "cream" ? mats.cream : mats.black;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.64, 0.5, 1.92, segments, 1, true), mats.wall);
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.48, 1.88, segments, 1, true), mats.inner);
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.5, segments), mats.paper);
  bottom.rotation.x = Math.PI / 2;
  bottom.position.y = -0.96;
  const lip = new THREE.Mesh(new THREE.TorusGeometry(0.64, 0.028, 8, segments), mats.wall);
  lip.rotation.x = Math.PI / 2;
  lip.position.y = 0.94;
  group.add(body, inner, bottom, lip);
  if (sleeve) {
    const label = new THREE.Mesh(
      new THREE.CylinderGeometry(0.648, 0.508, 1.2, segments, 1, true),
      mats.sleeve
    );
    label.position.y = -0.08;
    group.add(label);
  }
  const lidSkirt = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.7, 0.07, segments), lidMat);
  lidSkirt.position.y = 1.02;
  const lidDeck = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.05, segments), lidMat);
  lidDeck.position.y = 1.07;
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.58, Math.max(14, Math.floor(segments / 2)), 10, 0, Math.PI * 2, 0, Math.PI * 0.42),
    lidMat
  );
  dome.scale.y = 0.22;
  dome.position.y = 1.08;
  const sip = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.045, 10), lidMat);
  sip.position.set(0.16, 1.16, 0.2);
  group.add(lidSkirt, lidDeck, dome, sip);
  return group;
}

function makeBag(mats) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.45, 2.05, 0.38), mats.cream);
  const fold = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.32, 0.22), mats.cream);
  fold.position.set(0, 1.12, 0.04);
  fold.rotation.x = -0.22;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1.32, 1.78), mats.bagArt);
  face.position.z = 0.2;
  group.add(body, fold, face);
  return group;
}

function makePackCard(mats, scale = 1) {
  const group = new THREE.Group();
  const card = new THREE.Mesh(
    new THREE.BoxGeometry(1.05 * scale, 1.45 * scale, 0.06),
    mats.paper
  );
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(1.05 * scale, 0.12 * scale, 0.07),
    mats.black
  );
  stripe.position.y = 0.42 * scale;
  group.add(card, stripe);
  group.scale.setScalar(0.92);
  return group;
}

function makeEspressoShot(mats, segments) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.5, 1.05, segments, 1, true), mats.paper);
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.48, 1.02, segments, 1, true), mats.inner);
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.5, segments), mats.paper);
  bottom.rotation.x = Math.PI / 2;
  bottom.position.y = -0.52;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.03, 8, segments), mats.paper);
  rim.position.y = 0.52;
  rim.rotation.x = Math.PI / 2;
  const coffee = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.2, segments), mats.coffee);
  coffee.position.y = 0.38;
  const crema = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.07, segments), mats.crema);
  crema.position.y = 0.5;
  group.add(body, inner, bottom, rim, coffee, crema);
  return group;
}

function makeCinnamonRoll(mats) {
  // Compact pastry-only mesh (used inside still life).
  const group = new THREE.Group();
  const dough = new THREE.MeshStandardMaterial({
    map: cinnamonTexture(),
    roughness: 0.72,
    metalness: 0.02,
  });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.5, 0.28, 28), dough);
  body.position.y = 0.05;
  const crown = new THREE.Mesh(
    new THREE.SphereGeometry(0.46, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.48),
    dough
  );
  crown.position.y = 0.16;
  crown.scale.set(1, 0.48, 1);
  const glaze = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 12, 10),
    new THREE.MeshStandardMaterial({
      color: 0xfff6ea,
      roughness: 0.28,
      transparent: true,
      opacity: 0.9,
    })
  );
  glaze.position.set(0.06, 0.28, 0.08);
  glaze.scale.set(1.35, 0.32, 1.1);
  group.add(body, crown, glaze);
  return group;
}

function makePastryStillLife(mats, segments) {
  // Premium composed presentation: plate + cinnamon roll + companion cup.
  const group = new THREE.Group();
  const plate = new THREE.Mesh(
    new THREE.CylinderGeometry(0.92, 0.95, 0.055, 32),
    mats.cream
  );
  plate.position.set(0.22, -0.42, 0.05);

  const pastry = makeCinnamonRoll(mats);
  pastry.position.set(0.22, -0.26, 0.05);
  pastry.rotation.y = 0.35;

  const cup = makeEspressoShot(mats, Math.max(16, Math.floor(segments * 0.75)));
  cup.scale.setScalar(0.62);
  cup.position.set(-0.72, -0.18, -0.08);
  cup.rotation.set(0.04, 0.35, -0.03);

  const saucer = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.44, 0.04, 24),
    mats.paper
  );
  saucer.position.set(-0.72, -0.48, -0.08);

  group.add(plate, pastry, saucer, cup);
  return group;
}

function cinnamonTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Cinnamon texture context failed.");
  const g = ctx.createRadialGradient(128, 128, 8, 128, 128, 128);
  g.addColorStop(0, "#f3d7a8");
  g.addColorStop(0.35, "#c48a4a");
  g.addColorStop(0.55, "#f0d2a0");
  g.addColorStop(0.75, "#8a5528");
  g.addColorStop(1, "#d4a066");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = "rgba(90, 48, 18, 0.45)";
  ctx.lineWidth = 7;
  ctx.beginPath();
  for (let a = 0; a < Math.PI * 6; a += 0.08) {
    const r = 18 + a * 14;
    const x = 128 + Math.cos(a) * r * 0.35;
    const y = 128 + Math.sin(a) * r * 0.35;
    if (a === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 2;
  return texture;
}

function makeIcedDrink(mats, segments, { flavor = "coffee" } = {}) {
  const group = new THREE.Group();
  const matcha = flavor === "matcha";
  const shell = new THREE.Mesh(
    new THREE.CylinderGeometry(0.58, 0.5, 1.55, segments, 1, true),
    new THREE.MeshStandardMaterial({
      color: matcha ? 0xd8f0c8 : 0xf2ebe0,
      roughness: 0.28,
      metalness: 0.04,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
    })
  );
  const liquid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.44, 1.35, segments),
    matcha ? mats.matcha : mats.latte
  );
  liquid.position.y = -0.04;
  const lid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.58, 0.08, segments),
    mats.cream
  );
  lid.position.y = 0.78;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.028, 8, segments), mats.cream);
  rim.position.y = 0.74;
  rim.rotation.x = Math.PI / 2;
  const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.22, 10), mats.black);
  straw.position.set(0.14, 1.2, 0.04);
  straw.rotation.z = -0.14;
  [
    [0.1, 0.48, 0.08],
    [-0.12, 0.42, 0.06],
    [0.02, 0.56, -0.08],
    [-0.04, 0.36, -0.1],
  ].forEach(([x, y, z], index) => {
    const cube = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.13, 0.15), mats.ice);
    cube.position.set(x, y, z);
    cube.rotation.set(0.35 + index * 0.2, 0.4, 0.18);
    group.add(cube);
  });
  group.add(shell, liquid, lid, rim, straw);
  return group;
}

function makeBeans(count, anchor = { x: 1.2, y: -0.7 }) {
  const geometry = new THREE.SphereGeometry(0.09, 8, 6);
  geometry.scale(1, 0.62, 0.82);
  const material = new THREE.MeshStandardMaterial({ color: 0x3a2416, roughness: 0.84, metalness: 0.03 });
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  const dummy = new THREE.Object3D();
  const seeds = [];
  for (let i = 0; i < count; i += 1) {
    const layer = i % 3;
    seeds.push({
      x: anchor.x + (Math.random() - 0.5) * (layer === 0 ? 2.6 : 1.6),
      y: anchor.y + (Math.random() - 0.5) * (layer === 0 ? 1.8 : 1.1),
      z: (layer - 1) * 0.45 + (Math.random() - 0.5) * 0.28,
      s: 0.45 + Math.random() * 0.35,
      spin: Math.random() * Math.PI,
      speed: 0.1 + Math.random() * 0.14,
      drift: 0.04 + Math.random() * 0.06,
    });
  }
  return {
    mesh,
    update(time) {
      seeds.forEach((seed, index) => {
        dummy.position.set(
          seed.x,
          seed.y + Math.sin(time * seed.speed + seed.spin) * seed.drift,
          seed.z
        );
        dummy.rotation.set(seed.spin + time * 0.08, time * seed.speed * 0.5, seed.spin);
        dummy.scale.setScalar(seed.s);
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

function floorShadow(x, y, size = 2.1) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Shadow texture context failed.");
  const gradient = ctx.createRadialGradient(32, 32, 4, 32, 32, 32);
  gradient.addColorStop(0, "rgba(0,0,0,0.42)");
  gradient.addColorStop(0.45, "rgba(0,0,0,0.18)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size * 0.72),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, 0.02);
  return mesh;
}

function sleeveTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Sleeve texture context failed.");
  ctx.clearRect(0, 0, 512, 256);
  ctx.fillStyle = "#161616";
  ctx.textAlign = "center";
  ctx.font = "700 64px 'Bebas Neue', sans-serif";
  ctx.fillText("brewnns", 256, 128);
  ctx.font = "500 14px 'DM Sans', sans-serif";
  ctx.fillText("COFFEE HOUSE", 256, 154);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 2;
  texture.offset.x = 0.25;
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

function bagTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 720;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Bag texture context failed.");
  ctx.fillStyle = "#f7f4ef";
  ctx.fillRect(0, 0, 512, 720);
  ctx.fillStyle = "#111";
  ctx.textAlign = "center";
  ctx.font = "700 58px 'Bebas Neue', sans-serif";
  ctx.fillText("brewnns", 256, 180);
  ctx.font = "500 16px 'DM Sans', sans-serif";
  ctx.fillText("COFFEE HOUSE", 256, 214);
  ctx.font = "italic 110px 'Cormorant Garamond', serif";
  ctx.fillText("slow roast", 256, 348);
  ctx.font = "400 18px 'DM Sans', sans-serif";
  ctx.fillStyle = "#555";
  ctx.fillText("citrus · brown sugar · almond", 256, 450);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
