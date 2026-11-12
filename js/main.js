/* Navegação com melhoria progressiva: sem JS, todos os links permanecem visíveis. */
(() => {
  "use strict";

  const menuButton = document.querySelector(".menu-toggle");
  const menu = document.querySelector("#menu-principal");
  const desktop = window.matchMedia("(min-width: 900px)");

  if (menuButton && menu) {
    const setMenuOpen = (open) => {
      menuButton.setAttribute("aria-expanded", String(open));
      menuButton.querySelector(".menu-toggle-label").textContent = open ? "Fechar menu" : "Abrir menu";
      menu.hidden = !desktop.matches && !open;
    };

    const syncViewport = () => {
      const focusWasInMenu = menu.contains(document.activeElement);
      const focusWasOnButton = document.activeElement === menuButton;
      menuButton.hidden = desktop.matches;
      setMenuOpen(false);
      if (!desktop.matches && focusWasInMenu) menuButton.focus();
      if (desktop.matches && focusWasOnButton) menu.querySelector("a").focus();
    };

    menuButton.addEventListener("click", () => {
      setMenuOpen(menuButton.getAttribute("aria-expanded") !== "true");
    });

    menu.addEventListener("click", (event) => {
      if (!desktop.matches && event.target.closest("a")) {
        setMenuOpen(false);
        menuButton.focus({ preventScroll: true });
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !desktop.matches && menuButton.getAttribute("aria-expanded") === "true") {
        setMenuOpen(false);
        menuButton.focus();
      }
    });

    document.addEventListener("click", (event) => {
      if (!desktop.matches && !menu.hidden && !event.target.closest(".header-inner")) {
        const focusWasInMenu = menu.contains(document.activeElement);
        setMenuOpen(false);
        if (focusWasInMenu) menuButton.focus({ preventScroll: true });
      }
    });

    desktop.addEventListener("change", syncViewport);
    syncViewport();
    menuButton.closest(".site-header").classList.add("navigation-ready");
  }

  const year = document.querySelector("#ano-atual");
  if (year) year.textContent = new Date().getFullYear();
})();

