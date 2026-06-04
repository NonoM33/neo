/* ============================================================
   NEO DOMOTIQUE — v2 engine
   GSAP + ScrollTrigger + Lenis smooth scroll
   + interactive salon console (independent of GSAP)
   Robust: if GSAP/Lenis fail or reduced-motion → content stays visible.
   ============================================================ */
(function () {
  "use strict";

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGSAP = !!(window.gsap && window.gsap.registerPlugin && window.ScrollTrigger);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ============================================================
     ALWAYS-ON (work with or without GSAP)
     ============================================================ */

  // nav condense
  const nav = $(".nav");
  const navUpd = () => nav && nav.classList.toggle("scrolled", window.scrollY > 24);
  navUpd();
  window.addEventListener("scroll", navUpd, { passive: true });

  // hide scroll cue once the visitor starts scrolling
  const cue = $(".scroll-cue");
  const cueUpd = () => cue && cue.classList.toggle("cue-hidden", window.scrollY > 60);
  cueUpd();
  window.addEventListener("scroll", cueUpd, { passive: true });

  initSalon();
  initRooms();
  initSimlog();
  initCounters();
  initMagnetic();
  initCursor();

  /* ============================================================
     FALLBACK — no GSAP or reduced motion: reveal everything
     ============================================================ */
  if (!hasGSAP || reduce) {
    document.documentElement.classList.add("nogsap");
    document.body.classList.add("ready");
    $$(".hw").forEach((w) => w.classList.add("on"));
    // light a few rooms so scene 1 reads
    $$("#scene-rentrer [data-room]").slice(0, 4).forEach((r) => r.classList.add("lit"));
    updateRoomCount();
    return;
  }

  /* ============================================================
     GSAP PATH
     ============================================================ */
  const gsap = window.gsap;
  gsap.registerPlugin(window.ScrollTrigger);
  const ST = window.ScrollTrigger;
  document.documentElement.classList.add("gsap");

  // ---- Lenis smooth scroll ----
  let lenis = null;
  if (window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.1, wheelMultiplier: 1, smoothWheel: true });
    lenis.on("scroll", ST.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    document.documentElement.classList.add("lenis", "lenis-smooth");
    // in-page anchors → smooth scroll
    $$('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href");
        if (id.length < 2) return;
        const t = document.querySelector(id);
        if (!t) return;
        e.preventDefault();
        lenis.scrollTo(t, { offset: -76, duration: 1.2 });
      });
    });
  }

  // ---- HERO intro timeline ----
  const houseWins = $$(".hw");
  // robust window cascade (independent of gsap ticker)
  houseWins.forEach((w, i) => setTimeout(() => w.classList.add("on"), 650 + i * 170));

  const heroTl = gsap.timeline({ defaults: { ease: "power3.out" } });
  heroTl
    .from(".hero .eyebrow", { autoAlpha: 0, y: 22, duration: 0.7 }, 0.05)
    .fromTo(".build .w",
      { autoAlpha: 0, yPercent: 110 },
      { autoAlpha: 1, yPercent: 0, duration: 1.0, stagger: 0.09 }, 0.15)
    .from(".hero .lead", { autoAlpha: 0, y: 22, duration: 0.7 }, "-=0.55")
    .from(".hero-cta > *", { autoAlpha: 0, y: 18, duration: 0.6, stagger: 0.1 }, "-=0.4")
    .from(".hero-proof", { autoAlpha: 0, y: 14, duration: 0.6 }, "-=0.45")
    .fromTo(".house-stage svg",
      { autoAlpha: 0, scale: 1.07, filter: "blur(16px)" },
      { autoAlpha: 1, scale: 1, filter: "blur(0px)", duration: 1.3, ease: "power2.out" }, 0.1)
    .fromTo(".chip",
      { autoAlpha: 0, y: 18, scale: 0.94 },
      { autoAlpha: 1, y: 0, scale: 1, duration: 0.7, stagger: 0.14 }, 0.85);

  // subtle continuous float on hero house + chips
  gsap.to(".house-stage svg", { y: -10, duration: 4.5, ease: "sine.inOut", yoyo: true, repeat: -1 });
  $$(".chip").forEach((c, i) =>
    gsap.to(c, { y: "+=7", duration: 3 + i * 0.4, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 1.6 + i * 0.2 }));

  // hero house parallax-out on scroll
  gsap.to(".house-stage", {
    yPercent: 14, autoAlpha: 0.55, ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
  });
  gsap.to(".hero-copy", {
    yPercent: -8, ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
  });

  // ---- generic reveals ----
  $$(".reveal").forEach((el) => {
    gsap.fromTo(el,
      { autoAlpha: 0, y: 34 },
      {
        autoAlpha: 1, y: 0, duration: 0.95, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 88%" },
      });
  });

  // ---- statcards stagger ----
  $$(".statcards").forEach((grp) => {
    gsap.fromTo(grp.querySelectorAll(".statcard"),
      { autoAlpha: 0, y: 18 },
      {
        autoAlpha: 1, y: 0, duration: 0.7, ease: "power3.out", stagger: 0.12,
        scrollTrigger: { trigger: grp, start: "top 85%" },
      });
  });

  // ---- service / step / testimonial cards: stagger ----
  [".cards-grid", ".steps", ".t-grid", ".bigstats", ".ticks"].forEach((sel) => {
    const grp = $(sel);
    if (!grp) return;
    gsap.fromTo(grp.children,
      { autoAlpha: 0, y: 26 },
      {
        autoAlpha: 1, y: 0, duration: 0.7, ease: "power3.out", stagger: 0.1,
        scrollTrigger: { trigger: grp, start: "top 85%" },
      });
  });

  // ---- parallax + scroll-velocity skew on scene panels ----
  $$(".scene .panel, #securite .phone").forEach((el) => {
    const scene = el.closest("section");
    gsap.fromTo(el, { yPercent: 9 }, {
      yPercent: -9, ease: "none",
      scrollTrigger: { trigger: scene, start: "top bottom", end: "bottom top", scrub: 1 },
    });
  });
  const skewTargets = $$(".scene .panel");
  if (skewTargets.length) {
    const setters = skewTargets.map((el) => gsap.quickSetter(el, "skewY", "deg"));
    const proxy = { v: 0 };
    ST.create({
      onUpdate: (self) => {
        const v = clamp(self.getVelocity() / -360, -6, 6);
        if (Math.abs(v) > Math.abs(proxy.v)) {
          proxy.v = v;
          gsap.to(proxy, { v: 0, duration: 0.8, ease: "power3", overwrite: true, onUpdate: () => setters.forEach((s) => s(proxy.v)) });
        }
      },
    });
  }

  // ---- continuous sky (fil conducteur) ----
  initSky();

  // ---- narrative thread ----
  initThread();

  // ---- rooms: cinematic stagger-on when scene 1 enters (then user toggles) ----
  const roomScene = $("#scene-rentrer");
  if (roomScene) {
    const rooms = $$("#scene-rentrer [data-room]");
    ST.create({
      trigger: roomScene, start: "top 70%", once: true,
      onEnter: () => {
        rooms.forEach((r, i) => {
          if (r.dataset.user) return;
          gsap.delayedCall(0.15 + i * 0.14, () => { if (!r.dataset.user) { r.classList.add("lit"); updateRoomCount(); } });
        });
      },
    });
  }

  // ---- SIGNATURE: pinned, scrubbed sunrise ----
  initSunrisePin();

  // refresh after fonts/images settle
  window.addEventListener("load", () => ST.refresh());
  document.fonts && document.fonts.ready && document.fonts.ready.then(() => ST.refresh());
  setTimeout(() => ST.refresh(), 800);

  /* ============================================================
     GSAP feature implementations
     ============================================================ */

  function initSky() {
    const sky = $(".sky");
    if (!sky) return;
    // [frac, topRGB, botRGB, glowRGB, glowOpacity, sunY%]
    const SKY = [
      [0.00, [6, 8, 12], [10, 14, 22], [40, 60, 110], 0.00, 120],
      [0.13, [12, 17, 33], [30, 21, 40], [150, 80, 45], 0.20, 92],
      [0.30, [8, 11, 20], [12, 15, 26], [50, 55, 110], 0.05, 110],
      [0.45, [4, 6, 11], [7, 10, 18], [20, 30, 70], 0.00, 120],
      [0.57, [6, 9, 18], [11, 15, 30], [50, 65, 125], 0.08, 115],
      [0.72, [26, 36, 66], [82, 56, 30], [255, 182, 92], 0.40, 64],
      [0.82, [15, 21, 36], [13, 17, 26], [130, 130, 150], 0.06, 80],
      [1.00, [6, 8, 12], [10, 14, 22], [40, 60, 110], 0.00, 120],
    ];
    const lerp = (a, b, t) => a + (b - a) * t;
    const lA = (a, b, t) => a.map((v, i) => Math.round(lerp(v, b[i], t)));
    const rgb = (a) => `rgb(${a[0]},${a[1]},${a[2]})`;
    function apply(gp) {
      let i = 0; while (i < SKY.length - 1 && gp > SKY[i + 1][0]) i++;
      const a = SKY[i], b = SKY[Math.min(i + 1, SKY.length - 1)];
      const t = clamp((gp - a[0]) / ((b[0] - a[0]) || 1), 0, 1);
      sky.style.setProperty("--sky-top", rgb(lA(a[1], b[1], t)));
      sky.style.setProperty("--sky-bot", rgb(lA(a[2], b[2], t)));
      const g = lA(a[3], b[3], t);
      sky.style.setProperty("--sky-glow", `rgba(${g[0]},${g[1]},${g[2]},0.55)`);
      sky.style.setProperty("--sky-glow-o", lerp(a[4], b[4], t).toFixed(3));
      sky.style.setProperty("--sky-sun", lerp(a[5], b[5], t).toFixed(1) + "%");
    }
    apply(0);
    ST.create({
      trigger: document.documentElement, start: "top top", end: "bottom bottom", scrub: true,
      onUpdate: (self) => apply(self.progress),
    });
  }

  function initThread() {
    const narrative = $(".narrative");
    const thread = $("#thread");
    if (!narrative || !thread) return;
    const tFill = $("#threadFill"), tComet = $("#threadComet");
    const sections = $$(":scope > section", narrative);
    const nodes = sections.map((target) => {
      const el = document.createElement("div");
      el.className = "thread-node";
      thread.appendChild(el);
      return { el, target, posY: 0, on: false };
    });
    function layout() {
      const topAbs = thread.getBoundingClientRect().top + window.scrollY;
      nodes.forEach((o) => {
        const r = o.target.getBoundingClientRect();
        o.posY = (r.top + window.scrollY + r.height * 0.5) - topAbs;
        o.el.style.top = o.posY + "px";
      });
    }
    // satisfying particle burst when the orb crosses a step
    function burst(posY) {
      if (reduce) return;
      const fx = document.createElement("div");
      fx.className = "thread-fx";
      fx.style.top = posY + "px";
      const ring = document.createElement("div");
      ring.className = "thread-ring";
      fx.appendChild(ring);
      const N = 14;
      const palette = ["var(--warm)", "var(--warm-2)", "#fff", "var(--neo-2)"];
      for (let i = 0; i < N; i++) {
        const s = document.createElement("span");
        s.className = "thread-spark";
        const ang = (Math.PI * 2 * i) / N + (Math.random() - 0.5) * 0.5;
        const dist = 34 + Math.random() * 40;
        s.style.setProperty("--tx", Math.cos(ang) * dist + "px");
        s.style.setProperty("--ty", Math.sin(ang) * dist + "px");
        s.style.setProperty("--dur", (0.66 + Math.random() * 0.4).toFixed(2) + "s");
        s.style.setProperty("--spk", palette[i % palette.length]);
        fx.appendChild(s);
      }
      thread.appendChild(fx);
      setTimeout(() => fx.remove(), 1300);
    }
    let lastFill = 0, raf = 0;
    function update() {
      raf = 0;
      const tr = thread.getBoundingClientRect();
      const h = thread.offsetHeight;
      // fill = distance from thread top down to the viewport centre line.
      // This keeps the orb pinned to the reader's eye-line — it can never
      // race off-screen, and it pauses naturally while the sunrise scene is pinned.
      const fill = clamp(window.innerHeight * 0.5 - tr.top, 0, h);
      tFill.style.height = fill + "px";
      tComet.style.top = fill + "px";
      thread.classList.toggle("active", fill > 2 && fill < h - 2);
      const down = fill > lastFill + 0.5;
      for (const o of nodes) {
        const isOn = o.posY <= fill + 6;
        if (isOn !== o.on) {
          o.on = isOn;
          o.el.classList.toggle("on", isOn);
          if (isOn && down) burst(o.posY); // celebrate only going forward
        }
      }
      lastFill = fill;
    }
    const schedule = () => { if (!raf) raf = requestAnimationFrame(update); };
    ST.create({
      trigger: narrative, start: "top bottom", end: "bottom top",
      onRefresh: () => { layout(); update(); },
      onUpdate: schedule,
    });
    layout();
    update();
  }

  function initSunrisePin() {
    const scene = $("[data-daynight]");
    if (!scene) return;
    const dn = $(".daynight", scene);
    const tItems = $$(".tl-item", scene);
    const isNarrow = window.matchMedia("(max-width: 900px)").matches;
    ST.create({
      trigger: scene,
      start: "top top",
      end: isNarrow ? "+=90%" : "+=130%",
      pin: true,
      pinSpacing: true,
      scrub: 1,
      onUpdate: (self) => {
        const p = self.progress;
        dn && dn.style.setProperty("--sun", p.toFixed(3));
        tItems.forEach((it, i) => {
          const thr = 0.18 + (i / tItems.length) * 0.66;
          it.classList.toggle("on", p >= thr);
        });
      },
    });
  }

  /* ============================================================
     INTERACTIVE — salon console (works with or without GSAP)
     ============================================================ */
  function initSalon() {
    $$("[data-salon]").forEach((salon) => {
      const dim = $("[data-dim]", salon);
      const dimState = $(".ctrl-dim [data-state]", salon);
      const voletsBtn = $('[data-toggle="volets"]', salon);
      const tvBtn = $('[data-toggle="tv"]', salon);
      const tvLabel = $(".tv-label", salon);
      const toast = $("[data-toast]", salon);
      const master = $("[data-master]", salon);
      let toastT;

      const setVolets = (closed) => {
        salon.dataset.volets = closed ? "closed" : "open";
        salon.style.setProperty("--blinds", closed ? "100%" : "0%");
        voletsBtn.setAttribute("aria-pressed", String(closed));
        $("[data-state]", voletsBtn).textContent = closed ? "Fermés" : "Ouverts";
      };
      const setTv = (on) => {
        salon.dataset.tv = on ? "on" : "off";
        tvBtn.setAttribute("aria-pressed", String(on));
        $("[data-state]", tvBtn).textContent = on ? "Allumée" : "Éteinte";
        if (tvLabel) tvLabel.textContent = on ? "▶ Netflix" : "○ Veille";
      };
      const setDim = (v) => {
        v = Math.round(clamp(v, 0, 100));
        salon.style.setProperty("--bright", (v / 100).toFixed(2));
        if (dim) {
          dim.value = v;
          dim.style.background = `linear-gradient(90deg, var(--warm) ${v}%, rgba(255,255,255,.12) ${v}%)`;
        }
        if (dimState) dimState.textContent = v + "\u202f%";
      };
      const showToast = (txt) => {
        if (!toast) return;
        toast.textContent = txt;
        toast.classList.add("show");
        clearTimeout(toastT);
        toastT = setTimeout(() => toast.classList.remove("show"), 1700);
      };

      voletsBtn.addEventListener("click", () => setVolets(salon.dataset.volets !== "closed"));
      tvBtn.addEventListener("click", () => setTv(salon.dataset.tv !== "on"));
      dim && dim.addEventListener("input", (e) => setDim(+e.target.value));

      const cinema = () => {
        master.classList.remove("sweeping"); void master.offsetWidth; master.classList.add("sweeping");
        showToast("« Ok Neo, mode cinéma »");
        setTimeout(() => setVolets(true), 200);
        setTimeout(() => setDim(14), 520);
        setTimeout(() => setTv(true), 820);
      };
      master.addEventListener("click", cinema);

      setDim(100); // init slider fill

      // auto-demo once on first view (non-reduced)
      if (!reduce && "IntersectionObserver" in window) {
        const io = new IntersectionObserver((es) => {
          es.forEach((en) => {
            if (en.isIntersecting && !salon.dataset.demo) {
              salon.dataset.demo = "1";
              setTimeout(cinema, 700);
            }
          });
        }, { threshold: 0.5 });
        io.observe(salon);
      }
    });
  }

  /* ---- clickable rooms + live count ---- */
  function initRooms() {
    $$("[data-room]").forEach((r) => {
      r.addEventListener("click", () => {
        r.dataset.user = "1";
        r.classList.toggle("lit");
        updateRoomCount();
      });
    });
    updateRoomCount();
  }

  /* ---- vacation phone: rolling simulation log ---- */
  function initSimlog() {
    const log = $("[data-simlog]");
    if (!log || reduce) return;
    const events = [
      { t: "19:30", d: "Salon allumé — simulation", sec: false },
      { t: "20:00", d: "Volets fermés", sec: false },
      { t: "21:10", d: "TV active — présence sonore", sec: false },
      { t: "22:15", d: "Aucun mouvement — RAS", sec: true },
      { t: "23:00", d: "Mode nuit activé", sec: true },
      { t: "07:05", d: "Volets ouverts — chambre", sec: false },
      { t: "08:00", d: "Radio cuisine allumée", sec: false },
    ];
    let idx = 0;
    const push = () => {
      const e = events[idx % events.length];
      const row = document.createElement("div");
      row.className = "log-row" + (e.sec ? " sec" : "");
      row.innerHTML = `<span class="lt">${e.t}</span><span>${e.d}</span><span class="ld"></span>`;
      row.style.opacity = "0";
      row.style.transform = "translateY(-8px)";
      row.style.transition = "opacity .4s var(--ease), transform .4s var(--ease)";
      log.prepend(row);
      requestAnimationFrame(() => { row.style.opacity = "1"; row.style.transform = "none"; });
      while (log.children.length > 4) log.removeChild(log.lastChild);
      idx++;
    };
    const io = new IntersectionObserver((es) => {
      es.forEach((en) => {
        if (en.isIntersecting && !log.dataset.run) {
          log.dataset.run = "1"; push(); setInterval(push, 2200);
        }
      });
    }, { threshold: 0.3 });
    io.observe(log);
  }

  /* ---- count-up ---- */
  function initCounters() {
    const counters = $$("[data-count]");
    if (!counters.length) return;
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        const el = e.target;
        const to = parseFloat(el.dataset.count);
        const suffix = el.dataset.suffix || "", prefix = el.dataset.prefix || "";
        if (reduce) { el.textContent = prefix + to + suffix; return; }
        const t0 = performance.now(), dur = 1100;
        (function tick(now) {
          const k = clamp((now - t0) / dur, 0, 1);
          el.textContent = prefix + Math.round(to * (1 - Math.pow(1 - k, 3))) + suffix;
          if (k < 1) requestAnimationFrame(tick);
        })(t0);
      });
    }, { threshold: 0.5 });
    counters.forEach((c) => io.observe(c));
  }

  /* ---- magnetic buttons ---- */
  function initMagnetic() {
    if (reduce || !matchMedia("(hover:hover)").matches) return;
    $$("[data-magnetic]").forEach((btn) => {
      btn.addEventListener("mousemove", (e) => {
        const r = btn.getBoundingClientRect();
        btn.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px, ${(e.clientY - r.top - r.height / 2) * 0.22}px)`;
      });
      btn.addEventListener("mouseleave", () => { btn.style.transform = ""; });
    });
  }

  /* ---- cursor glow ---- */
  function initCursor() {
    const glow = $(".cursor-glow");
    if (!glow || !matchMedia("(hover:hover)").matches) return;
    let gx = innerWidth / 2, gy = innerHeight / 2, tx = gx, ty = gy;
    window.addEventListener("mousemove", (e) => { tx = e.clientX; ty = e.clientY; }, { passive: true });
    (function loop() {
      gx += (tx - gx) * 0.12; gy += (ty - gy) * 0.12;
      glow.style.transform = `translate(${gx}px, ${gy}px) translate(-50%,-50%)`;
      requestAnimationFrame(loop);
    })();
  }

  /* ---- shared: live lit-room count ---- */
  function updateRoomCount() {
    const el = document.querySelector("[data-litcount]");
    if (!el) return;
    const rooms = document.querySelectorAll("#scene-rentrer [data-room]");
    const n = [...rooms].filter((r) => r.classList.contains("lit")).length;
    el.textContent = n === 0 ? "Tout est éteint" : (n + (n > 1 ? " pièces allumées" : " pièce allumée"));
    const card = el.closest(".statcard");
    if (card) {
      const dot = card.querySelector(".sc-dot");
      if (dot) {
        dot.style.background = n ? "var(--ok)" : "var(--ink-3)";
        dot.style.boxShadow = n ? "0 0 10px 1px var(--ok)" : "none";
      }
    }
  }
})();