/* Leque: abertura, oscilação, mouse e seleção usam camadas de transformação independentes. */
(() => {
  "use strict";

  const hero = document.querySelector(".hero");
  const art = hero?.querySelector(".hero-art");
  const composition = art?.querySelector(".color-composition");
  if (!hero || !art || !composition) return;
  const visual = art.closest(".hero-visual") || art;
  const sheets = Array.from(art.querySelectorAll(".fan-sheet"));
  const ambient = composition.querySelector(".fan-ambient");
  const bladeMotions = sheets.map((sheet) => sheet.closest(".fan-blade-motion"));
  const selection = visual.querySelector(".fan-selection");
  const selectionName = visual.querySelector(".fan-selection-name");
  const selectionHex = visual.querySelector(".fan-selection-hex");
  const previewCurrent = visual.querySelector(".fan-preview-current");
  const previewNext = visual.querySelector(".fan-preview-next");
  const backgroundCurrent = art.querySelector(".fan-background-current");
  const backgroundNext = art.querySelector(".fan-background-next");
  const presentationReady = Boolean(selectionName && selectionHex && previewCurrent && previewNext && backgroundCurrent && backgroundNext);
  const interactiveFan = sheets.length > 0 && Boolean(selection);
  const lastBlade = sheets[sheets.length - 1]?.closest(".fan-blade");

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const hoverPointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  let heroVisible = true;
  let artVisible = false;
  let printing = false;
  let frame = 0;
  let pointerX = 0;
  let pointerY = 0;
  let currentTiltX = 0;
  let currentTiltY = 0;
  let phase = 0;
  let motionGain = 0;
  let previousTime = null;
  let settings;
  let hovering = false;
  let focusWithin = false;
  let openingStarted = false;
  let openingDone = false;
  let openingTimer = 0;
  let presentationFrame = 0;
  let presentationTimer = 0;
  let selectedColor = "";
  let selectedTint = "";

  // Lidos apenas na inicialização e no resize; o loop não consulta estilos/layout.
  const readMotionSettings = () => {
    const style = window.getComputedStyle(art);
    const number = (name, fallback) => {
      const value = Number.parseFloat(style.getPropertyValue(name));
      return Number.isFinite(value) ? value : fallback;
    };
    const time = (name, fallback) => {
      const configured = style.getPropertyValue(name).trim();
      const value = number(name, fallback / 1000);
      return Math.max(1, value * (configured.endsWith("ms") ? 1 : 1000));
    };
    settings = {
      duration: time("--fan-duration", 8000),
      swayX: Math.min(4, Math.max(0, number("--fan-sway-x", 3.2))),
      swayY: Math.min(4, Math.max(0, number("--fan-sway-y", 3.8))),
      spread: number("--fan-spread", 2.4),
      waveAngle: number("--fan-wave-angle", .65),
      waveDepth: number("--fan-wave-depth", .9),
      waveShift: number("--fan-wave-shift", .55),
      waveDelay: time("--fan-wave-delay", 280),
      interactionIntensity: Math.min(1, Math.max(0, number("--fan-interaction-intensity", .22))),
      settleTime: time("--fan-settle-time", 650),
      pointerResponse: time("--fan-pointer-response", 180),
      tiltLimit: Math.min(4, Math.max(0, number("--hero-tilt-limit", 3)))
    };
  };
  readMotionSettings();
  sheets.forEach((sheet, index) => {
    const direction = (index - (sheets.length - 1) / 2) / Math.max(1, (sheets.length - 1) / 2);
    sheet.closest(".fan-blade").style.setProperty("--fan-part-direction", direction.toFixed(3));
  });

  const finishPresentation = () => {
    window.cancelAnimationFrame(presentationFrame);
    window.clearTimeout(presentationTimer);
    presentationFrame = presentationTimer = 0;
    visual.classList.remove("is-changing");
    if (!presentationReady) return;
    if (selectedColor) previewCurrent.style.backgroundColor = selectedColor;
    if (selectedTint) backgroundCurrent.style.backgroundColor = selectedTint;
    previewNext.hidden = backgroundNext.hidden = true;
  };

  const showPresentation = (sheet) => {
    // O terceiro tom já existente representa a família; não duplica ou altera a paleta.
    const hex = window.getComputedStyle(sheet).getPropertyValue("--tone-3").trim();
    finishPresentation();
    if (!presentationReady || !/^#[\da-f]{6}$/i.test(hex)) {
      selectedColor = selectedTint = "";
      if (previewCurrent) previewCurrent.style.backgroundColor = "#dce7ee";
      if (backgroundCurrent) backgroundCurrent.style.backgroundColor = "#edf2f5";
      if (selectionName && selectionHex) {
        selectionName.textContent = sheet.dataset.fanName;
        selectionHex.textContent = "Amostra ilustrativa";
      } else {
        selection.textContent = "Cor: " + sheet.dataset.fanName;
      }
      return;
    }
    selectedColor = hex.toUpperCase();
    const channels = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
    selectedTint = "rgb(" + channels.map((channel) => Math.round(255 * .30 + channel * .70)).join(", ") + ")";
    selectionName.textContent = sheet.dataset.fanName;
    selectionHex.textContent = selectedColor;
    if (reducedMotion.matches || printing || document.hidden || !window.CSS?.supports("clip-path", "circle(145% at 18% 80%)")) {
      finishPresentation();
      return;
    }
    previewNext.style.backgroundColor = selectedColor;
    backgroundNext.style.backgroundColor = selectedTint;
    previewNext.hidden = backgroundNext.hidden = false;
    presentationFrame = window.requestAnimationFrame(() => {
      presentationFrame = window.requestAnimationFrame(() => {
        presentationFrame = 0;
        visual.classList.add("is-changing");
      });
    });
    presentationTimer = window.setTimeout(finishPresentation, 900);
  };

  const finishOpening = () => {
    if (openingDone) return;
    openingDone = true;
    window.clearTimeout(openingTimer);
    openingTimer = 0;
    art.classList.add("is-fan-open");
  };

  const canAnimate = () => interactiveFan && ambient && openingDone && heroVisible && artVisible && !document.hidden && !printing && !reducedMotion.matches;
  const canTilt = () => canAnimate() && hovering && !focusWithin && hoverPointer.matches;
  const resetTilt = () => {
    pointerX = pointerY = 0;
    if (!canAnimate()) {
      currentTiltX = currentTiltY = 0;
      composition.style.setProperty("--hero-rotate-x", "0deg");
      composition.style.setProperty("--hero-rotate-y", "0deg");
    }
  };
  const clearAmbient = () => {
    motionGain = 0;
    ambient?.style.setProperty("--fan-ambient-x", "0deg");
    ambient?.style.setProperty("--fan-ambient-y", "0deg");
    bladeMotions.forEach((motion) => {
      motion?.style.setProperty("--fan-wave-rotation", "0deg");
      motion?.style.setProperty("--fan-wave-y", "0px");
      motion?.style.setProperty("--fan-wave-z", "0px");
    });
  };

  const animate = (timestamp) => {
    frame = 0;
    if (!canAnimate()) { previousTime = null; return; }
    const delta = previousTime === null ? 0 : Math.min(64, Math.max(0, timestamp - previousTime));
    previousTime = timestamp;
    const turn = Math.PI * 2;
    phase = (phase + delta / settings.duration * turn) % turn;
    // Amortecimento exponencial: mantém a fase e reduz a força sem congelar as peças.
    const targetGain = (hovering || focusWithin) ? settings.interactionIntensity : 1;
    motionGain += (targetGain - motionGain) * (1 - Math.exp(-delta / settings.settleTime));
    const swayX = (Math.sin(phase) * .86 + Math.sin(phase * 2) * .14) * settings.swayX;
    const swayY = (Math.sin(phase + .9) * .82 + Math.sin(phase * 2 + .35) * .18) * settings.swayY;
    ambient.style.setProperty("--fan-ambient-x", `${(swayX * motionGain).toFixed(3)}deg`);
    ambient.style.setProperty("--fan-ambient-y", `${(swayY * motionGain).toFixed(3)}deg`);
    const spread = (Math.sin(phase - .45) * .85 + Math.sin(phase * 2) * .15) * settings.spread;
    bladeMotions.forEach((motion, index) => {
      if (!motion) return;
      const direction = (index - (sheets.length - 1) / 2) / Math.max(1, (sheets.length - 1) / 2);
      const wave = phase - index * settings.waveDelay / settings.duration * turn;
      motion.style.setProperty("--fan-wave-rotation", `${((spread * direction + Math.sin(wave) * settings.waveAngle) * motionGain).toFixed(3)}deg`);
      motion.style.setProperty("--fan-wave-y", `${(Math.sin(wave - .6) * settings.waveShift * motionGain).toFixed(3)}px`);
      motion.style.setProperty("--fan-wave-z", `${(Math.sin(wave + .4) * settings.waveDepth * motionGain).toFixed(3)}px`);
    });
    const follow = 1 - Math.exp(-delta / settings.pointerResponse);
    const targetX = canTilt() ? -pointerY * settings.tiltLimit : 0;
    const targetY = canTilt() ? pointerX * settings.tiltLimit : 0;
    currentTiltX += (targetX - currentTiltX) * follow;
    currentTiltY += (targetY - currentTiltY) * follow;
    composition.style.setProperty("--hero-rotate-x", `${currentTiltX.toFixed(3)}deg`);
    composition.style.setProperty("--hero-rotate-y", `${currentTiltY.toFixed(3)}deg`);
    frame = window.requestAnimationFrame(animate);
  };

  const syncMotion = () => {
    const stopped = document.hidden || reducedMotion.matches || printing;
    if (stopped) finishPresentation();
    if (reducedMotion.matches || printing || (openingStarted && (!artVisible || document.hidden))) finishOpening();
    if (interactiveFan && artVisible && !stopped && !openingDone && !openingStarted) {
      openingStarted = true;
      const configured = window.getComputedStyle(art).getPropertyValue("--fan-open-time").trim();
      const value = Number.parseFloat(configured);
      const duration = Number.isFinite(value) && value >= 0 ? value * (configured.endsWith("ms") ? 1 : 1000) : 1500;
      // Segurança se animationend não chegar; o relógio só começa com a arte visível.
      openingTimer = window.setTimeout(() => { finishOpening(); syncMotion(); }, duration + 200);
    }
    hero.classList.toggle("is-motion-paused", stopped || !heroVisible);
    art.classList.toggle("is-motion-paused", stopped || !heroVisible || !artVisible);
    if (canAnimate()) {
      if (!frame) frame = window.requestAnimationFrame(animate);
    } else {
      window.cancelAnimationFrame(frame);
      frame = 0;
      previousTime = null; // Retoma a fase existente, sem acumular tempo fora da tela.
      if (reducedMotion.matches || printing) clearAmbient();
    }
    if (!canTilt()) resetTilt();
  };

  const refreshInteraction = () => {
    hovering = !document.hidden && hoverPointer.matches && art.matches(":hover");
    focusWithin = art.contains(document.activeElement) && document.activeElement.matches(":focus-visible");
    syncMotion();
  };

  const trackPointer = (event) => {
    if (event.pointerType !== "mouse" || !hoverPointer.matches || document.hidden) return;
    hovering = true;
    focusWithin = false;
    const bounds = art.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    pointerX = Math.min(1, Math.max(-1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
    pointerY = Math.min(1, Math.max(-1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
  };
  const leaveArt = () => { hovering = false; resetTilt(); syncMotion(); };
  art.addEventListener("pointerenter", (event) => { trackPointer(event); syncMotion(); }, { passive: true });
  art.addEventListener("pointermove", trackPointer, { passive: true });
  art.addEventListener("pointerleave", leaveArt);
  art.addEventListener("pointercancel", leaveArt);
  window.addEventListener("blur", leaveArt);
  if (interactiveFan) {
    sheets.forEach((sheet) => {
      sheet.addEventListener("click", () => {
        finishOpening();
        sheets.forEach((item) => {
          const selected = item === sheet;
          item.setAttribute("aria-pressed", String(selected));
          item.closest(".fan-blade").classList.toggle("is-selected", selected);
        });
        showPresentation(sheet);
        syncMotion();
      });
    });
    art.addEventListener("focusin", (event) => {
      if (!sheets.includes(event.target)) return;
      focusWithin = event.target.matches(":focus-visible");
      finishOpening();
      syncMotion();
    });
    art.addEventListener("focusout", (event) => {
      focusWithin = art.contains(event.relatedTarget) && event.relatedTarget.matches(":focus-visible");
      syncMotion();
    });
    art.addEventListener("animationend", (event) => {
      if (event.target !== lastBlade || event.animationName !== "fan-blade-open") return;
      finishOpening();
      syncMotion();
    });
    backgroundNext?.addEventListener("animationend", (event) => {
      if (event.target === backgroundNext && event.animationName === "fan-ink-spread") finishPresentation();
    });
    sheets.forEach((sheet) => { sheet.disabled = false; });
    art.classList.add("fan-ready");
  }
  document.addEventListener("visibilitychange", refreshInteraction);
  reducedMotion.addEventListener("change", refreshInteraction);
  hoverPointer.addEventListener("change", refreshInteraction);
  window.addEventListener("resize", () => { readMotionSettings(); resetTilt(); refreshInteraction(); }, { passive: true });
  window.addEventListener("beforeprint", () => { printing = true; syncMotion(); });
  window.addEventListener("afterprint", () => { printing = false; syncMotion(); });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) { finishOpening(); finishPresentation(); }
    resetTilt();
    refreshInteraction();
  });

  // Fallback mantém a suspensão por visibilidade mesmo sem IntersectionObserver.
  const useVisibilityFallback = () => {
    const refreshVisibility = () => {
      const intersects = (element) => {
        const bounds = element.getBoundingClientRect();
        return bounds.bottom > 0 && bounds.right > 0 && bounds.top < window.innerHeight && bounds.left < window.innerWidth;
      };
      heroVisible = intersects(hero);
      artVisible = intersects(art);
      syncMotion();
    };
    window.addEventListener("scroll", refreshVisibility, { passive: true });
    window.addEventListener("resize", refreshVisibility, { passive: true });
    refreshVisibility();
  };
  if ("IntersectionObserver" in window) {
    let observer;
    try {
      heroVisible = false;
      observer = new window.IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.target === hero) heroVisible = entry.isIntersecting;
          if (entry.target === art) artVisible = entry.isIntersecting;
        });
        syncMotion();
      }, { threshold: 0 });
      observer.observe(hero);
      observer.observe(art);
    } catch {
      observer?.disconnect();
      useVisibilityFallback();
    }
  } else {
    useVisibilityFallback();
  }
  syncMotion();
})();

/* Efeitos únicos: o estado padrão do CSS nunca esconde fotos ou conteúdo. */
(() => {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const title = document.querySelector(".paint-title");
  const titleText = title?.querySelector(".paint-title-text");
  const finishTitle = () => {
    title?.classList.add("is-painted");
    titleText?.removeEventListener("animationend", onTitleEnd);
  };
  const onTitleEnd = (event) => {
    if (event.target === titleText && event.animationName === "title-brush-reveal" && !event.pseudoElement) finishTitle();
  };
  titleText?.addEventListener("animationend", onTitleEnd);
  // O retorno do histórico restaura o título completo, sem repetir sua entrada.
  window.addEventListener("pageshow", (event) => { if (event.persisted) finishTitle(); });

  const photos = [...document.querySelectorAll(".work-card > img, img[data-photo-reveal]")]
    .filter((photo) => !photo.closest("[data-comparison]"));
  const details = [...document.querySelectorAll("[data-paint-reveal]")];
  const targets = [...photos, ...details];
  let observer;

  const finishReveals = () => {
    observer?.disconnect();
    targets.forEach((target) => {
      target.dataset.motionSeen = "true";
      target.classList.remove("is-revealing");
    });
  };

  window.addEventListener("beforeprint", () => {
    finishTitle();
    finishReveals();
  });

  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) {
      finishTitle();
      finishReveals();
    }
  });

  if (reducedMotion.matches) {
    finishTitle();
    finishReveals();
    return;
  }
  if (!("IntersectionObserver" in window)) return;

  try {
    observer = new window.IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => {
        if (!isIntersecting) return;
        observer.unobserve(target);
        if (target.dataset.motionSeen === "true" || reducedMotion.matches) return;
        target.dataset.motionSeen = "true";
        target.classList.add("is-revealing");
        target.addEventListener("animationend", () => target.classList.remove("is-revealing"), { once: true });
      });
    }, { threshold: .01, rootMargin: "0px 0px 24px 0px" });

    const watch = (target) => {
      if (target.dataset.motionSeen === "true" || reducedMotion.matches) return;
      try {
        observer.observe(target);
      } catch {
        finishReveals();
      }
    };

    details.forEach(watch);
    photos.forEach((photo) => {
      if (photo.complete) {
        if (photo.naturalWidth > 0) watch(photo);
      } else {
        photo.addEventListener("load", () => {
          if (photo.naturalWidth > 0) watch(photo);
        }, { once: true });
      }
    });
  } catch {
    finishReveals();
  }
})();

/* O template é inerte. Somente pares reais inseridos na página são inicializados. */
(() => {
  "use strict";

  if (!window.CSS?.supports("clip-path", "inset(0 50% 0 0)")) return;

  document.querySelectorAll("[data-comparison]").forEach((comparison) => {
    const before = comparison.querySelector("[data-before]");
    const after = comparison.querySelector("[data-after]");
    const view = comparison.querySelector(".comparison-view");
    const slider = comparison.querySelector(".comparison-slider");
    const range = comparison.querySelector(".comparison-range");
    const help = comparison.querySelector(".comparison-help");
    if (!before || !after || !view || !slider || !range) return;

    const reset = () => {
      comparison.classList.remove("is-ready");
      slider.hidden = true;
      range.disabled = true;
      if (help) help.hidden = true;
      view.style.removeProperty("aspect-ratio");
      view.style.removeProperty("--comparison-position");
    };

    const update = () => {
      const value = Math.min(100, Math.max(0, Number(range.value) || 0));
      view.style.setProperty("--comparison-position", `${value}%`);
      range.setAttribute("aria-valuetext", `${value}% de antes e ${100 - value}% de depois visíveis`);
    };

    const activate = () => {
      reset();
      const images = [before, after];
      if (!images.every((image) => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0)) return;
      const beforeRatio = before.naturalWidth / before.naturalHeight;
      const afterRatio = after.naturalWidth / after.naturalHeight;
      if (Math.abs(beforeRatio - afterRatio) / beforeRatio > .001) return;

      view.style.setProperty("aspect-ratio", `${before.naturalWidth} / ${before.naturalHeight}`);
      update();
      comparison.classList.add("is-ready");
      slider.hidden = false;
      range.disabled = false;
      if (help) help.hidden = false;
    };

    range.addEventListener("input", update);
    [before, after].forEach((image) => {
      image.addEventListener("load", activate);
      image.addEventListener("error", reset);
    });
    activate();
  });
})();

/* Galeria: revelacao unica no wrapper e profundidade independente no card. */
(() => {
  "use strict";

  const gallery = document.querySelector(".work-gallery");
  if (!gallery) return;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(min-width: 900px) and (hover: hover) and (pointer: fine)");
  const entries = [...gallery.querySelectorAll("[data-gallery-entry]")];
  let observer;
  let printing = false;

  const states = entries.map((entry, index) => ({
    entry,
    card: entry.querySelector(".gallery-card"),
    imageWrap: entry.querySelector(".gallery-image-wrap"),
    image: entry.querySelector(".gallery-photo img"),
    delay: Math.min(index, 3) * 180,
    visible: false,
    ready: false,
    seen: false,
    timer: 0,
    frame: 0,
    pointerX: 0,
    pointerY: 0
  }));
  const byEntry = new Map(states.map((state) => [state.entry, state]));

  const finishReveal = (state) => {
    window.clearTimeout(state.timer);
    state.timer = 0;
    state.seen = true;
    state.entry.dataset.gallerySeen = "true";
    state.entry.classList.remove("is-pending", "is-revealing");
    observer?.unobserve(state.entry);
  };
  const finishReveals = () => {
    observer?.disconnect();
    states.forEach(finishReveal);
  };
  const reveal = (state) => {
    if (state.seen || !state.visible || !state.ready) return;
    if (reducedMotion.matches || printing || document.hidden) {
      finishReveal(state);
      return;
    }
    state.seen = true;
    state.entry.dataset.gallerySeen = "true";
    observer?.unobserve(state.entry);
    state.entry.classList.replace("is-pending", "is-revealing");
    // O limite evita conteudo oculto caso animationend ou o CSS nao cheguem.
    state.timer = window.setTimeout(() => finishReveal(state), state.delay + 1000);
  };

  const resetTilt = (state) => {
    if (state.frame) window.cancelAnimationFrame(state.frame);
    state.frame = 0;
    state.card?.classList.remove("is-tilting");
    ["--gallery-rotate-x", "--gallery-rotate-y", "--gallery-shift-z", "--gallery-shadow-x", "--gallery-shadow-y"]
      .forEach((property) => state.card?.style.removeProperty(property));
    ["--gallery-image-x", "--gallery-image-y"]
      .forEach((property) => state.imageWrap?.style.removeProperty(property));
  };
  const resetTilts = () => states.forEach(resetTilt);
  const canTilt = (state) => state.card && finePointer.matches && !reducedMotion.matches
    && !printing && !document.hidden && !state.entry.classList.contains("is-pending")
    && !state.entry.classList.contains("is-revealing") && !state.card.contains(document.activeElement);
  const applyTilt = (state) => {
    state.frame = 0;
    if (!canTilt(state)) {
      resetTilt(state);
      return;
    }
    // Mede a camada imovel para a propria rotacao nao alterar o ponto do mouse.
    const bounds = state.entry.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const x = Math.max(-1, Math.min(1, (state.pointerX - bounds.left) / bounds.width * 2 - 1));
    const y = Math.max(-1, Math.min(1, (state.pointerY - bounds.top) / bounds.height * 2 - 1));
    state.card.classList.add("is-tilting");
    state.card.style.setProperty("--gallery-rotate-x", `${(-y * 4).toFixed(2)}deg`);
    state.card.style.setProperty("--gallery-rotate-y", `${(x * 4).toFixed(2)}deg`);
    state.card.style.setProperty("--gallery-shift-z", "16px");
    state.card.style.setProperty("--gallery-shadow-x", `${(x * 10).toFixed(2)}px`);
    state.card.style.setProperty("--gallery-shadow-y", `${(20 + y * 6).toFixed(2)}px`);
    state.imageWrap?.style.setProperty("--gallery-image-x", `${(-x * 3).toFixed(2)}px`);
    state.imageWrap?.style.setProperty("--gallery-image-y", `${(-y * 3).toFixed(2)}px`);
  };

  states.forEach((state) => {
    const move = (event) => {
      if (event.pointerType !== "mouse" || !canTilt(state)) return;
      state.pointerX = event.clientX;
      state.pointerY = event.clientY;
      if (!state.frame) state.frame = window.requestAnimationFrame(() => applyTilt(state));
    };
    state.entry.addEventListener("pointerenter", move, { passive: true });
    state.entry.addEventListener("pointermove", move, { passive: true });
    state.entry.addEventListener("pointerleave", () => resetTilt(state));
    state.entry.addEventListener("pointercancel", () => resetTilt(state));
    state.entry.addEventListener("focusin", () => {
      finishReveal(state);
      resetTilt(state);
    });
    state.entry.addEventListener("animationend", (event) => {
      if (event.target === state.entry && !event.pseudoElement) finishReveal(state);
    });
  });

  reducedMotion.addEventListener("change", () => {
    resetTilts();
    if (reducedMotion.matches) finishReveals();
  });
  finePointer.addEventListener("change", resetTilts);
  window.addEventListener("blur", resetTilts);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) return;
    resetTilts();
    states.filter((state) => state.entry.classList.contains("is-revealing")).forEach(finishReveal);
  });
  window.addEventListener("beforeprint", () => {
    printing = true;
    resetTilts();
    finishReveals();
  });
  window.addEventListener("afterprint", () => { printing = false; });
  window.addEventListener("pageshow", (event) => {
    resetTilts();
    if (event.persisted) finishReveals();
  });

  if (reducedMotion.matches || !("IntersectionObserver" in window)) {
    finishReveals();
    return;
  }
  try {
    observer = new window.IntersectionObserver((observations) => {
      observations.forEach(({ target, isIntersecting }) => {
        const state = byEntry.get(target);
        if (!state || state.seen) return;
        state.visible = isIntersecting;
        reveal(state);
      });
    }, { threshold: .06, rootMargin: "0px 0px 40px 0px" });
    states.forEach((state) => {
      if (!state.image) {
        finishReveal(state);
        return;
      }
      state.entry.style.setProperty("--gallery-reveal-delay", `${state.delay}ms`);
      state.entry.classList.add("is-pending");
      state.ready = state.image.complete && state.image.naturalWidth > 0;
      if (state.image.complete && !state.image.naturalWidth) {
        finishReveal(state);
        return;
      }
      state.image.addEventListener("load", () => {
        state.ready = state.image.naturalWidth > 0;
        if (state.ready) reveal(state);
        else finishReveal(state);
      }, { once: true });
      state.image.addEventListener("error", () => finishReveal(state), { once: true });
      observer.observe(state.entry);
    });
  } catch {
    finishReveals();
  }
})();

/* Sem dialog/showModal, os links continuam abrindo as fotografias originais. */
(() => {
  "use strict";

  const gallery = document.querySelector(".work-gallery");
  const dialog = document.querySelector("#visualizacao-trabalho");
  if (!gallery || !dialog || typeof dialog.showModal !== "function") return;

  const closeButton = dialog.querySelector(".lightbox-close");
  const previousButton = dialog.querySelector(".lightbox-prev");
  const nextButton = dialog.querySelector(".lightbox-next");
  const counter = dialog.querySelector(".lightbox-counter");
  const stage = dialog.querySelector(".lightbox-stage");
  const image = dialog.querySelector(".lightbox-image");
  const caption = dialog.querySelector(".lightbox-caption");
  const status = dialog.querySelector(".lightbox-status");
  const original = dialog.querySelector(".lightbox-original");
  if (!closeButton || !previousButton || !nextButton || !counter || !stage || !image || !caption || !status || !original) return;

  let opener;
  let items = [];
  let currentIndex = 0;
  let loadToken = 0;
  let pendingImage;
  let swipe;
  let scrollLocked = false;
  let compensatedPadding = false;
  let previousPadding = "";
  let previousPaddingPriority = "";

  const lockPageScroll = () => {
    if (scrollLocked) return;
    scrollLocked = true;
    const root = document.documentElement;
    const scrollbarWidth = Math.max(0, window.innerWidth - root.clientWidth);
    // O CSS reserva a barra moderna; navegadores anteriores recebem compensacao temporaria.
    if (!window.CSS?.supports("scrollbar-gutter", "stable") && scrollbarWidth > 0) {
      previousPadding = document.body.style.getPropertyValue("padding-right");
      previousPaddingPriority = document.body.style.getPropertyPriority("padding-right");
      const padding = Number.parseFloat(window.getComputedStyle(document.body).paddingRight) || 0;
      document.body.style.setProperty("padding-right", `${padding + scrollbarWidth}px`);
      compensatedPadding = true;
    }
    root.classList.add("has-work-lightbox");
  };
  const unlockPageScroll = () => {
    document.documentElement.classList.remove("has-work-lightbox");
    if (compensatedPadding) {
      if (previousPadding) document.body.style.setProperty("padding-right", previousPadding, previousPaddingPriority);
      else document.body.style.removeProperty("padding-right");
    }
    scrollLocked = compensatedPadding = false;
    previousPadding = previousPaddingPriority = "";
  };

  const collectItems = () => [...gallery.querySelectorAll("a[data-lightbox][href]")].filter((trigger) =>
    !trigger.closest("[data-comparison]") && trigger.getAttribute("href")?.trim()
    && trigger.querySelector("img")?.getAttribute("src")?.trim()
  );
  const cancelLoad = () => {
    if (pendingImage) pendingImage.onload = pendingImage.onerror = null;
    pendingImage = null;
    image.onerror = null;
  };
  const showPhoto = (index) => {
    if (!items.length || !dialog.open) return;
    cancelLoad();
    currentIndex = (index % items.length + items.length) % items.length;
    const trigger = items[currentIndex];
    const thumbnail = trigger.querySelector("img");
    const source = trigger.href;
    const token = ++loadToken;
    image.hidden = true;
    image.removeAttribute("src");
    image.alt = thumbnail.alt;
    caption.textContent = trigger.closest("figure")?.querySelector(".gallery-caption-copy strong")?.textContent.trim()
      || trigger.closest("figure")?.querySelector("figcaption strong")?.textContent.trim() || "";
    caption.hidden = !caption.textContent;
    original.href = source;
    counter.textContent = `${currentIndex + 1} de ${items.length}`;
    previousButton.disabled = nextButton.disabled = items.length < 2;
    status.hidden = false;
    status.textContent = "Carregando fotografia\u2026";
    dialog.setAttribute("aria-busy", "true");

    const fail = () => {
      if (token !== loadToken || !dialog.open) return;
      image.hidden = true;
      status.hidden = false;
      status.textContent = "N\u00e3o foi poss\u00edvel carregar a fotografia. Use o link para abrir a imagem original.";
      dialog.removeAttribute("aria-busy");
    };
    const loader = new Image();
    pendingImage = loader;
    loader.decoding = "async";
    let settled = false;
    const finish = (loaded) => {
      if (settled || token !== loadToken || !dialog.open) return;
      settled = true;
      loader.onload = loader.onerror = null;
      pendingImage = null;
      if (!loaded) {
        fail();
        return;
      }
      image.width = loader.naturalWidth;
      image.height = loader.naturalHeight;
      image.onerror = fail;
      image.src = source;
      image.hidden = false;
      status.hidden = true;
      dialog.removeAttribute("aria-busy");
    };
    loader.onload = () => finish(loader.naturalWidth > 0 && loader.naturalHeight > 0);
    loader.onerror = () => finish(false);
    // Os handlers precedem src para cobrir tanto rede quanto cache (inclusive erro).
    loader.src = source;
    if (loader.complete) finish(loader.naturalWidth > 0 && loader.naturalHeight > 0);
  };
  const navigate = (direction) => showPhoto(currentIndex + direction);

  gallery.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const trigger = event.target.closest?.("a[data-lightbox][href]");
    if (!trigger || !gallery.contains(trigger) || trigger.closest("[data-comparison]")) return;
    const available = collectItems();
    const index = available.indexOf(trigger);
    if (index < 0) return;
    try {
      dialog.showModal();
    } catch {
      return;
    }
    event.preventDefault();
    opener = trigger;
    items = available;
    lockPageScroll();
    showPhoto(index);
    closeButton.focus({ preventScroll: true });
  });

  previousButton.addEventListener("click", () => navigate(-1));
  nextButton.addEventListener("click", () => navigate(1));
  closeButton.addEventListener("click", () => dialog.close());
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    dialog.close();
  });
  dialog.addEventListener("keydown", (event) => {
    if (!dialog.open || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === "Escape") {
      event.preventDefault();
      dialog.close();
    } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      navigate(event.key === "ArrowLeft" ? -1 : 1);
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      showPhoto(event.key === "Home" ? 0 : items.length - 1);
    } else if (event.key === "Tab") {
      const focusable = [...dialog.querySelectorAll("button:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])")]
        .filter((element) => element.tabIndex >= 0 && !element.closest("[hidden]") && element.getClientRects().length > 0);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first) {
        event.preventDefault();
        closeButton.focus({ preventScroll: true });
      } else if (event.shiftKey && (document.activeElement === first || !focusable.includes(document.activeElement))) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && (document.activeElement === last || !focusable.includes(document.activeElement))) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    }
  });
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });

  // Sem captura/preventDefault: toque vertical e zoom com dois dedos continuam nativos.
  stage.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "touch") return;
    if (!event.isPrimary || event.target.closest?.("button, a")) {
      swipe = null;
      return;
    }
    swipe = { id: event.pointerId, x: event.clientX, y: event.clientY, time: event.timeStamp };
  }, { passive: true });
  stage.addEventListener("pointerup", (event) => {
    if (!swipe || swipe.id !== event.pointerId) return;
    const x = event.clientX - swipe.x;
    const y = event.clientY - swipe.y;
    const duration = event.timeStamp - swipe.time;
    swipe = null;
    if (Math.abs(x) >= 56 && Math.abs(x) > Math.abs(y) * 1.4 && duration < 800) navigate(x < 0 ? 1 : -1);
  }, { passive: true });
  stage.addEventListener("pointercancel", () => { swipe = null; }, { passive: true });

  dialog.addEventListener("close", () => {
    if (dialog.open) return;
    loadToken++;
    cancelLoad();
    swipe = null;
    items = [];
    image.removeAttribute("src");
    image.hidden = true;
    original.removeAttribute("href");
    dialog.removeAttribute("aria-busy");
    unlockPageScroll();
    if (opener?.isConnected) opener.focus({ preventScroll: true });
    opener = null;
  });
  window.addEventListener("beforeprint", () => { if (dialog.open) dialog.close(); });
  window.addEventListener("pageshow", (event) => { if (event.persisted && dialog.open) dialog.close(); });
})();

/* Simulador: a foto não é substituída; somente a parede recortada recebe a cor. */
(() => {
  "use strict";

  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const css = window.CSS;
  const fallbackWidth = 1156;
  const fallbackHeight = 650;
  const fallbackSource = new URL("assets/imagens/ambiente-simulador.png", document.baseURI).href;

  document.querySelectorAll("[data-paint-simulator]").forEach((root) => {
    const image = root.querySelector(".simulator-image");
    const wall = root.querySelector(".simulator-wall");
    const light = root.querySelector(".simulator-wall-light");
    const current = root.querySelector(".simulator-paint-current");
    const next = root.querySelector(".simulator-paint-next");
    const palette = root.querySelector(".simulator-palette");
    const selection = root.querySelector(".simulator-selection");
    const colorName = root.querySelector(".simulator-color-name");
    const feedback = root.querySelector(".simulator-feedback");
    if (!image || !wall || !light || !current || !next || !palette || !selection || !colorName || !feedback) return;

    const colors = Array.from(palette.querySelectorAll("[data-paint-color]")).filter((button) => {
      const valid = /^#[\da-f]{6}$/i.test(button.dataset.paintColor || "");
      button.disabled = !valid;
      if (valid) button.style.setProperty("--paint-color", button.dataset.paintColor);
      return valid;
    });
    if (!colors.length) return;
    let selected = colors.find((button) => button.getAttribute("aria-pressed") === "true") || colors[0];
    let ready = false;
    let frame = 0;
    let timer = 0;
    let source = "";
    let maskImage;
    let maskLoaded = false;
    let maskPending = false;
    let maskIssue = "";

    const useFallback = () => {
      wall.classList.remove("has-png-mask");
      wall.style.removeProperty("--wall-mask-image");
    };
    const finish = () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      frame = timer = 0;
      current.style.backgroundColor = selected.dataset.paintColor;
      root.classList.remove("is-painting");
      next.hidden = true;
    };
    const announce = () => {
      colors.forEach((button) => button.setAttribute("aria-pressed", String(button === selected)));
      colorName.textContent = selected.querySelector(".paint-color-name").textContent.trim();
    };
    const disable = (message = "") => {
      ready = false;
      finish();
      wall.hidden = selection.hidden = true;
      palette.hidden = false;
      palette.disabled = true;
      useFallback();
      if (message) {
        feedback.textContent = message;
        feedback.hidden = false;
      }
    };

    const fallbackMask = window.getComputedStyle(root).getPropertyValue("--wall-mask-fallback").trim();
    const supportsFallback = !!css && /^polygon\(/i.test(fallbackMask) && css.supports("clip-path", fallbackMask);
    const supportsMask = !!css && (css.supports("mask-image", "linear-gradient(#fff, #fff)") || css.supports("-webkit-mask-image", "linear-gradient(#fff, #fff)"));
    if (!css || !css.supports("mix-blend-mode", "hard-light") || !css.supports("filter", "grayscale(1) contrast(.9) brightness(1.22)")) {
      disable("A prévia de cores não está disponível neste navegador. A fotografia original permanece visível.");
      return;
    }

    const activate = () => {
      if (!image.complete || !image.naturalWidth || !image.naturalHeight || !light.complete || !light.naturalWidth || !light.naturalHeight || (image.currentSrc || image.src) !== source || (light.currentSrc || light.src) !== source) return;
      if (light.naturalWidth !== image.naturalWidth || light.naturalHeight !== image.naturalHeight) {
        disable("Não foi possível preparar a simulação. A fotografia original permanece visível.");
        return;
      }
      // Aguarda o PNG principal para não exibir o recorte antigo durante a carga normal.
      if (maskPending) return;
      const pngMatches = maskLoaded && maskImage.naturalWidth === image.naturalWidth && maskImage.naturalHeight === image.naturalHeight;
      if (maskLoaded && !pngMatches) maskIssue = "A máscara não tem as mesmas dimensões da fotografia.";
      const fallbackMatches = supportsFallback && source === fallbackSource && image.naturalWidth === fallbackWidth && image.naturalHeight === fallbackHeight;
      if (!pngMatches && !fallbackMatches) {
        disable(maskIssue || "A máscara não corresponde a esta fotografia. A imagem original permanece visível.");
        return;
      }
      if (pngMatches) {
        wall.style.setProperty("--wall-mask-image", "url(" + JSON.stringify(maskImage.currentSrc || maskImage.src) + ")");
        wall.classList.add("has-png-mask");
      } else {
        useFallback();
      }
      if (!ready) {
        ready = true;
        finish();
        announce();
      }
      wall.hidden = palette.hidden = selection.hidden = false;
      palette.disabled = false;
      feedback.textContent = pngMatches ? "" : maskIssue + " Usando o recorte anterior, que pode apresentar imperfeições nas bordas.";
      feedback.hidden = pngMatches;
    };
    const prepare = () => {
      if (!image.getAttribute("src")?.trim() || !image.complete) return;
      if (!image.naturalWidth || !image.naturalHeight) {
        disable("Não foi possível carregar o ambiente. Tente recarregar a página.");
        return;
      }
      const loadedSource = image.currentSrc || image.src;
      if (loadedSource !== source || (light.currentSrc || light.src) !== loadedSource || (light.complete && !light.naturalWidth)) {
        disable();
        source = loadedSource;
        light.src = source;
      }
      activate();
    };

    colors.forEach((button) => button.addEventListener("click", () => {
      if (!ready || button === selected) return;
      finish();
      selected = button;
      announce();
      if (motion.matches) {
        finish();
        return;
      }
      next.style.backgroundColor = selected.dataset.paintColor;
      next.hidden = false;
      // Dois frames separam trocas rápidas sem forçar recálculo síncrono de layout.
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          frame = 0;
          root.classList.add("is-painting");
        });
      });
      // Fallback se o CSS ou animationend não estiverem disponíveis.
      timer = window.setTimeout(finish, 850);
    }));
    next.addEventListener("animationend", (event) => {
      if (event.target === next && event.animationName === "room-paint-reveal") finish();
    });
    motion.addEventListener("change", () => { if (motion.matches) finish(); });
    window.addEventListener("beforeprint", finish);
    image.addEventListener("load", prepare);
    light.addEventListener("load", activate);
    image.addEventListener("error", () => disable("Não foi possível carregar o ambiente. Tente recarregar a página."));
    light.addEventListener("error", () => disable("Não foi possível preparar a simulação. A fotografia original permanece visível."));

    // Alfa do PNG manual é o recorte principal. A falha mantém o fallback e avisa o visitante.
    const maskSource = root.dataset.wallMaskSrc?.trim();
    if (maskSource && supportsMask && window.location?.protocol !== "file:") {
      maskImage = new Image();
      maskImage.decoding = "async";
      maskPending = true;
      maskImage.onload = () => {
        maskPending = false;
        maskLoaded = maskImage.naturalWidth > 0 && maskImage.naturalHeight > 0;
        maskIssue = maskLoaded ? "" : "Não foi possível carregar a máscara manual da parede.";
        activate();
      };
      maskImage.onerror = () => {
        maskPending = maskLoaded = false;
        maskIssue = "Não foi possível carregar a máscara manual da parede.";
        useFallback();
        activate();
      };
      // Os eventos são registrados antes do src para cobrir rede e cache.
      maskImage.src = maskSource;
      if (maskImage.complete) {
        if (maskImage.naturalWidth > 0) maskImage.onload();
        else maskImage.onerror();
      }
    } else {
      maskIssue = !maskSource ? "A máscara manual da parede não foi configurada."
        : !supportsMask ? "Este navegador não oferece suporte à máscara PNG."
        : "Abra o site por um servidor HTTP para usar a máscara manual.";
    }
    prepare();
  });
})();
