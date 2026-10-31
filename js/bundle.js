(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // js/spring.js
  function frame(now) {
    const dt = Math.min((now - last) / 1e3, 0.05);
    last = now;
    for (const fn of Array.from(active)) {
      if (!fn(dt)) active.delete(fn);
    }
    raf = active.size ? requestAnimationFrame(frame) : 0;
  }
  function animate(fn) {
    active.add(fn);
    if (!raf) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  }
  function rubber2(delta, limit) {
    return limit * Math.tanh(delta / (limit * 1.8));
  }
  function angleDelta(from, to) {
    return ((to - from) % 360 + 540) % 360 - 180;
  }
  var prefersReducedMotion, SUBSTEP, Spring, active, raf, last, clamp2;
  var init_spring = __esm({
    "js/spring.js"() {
      prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      SUBSTEP = 1 / 240;
      Spring = class {
        constructor(value = 0, { response = 0.4, damping = 0.8 } = {}) {
          this.value = value;
          this.target = value;
          this.velocity = 0;
          this.eps = 4e-4;
          this.veps = 8e-4;
          this.setParams(response, damping);
        }
        setParams(response, damping) {
          const w = 2 * Math.PI / response;
          this.k = w * w;
          this.c = 2 * damping * w;
          return this;
        }
        set(target) {
          this.target = target;
          return this;
        }
        snap(value) {
          this.value = this.target = value;
          this.velocity = 0;
          return this;
        }
        step(dt) {
          let remaining = Math.min(dt, 0.05);
          while (remaining > 0) {
            const h2 = Math.min(SUBSTEP, remaining);
            const accel = this.k * (this.target - this.value) - this.c * this.velocity;
            this.velocity += accel * h2;
            this.value += this.velocity * h2;
            remaining -= h2;
          }
          if (this.atRest) this.snap(this.target);
          return this.value;
        }
        get atRest() {
          return Math.abs(this.velocity) < this.veps && Math.abs(this.target - this.value) < this.eps;
        }
      };
      active = /* @__PURE__ */ new Set();
      raf = 0;
      last = 0;
      clamp2 = (v, a, b) => Math.min(b, Math.max(a, v));
    }
  });

  // js/glass.js
  var glass_exports = {};
  __export(glass_exports, {
    getGlass: () => getGlass,
    initGlass: () => initGlass,
    refreshGlass: () => refreshGlass,
    registerGlass: () => registerGlass,
    supportsRefraction: () => supportsRefraction
  });
  function getProfile(surface, bezel, thickness, n) {
    const key = `${surface}|${bezel}|${thickness}|${n}`;
    if (profileCache.has(key)) return profileCache.get(key);
    const f = SURFACES[surface] || SURFACES.squircle;
    const N = 128;
    const mags = new Float32Array(N);
    let max = 0;
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const a = Math.max(0, t - 2e-3);
      const b = Math.min(1, t + 2e-3);
      const height = f(t) * thickness;
      const slope = (f(b) - f(a)) / (b - a) * (thickness / bezel);
      const incidence = Math.atan(slope);
      const refracted = Math.asin(Math.min(1, Math.sin(incidence) / n));
      const deviation = incidence - refracted;
      const m = Math.tan(deviation) * height;
      mags[i] = m;
      if (m > max) max = m;
    }
    const profile = { mags, max: Math.max(max, 1e-4) };
    profileCache.set(key, profile);
    return profile;
  }
  function buildMap(w, h2, r, bezel, profile) {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h2;
    const ctx2 = canvas.getContext("2d");
    const img = ctx2.createImageData(w, h2);
    const px = img.data;
    const hw = w / 2;
    const hh = h2 / 2;
    const ix = hw - r;
    const iy = hh - r;
    const N = profile.mags.length;
    const inv = 1 / profile.max;
    for (let y = 0; y < h2; y++) {
      const dy = y + 0.5 - hh;
      const sy = dy < 0 ? -1 : 1;
      const qy = Math.abs(dy) - iy;
      for (let x = 0; x < w; x++) {
        const dx = x + 0.5 - hw;
        const sx = dx < 0 ? -1 : 1;
        const qx = Math.abs(dx) - ix;
        let sd;
        let gx;
        let gy;
        if (qx > 0 && qy > 0) {
          const len = Math.hypot(qx, qy);
          sd = len - r;
          gx = qx * sx / len;
          gy = qy * sy / len;
        } else if (qx > qy) {
          sd = qx - r;
          gx = sx;
          gy = 0;
        } else {
          sd = qy - r;
          gx = 0;
          gy = sy;
        }
        const depth = -sd;
        let R2 = 128;
        let G2 = 128;
        if (depth > 0 && depth < bezel) {
          const pos = depth / bezel * (N - 1);
          const i0 = Math.floor(pos);
          const fr = pos - i0;
          const m = (profile.mags[i0] * (1 - fr) + profile.mags[Math.min(N - 1, i0 + 1)] * fr) * inv;
          R2 = 128 - gx * m * 127;
          G2 = 128 - gy * m * 127;
        }
        const o = (y * w + x) * 4;
        px[o] = R2;
        px[o + 1] = G2;
        px[o + 2] = 128;
        px[o + 3] = 255;
      }
    }
    ctx2.putImageData(img, 0, 0);
    return canvas.toDataURL("image/png");
  }
  function ensureDefs() {
    if (defs) return defs;
    const svg3 = document.createElementNS(SVG_NS, "svg");
    svg3.setAttribute("class", "glass-defs");
    svg3.setAttribute("width", "0");
    svg3.setAttribute("height", "0");
    svg3.setAttribute("aria-hidden", "true");
    defs = document.createElementNS(SVG_NS, "defs");
    svg3.appendChild(defs);
    document.body.appendChild(svg3);
    return defs;
  }
  function buildFilter(state) {
    const { opts } = state;
    const filter = ns("filter");
    filter.setAttribute("id", state.id);
    filter.setAttribute("color-interpolation-filters", "sRGB");
    filter.setAttribute("filterUnits", "userSpaceOnUse");
    filter.setAttribute("primitiveUnits", "userSpaceOnUse");
    filter.setAttribute("x", "0");
    filter.setAttribute("y", "0");
    const image = ns("feImage");
    image.setAttribute("x", "0");
    image.setAttribute("y", "0");
    image.setAttribute("preserveAspectRatio", "none");
    image.setAttribute("result", "map");
    filter.appendChild(image);
    const disp = [];
    const displace = (result, mul) => {
      const node = ns("feDisplacementMap");
      node.setAttribute("in", "SourceGraphic");
      node.setAttribute("in2", "map");
      node.setAttribute("xChannelSelector", "R");
      node.setAttribute("yChannelSelector", "G");
      if (result) node.setAttribute("result", result);
      filter.appendChild(node);
      disp.push({ node, mul });
    };
    if (opts.ca > 0) {
      const channel = (name, values) => {
        const m = ns("feColorMatrix");
        m.setAttribute("in", `d${name}`);
        m.setAttribute("type", "matrix");
        m.setAttribute("values", values);
        m.setAttribute("result", `c${name}`);
        filter.appendChild(m);
      };
      displace("dR", 1 + opts.ca);
      channel("R", "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0");
      displace("dG", 1);
      channel("G", "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0");
      displace("dB", 1 - opts.ca);
      channel("B", "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0");
      const rg = ns("feBlend");
      rg.setAttribute("in", "cR");
      rg.setAttribute("in2", "cG");
      rg.setAttribute("mode", "screen");
      rg.setAttribute("result", "rg");
      filter.appendChild(rg);
      const rgb = ns("feBlend");
      rgb.setAttribute("in", "rg");
      rgb.setAttribute("in2", "cB");
      rgb.setAttribute("mode", "screen");
      filter.appendChild(rgb);
    } else {
      displace(null, 1);
    }
    ensureDefs().appendChild(filter);
    state.filter = filter;
    state.image = image;
    state.disp = disp;
  }
  function applyBackdrop(state, withFilter) {
    const o = state.opts;
    const boost = supportsRefraction && !state.opts.lite ? 1 : 1.5;
    const value = (withFilter ? `url(#${state.id}) ` : "") + `blur(${(o.blur * boost).toFixed(1)}px) saturate(${(o.saturate + (supportsRefraction ? 0 : 0.2)).toFixed(2)}) brightness(${o.brightness})`;
    state.el.style.backdropFilter = value;
    state.el.style.webkitBackdropFilter = value;
  }
  function setImageHref(node, url) {
    node.setAttribute("href", url);
    node.setAttributeNS(XLINK_NS, "xlink:href", url);
  }
  function updateScale(state) {
    if (!state.disp) return;
    const swell = 1 + (state.motion ? state.motion.press.value * 0.3 : 0);
    for (const d of state.disp) d.node.setAttribute("scale", (state.baseScale * d.mul * swell).toFixed(2));
  }
  function layout(state) {
    const { el, opts } = state;
    const w = Math.round(el.offsetWidth);
    const h2 = Math.round(el.offsetHeight);
    if (w < 4 || h2 < 4) return;
    const cs = getComputedStyle(el);
    let r = cs.borderTopLeftRadius;
    r = r.endsWith("%") ? parseFloat(r) / 100 * Math.min(w, h2) : parseFloat(r) || 0;
    r = Math.min(r, w / 2, h2 / 2);
    const bezel = clamp2(opts.bezel, 2, Math.min(w, h2) / 2);
    const key = [w, h2, r.toFixed(1), bezel, opts.thickness, opts.index, opts.surface].join("|");
    if (state.key === key) return;
    state.key = key;
    if (!supportsRefraction || opts.lite) {
      if (!state.applied) {
        applyBackdrop(state, false);
        state.applied = true;
      }
      return;
    }
    if (!state.filter) buildFilter(state);
    let entry = mapCache.get(key);
    if (!entry) {
      const profile = getProfile(opts.surface, bezel, opts.thickness, opts.index);
      entry = { url: buildMap(w, h2, r, bezel, profile), max: profile.max };
      mapCache.set(key, entry);
      if (mapCache.size > 80) mapCache.delete(mapCache.keys().next().value);
    }
    state.baseScale = 2 * entry.max * opts.refraction;
    state.filter.setAttribute("width", w);
    state.filter.setAttribute("height", h2);
    state.image.setAttribute("width", w);
    state.image.setAttribute("height", h2);
    setImageHref(state.image, entry.url);
    updateScale(state);
    if (!state.applied) {
      applyBackdrop(state, true);
      state.applied = true;
    }
  }
  function createMotion(state) {
    const o = state.opts;
    const m = {
      scale: new Spring(1, { response: 0.4, damping: 0.62 }),
      x: new Spring(0, { response: 0.34, damping: 0.68 }),
      y: new Spring(0, { response: 0.34, damping: 0.68 }),
      sx: new Spring(1, { response: 0.34, damping: 0.6 }),
      sy: new Spring(1, { response: 0.34, damping: 0.6 }),
      press: new Spring(0, { response: 0.3, damping: 0.9 }),
      hover: new Spring(0, { response: 0.4, damping: 1 }),
      la: new Spring(DEFAULT_LIGHT, { response: 0.5, damping: 1 }),
      pressed: false,
      hovered: false,
      pointerId: null
    };
    m.springs = [m.scale, m.x, m.y, m.sx, m.sy, m.press, m.hover, m.la];
    m.tick = (dt) => {
      for (const s of m.springs) s.step(dt);
      render(state);
      return m.springs.some((s) => !s.atRest);
    };
    state.motion = m;
    return m;
  }
  function render(state) {
    const { el, motion: m, opts: o } = state;
    if (!o.isStatic && !prefersReducedMotion) {
      const resting = m.scale.atRest && m.x.atRest && m.y.atRest && m.sx.atRest && m.sy.atRest && m.scale.value === 1 && m.x.value === 0 && m.y.value === 0 && m.sx.value === 1 && m.sy.value === 1;
      el.style.transform = resting ? "" : `translate3d(${m.x.value.toFixed(2)}px, ${m.y.value.toFixed(2)}px, 0) scale(${(m.scale.value * m.sx.value).toFixed(4)}, ${(m.scale.value * m.sy.value).toFixed(4)})`;
    }
    el.style.setProperty("--la", `${m.la.value.toFixed(1)}deg`);
    el.style.setProperty("--press", m.press.value.toFixed(3));
    el.style.setProperty("--hover", m.hover.value.toFixed(3));
    const swell = m.press.value.toFixed(2);
    if (swell !== state.lastSwell) {
      state.lastSwell = swell;
      updateScale(state);
    }
  }
  function wake(state) {
    animate(state.motion.tick);
  }
  function retarget(state) {
    const { motion: m, opts: o } = state;
    const pressed = m.pressed;
    const hovered = m.hovered;
    if (pressed) {
      m.scale.setParams(0.2, 0.86);
      m.scale.set(o.pressScale);
    } else {
      m.scale.setParams(0.42, 0.62);
      m.scale.set(hovered ? o.hoverScale : 1);
    }
    m.press.set(pressed ? 1 : 0);
    m.hover.set(pressed || hovered ? 1 : 0);
    if (!pressed) {
      m.x.set(0);
      m.y.set(hovered ? -o.lift : 0);
      m.sx.set(1);
      m.sy.set(1);
    }
    wake(state);
  }
  function setShimmer(state, e) {
    const r = state.el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    state.el.style.setProperty("--mx", `${((e.clientX - r.left) / r.width * 100).toFixed(1)}%`);
    state.el.style.setProperty("--my", `${((e.clientY - r.top) / r.height * 100).toFixed(1)}%`);
  }
  function bindPointer(state) {
    const { el, motion: m, opts: o } = state;
    const onDragMove = (e) => {
      if (e.pointerId !== m.pointerId) return;
      setShimmer(state, e);
      if (o.isStatic || prefersReducedMotion) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2 - m.x.value;
      const cy = r.top + r.height / 2 - m.y.value;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const lim = o.dragLimit;
      m.x.set(rubber2(dx, lim));
      m.y.set(rubber2(dy, lim));
      const ax = clamp2(Math.abs(dx) / 70, 0, 1);
      const ay = clamp2(Math.abs(dy) / 70, 0, 1);
      m.sx.set(1 + 0.1 * ax - 0.05 * ay);
      m.sy.set(1 + 0.1 * ay - 0.05 * ax);
      wake(state);
    };
    const end = (e) => {
      if (e.pointerId !== m.pointerId) return;
      m.pressed = false;
      m.pointerId = null;
      window.removeEventListener("pointermove", onDragMove);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      if (e.pointerType === "touch") m.hovered = false;
      retarget(state);
    };
    el.addEventListener("pointerenter", (e) => {
      if (e.pointerType === "touch") return;
      m.hovered = true;
      setShimmer(state, e);
      retarget(state);
    });
    const aim = (e) => {
      const r = el.getBoundingClientRect();
      const a = Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI + 90;
      m.la.set(m.la.value + angleDelta(m.la.value, a));
      wake(state);
    };
    el.addEventListener("pointermove", (e) => {
      if (!m.pressed) setShimmer(state, e);
      if (e.pointerType !== "touch") aim(e);
    });
    el.addEventListener("pointerleave", () => {
      m.hovered = false;
      m.la.set(m.la.value + angleDelta(m.la.value, DEFAULT_LIGHT));
      retarget(state);
    });
    el.addEventListener("pointerdown", (e) => {
      if (e.button > 0 || m.pressed) return;
      m.pressed = true;
      m.pointerId = e.pointerId;
      setShimmer(state, e);
      window.addEventListener("pointermove", onDragMove);
      window.addEventListener("pointerup", end);
      window.addEventListener("pointercancel", end);
      retarget(state);
    });
  }
  function readOptions(el) {
    const d = el.dataset;
    const num = (v, def) => v === void 0 || v === "" || Number.isNaN(+v) ? def : +v;
    return {
      bezel: num(d.glassBezel, 20),
      thickness: num(d.glassThickness, 50),
      refraction: num(d.glassRefraction, 1),
      index: num(d.glassIndex, 1.5),
      surface: d.glassSurface || "squircle",
      blur: num(d.glassBlur, 6),
      saturate: num(d.glassSaturate, 1.6),
      brightness: num(d.glassBrightness, 1.05),
      ca: coarsePointer ? 0 : num(d.glassCa, 0),
      lite: "glassLite" in d,
      isStatic: "glassStatic" in d,
      manual: "glassManual" in d,
      pressScale: num(d.pressScale, 1.06),
      hoverScale: num(d.hoverScale, 1),
      lift: num(d.hoverLift, 0),
      dragLimit: num(d.dragLimit, 16)
    };
  }
  function scheduleLayout(state) {
    layoutQueue.add(state);
    if (layoutScheduled) return;
    layoutScheduled = true;
    requestAnimationFrame(() => {
      layoutScheduled = false;
      const batch = layoutQueue;
      layoutQueue = /* @__PURE__ */ new Set();
      batch.forEach(layout);
    });
  }
  function registerGlass(el) {
    if (states.has(el)) return states.get(el);
    const state = { el, id: `lg-${++uid}`, opts: readOptions(el), key: "", applied: false };
    createMotion(state);
    states.set(el, state);
    state.api = {
      press(v) {
        state.motion.pressed = !!v;
        retarget(state);
      },
      hover(v) {
        state.motion.hovered = !!v;
        retarget(state);
      },
      refresh() {
        state.key = "";
        scheduleLayout(state);
      }
    };
    if (!state.opts.manual) bindPointer(state);
    resizeObserver.observe(el, { box: "border-box" });
    scheduleLayout(state);
    render(state);
    return state;
  }
  function getGlass(el) {
    return states.get(el)?.api;
  }
  function refreshGlass() {
    states.forEach((s) => s.api.refresh());
  }
  function initGlass() {
    document.querySelectorAll("[data-glass]").forEach(registerGlass);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refreshGlass);
  }
  var SVG_NS, XLINK_NS, DEFAULT_LIGHT, ua, isBlink, coarsePointer, supportsRefraction, states, mapCache, profileCache, defs, uid, SURFACES, ns, layoutQueue, layoutScheduled, resizeObserver;
  var init_glass = __esm({
    "js/glass.js"() {
      init_spring();
      SVG_NS = "http://www.w3.org/2000/svg";
      XLINK_NS = "http://www.w3.org/1999/xlink";
      DEFAULT_LIGHT = -40;
      ua = navigator.userAgent;
      isBlink = /Chrome\/|Chromium\//.test(ua) && !/(iPhone|iPad|iPod|CriOS|FxiOS|EdgiOS|OPiOS)/.test(ua);
      coarsePointer = window.matchMedia("(pointer: coarse)").matches;
      supportsRefraction = isBlink && CSS.supports("backdrop-filter", "blur(1px)");
      document.documentElement.classList.add(supportsRefraction ? "has-refraction" : "no-refraction");
      states = /* @__PURE__ */ new Map();
      mapCache = /* @__PURE__ */ new Map();
      profileCache = /* @__PURE__ */ new Map();
      defs = null;
      uid = 0;
      SURFACES = {
        // Apple-style squircle: soft transition into the flat interior, smooth refraction gradients.
        squircle: (t) => Math.pow(1 - Math.pow(1 - t, 4), 0.25),
        // Plain circular dome: harsher edge, stronger "lens" feel.
        circle: (t) => Math.sqrt(1 - (1 - t) * (1 - t)),
        // Convex outside, concave inside (used by iOS switches).
        lip: (t) => {
          const convex = Math.pow(1 - Math.pow(1 - t, 4), 0.25);
          const s = t * t * t * (t * (t * 6 - 15) + 10);
          return convex * (1 - s) + (1 - convex) * s;
        }
      };
      ns = (name) => document.createElementNS(SVG_NS, name);
      layoutQueue = /* @__PURE__ */ new Set();
      layoutScheduled = false;
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const state = states.get(entry.target);
          if (state) scheduleLayout(state);
        }
      });
    }
  });

  // js/core/util.js
  var clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  var $ = (s, r = document) => r.querySelector(s);
  var rubber = (x, d, c = 0.55) => (x < 0 ? -1 : 1) * (1 - 1 / (Math.abs(x) * c / d + 1)) * d;
  function h(sel, props, ...kids) {
    const m = sel.match(/^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i);
    const el = document.createElement(m?.[1] || "div");
    (m?.[2].match(/[.#][\w-]+/g) || []).forEach((t) => t[0] === "." ? el.classList.add(t.slice(1)) : el.id = t.slice(1));
    if (props && (typeof props !== "object" || props.nodeType || Array.isArray(props))) {
      kids.unshift(props);
      props = null;
    }
    for (const [k, v] of Object.entries(props || {})) {
      if (k === "style" && typeof v === "object") Object.assign(el.style, v);
      else if (k === "on") for (const [ev, fn] of Object.entries(v)) el.addEventListener(ev, fn);
      else if (k === "html") el.innerHTML = v;
      else if (k === "class") el.className += " " + v;
      else if (v !== false && v != null) el.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(kid));
    return el;
  }
  var store = {
    get(k, d) {
      try {
        const v = localStorage.getItem("ios18:" + k);
        return v == null ? d : JSON.parse(v);
      } catch {
        return d;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem("ios18:" + k, JSON.stringify(v));
      } catch {
      }
    }
  };
  var Velocity = class {
    constructor() {
      this.s = [];
    }
    reset() {
      this.s = [];
    }
    push(x, y) {
      const t = performance.now();
      this.s.push({ x, y, t });
      while (this.s.length > 2 && t - this.s[0].t > 90) this.s.shift();
    }
    get() {
      const a = this.s[0];
      const b = this.s[this.s.length - 1];
      if (!a || a === b || b.t - a.t < 8 || performance.now() - b.t > 90) return { x: 0, y: 0 };
      const dt = (b.t - a.t) / 1e3;
      return { x: (b.x - a.x) / dt, y: (b.y - a.y) / dt };
    }
  };
  var sys = {
    v: {},
    subs: {},
    init(defaults) {
      for (const [k, d] of Object.entries(defaults)) this.v[k] = store.get(k, d);
    },
    get(k) {
      return this.v[k];
    },
    set(k, val, persist = true) {
      this.v[k] = val;
      if (persist) store.set(k, val);
      (this.subs[k] || []).forEach((f) => f(val));
      (this.subs["*"] || []).forEach((f) => f(k, val));
    },
    on(k, f, immediate = true) {
      var _a;
      ((_a = this.subs)[k] || (_a[k] = [])).push(f);
      if (immediate && k !== "*") f(this.v[k]);
    }
  };

  // js/core/metrics.js
  var W = 440;
  var H = 956;
  var R = 62;
  var ICON = 62;
  var ICON_R = ICON * 0.2237;
  var ISLAND = { w: 100, h: 30, top: 11 };
  var COL_PITCH = 96.5;
  var ROW_PITCH = 112;
  var GRID_X = 28;
  var GRID_Y = 92;
  var slotXY = (i) => ({
    x: GRID_X + i % 4 * COL_PITCH + (COL_PITCH - ICON) / 2,
    y: GRID_Y + Math.floor(i / 4) * ROW_PITCH
  });
  var DOCK = { x: 12, y: 836, w: 416, h: 96 };

  // js/core/ctx.js
  var ctx = {
    phone: null,
    screen: null,
    el: {},
    mod: {},
    /** pointer position in screen points */
    pt(e) {
      const r = this.screen.getBoundingClientRect();
      const k = r.width / W;
      return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k };
    },
    /** element rect in screen points */
    rect(el) {
      const sr = this.screen.getBoundingClientRect();
      const k = sr.width / W;
      const r = el.getBoundingClientRect();
      return { x: (r.left - sr.left) / k, y: (r.top - sr.top) / k, w: r.width / k, h: r.height / k };
    }
  };

  // js/main.js
  init_glass();

  // js/system/device.js
  function buildDevice() {
    const stage = $("#stage");
    stage.innerHTML = `
    <div class="phone" id="phone" data-color="${sys.get("color")}">
        <div class="frame"></div><div class="bezel"></div>
        <div class="hw l action" data-hw="action" title="Action button"></div>
        <div class="hw l volup" data-hw="volup" title="Volume up"></div>
        <div class="hw l voldown" data-hw="voldown" title="Volume down"></div>
        <div class="hw r power" data-hw="power" title="Side button (lock / wake)"></div>
        <div class="hw r camctl" data-hw="camctl" title="Camera Control"></div>
        <div class="screen" id="screen" data-theme="light">
            <div class="home" id="home"></div>
            <div class="windows" id="windows"></div>
            <div class="switcher" id="switcher"></div>
            <div class="lock" id="lock"></div>
            <div class="cc" id="cc"></div>
            <div class="spot" id="spot"></div>
            <div class="kb" id="kb"></div>
            <div class="banners" id="banners"></div>
            <div class="statusbar" id="sb"></div>
            <div class="island" id="island"></div>
            <div class="indicator" id="ind"><i></i></div>
            <div class="hud" id="hud"></div>
            <div class="sheen"></div>
            <div class="dim" id="dim"></div>
            <div class="off" id="off"></div>
        </div>
    </div>`;
    ctx.phone = $("#phone");
    ctx.screen = $("#screen");
    for (const id of ["home", "windows", "switcher", "lock", "cc", "spot", "kb", "banners", "sb", "island", "ind", "hud", "dim", "off"]) ctx.el[id] = $("#" + id);
    const fit = () => {
      const vw = innerWidth;
      const vh = innerHeight;
      const bare = vw < 520;
      ctx.phone.classList.toggle("bare", bare);
      const s = bare ? Math.min(vw / W, vh / H) : Math.min((vw - 24) / 471, (vh - 24) / 987, 1.2);
      ctx.phone.style.setProperty("--s", s.toFixed(4));
    };
    fit();
    addEventListener("resize", fit);
    sys.on("theme", (t) => ctx.screen.setAttribute("data-theme", t));
    sys.on("color", (c) => ctx.phone.setAttribute("data-color", c));
    sys.on("brightness", (b) => ctx.el.dim.style.opacity = ((1 - b) * 0.78).toFixed(3));
    sys.on("glass", (g2) => {
      const a = sys.get("theme") === "dark" ? 0.04 + g2 * 0.3 : 0.07 + g2 * 0.45;
      ctx.screen.style.setProperty("--glass-fill", sys.get("theme") === "dark" ? `rgba(40,40,46,${a})` : `rgba(255,255,255,${a})`);
    });
    sys.on("theme", () => sys.set("glass", sys.get("glass"), false), false);
  }

  // js/system/statusbar.js
  var SIGNAL = `<svg width="19" height="12" viewBox="0 0 19 12"><rect x="0" y="8" width="3.2" height="4" rx="1" fill="currentColor"/><rect x="5" y="5.5" width="3.2" height="6.5" rx="1" fill="currentColor"/><rect x="10" y="3" width="3.2" height="9" rx="1" fill="currentColor"/><rect x="15" y="0" width="3.2" height="12" rx="1" fill="currentColor"/></svg>`;
  var WIFI = `<svg width="17" height="12" viewBox="0 0 17 12" fill="currentColor"><path d="M8.5 2.3c2.4 0 4.6.9 6.3 2.5.1.1.3.1.4 0l1.1-1.1c.1-.1.1-.3 0-.4C14.3 1.2 11.5 0 8.5 0S2.7 1.2.7 3.3c-.1.1-.1.3 0 .4l1.1 1.1c.1.1.3.1.4 0 1.7-1.6 3.9-2.5 6.3-2.5zm0 3.9c1.3 0 2.5.5 3.4 1.3.1.1.3.1.4 0l1.1-1.1c.1-.1.1-.3 0-.4-1.2-1.1-2.9-1.8-4.9-1.8s-3.7.7-4.9 1.8c-.1.1-.1.3 0 .4l1.1 1.1c.1.1.3.1.4 0 .9-.8 2.1-1.3 3.4-1.3zm2.1 2.6c.1-.1.1-.3 0-.4-.5-.5-1.3-.8-2.1-.8s-1.6.3-2.1.8c-.1.1-.1.3 0 .4l1.8 1.8c.2.2.4.2.6 0l1.8-1.8z"/></svg>`;
  function initStatusBar() {
    const sb = ctx.el.sb;
    sb.innerHTML = `<div class="sb-l"><span id="sb-time">9:41</span></div>
        <div class="sb-r"><span id="sb-sig">${SIGNAL}</span><span id="sb-5g">5G</span><span id="sb-wifi">${WIFI}</span>
        <span class="batt"><i class="body"><b id="sb-lvl"></b></i><i class="cap"></i><em id="sb-pct">100</em></span></div>`;
    const t = sb.querySelector("#sb-time");
    const tick = () => {
      const d = /* @__PURE__ */ new Date();
      t.textContent = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: false }).replace(/^0/, "");
    };
    tick();
    setInterval(tick, 5e3);
    const lvl = sb.querySelector("#sb-lvl");
    const pct = sb.querySelector("#sb-pct");
    const setBatt = (p, charging) => {
      lvl.style.width = `${Math.max(8, p * 100)}%`;
      pct.textContent = Math.round(p * 100);
      lvl.parentNode.parentNode.classList.toggle("low", p <= 0.2);
      lvl.parentNode.parentNode.classList.toggle("chg", !!charging);
    };
    setBatt(1);
    navigator.getBattery?.().then((b) => {
      const u = () => setBatt(b.level, b.charging);
      b.addEventListener("levelchange", u);
      b.addEventListener("chargingchange", u);
      u();
    });
    sys.on("airplane", (a) => {
      sb.querySelector("#sb-sig").style.opacity = a ? 0.35 : 1;
      sb.querySelector("#sb-5g").style.display = a ? "none" : "";
    });
    sys.on("wifi", (w) => sb.querySelector("#sb-wifi").style.opacity = w ? 1 : 0.35);
    ctx.mod.setStatusTone = (tone2) => sb.setAttribute("data-tone", tone2);
    ctx.mod.setIndicatorTone = (tone2) => ctx.el.ind.setAttribute("data-tone", tone2);
  }

  // js/system/hud.js
  function initHud() {
    const hud = ctx.el.hud;
    hud.innerHTML = `<div class="vol" data-glass data-glass-lite data-glass-static data-glass-bezel="14"><b></b><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="#fff"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/></svg></div>`;
    const vol = hud.querySelector(".vol");
    const fill = vol.querySelector("b");
    let timer = 0;
    ctx.mod.showVolume = () => {
      fill.style.height = `${sys.get("volume") * 100}%`;
      hud.classList.add("on");
      clearTimeout(timer);
      timer = setTimeout(() => hud.classList.remove("on"), 1600);
    };
    ctx.mod.bumpVolume = (d) => {
      sys.set("volume", clamp(Math.round((sys.get("volume") + d) * 16) / 16, 0, 1));
      ctx.mod.showVolume();
    };
  }

  // js/core/motion.js
  init_spring();
  var UNIT = /* @__PURE__ */ new Set(["s", "p", "u"]);
  var Group = class {
    constructor(values, params, apply) {
      this.p = params;
      this.apply = apply;
      this.s = {};
      for (const [k, v] of Object.entries(values)) {
        const sp = this.s[k] = new Spring(v, params);
        if (!UNIT.has(k)) sp.eps = 0.03, sp.veps = 0.4;
      }
      this.done = null;
      this.tick = (dt) => {
        for (const s of Object.values(this.s)) s.step(dt);
        this.apply(this.values);
        const rest = Object.values(this.s).every((s) => s.atRest);
        if (rest && this.done) {
          const d = this.done;
          this.done = null;
          d();
        }
        return !rest;
      };
    }
    get values() {
      const o = {};
      for (const [k, s] of Object.entries(this.s)) o[k] = s.value;
      return o;
    }
    snap(values) {
      for (const [k, v] of Object.entries(values)) this.s[k]?.snap(v);
      this.apply(this.values);
    }
    /** Move current value without touching target/velocity (used while dragging). */
    drive(values) {
      for (const [k, v] of Object.entries(values)) if (this.s[k]) {
        this.s[k].value = this.s[k].target = v;
        this.s[k].velocity = 0;
      }
      this.apply(this.values);
    }
    to(targets, { params, velocity, done } = {}) {
      const pr = params || this.p;
      for (const [k, v] of Object.entries(targets)) {
        const s = this.s[k];
        if (!s) continue;
        s.setParams(pr.response, pr.damping);
        s.set(v);
        if (velocity && velocity[k] != null) s.velocity = velocity[k];
      }
      this.done = done || null;
      animate(this.tick);
    }
    get resting() {
      return Object.values(this.s).every((s) => s.atRest);
    }
  };
  var SPRING = {
    open: { response: 0.5, damping: 0.9 },
    close: { response: 0.46, damping: 0.88 },
    ui: { response: 0.42, damping: 0.86 },
    soft: { response: 0.55, damping: 1 },
    bouncy: { response: 0.45, damping: 0.7 }
  };

  // js/core/apps.js
  var APPS = {};
  var registerApp = (def) => APPS[def.id] = { status: "dark", bg: "var(--bg)", ...def };
  var g = (a, b) => `linear-gradient(180deg, ${a}, ${b})`;
  var svg = (inner) => `<svg viewBox="0 0 64 64" width="100%" height="100%">${inner}</svg>`;
  var ICONS = {
    phone: [g("#72e57f", "#1fae3b"), svg(`<path fill="#fff" d="M19.5 14.5c1-1.3 2.9-1.5 4.1-.4l3.1 2.8c1 .9 1.2 2.3.5 3.4l-1.6 2.5c2.1 3.7 5.1 6.7 8.8 8.8l2.5-1.6c1.1-.7 2.5-.5 3.4.5l2.8 3.1c1.1 1.2.9 3.1-.4 4.1-2.2 1.7-5.1 2.4-7.7 1.6C25.4 42.5 17.700 34.800 14.100 22.900c-.8-2.600-.1-5.500 1.600-7.700z" transform="translate(.5 .5) scale(.97)"/>`)],
    messages: [g("#72e57f", "#1fae3b"), svg(`<path fill="#fff" d="M32 13c-11.600 0-21 7.300-21 16.300 0 4.900 2.800 9.300 7.200 12.200-.4 2.600-1.600 5-3.400 6.800 3.400-.2 6.400-1.600 8.700-3.500 2.700.9 5.600 1.400 8.500 1.400 11.600 0 21-7.300 21-16.300S43.600 13 32 13z"/>`)],
    safari: [g("#4cc0ff", "#1166e6"), svg(`<circle cx="32" cy="32" r="22" fill="none" stroke="#fff" stroke-width="2.4" opacity=".9"/><path d="M32 8v6M32 50v6M8 32h6M50 32h6" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><path d="M42.500 21.500 35 35l-13.500 7.500L29 29z" fill="#fff"/><path d="M42.500 21.500 35 35 29 29z" fill="#ff453a"/>`)],
    music: [g("#ff7a90", "#f5213f"), svg(`<path fill="#fff" d="M43 12.500 26 16.200c-1.100.2-1.800 1.100-1.800 2.200v19.100a6.800 6.800 0 1 0 3.600 6V24.800l11.800-2.600v11.700a6.800 6.800 0 1 0 3.600 6V14.700c0-1.500-1.200-2.500-2.200-2.200z" transform="translate(-1 0)"/>`)],
    camera: [g("#c9c9ce", "#6e6e73"), svg(`<path fill="#1c1c1e" d="M22 18l3-4.500h14L42 18h6.500A5.500 5.500 0 0 1 54 23.500v20A5.500 5.500 0 0 1 48.500 49h-33A5.500 5.500 0 0 1 10 43.500v-20A5.500 5.500 0 0 1 15.500 18z"/><circle cx="32" cy="33" r="9.500" fill="#3a3a3f" stroke="#8e8e93" stroke-width="2"/><circle cx="32" cy="33" r="5" fill="#0b0b10"/><circle cx="46" cy="23.500" r="1.700" fill="#ff9f0a"/>`)],
    photos: ["#fff", svg(`<g style="mix-blend-mode:multiply" opacity=".9"><ellipse cx="32" cy="19" rx="8.5" ry="13" fill="#ff9f0a" transform="rotate(0 32 32)"/><ellipse cx="32" cy="19" rx="8.5" ry="13" fill="#ff453a" transform="rotate(45 32 32)"/><ellipse cx="32" cy="19" rx="8.5" ry="13" fill="#ff375f" transform="rotate(90 32 32)"/><ellipse cx="32" cy="19" rx="8.5" ry="13" fill="#bf5af2" transform="rotate(135 32 32)"/><ellipse cx="32" cy="19" rx="8.5" ry="13" fill="#0a84ff" transform="rotate(180 32 32)"/><ellipse cx="32" cy="19" rx="8.5" ry="13" fill="#30d158" transform="rotate(225 32 32)"/><ellipse cx="32" cy="19" rx="8.5" ry="13" fill="#ffd60a" transform="rotate(270 32 32)"/><ellipse cx="32" cy="19" rx="8.5" ry="13" fill="#ff9f0a" transform="rotate(315 32 32)"/></g>`)],
    clock: ["#0b0b0d", svg(`<circle cx="32" cy="32" r="25" fill="#fff"/><g stroke="#1c1c1e" stroke-width="2" stroke-linecap="round">${Array.from({ length: 12 }, (_, i) => `<path d="M32 10v${i % 3 ? 3 : 5}" transform="rotate(${i * 30} 32 32)"/>`).join("")}</g><path d="M32 32V18M32 32l9 5" stroke="#1c1c1e" stroke-width="3.200" stroke-linecap="round"/><path d="M32 32L24 44" stroke="#ff9f0a" stroke-width="1.800" stroke-linecap="round"/><circle cx="32" cy="32" r="2.500" fill="#ff9f0a"/>`)],
    weather: [g("#2f80ff", "#68c3ff"), svg(`<circle cx="24" cy="24" r="9" fill="#ffd60a"/><path d="M24 8v4M10 24H6M12 12l3 3M36 12l-3 3" stroke="#ffd60a" stroke-width="2.600" stroke-linecap="round"/><path fill="#fff" d="M25 44a8 8 0 0 1 1.500-15.800A11 11 0 0 1 47.500 31 7 7 0 0 1 47 44z"/>`)],
    notes: [g("#ffe66b", "#ffc400"), svg(`<rect x="0" y="22" width="64" height="42" fill="#fff"/><g stroke="#e0e0e5" stroke-width="2"><path d="M8 34h48M8 44h48M8 54h30"/></g><rect y="0" width="64" height="22" fill="none"/>`)],
    calculator: [g("#4a4a50", "#1c1c1f"), svg(`<rect x="12" y="12" width="40" height="13" rx="3.500" fill="#2c2c30"/><g fill="#8e8e93"><circle cx="19" cy="35" r="4.500"/><circle cx="32" cy="35" r="4.500"/><circle cx="19" cy="48" r="4.500"/><circle cx="32" cy="48" r="4.500"/></g><g fill="#ff9f0a"><circle cx="45" cy="35" r="4.500"/><circle cx="45" cy="48" r="4.500"/></g>`)],
    settings: [g("#b9bcc4", "#6e7078"), svg(`<g fill="#2a2a2e"><circle cx="32" cy="32" r="15"/>${Array.from({ length: 8 }, (_, i) => `<rect x="28" y="9" width="8" height="12" rx="2.500" transform="rotate(${i * 45} 32 32)"/>`).join("")}</g><circle cx="32" cy="32" r="8.500" fill="#b9bcc4"/><circle cx="32" cy="32" r="4.200" fill="#2a2a2e"/>`)],
    maps: [g("#7be08a", "#3ba7ff"), svg(`<path d="M0 44 64 22v12L0 56z" fill="#fff" opacity=".9"/><path d="M32 12a11 11 0 0 1 11 11c0 9-11 21-11 21S21 32 21 23a11 11 0 0 1 11-11z" fill="#ff453a"/><circle cx="32" cy="23" r="4.200" fill="#fff"/>`)],
    mail: [g("#5cc8ff", "#0a6cff"), svg(`<rect x="10" y="17" width="44" height="31" rx="5" fill="#fff"/><path d="M12 21l20 14 20-14" fill="none" stroke="#0a6cff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`)],
    appstore: [g("#4dc6ff", "#0a6cff"), svg(`<g stroke="#fff" stroke-width="5" stroke-linecap="round"><path d="M32 13 21 33M32 13l11 20M17 41h30M23 30l8 11"/></g>`)],
    wallet: ["#0b0b0d", svg(`<rect x="10" y="17" width="44" height="9" rx="3" fill="#ff453a"/><rect x="10" y="24" width="44" height="9" rx="3" fill="#ffd60a"/><rect x="10" y="31" width="44" height="9" rx="3" fill="#30d158"/><rect x="10" y="38" width="44" height="12" rx="4" fill="#0a84ff"/>`)],
    health: ["#fff", svg(`<path d="M32 50C14 38 10 28 10 22a10.500 10.500 0 0 1 22-4 10.500 10.500 0 0 1 22 4c0 6-4 16-22 28z" fill="#ff2d55"/>`)],
    files: [g("#5cc8ff", "#0a6cff"), svg(`<path d="M10 20a4 4 0 0 1 4-4h12l5 5h19a4 4 0 0 1 4 4v22a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4z" fill="#fff"/>`)],
    tv: ["#0b0b0d", svg(`<text x="32" y="40" text-anchor="middle" font-family="Inter,sans-serif" font-weight="700" font-size="22" fill="#fff">tv</text>`)],
    stocks: ["#0b0b0d", svg(`<path d="M8 44l12-12 9 8 14-18 13 10" fill="none" stroke="#30d158" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`)],
    translate: [g("#5cc8ff", "#0a6cff"), svg(`<text x="22" y="34" text-anchor="middle" font-family="Inter,sans-serif" font-weight="700" font-size="22" fill="#fff">A</text><text x="42" y="48" text-anchor="middle" font-family="Inter,sans-serif" font-weight="700" font-size="18" fill="#fff" opacity=".85">\u6587</text>`)],
    home: [g("#ffb340", "#ff8a00"), svg(`<path d="M32 12 10 32h6v18h12V38h8v12h12V32h6z" fill="#fff"/>`)],
    podcasts: [g("#c07bff", "#7a2cf0"), svg(`<circle cx="32" cy="27" r="6" fill="#fff"/><path d="M32 36v14" stroke="#fff" stroke-width="5" stroke-linecap="round"/><path d="M20 27a12 12 0 0 1 24 0M14 27a18 18 0 0 1 36 0" fill="none" stroke="#fff" stroke-width="3.500" stroke-linecap="round"/>`)],
    reminders: ["#fff", svg(`<g fill="none" stroke="#ff9f0a" stroke-width="3.500"><circle cx="16" cy="20" r="4.500" stroke="#0a84ff"/><circle cx="16" cy="32" r="4.500" stroke="#ff9f0a"/><circle cx="16" cy="44" r="4.500" stroke="#ff453a"/></g><g stroke="#c7c7cc" stroke-width="3" stroke-linecap="round"><path d="M28 20h24M28 32h24M28 44h24"/></g>`)],
    compass: ["#0b0b0d", svg(`<circle cx="32" cy="32" r="22" fill="none" stroke="#fff" stroke-width="2.500"/><path d="M32 14 38 32H26z" fill="#ff453a"/><path d="M32 50 26 32h12z" fill="#fff"/>`)]
  };
  function iconHTML(id, name) {
    if (id === "calendar") {
      const d = /* @__PURE__ */ new Date();
      return `<div class="icon cal"><span class="cd">${d.toLocaleDateString("en", { weekday: "short" }).toUpperCase()}</span><b>${d.getDate()}</b></div>`;
    }
    const [bg, art] = ICONS[id] || ICONS.compass;
    return `<div class="icon" style="background:${bg}">${art}</div>`;
  }

  // js/core/wallpapers.js
  var WALLPAPERS = [
    { id: "aurora", name: "Aurora", css: "radial-gradient(120% 70% at 20% 10%, #7b5cff 0%, transparent 60%), radial-gradient(90% 70% at 90% 30%, #00d4ff 0%, transparent 55%), radial-gradient(100% 80% at 40% 100%, #ff4fa3 0%, transparent 60%), #1a1240" },
    { id: "sunset", name: "Sunset", css: "radial-gradient(110% 70% at 80% 0%, #ffcf5c 0%, transparent 55%), radial-gradient(100% 80% at 10% 40%, #ff5f6d 0%, transparent 60%), radial-gradient(120% 70% at 60% 100%, #6a2cff 0%, transparent 60%), #2a0f3a" },
    { id: "ocean", name: "Ocean", css: "radial-gradient(100% 70% at 70% 0%, #5ef0ff 0%, transparent 55%), radial-gradient(110% 80% at 0% 60%, #1668ff 0%, transparent 60%), radial-gradient(100% 70% at 80% 100%, #00c2a8 0%, transparent 60%), #04163a" },
    { id: "bloom", name: "Bloom", css: "radial-gradient(90% 60% at 30% 15%, #ffd1f0 0%, transparent 60%), radial-gradient(100% 70% at 90% 50%, #b69cff 0%, transparent 60%), radial-gradient(110% 70% at 20% 100%, #ff8fb1 0%, transparent 60%), #3b1a52" },
    { id: "graphite", name: "Graphite", css: "radial-gradient(100% 60% at 70% 0%, #5b5f6e 0%, transparent 60%), radial-gradient(100% 70% at 10% 100%, #2c3040 0%, transparent 60%), #0d0e14" },
    { id: "ember", name: "Ember", css: "radial-gradient(100% 70% at 50% 0%, #ff7a18 0%, transparent 55%), radial-gradient(110% 80% at 100% 70%, #af002d 0%, transparent 60%), radial-gradient(100% 70% at 0% 100%, #4a0d67 0%, transparent 60%), #1a0610" }
  ];
  var wallpaperCSS = (id, custom) => id === "custom" && custom ? `center / cover no-repeat url(${custom})` : (WALLPAPERS.find((w) => w.id === id) || WALLPAPERS[0]).css;

  // js/system/home.js
  init_glass();
  var DEFAULT = {
    pages: [
      ["calendar", "photos", "camera", "clock", "notes", "calculator", "weather", "settings", "maps", "mail", "appstore", "wallet", "health", "files", "stocks", "tv"],
      ["translate", "home", "podcasts", "reminders", "compass"]
    ],
    dock: ["phone", "safari", "messages", "music"]
  };
  var OFFSET = [8, 0];
  function initHome() {
    const home = ctx.el.home;
    let layout2 = store.get("layout", null) || JSON.parse(JSON.stringify(DEFAULT));
    layout2.pages = layout2.pages.map((p) => p.filter((id) => APPS[id]));
    const state = { appP: 0, unlockU: 1, editing: false, page: 0 };
    const wp = h("div.wp");
    const pages = h("div.pages");
    const track = h("div.track");
    const dots = h("div.dots");
    const dockGlass = h("div.dock-glass", { "data-glass": "", "data-glass-static": "", "data-glass-bezel": "34", "data-glass-thickness": "60", "data-glass-refraction": "1.1", "data-glass-blur": "6" });
    const dockRow = h("div.dock-row");
    const doneBtn = h("button.done", { "data-glass": "", "data-glass-lite": "", "data-glass-bezel": "14", on: { click: () => setEdit(false) } }, "Done");
    pages.append(track);
    home.append(wp, pages, dots, dockGlass, dockRow, doneBtn);
    registerGlass(dockGlass);
    registerGlass(doneBtn);
    sys.on("wallpaper", () => wp.style.background = wallpaperCSS(sys.get("wallpaper"), sys.get("customWallpaper")));
    sys.on("customWallpaper", () => wp.style.background = wallpaperCSS(sys.get("wallpaper"), sys.get("customWallpaper")), false);
    sys.on("theme", (t) => wp.style.filter = t === "dark" ? "brightness(.72)" : "");
    const icons = {};
    const pageEls = [];
    function makeIcon(id, onDock) {
      const app = APPS[id];
      const el = h("div.hicon", { "data-app": id, html: `${iconHTML(id, app.name)}<span class="lbl">${app.name}</span>${app.placeholder ? '<button class="del">\u2212</button>' : ""}` });
      el.style.setProperty("--j", (Math.random() * 2).toFixed(2));
      const g2 = new Group({ x: 0, y: 0 }, { response: 0.38, damping: 0.8 }, (v) => el.style.transform = `translate3d(${v.x}px,${v.y}px,0)`);
      icons[id] = { el, g: g2, id, dock: !!onDock };
      return icons[id];
    }
    function build() {
      track.innerHTML = "";
      dockRow.innerHTML = "";
      dots.innerHTML = "";
      pageEls.length = 0;
      layout2.pages.forEach((ids, p) => {
        const page2 = h("div.page", { style: { left: p * W + "px" } });
        pageEls.push(page2);
        track.append(page2);
        if (p === 0) page2.append(...makeWidgets());
        ids.forEach((id, i) => {
          const ic2 = makeIcon(id);
          ic2.page = p;
          page2.append(ic2.el);
        });
        dots.append(h("i"));
      });
      layout2.dock.forEach((id) => {
        const ic2 = makeIcon(id, true);
        dockRow.append(ic2.el);
      });
      placeAll(true);
      setDot(state.page);
    }
    function placeAll(snap) {
      layout2.pages.forEach((ids, p) => ids.forEach((id, i) => place(id, OFFSET[p] + i, snap)));
      layout2.dock.forEach((id, i) => {
        const gap = (DOCK.w - 4 * ICON) / 5;
        const t = { x: DOCK.x + gap * (i + 1) + ICON * i - (84 - ICON) / 2, y: DOCK.y + (DOCK.h - ICON) / 2 - 2 };
        icons[id].g[snap ? "snap" : "to"](t);
      });
    }
    function place(id, slot, snap) {
      const s = slotXY(slot);
      const t = { x: s.x - (84 - ICON) / 2, y: s.y };
      icons[id].g[snap ? "snap" : "to"](t);
    }
    function makeWidgets() {
      const d = /* @__PURE__ */ new Date();
      const w = COL_PITCH * 2 - 8;
      const ht = ROW_PITCH * 2 - 40;
      const cal = h("div.widget.cal", { "data-glass": "", "data-glass-lite": "", "data-glass-static": "", "data-glass-bezel": "26", style: { left: GRID_X + 4 + "px", top: GRID_Y + "px", width: w + "px", height: ht + "px" } });
      cal.innerHTML = `<span class="wd">${d.toLocaleDateString("en", { weekday: "long" })}</span><b class="wn">${d.getDate()}</b><em>${d.toLocaleDateString("en", { month: "long" })}</em><p>No events today</p>`;
      const hr = d.getHours();
      const wx = h("div.widget.wx", { "data-glass": "", "data-glass-lite": "", "data-glass-static": "", "data-glass-bezel": "26", style: { left: GRID_X + 4 + COL_PITCH * 2 + "px", top: GRID_Y + "px", width: w + "px", height: ht + "px" } });
      wx.innerHTML = `<span class="wl">Ho Chi Minh City</span><b class="wt">${hr > 17 || hr < 6 ? 27 : 31}\xB0</b><svg viewBox="0 0 24 24" width="30" height="30"><circle cx="9" cy="10" r="4.2" fill="#ffd60a"/><path d="M9 2.500v1.500M2.500 10H4M4.500 5.500l1 1M13.500 5.500l-1 1" stroke="#ffd60a" stroke-width="1.400" stroke-linecap="round"/><path fill="#fff" d="M10 20a4 4 0 0 1 .8-7.900A5.500 5.500 0 0 1 21 14a3.500 3.500 0 0 1-.5 6z"/></svg><p>Mostly Cloudy</p><em>H:33\xB0  L:26\xB0</em>`;
      requestAnimationFrame(() => [cal, wx].forEach(registerGlass));
      return [cal, wx];
    }
    const pg = new Group({ x: 0 }, { response: 0.5, damping: 0.88 }, (v) => track.style.transform = `translate3d(${-v.x}px,0,0)`);
    const maxPage = () => layout2.pages.length - 1;
    function setDot(p) {
      state.page = p;
      dots.querySelectorAll("i").forEach((d, i) => d.classList.toggle("on", i === p));
    }
    function goPage(p, vx) {
      p = clamp(p, 0, maxPage());
      setDot(p);
      pg.to({ x: p * W }, { velocity: vx != null ? { x: vx } : void 0 });
    }
    const can = () => ctx.mod.canHome?.();
    const vel = new Velocity();
    let down = null;
    let lp = 0;
    let drag = null;
    home.addEventListener("pointerdown", (e) => {
      if (!can() || e.target.closest(".done,.cmenu")) return;
      const p = ctx.pt(e);
      if (p.y < 40 || p.y > H - 34) return;
      const icon = e.target.closest(".hicon");
      down = { x: p.x, y: p.y, icon, axis: null, x0: pg.values.x, id: e.pointerId, del: !!e.target.closest(".del") };
      vel.reset();
      vel.push(p.x, p.y);
      if (icon && !down.del) {
        icon.classList.add("pressed");
        clearTimeout(lp);
        if (!state.editing) lp = setTimeout(() => down && !down.axis && openMenu(icon), 430);
      } else if (!icon && !state.editing) {
        clearTimeout(lp);
        lp = setTimeout(() => down && !down.axis && setEdit(true), 650);
      }
      try {
        home.setPointerCapture(e.pointerId);
      } catch {
      }
      ;
    });
    home.addEventListener("pointermove", (e) => {
      if (!down || e.pointerId !== down.id) return;
      const p = ctx.pt(e);
      vel.push(p.x, p.y);
      const dx = p.x - down.x;
      const dy = p.y - down.y;
      if (drag) return moveDrag(p);
      if (!down.axis && Math.hypot(dx, dy) > 7) {
        clearTimeout(lp);
        down.icon?.classList.remove("pressed");
        if (state.editing && down.icon && !down.del) {
          startDrag(down.icon, p);
          return;
        }
        down.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        if (down.axis === "y" && dy < 0) down.axis = "none";
      }
      if (down.axis === "x") {
        let x = down.x0 - dx;
        const max = maxPage() * W;
        if (x < 0) x = rubber(x, W);
        if (x > max) x = max + rubber(x - max, W);
        pg.drive({ x });
      } else if (down.axis === "y" && !state.editing) {
        ctx.mod.spot?.drag(clamp(dy / (H * 0.4), 0, 1));
      }
    });
    const end = (e) => {
      if (!down || e.pointerId !== down.id) return;
      const d = down;
      down = null;
      clearTimeout(lp);
      d.icon?.classList.remove("pressed");
      const v = vel.get();
      if (drag) return endDrag();
      if (!d.axis) {
        if (menuOpen) return;
        if (d.del) return removeIcon(d.icon.dataset.app);
        if (d.icon && !state.editing) ctx.mod.wm.open(d.icon.dataset.app);
        else if (!d.icon && state.editing) return;
        return;
      }
      if (d.axis === "x") {
        const proj = pg.values.x - v.x * 0.2;
        goPage(Math.round(proj / W), -v.x);
      } else if (d.axis === "y" && !state.editing) {
        ctx.mod.spot?.release(v.y);
      }
    };
    home.addEventListener("pointerup", end);
    home.addEventListener("pointercancel", end);
    function setEdit(on) {
      state.editing = on;
      home.classList.toggle("edit", on);
      closeMenu();
    }
    function startDrag(el, p) {
      const id = el.dataset.app;
      const ic2 = icons[id];
      if (ic2.dock) return;
      const page2 = layout2.pages.findIndex((ids) => ids.includes(id));
      const s = ic2.g.values;
      drag = { id, ic: ic2, page: page2, ox: p.x + pg.values.x - page2 * W - s.x, oy: p.y - s.y };
      el.classList.add("lift");
      el.style.zIndex = 60;
    }
    function moveDrag(p) {
      const { ic: ic2, id, page: page2 } = drag;
      const px = p.x + pg.values.x - page2 * W;
      ic2.g.drive({ x: px - drag.ox, y: p.y - drag.oy });
      const col = clamp(Math.floor((px - GRID_X) / COL_PITCH), 0, 3);
      const row = clamp(Math.floor((p.y - GRID_Y + 24) / ROW_PITCH), 0, 5);
      let slot = row * 4 + col;
      const ids = layout2.pages[page2];
      slot = clamp(slot - OFFSET[page2], 0, ids.length - 1);
      const from = ids.indexOf(id);
      if (slot !== from) {
        ids.splice(from, 1);
        ids.splice(slot, 0, id);
        ids.forEach((x, i) => x !== id && place(x, OFFSET[page2] + i));
      }
    }
    function endDrag() {
      const { id, ic: ic2, page: page2 } = drag;
      drag = null;
      const i = layout2.pages[page2].indexOf(id);
      place(id, OFFSET[page2] + i);
      ic2.g.p = { response: 0.4, damping: 0.7 };
      ic2.el.classList.remove("lift");
      setTimeout(() => ic2.el.style.zIndex = "", 350);
      store.set("layout", layout2);
    }
    function removeIcon(id) {
      const ic2 = icons[id];
      ic2.el.classList.add("gone");
      setTimeout(() => {
        ic2.el.remove();
        layout2.pages.forEach((ids) => ids.includes(id) && ids.splice(ids.indexOf(id), 1));
        delete icons[id];
        layout2.pages.forEach((ids, p) => ids.forEach((x, i) => place(x, OFFSET[p] + i)));
        store.set("layout", layout2);
      }, 220);
    }
    let menuOpen = null;
    function openMenu(iconEl) {
      if (state.editing) return;
      const id = iconEl.dataset.app;
      const r = ctx.rect(iconEl.querySelector(".icon"));
      const below = r.y < H / 2;
      const menu = h(
        "div.cmenu",
        { "data-glass": "", "data-glass-lite": "", "data-glass-static": "", "data-glass-bezel": "20", style: { left: clamp(r.x - 50, 14, W - 14 - 240) + "px", [below ? "top" : "bottom"]: (below ? r.y + r.h + 22 : H - r.y + 14) + "px", transformOrigin: `${r.x + r.w / 2}px ${below ? "0%" : "100%"}` } },
        h("button", { on: { click: () => {
          closeMenu();
          ctx.mod.wm.open(id);
        } } }, `Open ${APPS[id].name}`),
        h("button", { on: { click: () => setEdit(true) } }, "Edit Home Screen")
      );
      const dim = h("div.cdim", { on: { pointerdown: closeMenu } });
      const clone = h("div.mclone", { html: iconEl.querySelector(".icon").outerHTML, style: { left: r.x + "px", top: r.y + "px" } });
      home.append(dim, clone, menu);
      registerGlass(menu);
      iconEl.style.visibility = "hidden";
      menuOpen = { menu, dim, iconEl, clone };
      requestAnimationFrame(() => (menu.classList.add("in"), dim.classList.add("in"), clone.classList.add("in")));
    }
    function closeMenu() {
      if (!menuOpen) return;
      const { menu, dim, iconEl, clone } = menuOpen;
      menuOpen = null;
      menu.classList.remove("in");
      dim.classList.remove("in");
      clone.classList.remove("in");
      setTimeout(() => (iconEl.style.visibility = "", menu.remove(), dim.remove(), clone.remove()), 320);
    }
    const factors = () => {
      const hs = 1 + 0.11 * state.appP + 0.1 * (1 - state.unlockU);
      const ho = clamp(1 - state.appP * 1.35, 0, 1) * clamp(state.unlockU * 1.2, 0, 1);
      home.style.setProperty("--hs", hs.toFixed(4));
      home.style.setProperty("--ho", ho.toFixed(3));
    };
    const api = ctx.mod.home = {
      setApp(p) {
        state.appP = p;
        factors();
      },
      setUnlock(u) {
        state.unlockU = u;
        factors();
      },
      setHidden(b) {
        home.style.visibility = b ? "hidden" : "";
      },
      hideIcon(id, b) {
        icons[id] && (icons[id].el.style.visibility = b ? "hidden" : "");
      },
      revealIcon(id) {
        const p = layout2.pages.findIndex((ids) => ids.includes(id));
        if (p >= 0 && p !== state.page) {
          setDot(p);
          pg.drive({ x: p * W });
        }
        if (icons[id]) icons[id].el.style.visibility = "hidden";
      },
      iconRect(id) {
        const ic2 = icons[id];
        if (!ic2) return { x: W / 2 - ICON / 2, y: H - 120, w: ICON, h: ICON };
        const v = ic2.g.values;
        const p = layout2.pages.findIndex((ids) => ids.includes(id));
        const px = p >= 0 ? p * W - pg.values.x : 0;
        return { x: v.x + (84 - ICON) / 2 + px, y: v.y, w: ICON, h: ICON };
      },
      get editing() {
        return state.editing;
      },
      setEdit,
      firstPage() {
        goPage(0);
      },
      get wallpaperEl() {
        return wp;
      }
    };
    build();
    factors();
  }

  // js/system/wm.js
  var wins = /* @__PURE__ */ new Map();
  var order = [];
  var current = null;
  var mode = "home";
  var S0 = ICON / W;
  var FULL = { cx: W / 2, cy: H / 2, mw: W, mh: H, s: 1, r: R };
  var stateFromRect = (r) => ({ cx: r.x + r.w / 2, cy: r.y + r.h / 2, mw: r.w, mh: r.h, s: Math.max(r.w / W, S0 * (r.w / ICON)), r: Math.min(r.w, r.h) * 0.2237 });
  var Win = class {
    constructor(app) {
      this.app = app;
      this.el = h("div.win", { style: { display: "none" } });
      this.content = h("div.win-c", { style: { background: app.bg } });
      this.el.append(this.content);
      ctx.el.windows.append(this.el);
      this.g = new Group({ ...FULL }, SPRING.open, (v) => this.apply(v));
      this.built = false;
    }
    build() {
      if (this.built) return;
      this.built = true;
      this.api = { win: this, root: this.content, close: () => wm.goHome(), setTone: () => syncTone() };
      this.app.build(this.content, this.api);
    }
    apply(v) {
      const s = v.s;
      const l = Math.max(0, (W - v.mw / s) / 2);
      const t = Math.max(0, (H - v.mh / s) / 2);
      const full = Math.abs(s - 1) < 2e-3 && Math.abs(v.mw - W) < 0.5 && Math.abs(v.mh - H) < 0.5 && Math.abs(v.cx - W / 2) < 0.5 && Math.abs(v.cy - H / 2) < 0.5;
      if (full) {
        this.el.style.transform = "";
        this.el.style.clipPath = "";
      } else {
        this.el.style.transform = `translate3d(${(v.cx - W / 2).toFixed(2)}px,${(v.cy - H / 2).toFixed(2)}px,0) scale(${s.toFixed(4)})`;
        this.el.style.clipPath = `inset(${t.toFixed(2)}px ${l.toFixed(2)}px round ${(v.r / s).toFixed(2)}px)`;
      }
      if (mode !== "switcher" && this === wins.get(current)) setFactors(clamp((s - S0) / (1 - S0), 0, 1));
      onWinApply?.(this, v);
    }
  };
  var onWinApply = null;
  function setFactors(p) {
    ctx.mod.home?.setApp(p);
  }
  function toneFor(app) {
    if (!app) return "light";
    if (app.status === "light") return "light";
    return sys.get("theme") === "dark" ? "light" : "dark";
  }
  function syncTone() {
    const app = current ? APPS[current] : null;
    ctx.mod.setStatusTone(toneFor(app));
    ctx.mod.setIndicatorTone(toneFor(app));
  }
  function zOrder() {
    order.forEach((id, i) => wins.get(id).el.style.zIndex = i + 1);
  }
  var iconRect = (id) => ctx.mod.home.iconRect(id);
  var wm = {
    get current() {
      return current;
    },
    get mode() {
      return mode;
    },
    get running() {
      return order.slice();
    },
    syncTone,
    open(id, from) {
      if (mode === "switcher") return;
      const app = APPS[id];
      if (!app) return;
      ctx.mod.kb?.hide();
      if (current === id) return;
      let w = wins.get(id);
      if (!w) wins.set(id, w = new Win(app));
      w.build();
      const prev = current && wins.get(current);
      const rect = from || iconRect(id);
      w.el.style.display = "block";
      w.el.style.opacity = "";
      w.el.classList.remove("inert");
      w.g.snap(stateFromRect(rect));
      order = order.filter((x) => x !== id);
      order.push(id);
      zOrder();
      current = id;
      mode = "anim";
      w.el.classList.add("moving");
      ctx.mod.home.hideIcon(id, true);
      ctx.mod.home.setHidden(false);
      syncTone();
      w.g.to(FULL, {
        params: SPRING.open,
        done: () => {
          mode = "app";
          w.el.classList.remove("moving");
          ctx.mod.home.setHidden(true);
          if (prev && prev !== w) prev.el.style.display = "none";
          w.api.hooks?.open?.();
        }
      });
    },
    goHome(velocity, fromState) {
      if (!current || mode === "switcher") return;
      const id = current;
      const w = wins.get(id);
      ctx.mod.kb?.hide();
      ctx.mod.home.setHidden(false);
      ctx.mod.home.revealIcon(id);
      const rect = iconRect(id);
      mode = "anim";
      w.el.classList.add("moving");
      w.api.hooks?.close?.();
      current = null;
      syncTone();
      const prevApply = onWinApply;
      onWinApply = (win) => {
        if (win === w) setFactors(clamp((w.g.s.s.value - S0) / (1 - S0), 0, 1));
      };
      w.g.to(stateFromRect(rect), {
        params: SPRING.close,
        velocity,
        done: () => {
          w.el.style.display = "none";
          w.el.classList.remove("moving");
          ctx.mod.home.hideIcon(id, false);
          setFactors(0);
          mode = "home";
          onWinApply = prevApply;
        }
      });
    },
    /* ---------- interactive close / app switch (bottom-edge gesture) ---------- */
    drag: null,
    dragStart() {
      if (!current || mode === "switcher") return false;
      mode = "anim";
      const w = wins.get(current);
      w.el.classList.add("moving");
      wm.drag = { w, id: current };
      ctx.mod.home.setHidden(false);
      ctx.mod.kb?.hide();
      return true;
    },
    dragMove(dx, up) {
      const d = wm.drag;
      if (!d) return;
      const k = clamp(up / (H * 0.62), 0, 1.6);
      const s = k <= 1 ? 1 - 0.5 * k : 0.5 - (k - 1) * 0.12;
      d.w.g.drive({ s, mw: W * s, mh: H * s, cx: W / 2 + dx * 0.9, cy: H / 2 - Math.max(0, up) * 0.46 + (1 - s) * 0, r: R });
    },
    dragEnd(vel, dx, up) {
      const d = wm.drag;
      if (!d) return;
      wm.drag = null;
      const vy = -vel.y;
      const v = d.w.g.values;
      const velocity = { cx: vel.x, cy: vel.y };
      if (up > 70 && (vy > 650 || up > 300 && vy > 80)) {
        mode = "app";
        wm.goHome(velocity);
      } else if (up > 110 && vy <= 420) {
        wm.enterSwitcher(velocity);
      } else {
        d.w.g.to(FULL, {
          params: SPRING.open,
          velocity,
          done: () => {
            mode = "app";
            d.w.el.classList.remove("moving");
            ctx.mod.home.setHidden(true);
          }
        });
      }
    },
    /* swipe along the home indicator to jump to the neighbouring app */
    swipeStart() {
      if (!current || order.length < 2) return false;
      wm.sw = { w: wins.get(current) };
      mode = "anim";
      wm.sw.w.el.classList.add("moving");
      return true;
    },
    swipeMove(dx) {
      const sw2 = wm.sw;
      if (!sw2) return;
      const x = dx > 0 && order.length > 1 ? dx : dx < 0 ? dx : 0;
      const e = Math.abs(x) > W * 0.5 ? rubber(x, W) : x;
      const k = clamp(Math.abs(e) / W, 0, 1);
      const s = 1 - 0.1 * k;
      sw2.w.g.drive({ s, mw: W * s, mh: H * s, cx: W / 2 + e, cy: H / 2, r: R });
    },
    swipeEnd(vel, dx) {
      const sw2 = wm.sw;
      if (!sw2) return;
      wm.sw = null;
      const idx = order.indexOf(current);
      const dir = dx > 0 ? -1 : 1;
      const j = idx + dir;
      const go = Math.abs(dx) > 90 || Math.abs(vel.x) > 600;
      const w = sw2.w;
      if (!go || j < 0 || j >= order.length) {
        w.g.to(FULL, { params: SPRING.open, velocity: { cx: vel.x }, done: () => {
          mode = "app";
          w.el.classList.remove("moving");
        } });
        return;
      }
      w.api.hooks?.close?.();
      const nid = order[j];
      const nw = wins.get(nid);
      const side = dx > 0 ? 1 : -1;
      nw.el.style.display = "block";
      nw.el.style.opacity = "";
      const off = { s: 0.9, mw: W * 0.9, mh: H * 0.9, cy: H / 2, r: R };
      nw.g.snap({ ...off, cx: W / 2 - side * (W * 0.62) });
      order.splice(j, 1);
      order.push(nid);
      zOrder();
      current = nid;
      syncTone();
      nw.el.classList.add("moving");
      w.g.to({ ...off, cx: W / 2 + side * W * 0.62 }, { params: SPRING.open, velocity: { cx: vel.x }, done: () => {
        w.el.style.display = "none";
        w.el.classList.remove("moving");
      } });
      nw.g.to(FULL, { params: SPRING.open, done: () => {
        mode = "app";
        nw.el.classList.remove("moving");
        nw.api.hooks?.open?.();
      } });
    },
    /* ---------- app switcher ---------- */
    enterSwitcher(velocity) {
      if (mode === "switcher") return;
      mode = "switcher";
      const ids = order.slice().reverse();
      sw.ids = ids;
      sw.scroll = 0;
      sw.el.classList.add("on");
      sw.bg.classList.add("on");
      ctx.mod.home.setHidden(false);
      ctx.mod.home.setApp(0.25);
      ids.forEach((id, i) => {
        const w = wins.get(id);
        w.el.style.display = "block";
        w.el.style.opacity = "";
        w.el.classList.add("inert", "moving");
        w.g.to(cardState(i, 0), { params: SPRING.ui, velocity: id === current ? velocity : void 0 });
      });
      buildLabels();
      syncLabels();
      current = null;
      ctx.mod.setStatusTone("light");
      ctx.mod.setIndicatorTone("light");
    },
    exitSwitcher(toId, fromRect) {
      sw.el.classList.remove("on");
      sw.bg.classList.remove("on");
      if (toId) {
        const w = wins.get(toId);
        order = order.filter((x) => x !== toId);
        order.push(toId);
        zOrder();
        current = toId;
        mode = "anim";
        syncTone();
        sw.ids.forEach((id) => id !== toId && (wins.get(id).el.style.opacity = "0"));
        w.g.to(FULL, {
          params: SPRING.open,
          done: () => {
            wins.forEach((x, id) => {
              x.el.classList.remove("inert", "moving");
              if (id !== toId) {
                x.el.style.display = "none";
                x.el.style.opacity = "";
              }
            });
            mode = "app";
            ctx.mod.home.setHidden(true);
            ctx.mod.home.setApp(1);
            w.api.hooks?.open?.();
          }
        });
        ctx.mod.home.setApp(1);
      } else {
        const id = sw.ids[0];
        ctx.mod.home.setApp(0);
        sw.ids.forEach((x, i) => {
          const w = wins.get(x);
          w.el.classList.remove("inert");
          if (i === 0 && id) {
            ctx.mod.home.revealIcon(id);
            w.g.to(stateFromRect(iconRect(id)), { params: SPRING.close, done: () => {
              w.el.style.display = "none";
              w.el.classList.remove("moving");
            } });
          } else {
            w.el.style.opacity = "0";
            setTimeout(() => {
              w.el.style.display = "none";
              w.el.style.opacity = "";
              w.el.classList.remove("moving");
            }, 300);
          }
        });
        mode = "home";
      }
      sw.labels.forEach((l) => l.style.opacity = 0);
    },
    destroy(id) {
      const w = wins.get(id);
      if (!w) return;
      w.api.hooks?.destroy?.();
      w.el.remove();
      wins.delete(id);
      order = order.filter((x) => x !== id);
    }
  };
  var CS = 0.56;
  var CW = W * CS;
  var CH = H * CS;
  var GAP = 30;
  var cardState = (i, scroll) => ({ cx: W / 2 + i * (CW + GAP) + scroll, cy: H / 2 - 12, mw: CW, mh: CH, s: CS, r: 38 });
  var sw = { ids: [], scroll: 0, el: null, bg: null, labels: [], active: null };
  function buildLabels() {
    sw.labels.forEach((l) => l.remove());
    sw.labels = sw.ids.map((id) => {
      const app = APPS[id];
      const l = h("div.sw-label", { html: `<span class="mini">${app.icon}</span><b>${app.name}</b>` });
      sw.el.append(l);
      return l;
    });
  }
  function syncLabels() {
    sw.ids.forEach((id, i) => {
      const w = wins.get(id);
      if (!w) return;
      const v = w.g.values;
      const l = sw.labels[i];
      if (!l) return;
      l.style.transform = `translate3d(${v.cx - 90}px, ${v.cy - v.mh / 2 - 34}px, 0)`;
      l.style.opacity = mode === "switcher" ? clamp(1 - Math.abs(v.cx - W / 2) / 360 + 0.35, 0, 1).toFixed(2) : 0;
    });
  }
  function layoutCards(springy, velocity) {
    sw.ids.forEach((id, i) => {
      const w = wins.get(id);
      if (!w) return;
      const st = cardState(i, sw.scroll);
      if (springy) w.g.to(st, { params: SPRING.ui, velocity: velocity ? { cx: velocity } : void 0 });
      else w.g.drive(st);
    });
  }
  function initWM() {
    sw.bg = h("div.sw-bg");
    ctx.el.windows.before(sw.bg);
    sw.el = ctx.el.switcher;
    onWinApply = () => mode === "switcher" && syncLabels();
    const baseOnApply = () => {
    };
    const origApply = Win.prototype.apply;
    Win.prototype.apply = function(v) {
      origApply.call(this, v);
      if (mode === "switcher") syncLabels();
    };
    const vel = { x: 0, last: 0, t: 0 };
    let down = null;
    sw.el.addEventListener("pointerdown", (e) => {
      if (mode !== "switcher") return;
      const p = ctx.pt(e);
      const hit = sw.ids.findIndex((id) => {
        const v = wins.get(id).g.values;
        return Math.abs(p.x - v.cx) < v.mw / 2 && Math.abs(p.y - v.cy) < v.mh / 2;
      });
      down = { x: p.x, y: p.y, hit, axis: null, scroll0: sw.scroll, t: performance.now(), samples: [{ t: performance.now(), x: p.x, y: p.y }] };
      try {
        sw.el.setPointerCapture(e.pointerId);
      } catch {
      }
      ;
    });
    sw.el.addEventListener("pointermove", (e) => {
      if (!down) return;
      const p = ctx.pt(e);
      const dx = p.x - down.x;
      const dy = p.y - down.y;
      const now = performance.now();
      down.samples.push({ t: now, x: p.x, y: p.y });
      while (down.samples.length > 2 && now - down.samples[0].t > 90) down.samples.shift();
      if (!down.axis && Math.hypot(dx, dy) > 8) down.axis = Math.abs(dx) > Math.abs(dy) || down.hit < 0 ? "x" : "y";
      if (down.axis === "x") {
        const max = 0;
        const min = -(sw.ids.length - 1) * (CW + GAP);
        let s = down.scroll0 + dx;
        if (s > max) s = rubber(s - max, W) + max;
        if (s < min) s = rubber(s - min, W) + min;
        sw.scroll = s;
        layoutCards(false);
      } else if (down.axis === "y" && down.hit >= 0) {
        const w = wins.get(sw.ids[down.hit]);
        const st = cardState(down.hit, sw.scroll);
        const lift = dy < 0 ? dy : rubber(dy, 120);
        w.g.drive({ ...st, cy: st.cy + lift });
      }
    });
    const endPtr = (e) => {
      if (!down) return;
      const d = down;
      down = null;
      const p = ctx.pt(e);
      const a = d.samples[0];
      const b = d.samples[d.samples.length - 1];
      const dt = Math.max(0.016, (b.t - a.t) / 1e3);
      const stale = performance.now() - b.t > 90;
      const v = stale ? { x: 0, y: 0 } : { x: (b.x - a.x) / dt, y: (b.y - a.y) / dt };
      if (!d.axis) {
        if (d.hit >= 0) wm.exitSwitcher(sw.ids[d.hit]);
        else wm.exitSwitcher(null);
        return;
      }
      if (d.axis === "x") {
        const step = CW + GAP;
        const proj = sw.scroll + v.x * 0.26;
        const i = clamp(Math.round(-proj / step), 0, sw.ids.length - 1);
        sw.scroll = -i * step;
        layoutCards(true, v.x);
      } else if (d.hit >= 0) {
        const id = sw.ids[d.hit];
        const w = wins.get(id);
        const dy = p.y - d.y;
        if (dy < -110 || v.y < -520) {
          w.g.to({ cy: -H * 0.7, s: CS * 0.9 }, {
            params: { response: 0.4, damping: 1 },
            velocity: { cy: v.y },
            done: () => {
              wm.destroy(id);
            }
          });
          sw.ids.splice(d.hit, 1);
          const l = sw.labels.splice(d.hit, 1)[0];
          if (l) l.style.opacity = 0, setTimeout(() => l.remove(), 300);
          sw.scroll = clamp(sw.scroll, -(Math.max(sw.ids.length, 1) - 1) * (CW + GAP), 0);
          layoutCards(true);
          if (!sw.ids.length) setTimeout(() => wm.exitSwitcher(null), 120);
        } else {
          w.g.to(cardState(d.hit, sw.scroll), { params: SPRING.bouncy, velocity: { cy: v.y } });
        }
      }
    };
    sw.el.addEventListener("pointerup", endPtr);
    sw.el.addEventListener("pointercancel", endPtr);
  }

  // js/system/lock.js
  init_glass();

  // js/core/audio.js
  var ac = null;
  function tone(freq = 880, dur = 0.08, vol = 0.05, type = "sine", slide = 0) {
    if (sys.get("silent") || !sys.get("sounds")) return;
    try {
      ac || (ac = new (window.AudioContext || window.webkitAudioContext)());
      const t = ac.currentTime;
      const o = ac.createOscillator();
      const g2 = ac.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
      g2.gain.setValueAtTime(vol * sys.get("volume"), t);
      g2.gain.exponentialRampToValueAtTime(1e-4, t + dur);
      o.connect(g2).connect(ac.destination);
      o.start(t);
      o.stop(t + dur + 0.02);
    } catch {
    }
  }
  var sfx = {
    key: () => tone(1800, 0.025, 0.04, "square"),
    lock: () => tone(220, 0.09, 0.12, "triangle", 0.6),
    unlock: () => tone(520, 0.1, 0.1, "triangle", 1.5),
    notif: () => [880, 1175, 1568].forEach((f, i) => setTimeout(() => tone(f, 0.18, 0.08, "sine"), i * 110)),
    tap: () => tone(1200, 0.02, 0.03, "sine")
  };
  var buzz = (ms = 8) => navigator.vibrate?.(ms);

  // js/system/lock.js
  var LOCK_SVG = `<svg viewBox="0 0 24 30" width="22" height="27"><path class="shackle" d="M6.500 13V9.500a5.500 5.500 0 0 1 11 0V13" fill="none" stroke="#fff" stroke-width="2.600" stroke-linecap="round"/><rect x="3.500" y="12.500" width="17" height="14" rx="4" fill="#fff"/></svg>`;
  var FLASH = `<svg viewBox="0 0 24 24" width="22" height="22" fill="#fff"><path d="M8 2h8v4.500l-1.700 3.200V22H9.700V9.700L8 6.500z"/></svg>`;
  var CAM = `<svg viewBox="0 0 24 24" width="24" height="24" fill="#fff"><path d="M8.500 5 9.700 3h4.600l1.200 2H19a2.500 2.500 0 0 1 2.500 2.500v10A2.500 2.500 0 0 1 19 20H5a2.500 2.500 0 0 1-2.500-2.500v-10A2.500 2.500 0 0 1 5 5z"/><circle cx="12" cy="12.500" r="4" fill="#3a3a3f"/></svg>`;
  function initLock() {
    const el = ctx.el.lock;
    el.innerHTML = `
        <div class="lwp"></div>
        <div class="lock-c">
            <div class="padlock">${LOCK_SVG}</div>
            <div class="ldate"></div>
            <div class="ltime"></div>
            <div class="lnotifs"></div>
            <button class="lbtn flash" data-glass data-glass-surface="circle" data-glass-bezel="20" data-glass-thickness="40" data-glass-blur="4" data-press-scale="1.12">${FLASH}</button>
            <button class="lbtn cam" data-glass data-glass-surface="circle" data-glass-bezel="20" data-glass-thickness="40" data-glass-blur="4" data-press-scale="1.12">${CAM}</button>
            <div class="lhint">Swipe up to open</div>
        </div>`;
    const lwp = el.querySelector(".lwp");
    const content = el.querySelector(".lock-c");
    const padlock = el.querySelector(".padlock");
    const timeEl = el.querySelector(".ltime");
    const dateEl = el.querySelector(".ldate");
    el.querySelectorAll("[data-glass]").forEach(registerGlass);
    sys.on("wallpaper", () => lwp.style.background = wallpaperCSS(sys.get("wallpaper"), sys.get("customWallpaper")));
    sys.on("customWallpaper", () => lwp.style.background = wallpaperCSS(sys.get("wallpaper"), sys.get("customWallpaper")), false);
    sys.on("compactClock", (c) => el.classList.toggle("compact", !!c));
    const tick = () => {
      const d = /* @__PURE__ */ new Date();
      timeEl.textContent = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: false }).replace(/^0/, "");
      dateEl.textContent = d.toLocaleDateString("en", { weekday: "long", day: "numeric", month: "long" });
    };
    tick();
    setInterval(tick, 1e3);
    const st = { locked: true, shown: true, faceOk: false, u: 0 };
    const g2 = new Group({ u: 0 }, { response: 0.5, damping: 0.88 }, (v) => {
      const u = clamp(v.u, 0, 1);
      st.u = v.u;
      el.style.transform = u === 0 ? "" : `translate3d(0,${(-u * H * 0.5).toFixed(1)}px,0)`;
      el.style.opacity = (1 - clamp(u * 1.15, 0, 1)).toFixed(3);
      el.style.visibility = u >= 0.995 ? "hidden" : "";
      ctx.mod.home.setUnlock(u >= 0.995 ? 1 : clamp(u, 0, 1));
      el.style.pointerEvents = u > 0.5 ? "none" : "";
    });
    function faceID() {
      st.faceOk = false;
      padlock.classList.remove("open", "scan");
      void padlock.offsetWidth;
      padlock.classList.add("scan");
      el.classList.remove("ready");
      clearTimeout(st.fid);
      st.fid = setTimeout(() => {
        padlock.classList.remove("scan");
        padlock.classList.add("open");
        st.faceOk = true;
        el.classList.add("ready");
        buzz(12);
      }, 950);
    }
    const flash = el.querySelector(".flash");
    const cam = el.querySelector(".cam");
    sys.on("flash", (on) => flash.classList.toggle("on", !!on));
    const hold = (btn2, fn) => {
      let t = 0;
      btn2.addEventListener("pointerdown", () => {
        clearTimeout(t);
        t = setTimeout(() => {
          buzz(20);
          fn();
        }, 380);
      });
      const c = () => clearTimeout(t);
      btn2.addEventListener("pointerup", c);
      btn2.addEventListener("pointerleave", c);
    };
    hold(flash, () => sys.set("flash", !sys.get("flash"), false));
    hold(cam, () => {
      const r = ctx.rect(cam);
      api.hide(true);
      ctx.mod.wm.open("camera", r);
    });
    const api = ctx.mod.lock = {
      get locked() {
        return st.locked;
      },
      get shown() {
        return st.u < 0.995;
      },
      get faceOk() {
        return st.faceOk;
      },
      el,
      lock() {
        st.locked = true;
        g2.snap({ u: 0 });
        ctx.mod.home.setUnlock(0);
        faceID();
        ctx.mod.cc?.close(true);
        ctx.mod.kb?.hide();
        ctx.mod.spot?.close(true);
      },
      /** screen just woke up */
      wake() {
        if (st.locked) faceID();
        content.classList.remove("wakein");
        void content.offsetWidth;
        content.classList.add("wakein");
      },
      hide(openApp) {
        st.locked = false;
        g2.to({ u: 1 }, { params: { response: 0.48, damping: 0.9 } });
        if (!openApp) sfx.unlock();
        ctx.mod.wm.syncTone();
        padlock.classList.add("open");
      },
      show() {
        g2.to({ u: 0 }, { params: { response: 0.5, damping: 0.86 } });
        ctx.mod.setStatusTone("light");
        ctx.mod.setIndicatorTone("light");
      },
      peek: {
        start() {
          el.style.visibility = "";
          g2.drive({ u: 1 });
        },
        move(dy) {
          g2.drive({ u: 1 - clamp(dy / (H * 0.5), 0, 1) });
        },
        end(vy) {
          vy > 450 || st.u < 0.55 ? api.show() : (g2.to({ u: 1 }), ctx.mod.wm.syncTone());
        }
      },
      /* swipe up from the bottom edge */
      dragMove(up) {
        if (st.locked && !st.faceOk) {
          g2.drive({ u: clamp(up / 900, 0, 0.1) });
          padlock.classList.add("nope");
          return;
        }
        g2.drive({ u: clamp(up / (H * 0.5), 0, 1) });
      },
      dragEnd(vy) {
        padlock.classList.remove("nope");
        if (st.locked && !st.faceOk) return g2.to({ u: 0 });
        if (st.u > 0.3 || vy > 600) api.hide();
        else g2.to({ u: 0 });
      }
    };
    faceID();
    ctx.mod.notif?.bindLock?.(el.querySelector(".lnotifs"));
    ctx.mod.lockBindNotifs = (n) => n.bindLock(el.querySelector(".lnotifs"));
  }

  // js/system/notifications.js
  init_glass();
  function initNotifications() {
    const list = [];
    let lockBox = null;
    const host = ctx.el.banners;
    const item = (n) => {
      const app = APPS[n.app];
      return h(
        "div.notif",
        { "data-glass": "", "data-glass-lite": "", "data-glass-static": "", "data-glass-bezel": "22" },
        h("span.ni", { html: iconHTML(n.app, app.name) }),
        h("span.nt", { html: `<strong>${n.title}</strong><em>${n.body}</em>` }),
        h("time", "now")
      );
    };
    function renderLock() {
      if (!lockBox) return;
      lockBox.innerHTML = "";
      list.slice(0, 4).forEach((n, i) => {
        const el = item(n);
        el.style.setProperty("--i", i);
        el.addEventListener("click", () => open(n));
        lockBox.append(el);
        registerGlass(el);
      });
    }
    function open(n) {
      if (ctx.mod.lock.shown) ctx.mod.lock.hide(true);
      ctx.mod.wm.open(n.app);
    }
    function banner(n) {
      const el = item(n);
      el.classList.add("banner");
      const g2 = new Group({ y: -130, s: 0.82 }, { response: 0.5, damping: 0.74 }, (v) => el.style.transform = `translate3d(0,${v.y}px,0) scale(${v.s})`);
      g2.snap({ y: -130, s: 0.82 });
      host.append(el);
      registerGlass(el);
      g2.to({ y: 0, s: 1 });
      let gone = false;
      const dismiss = () => {
        if (gone) return;
        gone = true;
        g2.to({ y: -140, s: 0.88 }, { params: { response: 0.4, damping: 1 }, done: () => el.remove() });
      };
      const t = setTimeout(dismiss, 4600);
      const vel = new Velocity();
      let sy = null;
      el.addEventListener("pointerdown", (e) => {
        clearTimeout(t);
        sy = ctx.pt(e).y;
        vel.reset();
        try {
          el.setPointerCapture(e.pointerId);
        } catch {
        }
        ;
      });
      el.addEventListener("pointermove", (e) => {
        if (sy == null) return;
        const y = ctx.pt(e).y;
        vel.push(0, y);
        g2.drive({ y: Math.min(8, y - sy), s: 1 });
      });
      el.addEventListener("pointerup", (e) => {
        if (sy == null) return;
        const moved = ctx.pt(e).y - sy;
        sy = null;
        if (Math.abs(moved) < 6) {
          dismiss();
          open(n);
        } else if (moved < -20 || vel.get().y < -300) dismiss();
        else g2.to({ y: 0, s: 1 });
      });
    }
    ctx.mod.notif = {
      bindLock(box) {
        lockBox = box;
        renderLock();
      },
      post(n) {
        list.unshift(n);
        renderLock();
        if (!ctx.mod.power.on) {
          ctx.mod.power.wake();
          return;
        }
        sfx.notif();
        buzz([20, 30, 20]);
        if (!ctx.mod.lock.shown) banner(n);
      },
      clear() {
        list.length = 0;
        renderLock();
      }
    };
    ctx.mod.lockBindNotifs?.(ctx.mod.notif);
    list.push({ app: "messages", title: "Dat514", body: "Welcome to the iPhone 18 Pro Max simulator. Swipe up to open." });
    list.push({ app: "calendar", title: "Calendar", body: "Liquid Glass design review \u2014 today" });
    renderLock();
  }

  // js/system/island.js
  var SIZES = {
    idle: { w: ISLAND.w, h: ISLAND.h, r: ISLAND.h / 2 },
    compact: { w: 196, h: ISLAND.h, r: ISLAND.h / 2 },
    alert: { w: 276, h: 64, r: 32 },
    "x-music": { w: 404, h: 176, r: 46 },
    "x-timer": { w: 404, h: 112, r: 46 },
    "x-call": { w: 404, h: 112, r: 46 }
  };
  var ICO = {
    timer: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff9f0a" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9.5 2.5h5"/></svg>`,
    call: `<svg width="18" height="18" viewBox="0 0 24 24" fill="#30d158"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.6a1 1 0 0 1-.25 1z"/></svg>`,
    play: `<svg width="30" height="30" viewBox="0 0 24 24" fill="#fff"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>`,
    pause: `<svg width="30" height="30" viewBox="0 0 24 24" fill="#fff"><rect x="6" y="5" width="4.2" height="14" rx="1.4"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.4"/></svg>`,
    next: `<svg width="30" height="30" viewBox="0 0 24 24" fill="#fff"><path d="M5 6.2v11.6a.8.8 0 0 0 1.25.66l8.2-5.8a.8.8 0 0 0 0-1.32l-8.2-5.8A.8.8 0 0 0 5 6.2zM16.5 5.5h2.3v13h-2.3z"/></svg>`,
    prev: `<svg width="30" height="30" viewBox="0 0 24 24" fill="#fff"><path d="M19 6.2v11.6a.8.8 0 0 1-1.25.66l-8.2-5.8a.8.8 0 0 1 0-1.32l8.2-5.8A.8.8 0 0 1 19 6.2zM7.5 5.5H5.2v13h2.3z"/></svg>`,
    bell: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ff453a" stroke-width="2.2" stroke-linecap="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0M3 3l18 18"/></svg>`,
    bellon: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/></svg>`
  };
  var WAVE = `<span class="wave"><i></i><i></i><i></i><i></i><i></i></span>`;
  function initIsland() {
    const el = ctx.el.island;
    el.innerHTML = `
        <div class="isl-v" data-v="compact-music"><span class="mini-art"></span>${WAVE}</div>
        <div class="isl-v" data-v="compact-timer">${ICO.timer}<b class="t"></b></div>
        <div class="isl-v" data-v="compact-call">${ICO.call}<b class="t g"></b></div>
        <div class="isl-v" data-v="alert"><span class="ai"></span><span class="at"></span></div>
        <div class="isl-v x" data-v="x-music">
            <div class="xm-top"><span class="art"></span><span class="meta"><b class="xm-title"></b><em class="xm-artist"></em></span>${WAVE}</div>
            <div class="xm-bar"><span class="cur">0:00</span><div class="track"><i></i></div><span class="dur">0:00</span></div>
            <div class="xm-ctl"><button data-a="prev">${ICO.prev}</button><button data-a="toggle" class="pp"></button><button data-a="next">${ICO.next}</button></div>
        </div>
        <div class="isl-v x" data-v="x-timer"><div class="xt"><span class="xt-l">${ICO.timer}<b class="xt-t"></b></span><button class="xt-x" data-a="cancel">Stop</button></div></div>
        <div class="isl-v x" data-v="x-call"><div class="xt"><span class="xt-l"><em class="xc-n"></em><b class="xt-t g"></b></span><button class="xt-x red" data-a="hangup">End</button></div></div>`;
    const g2 = new Group({ ...SIZES.idle }, { response: 0.46, damping: 0.74 }, (v) => {
      el.style.width = v.w + "px";
      el.style.height = v.h + "px";
      el.style.borderRadius = v.r + "px";
    });
    g2.snap(SIZES.idle);
    const act = { music: null, timer: null, call: null };
    let expanded = null;
    let view = "idle";
    let alertTimer = 0;
    let collapseTimer = 0;
    let alertShown = null;
    const order2 = ["call", "timer", "music"];
    const top = () => order2.find((k) => act[k]);
    const fmt = (s) => {
      s = Math.max(0, Math.round(s));
      const m = Math.floor(s / 60);
      return `${Math.floor(m / 60) ? Math.floor(m / 60) + ":" : ""}${String(m % 60).padStart(Math.floor(m / 60) ? 2 : 1, "0")}:${String(s % 60).padStart(2, "0")}`;
    };
    function setView(v) {
      if (v === view) return;
      view = v;
      el.dataset.view = v;
      el.querySelectorAll(".isl-v").forEach((n) => n.classList.toggle("on", n.dataset.v === v));
      const size = SIZES[v] || SIZES.compact;
      g2.to({ w: size.w, h: size.h, r: size.r }, { params: v === "idle" || v.startsWith("compact") ? { response: 0.42, damping: 0.8 } : { response: 0.48, damping: 0.72 } });
    }
    function render2() {
      let v = "idle";
      if (alertShown) v = "alert";
      else {
        const k = top();
        if (k) v = expanded === k ? "x-" + k : "compact-" + k;
      }
      setView(v);
      const m = act.music;
      el.querySelectorAll(".wave").forEach((w) => w.classList.toggle("on", !!m?.playing));
      if (m) {
        el.querySelector(".xm-title").textContent = m.title || "";
        el.querySelector(".xm-artist").textContent = m.artist || "";
        el.querySelector(".pp").innerHTML = m.playing ? ICO.pause : ICO.play;
        el.querySelectorAll(".mini-art,.art").forEach((a) => a.style.background = m.art || "linear-gradient(135deg,#fc5c7d,#6a82fb)");
      }
      ticker();
    }
    let tk = 0;
    function ticker() {
      const need = act.timer || act.call || expanded === "music" && act.music;
      if (need && !tk) tk = setInterval(updateTimes, 250);
      if (!need && tk) {
        clearInterval(tk);
        tk = 0;
      }
      updateTimes();
    }
    function updateTimes() {
      if (act.timer) {
        const left = Math.max(0, (act.timer.end - Date.now()) / 1e3);
        el.querySelector('[data-v="compact-timer"] .t').textContent = fmt(left);
        el.querySelector(".xt-t").textContent = fmt(left);
        if (left <= 0) {
          const done = act.timer;
          ctx.mod.island.update("timer", null);
          done.onDone?.();
          ctx.mod.island.alert(`<span style="font-weight:700">Timer</span> done`, "timer", 3500);
        }
      }
      if (act.call) {
        const s = (Date.now() - act.call.start) / 1e3;
        el.querySelector('[data-v="compact-call"] .t').textContent = fmt(s);
        el.querySelector('[data-v="x-call"] .xt-t').textContent = fmt(s);
        el.querySelector(".xc-n").textContent = act.call.name;
      }
      if (act.music && expanded === "music") {
        const p = act.music.getProgress?.() || { cur: 0, dur: 0 };
        el.querySelector(".cur").textContent = fmt(p.cur);
        el.querySelector(".dur").textContent = fmt(p.dur);
        el.querySelector(".track i").style.width = (p.dur ? p.cur / p.dur * 100 : 0) + "%";
      }
    }
    const api = ctx.mod.island = {
      update(kind, data) {
        act[kind] = data;
        if (!data && expanded === kind) expanded = null;
        render2();
      },
      expand(kind) {
        expanded = kind || top();
        clearTimeout(collapseTimer);
        render2();
        collapseTimer = setTimeout(api.collapse, 9e3);
      },
      collapse() {
        expanded = null;
        render2();
      },
      alert(html, icon, ms = 2200) {
        alertShown = true;
        el.querySelector(".ai").innerHTML = ICO[icon] || "";
        el.querySelector(".at").innerHTML = html;
        render2();
        clearTimeout(alertTimer);
        alertTimer = setTimeout(() => {
          alertShown = null;
          render2();
        }, ms);
      }
    };
    el.addEventListener("click", (e) => {
      const b = e.target.closest("[data-a]");
      if (b) {
        const a = b.dataset.a;
        if (a === "toggle") ctx.mod.player?.toggle();
        else if (a === "next") ctx.mod.player?.next();
        else if (a === "prev") ctx.mod.player?.prev();
        else if (a === "cancel") ctx.mod.clock?.cancelTimer();
        else if (a === "hangup") ctx.mod.phone?.hangup();
        e.stopPropagation();
        return;
      }
      if (expanded) api.collapse();
      else if (top()) api.expand();
    });
    ctx.screen.addEventListener("pointerdown", (e) => {
      if (expanded && !e.target.closest("#island")) api.collapse();
    }, true);
    ctx.mod.ICO = ICO;
    render2();
  }

  // js/system/control.js
  init_glass();
  var I = {
    air: `<path d="M21 16v-2l-8-5V3.500a1.500 1.500 0 0 0-3 0V9l-8 5v2l8-2.500V19l-2 1.500V22l3.500-1 3.500 1v-1.500L13 19v-5.500z" fill="currentColor"/>`,
    cell: `<path d="M4 18V14M9 18V10M14 18V6M19 18V2" stroke="currentColor" stroke-width="3" stroke-linecap="round" fill="none"/>`,
    wifi: `<path d="M2 9a15 15 0 0 1 20 0M5.500 12.500a10 10 0 0 1 13 0M9 16a5 5 0 0 1 6 0" stroke="currentColor" stroke-width="2.400" stroke-linecap="round" fill="none"/><circle cx="12" cy="19.500" r="1.600" fill="currentColor"/>`,
    bt: `<path d="M7 7l10 10-5 4.500V2.500L17 7 7 17" stroke="currentColor" stroke-width="2.200" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
    moon: `<path d="M20 14.500A8.500 8.500 0 1 1 9.500 4a7 7 0 0 0 10.500 10.500z" fill="currentColor"/>`,
    flash: `<path d="M8 2h8v4.500l-1.700 3.200V22H9.700V9.700L8 6.500z" fill="currentColor"/>`,
    timer: `<circle cx="12" cy="13.500" r="8" stroke="currentColor" stroke-width="2.200" fill="none"/><path d="M12 9.500v4l2.500 1.500M9.500 2.500h5" stroke="currentColor" stroke-width="2.200" stroke-linecap="round" fill="none"/>`,
    calc: `<rect x="4" y="2.500" width="16" height="19" rx="3.500" stroke="currentColor" stroke-width="2.200" fill="none"/><path d="M8 7h8M8 12h2M14 12h2M8 16.500h2M14 16.500h2" stroke="currentColor" stroke-width="2.200" stroke-linecap="round"/>`,
    cam: `<path d="M8.500 5 9.700 3h4.600l1.200 2H19a2.500 2.500 0 0 1 2.500 2.500v10A2.500 2.500 0 0 1 19 20H5a2.500 2.500 0 0 1-2.500-2.500v-10A2.500 2.500 0 0 1 5 5z" fill="currentColor"/><circle cx="12" cy="12.500" r="3.800" fill="#000" opacity=".55"/>`,
    sun: `<circle cx="12" cy="12" r="4.200" fill="currentColor"/><path d="M12 2.500v2.500M12 19v2.500M2.500 12H5M19 12h2.500M5.300 5.300l1.800 1.800M16.900 16.900l1.800 1.800M5.300 18.700l1.800-1.800M16.900 7.100l1.800-1.800" stroke="currentColor" stroke-width="2.200" stroke-linecap="round"/>`,
    vol: `<polygon points="3 9 7 9 12 4.500 12 19.500 7 15 3 15" fill="currentColor"/><path d="M15.500 8.500a5 5 0 0 1 0 7M18.500 5.500a9.500 9.500 0 0 1 0 13" stroke="currentColor" stroke-width="2.200" stroke-linecap="round" fill="none"/>`,
    rot: `<rect x="6" y="3" width="12" height="18" rx="3" stroke="currentColor" stroke-width="2.200" fill="none"/><path d="M3 12a9 9 0 0 1 3-6.500M21 12a9 9 0 0 1-3 6.500" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>`,
    bell: `<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.700 21a2 2 0 0 1-3.400 0" stroke="currentColor" stroke-width="2.200" stroke-linecap="round" fill="none"/>`,
    half: `<circle cx="12" cy="12" r="8.500" stroke="currentColor" stroke-width="2.200" fill="none"/><path d="M12 3.500a8.500 8.500 0 0 1 0 17z" fill="currentColor"/>`,
    batt: `<rect x="2.500" y="7" width="17" height="10" rx="2.600" stroke="currentColor" stroke-width="2" fill="none"/><path d="M22 10.500v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><rect x="5" y="9.500" width="6" height="5" rx="1" fill="currentColor"/>`,
    play: `<path d="M8 5.500v13a1 1 0 0 0 1.500.86l10.500-6.500a1 1 0 0 0 0-1.720L9.500 4.640A1 1 0 0 0 8 5.500z" fill="currentColor"/>`,
    pause: `<rect x="6" y="5" width="4.200" height="14" rx="1.400" fill="currentColor"/><rect x="13.800" y="5" width="4.200" height="14" rx="1.400" fill="currentColor"/>`,
    next: `<path d="M5 6.200v11.600a.8.8 0 0 0 1.250.66l8.200-5.800a.8.8 0 0 0 0-1.320l-8.200-5.800A.8.8 0 0 0 5 6.200zM16.500 5.500h2.300v13h-2.300z" fill="currentColor"/>`,
    prev: `<path d="M19 6.200v11.600a.8.8 0 0 1-1.250.66l-8.200-5.800a.8.8 0 0 1 0-1.320l8.200-5.800A.8.8 0 0 1 19 6.200zM7.500 5.500H5.200v13h2.300z" fill="currentColor"/>`
  };
  var svg2 = (n, s = 26) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}">${I[n]}</svg>`;
  var G = (cls, extra = "") => `data-glass data-glass-lite data-glass-bezel="26" ${extra} class="${cls}"`;
  function initControl() {
    const el = ctx.el.cc;
    const cb = (key, ico, color) => `<button class="cbtn" data-key="${key}" data-glass data-glass-surface="circle" data-glass-bezel="20" data-glass-thickness="40" data-glass-blur="4" data-press-scale="1.1" style="--on:${color}">${svg2(ico, 28)}</button>`;
    const tile = (key, ico, label) => `<button class="tile" data-key="${key}" data-glass data-glass-lite data-glass-bezel="30" data-press-scale="1.08">${svg2(ico, 30)}</button>`;
    el.innerHTML = `
    <div class="cc-bg"></div>
    <div class="cc-grid">
        <div class="mod s22 conn" ${G("")}>${cb("airplane", "air", "#ff9f0a")}${cb("cellular", "cell", "#30d158")}${cb("wifi", "wifi", "#0a84ff")}${cb("bt", "bt", "#0a84ff")}</div>
        <div class="mod s22 media" ${G("")}>
            <div class="m-art"></div><div class="m-t"><b>Not Playing</b><em></em></div>
            <div class="m-c"><button data-m="prev">${svg2("prev", 28)}</button><button data-m="toggle" class="pp">${svg2("play", 34)}</button><button data-m="next">${svg2("next", 28)}</button></div>
        </div>
        ${tile("rotation", "rot")}${tile("silent", "bell")}
        <div class="mod vs s12 bright" data-slider="brightness" ${G("")}><i class="vsf"></i>${svg2("sun", 30)}</div>
        <div class="mod vs s12 volume" data-slider="volume" ${G("")}><i class="vsf"></i>${svg2("vol", 30)}</div>
        <button class="mod s21 focus" data-key="focus" ${G("", 'data-press-scale="1.05"')}>${svg2("moon", 28)}<b>Focus</b></button>
        ${tile("flash", "flash")}${tile("timer", "timer")}${tile("calc", "calc")}${tile("cam", "cam")}
        ${tile("dark", "half")}${tile("lowpower", "batt")}
    </div>`;
    el.querySelectorAll("[data-glass]").forEach(registerGlass);
    const g2 = new Group({ p: 0 }, { response: 0.46, damping: 0.84 }, (v) => {
      const p = clamp(v.p, 0, 1.04);
      const bg = el.querySelector(".cc-bg");
      const grid = el.querySelector(".cc-grid");
      bg.style.opacity = clamp(p, 0, 1).toFixed(3);
      grid.style.opacity = clamp(p * 1.4 - 0.1, 0, 1).toFixed(3);
      grid.style.transform = `scale(${(0.55 + 0.45 * p).toFixed(4)})`;
      el.style.visibility = p < 4e-3 ? "hidden" : "visible";
      el.style.pointerEvents = p > 0.6 ? "auto" : "none";
    });
    g2.snap({ p: 0 });
    let isOpen = false;
    const toggles = {
      airplane: () => {
        const on = !sys.get("airplane");
        sys.set("airplane", on);
        if (on) ["wifi", "bt", "cellular"].forEach((k) => sys.set(k, false));
      },
      cellular: () => sys.set("cellular", !sys.get("cellular")),
      wifi: () => sys.set("wifi", !sys.get("wifi")),
      bt: () => sys.set("bt", !sys.get("bt")),
      focus: () => {
        sys.set("focus", !sys.get("focus"));
        ctx.mod.island.alert(sys.get("focus") ? "Do Not Disturb" : "Focus off", "bellon", 1500);
      },
      rotation: () => sys.set("rotlock", !sys.get("rotlock")),
      silent: () => sys.set("silent", !sys.get("silent")),
      flash: () => sys.set("flash", !sys.get("flash"), false),
      dark: () => sys.set("theme", sys.get("theme") === "dark" ? "light" : "dark"),
      lowpower: () => sys.set("lowpower", !sys.get("lowpower"))
    };
    const stateOf = {
      airplane: () => sys.get("airplane"),
      cellular: () => sys.get("cellular") && !sys.get("airplane"),
      wifi: () => sys.get("wifi"),
      bt: () => sys.get("bt"),
      focus: () => sys.get("focus"),
      rotation: () => sys.get("rotlock"),
      silent: () => sys.get("silent"),
      flash: () => sys.get("flash"),
      dark: () => sys.get("theme") === "dark",
      lowpower: () => sys.get("lowpower")
    };
    const refresh = () => el.querySelectorAll("[data-key]").forEach((b) => b.classList.toggle("on", !!stateOf[b.dataset.key]?.()));
    ["airplane", "cellular", "wifi", "bt", "focus", "rotlock", "silent", "flash", "theme", "lowpower"].forEach((k) => sys.on(k, refresh));
    el.addEventListener("click", (e) => {
      const appTile = e.target.closest(".tile");
      if (appTile && ["timer", "calc", "cam"].includes(appTile.dataset.key)) {
        const id = { timer: "clock", calc: "calculator", cam: "camera" }[appTile.dataset.key];
        const r = ctx.rect(appTile);
        api.close();
        return void setTimeout(() => ctx.mod.wm.open(id, r), 60);
      }
      const b = e.target.closest("[data-key]");
      if (b) {
        const k = b.dataset.key;
        buzz(10);
        sfx.tap();
        if (toggles[k]) return void toggles[k]();
        return;
      }
      const m = e.target.closest("[data-m]");
      if (m) {
        const p = ctx.mod.player;
        if (m.dataset.m === "toggle") p?.toggle();
        else p?.[m.dataset.m]?.();
        return;
      }
      if (!e.target.closest(".mod, .tile")) api.close();
    });
    ["timer", "calc", "cam"].forEach((k) => delete toggles[k]);
    el.querySelectorAll("[data-slider]").forEach((s) => {
      const key = s.dataset.slider;
      const fill = s.querySelector(".vsf");
      const draw = (v) => fill.style.height = `${(v * 100).toFixed(1)}%`;
      sys.on(key, draw);
      const set = (e) => {
        const r = s.getBoundingClientRect();
        const v = clamp(1 - (e.clientY - r.top) / r.height, key === "brightness" ? 0.04 : 0, 1);
        sys.set(key, v, false);
        if (key === "volume") ctx.mod.showVolume?.();
      };
      s.addEventListener("pointerdown", (e) => {
        try {
          s.setPointerCapture(e.pointerId);
        } catch {
        }
        ;
        s.classList.add("drag");
        set(e);
      });
      s.addEventListener("pointermove", (e) => s.classList.contains("drag") && set(e));
      const up = () => {
        s.classList.remove("drag");
        sys.set(key, sys.get(key));
      };
      s.addEventListener("pointerup", up);
      s.addEventListener("pointercancel", up);
    });
    ctx.mod.ccMedia = (m) => {
      el.querySelector(".m-t b").textContent = m?.title || "Not Playing";
      el.querySelector(".m-t em").textContent = m?.artist || "";
      el.querySelector(".m-art").style.background = m?.art || "rgba(255,255,255,.15)";
      el.querySelector(".pp").innerHTML = svg2(m?.playing ? "pause" : "play", 34);
    };
    const api = ctx.mod.cc = {
      get open() {
        return isOpen;
      },
      begin() {
        el.style.visibility = "visible";
        g2.drive({ p: 0 });
      },
      drag(p) {
        g2.drive({ p });
      },
      release(vyDown) {
        const p = g2.values.p;
        const want = vyDown > 450 ? true : vyDown < -450 ? false : p > 0.45;
        want ? api.openIt() : api.close();
      },
      openIt() {
        isOpen = true;
        g2.to({ p: 1 }, { params: { response: 0.5, damping: 0.78 } });
        ctx.mod.setStatusTone("light");
        ctx.mod.setIndicatorTone("light");
      },
      close(instant) {
        isOpen = false;
        if (instant) g2.snap({ p: 0 });
        else g2.to({ p: 0 }, { params: { response: 0.42, damping: 1 } });
        ctx.mod.wm.syncTone();
      }
    };
    refresh();
  }

  // js/system/spotlight.js
  init_glass();
  function initSpotlight() {
    const el = ctx.el.spot;
    el.innerHTML = `<div class="sp-bg"></div>
        <div class="sp-top"><div class="sp-field" data-glass data-glass-lite data-glass-static data-glass-bezel="22"><svg viewBox="0 0 24 24" width="18" height="18"><circle cx="10.500" cy="10.500" r="6.500" stroke="currentColor" stroke-width="2.200" fill="none"/><path d="M15.500 15.500 21 21" stroke="currentColor" stroke-width="2.200" stroke-linecap="round"/></svg><input data-kb inputmode="none" placeholder="Search" autocomplete="off"></div><button class="sp-cancel">Cancel</button></div>
        <div class="sp-list"></div>`;
    registerGlass(el.querySelector(".sp-field"));
    const input = el.querySelector("input");
    const list = el.querySelector(".sp-list");
    let isOpen = false;
    const g2 = new Group({ p: 0 }, { response: 0.44, damping: 0.9 }, (v) => {
      const p = clamp(v.p, 0, 1);
      el.style.visibility = p < 4e-3 ? "hidden" : "visible";
      el.style.pointerEvents = p > 0.5 ? "auto" : "none";
      el.querySelector(".sp-bg").style.opacity = p;
      const top = el.querySelector(".sp-top");
      top.style.opacity = clamp(p * 1.5 - 0.2, 0, 1);
      top.style.transform = `translate3d(0,${(1 - p) * -24}px,0)`;
      list.style.opacity = clamp(p * 1.5 - 0.3, 0, 1);
    });
    g2.snap({ p: 0 });
    function fill(q) {
      list.innerHTML = "";
      const apps = Object.values(APPS).filter((a) => !q || a.name.toLowerCase().includes(q.toLowerCase()));
      if (!apps.length) return void list.append(h("p.empty", "No Results"));
      list.append(h("div.sp-h", q ? "Applications" : "Siri Suggestions"));
      apps.slice(0, 8).forEach((a) => {
        list.append(h("button.sp-row", { on: { click: () => {
          const r = ctx.mod.home.iconRect(a.id);
          api.close();
          ctx.mod.wm.open(a.id, r);
        } }, html: `<span class="mini">${iconHTML(a.id, a.name)}</span><b>${a.name}</b>` }));
      });
    }
    input.addEventListener("input", () => fill(input.value));
    el.querySelector(".sp-cancel").addEventListener("click", () => api.close());
    el.querySelector(".sp-bg").addEventListener("click", () => api.close());
    const api = ctx.mod.spot = {
      get open() {
        return isOpen;
      },
      drag(p) {
        g2.drive({ p });
        if (p > 0.02) fill(input.value);
      },
      release(vyDown) {
        const p = g2.values.p;
        const want = vyDown > 450 ? true : vyDown < -450 ? false : p > 0.4;
        want ? api.openIt() : api.close();
      },
      openIt() {
        isOpen = true;
        fill("");
        g2.to({ p: 1 });
        setTimeout(() => input.focus(), 120);
        ctx.mod.setStatusTone("light");
      },
      close(instant) {
        if (!isOpen && g2.values.p < 0.01) return;
        isOpen = false;
        input.value = "";
        ctx.mod.kb?.hide();
        if (instant) g2.snap({ p: 0 });
        else g2.to({ p: 0 }, { params: { response: 0.4, damping: 1 } });
        ctx.mod.wm.syncTone();
      }
    };
  }

  // js/system/keyboard.js
  var KB_H = 316;
  var L1 = "qwertyuiop".split("");
  var L2 = "asdfghjkl".split("");
  var L3 = "zxcvbnm".split("");
  var N1 = "1234567890".split("");
  var N2 = ["-", "/", ":", ";", "(", ")", "$", "&", "@", '"'];
  var N3 = [".", ",", "?", "!", "'"];
  function initKeyboard() {
    const el = ctx.el.kb;
    el.innerHTML = `<div class="kb-bg" data-glass data-glass-lite data-glass-static data-glass-bezel="1"></div><div class="kb-keys"></div><div class="kb-pop"></div>`;
    const keys = el.querySelector(".kb-keys");
    const pop = el.querySelector(".kb-pop");
    const st = { mode: "abc", shift: false, caps: false, target: null, vis: false };
    const g2 = new Group({ y: KB_H }, { response: 0.44, damping: 0.9 }, (v) => {
      el.style.transform = `translate3d(0,${v.y.toFixed(1)}px,0)`;
      el.style.visibility = v.y >= KB_H - 0.5 ? "hidden" : "visible";
      ctx.screen.style.setProperty("--kb", `${Math.max(0, KB_H - v.y).toFixed(1)}px`);
    });
    g2.snap({ y: KB_H });
    const key = (label, o = {}) => {
      const k = h("button.k", { "data-k": o.v ?? label, class: o.cls || "", html: o.html || label });
      return k;
    };
    function render2() {
      keys.innerHTML = "";
      const up2 = st.shift || st.caps;
      const row = (arr, cls = "") => h("div.kr" + (cls ? "." + cls : ""), arr);
      if (st.mode === "abc") {
        const f = (c) => key(up2 ? c.toUpperCase() : c, { v: up2 ? c.toUpperCase() : c });
        keys.append(row(L1.map(f)), row(L2.map(f), "r2"));
        keys.append(row([key("", { v: "shift", cls: "fn sh" + (st.shift ? " on" : "") + (st.caps ? " caps" : ""), html: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 4 3.500 13H9v6h6v-6h5.500z" fill="currentColor"/></svg>' }), ...L3.map(f), key("", { v: "del", cls: "fn", html: '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M9 5h11a1.500 1.500 0 0 1 1.500 1.500v11A1.500 1.500 0 0 1 20 19H9l-6-7z" fill="none" stroke="currentColor" stroke-width="1.800" stroke-linejoin="round"/><path d="M12.500 9.500l5 5M17.500 9.500l-5 5" stroke="currentColor" stroke-width="1.800" stroke-linecap="round"/></svg>' })], "r3"));
      } else {
        keys.append(row(N1.map((c) => key(c))), row(N2.map((c) => key(c))));
        keys.append(row([key("#+=", { v: "noop", cls: "fn" }), ...N3.map((c) => key(c)), key("", { v: "del", cls: "fn", html: '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M9 5h11a1.500 1.500 0 0 1 1.500 1.500v11A1.500 1.500 0 0 1 20 19H9l-6-7z" fill="none" stroke="currentColor" stroke-width="1.800" stroke-linejoin="round"/><path d="M12.500 9.500l5 5M17.500 9.500l-5 5" stroke="currentColor" stroke-width="1.800" stroke-linecap="round"/></svg>' })], "r3 n"));
      }
      keys.append(row([key(st.mode === "abc" ? "123" : "ABC", { v: "mode", cls: "fn" }), key("space", { v: " ", cls: "space" }), key("return", { v: "ret", cls: "fn ret" })], "r4"));
    }
    render2();
    function insert(t) {
      const tg = st.target;
      if (!tg) return;
      if (tg.isContentEditable) document.execCommand("insertText", false, t);
      else {
        const s = tg.selectionStart ?? tg.value.length;
        const e = tg.selectionEnd ?? s;
        tg.setRangeText(t, s, e, "end");
        tg.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
    function back() {
      const tg = st.target;
      if (!tg) return;
      if (tg.isContentEditable) return document.execCommand("delete");
      const s = tg.selectionStart ?? 0;
      const e = tg.selectionEnd ?? s;
      if (s !== e) tg.setRangeText("", s, e, "end");
      else if (s > 0) tg.setRangeText("", s - 1, s, "end");
      tg.dispatchEvent(new Event("input", { bubbles: true }));
    }
    function press(v) {
      sfx.key();
      if (v === "del") return back();
      if (v === "shift") {
        const now = performance.now();
        if (now - (st.lastShift || 0) < 350) st.caps = true, st.shift = false;
        else if (st.caps) st.caps = false;
        else st.shift = !st.shift;
        st.lastShift = now;
        return render2();
      }
      if (v === "mode") {
        st.mode = st.mode === "abc" ? "num" : "abc";
        return render2();
      }
      if (v === "noop") return;
      if (v === "ret") {
        const tg = st.target;
        if (tg?.tagName === "TEXTAREA" || tg?.isContentEditable) return insert("\n");
        tg?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
        tg?.dispatchEvent(new CustomEvent("kb-return", { bubbles: true }));
        return;
      }
      insert(v);
      if (st.shift && !st.caps) {
        st.shift = false;
        render2();
      }
    }
    let rep = 0;
    keys.addEventListener("pointerdown", (e) => {
      const k = e.target.closest(".k");
      if (!k) return;
      e.preventDefault();
      e.stopPropagation();
      const v = k.dataset.k;
      k.classList.add("down");
      buzz(4);
      if (v.length === 1 && v !== " ") {
        const kr = ctx.rect(k);
        pop.textContent = v;
        pop.style.cssText = `left:${kr.x + kr.w / 2 - 33}px;top:${kr.y - kr.h - 22 - (H - KB_H) + 6}px;`;
        pop.classList.add("on");
      }
      try {
        k.setPointerCapture(e.pointerId);
      } catch {
      }
      ;
      if (v === "del") {
        press(v);
        rep = setTimeout(function loop() {
          press("del");
          rep = setTimeout(loop, 55);
        }, 420);
      }
      k._v = v;
    });
    const up = (e) => {
      const k = e.target.closest?.(".k");
      clearTimeout(rep);
      pop.classList.remove("on");
      keys.querySelectorAll(".down").forEach((x) => x.classList.remove("down"));
      if (!k || e.type === "pointercancel") return;
      const r = k.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top - 8 && e.clientY <= r.bottom + 8;
      if (inside && k._v !== "del") press(k._v);
    };
    keys.addEventListener("pointerup", up);
    keys.addEventListener("pointercancel", up);
    const isField = (t) => t?.matches?.("input[data-kb],textarea[data-kb],[contenteditable][data-kb]");
    ctx.screen.addEventListener("focusin", (e) => isField(e.target) && api.show(e.target));
    ctx.screen.addEventListener("focusout", (e) => {
      if (isField(e.target)) setTimeout(() => !isField(document.activeElement) && api.hide(), 30);
    });
    const api = ctx.mod.kb = {
      get visible() {
        return st.vis;
      },
      height: KB_H,
      show(t) {
        st.target = t;
        if (!st.vis) {
          st.vis = true;
          g2.to({ y: 0 });
        }
        st.mode = "abc";
        st.shift = !t.value;
        render2();
      },
      hide() {
        if (!st.vis) return;
        st.vis = false;
        document.activeElement?.blur?.();
        g2.to({ y: KB_H }, { params: { response: 0.38, damping: 1 } });
      }
    };
  }

  // js/system/gestures.js
  function initGestures() {
    const screen = ctx.screen;
    const vel = new Velocity();
    let g2 = null;
    screen.addEventListener("pointerdown", (e) => {
      if (!ctx.mod.power.on || g2) return;
      if (e.target.closest("#island, .kb-keys")) return;
      const p = ctx.pt(e);
      const wm2 = ctx.mod.wm;
      const lock = ctx.mod.lock;
      const cc = ctx.mod.cc;
      let type = null;
      if (p.y > H - 36) type = "bottom";
      else if (p.y < 46) type = p.x > W * 0.55 ? "cc" : "notif";
      if (!type) return;
      if (type === "notif" && (lock.shown || cc.open || wm2.mode === "switcher")) type = null;
      if (type === "cc" && (cc.open || wm2.mode === "switcher")) type = null;
      if (!type) return;
      e.stopPropagation();
      e.preventDefault();
      g2 = { type, x: p.x, y: p.y, id: e.pointerId, axis: null, started: false };
      vel.reset();
      vel.push(p.x, p.y);
      try {
        screen.setPointerCapture(e.pointerId);
      } catch {
      }
      ;
    }, true);
    screen.addEventListener("pointermove", (e) => {
      if (!g2 || e.pointerId !== g2.id) return;
      const p = ctx.pt(e);
      vel.push(p.x, p.y);
      const dx = p.x - g2.x;
      const dy = p.y - g2.y;
      const up = -dy;
      const wm2 = ctx.mod.wm;
      const lock = ctx.mod.lock;
      const cc = ctx.mod.cc;
      const k = (d) => Math.min(1, Math.max(0, d));
      if (g2.type === "cc") {
        if (!g2.started && dy > 6) g2.started = true, cc.begin();
        if (g2.started) cc.drag(k(dy / (H * 0.42)));
        return;
      }
      if (g2.type === "notif") {
        if (!g2.started && dy > 6) g2.started = true, lock.peek.start();
        if (g2.started) lock.peek.move(dy);
        return;
      }
      if (cc.open) return void (g2.started = true, cc.drag(1 - k(up / (H * 0.42))));
      if (ctx.mod.spot.open) return void (g2.started = true, ctx.mod.spot.drag(1 - k(up / (H * 0.35))));
      if (lock.shown) {
        g2.started = true;
        return lock.dragMove(Math.max(0, up));
      }
      if (wm2.mode === "switcher") return void (g2.started = true);
      if (g2.started && g2.axis) {
        if (g2.axis === "x") wm2.swipeMove(dx);
        else wm2.dragMove(dx, Math.max(0, up));
        return;
      }
      if (wm2.mode === "app" && !g2.axis && Math.hypot(dx, dy) > 8) {
        g2.axis = Math.abs(dx) > Math.abs(dy) * 1.4 ? "x" : "y";
        g2.started = g2.axis === "x" ? wm2.swipeStart() : wm2.dragStart();
        if (g2.started) g2.axis === "x" ? wm2.swipeMove(dx) : wm2.dragMove(dx, Math.max(0, up));
      }
    });
    const end = (e) => {
      if (!g2 || e.pointerId !== g2.id) return;
      const d = g2;
      g2 = null;
      const p = ctx.pt(e);
      const v = vel.get();
      const dx = p.x - d.x;
      const up = d.y - p.y;
      const wm2 = ctx.mod.wm;
      if (d.type === "cc") return d.started && ctx.mod.cc.release(v.y);
      if (d.type === "notif") return d.started && ctx.mod.lock.peek.end(v.y);
      if (ctx.mod.cc.open) return ctx.mod.cc.release(v.y);
      if (ctx.mod.spot.open) return ctx.mod.spot.release(v.y);
      if (ctx.mod.lock.shown) return d.started && ctx.mod.lock.dragEnd(-v.y);
      if (wm2.mode === "switcher") return up > 40 && wm2.exitSwitcher(null);
      if (d.started && d.axis) return d.axis === "x" ? wm2.swipeEnd(v, dx) : wm2.dragEnd(v, dx, Math.max(0, up));
    };
    screen.addEventListener("pointerup", end);
    screen.addEventListener("pointercancel", end);
  }

  // js/system/power.js
  function initPower() {
    const off = ctx.el.off;
    const st = { on: true };
    const api = ctx.mod.power = {
      get on() {
        return st.on;
      },
      sleep() {
        if (!st.on) return;
        st.on = false;
        sfx.lock();
        ctx.mod.kb?.hide();
        ctx.mod.cc?.close(true);
        ctx.mod.spot?.close(true);
        ctx.mod.lock.lock();
        off.classList.add("on");
        ctx.mod.island?.collapse();
      },
      wake() {
        if (st.on) return;
        st.on = true;
        off.classList.remove("on");
        ctx.mod.lock.wake();
      },
      toggle() {
        st.on ? api.sleep() : api.wake();
      }
    };
    const press = (name) => {
      switch (name) {
        case "power":
          api.toggle();
          break;
        case "volup":
          api.on && ctx.mod.bumpVolume(1 / 16);
          break;
        case "voldown":
          api.on && ctx.mod.bumpVolume(-1 / 16);
          break;
        case "action": {
          if (!api.on) return api.wake();
          const s = !sys.get("silent");
          sys.set("silent", s);
          ctx.mod.island.alert(s ? "Silent" : "Ring", s ? "bell" : "bellon", 1800);
          navigator.vibrate?.(s ? [30, 40, 30] : 30);
          break;
        }
        case "camctl":
          if (!api.on) api.wake();
          if (ctx.mod.lock.shown) ctx.mod.lock.hide(true);
          setTimeout(() => ctx.mod.wm.open("camera", { x: 392, y: 640, w: 40, h: 40 }), 80);
          break;
      }
    };
    ctx.phone.querySelectorAll("[data-hw]").forEach((b) => b.addEventListener("click", () => press(b.dataset.hw)));
    off.addEventListener("click", () => api.wake());
    addEventListener("keydown", (e) => {
      if (e.target.closest?.("input,textarea,[contenteditable]")) return;
      if (e.key === "Escape") ctx.mod.wm.goHome?.();
      if (e.key === "l" && e.ctrlKey) {
        e.preventDefault();
        api.toggle();
      }
    });
  }

  // js/apps/index.js
  var NAMES = {
    phone: "Phone",
    messages: "Messages",
    safari: "Safari",
    music: "Music",
    camera: "Camera",
    photos: "Photos",
    clock: "Clock",
    calendar: "Calendar",
    notes: "Notes",
    calculator: "Calculator",
    settings: "Settings",
    weather: "Weather",
    maps: "Maps",
    mail: "Mail",
    appstore: "App Store",
    wallet: "Wallet",
    health: "Health",
    files: "Files",
    stocks: "Stocks",
    tv: "TV",
    translate: "Translate",
    home: "Home",
    podcasts: "Podcasts",
    reminders: "Reminders",
    compass: "Compass"
  };
  async function registerAllApps(mods) {
    for (const m of mods) m();
    for (const [id, name] of Object.entries(NAMES)) {
      if (APPS[id]) continue;
      registerApp({
        id,
        name,
        placeholder: true,
        status: "auto",
        get icon() {
          return iconHTML(id, name);
        },
        build(root) {
          root.append(h("div.ph", { html: `<span class="mini big">${iconHTML(id, name)}</span><h2>${name}</h2><p>This app isn\u2019t part of the simulator yet.<br>Swipe up from the bottom edge to go home.</p>` }));
        }
      });
    }
    for (const [id, a] of Object.entries(APPS)) if (!("icon" in a)) Object.defineProperty(a, "icon", { get: () => iconHTML(id, a.name) });
  }

  // js/core/ui.js
  init_glass();
  var ICO2 = {
    back: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>`,
    chev: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>`,
    plus: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 4v16M4 12h16"/></svg>`,
    compose: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-6M18.5 3.500a2 2 0 0 1 3 3L12 16l-4 1 1-4z"/></svg>`,
    trash: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>`,
    search: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="10.500" cy="10.500" r="6.500"/><path d="M15.500 15.500 21 21"/></svg>`,
    up: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>`
  };
  function page({ title, back, right, large = true, bg }) {
    const scroll = h("div.pg-s");
    const el = h("div.pg", { style: bg ? { background: bg } : {} });
    const bar = h("div.pg-bar");
    const left = back ? btn(ICO2.back, back.onClick, "circle") : h("span");
    const r = right ? Array.isArray(right) ? right : [right] : [];
    bar.append(left, h("div.pg-t", title || ""), h("div.pg-r", r));
    if (large && title) scroll.append(h("h1.lt", title));
    if (!large) el.classList.add("scrolled");
    else scroll.addEventListener("scroll", () => el.classList.toggle("scrolled", scroll.scrollTop > 40), { passive: true });
    el.append(scroll, bar);
    return { el, scroll, bar };
  }
  function btn(html, onClick, cls = "") {
    const b = h("button.gbtn" + (cls ? "." + cls : ""), { "data-glass": "", "data-glass-lite": "", "data-glass-bezel": "20", "data-press-scale": "1.1", html, on: { click: onClick } });
    requestAnimationFrame(() => registerGlass(b));
    return b;
  }
  var cell = ({ icon, color, title, detail, chev, onClick, right, sub }) => {
    const c = h("div.cell" + (onClick ? ".tap" : ""), { on: onClick ? { click: onClick } : {} });
    if (icon) c.append(h("span.ico", { style: { background: color || "#8e8e93" }, html: icon }));
    c.append(h("span.ct", { html: `${title}${sub ? `<em>${sub}</em>` : ""}` }));
    if (detail != null) c.append(h("span.det", detail));
    if (right) c.append(right);
    if (chev) c.append(h("span.chev", { html: ICO2.chev }));
    return c;
  };
  var group = (cells, foot) => h("div.grpw", [h("div.grp", cells), foot ? h("p.foot", foot) : null]);
  function toggle(value, onChange) {
    const i = h("input", { type: "checkbox" });
    i.checked = !!value;
    i.addEventListener("change", () => onChange(i.checked));
    const l = h("label.sw", [i, h("i")]);
    l.set = (v) => i.checked = !!v;
    return l;
  }
  function segmented(items, value, onChange) {
    const s = h("div.seg");
    const pill = h("i");
    s.append(pill);
    const btns = items.map(([v, label]) => h("button", { on: { click: () => set(v) } }, label));
    s.append(...btns);
    const set = (v, silent) => {
      const idx = items.findIndex(([x]) => x === v);
      s.style.setProperty("--n", items.length);
      s.style.setProperty("--i", idx);
      btns.forEach((b, j) => b.classList.toggle("on", j === idx));
      if (!silent) onChange(v);
    };
    set(value, true);
    s.set = (v) => set(v, true);
    return s;
  }
  function slider(value, onInput, { min = 0, max = 1, step = 0.01 } = {}) {
    const i = h("input.rng", { type: "range", min, max, step });
    i.value = value;
    const paint = () => i.style.setProperty("--v", (i.value - min) / (max - min) * 100 + "%");
    i.addEventListener("input", () => (paint(), onInput(+i.value)));
    paint();
    i.set = (v) => (i.value = v, paint());
    return i;
  }
  function tabBar(tabs, initial, onSelect) {
    const bar = h("div.tabbar", { "data-glass": "", "data-glass-lite": "", "data-glass-static": "", "data-glass-bezel": "32" });
    const lens = h("i.tlens", { "data-glass": "", "data-glass-static": "", "data-glass-manual": "", "data-glass-bezel": "26", "data-glass-thickness": "50", "data-glass-blur": "2", "data-glass-refraction": "1.1" });
    const btns = tabs.map((t) => h("button.tab", { on: { click: () => select(t.id) }, html: `${t.icon}<span>${t.label}</span>` }));
    bar.append(lens, ...btns);
    bar.style.setProperty("--n", tabs.length);
    requestAnimationFrame(() => (registerGlass(bar), registerGlass(lens)));
    let cur = initial;
    function select(id, silent) {
      const idx = tabs.findIndex((t) => t.id === id);
      cur = id;
      bar.style.setProperty("--i", idx);
      btns.forEach((b, j) => b.classList.toggle("on", j === idx));
      if (!silent) onSelect(id);
    }
    select(initial, true);
    bar.select = select;
    return bar;
  }
  var NavStack = class {
    constructor(root) {
      this.root = root;
      this.items = [];
      root.classList.add("nav");
      this.bindEdge();
    }
    mk(el) {
      const g2 = new Group({ x: 0 }, { response: 0.46, damping: 0.92 }, (v) => this.apply(el, v.x));
      el._g = g2;
      el._dim = h("div.pdim");
      el.append(el._dim);
      return g2;
    }
    apply(el, x) {
      el.style.transform = x === 0 ? "" : `translate3d(${x}px,0,0)`;
    }
    push(pageEl) {
      const prev = this.items[this.items.length - 1];
      const g2 = this.mk(pageEl);
      pageEl.classList.add("pushed");
      this.root.append(pageEl);
      this.items.push(pageEl);
      g2.snap({ x: W });
      g2.to({ x: 0 }, { done: () => (pageEl.classList.remove("moving"), prev && (prev.style.visibility = "hidden")) });
      pageEl.classList.add("moving");
      if (prev) {
        prev.style.visibility = "";
        prev._g.to({ x: -W * 0.3 });
        prev._dim.style.opacity = 0.14;
      }
      return pageEl;
    }
    pop() {
      if (this.items.length < 2) return;
      const top = this.items.pop();
      const prev = this.items[this.items.length - 1];
      prev.style.visibility = "";
      prev._g.to({ x: 0 });
      prev._dim.style.opacity = 0;
      top._g.to({ x: W }, { params: { response: 0.4, damping: 1 }, done: () => top.remove() });
    }
    bindEdge() {
      const vel = new Velocity();
      let d = null;
      this.root.addEventListener("pointerdown", (e) => {
        if (this.items.length < 2) return;
        const p = ctx.pt(e);
        const r = ctx.rect(this.root);
        if (p.x - r.x > 26 || p.y < 56 || p.y > 900) return;
        d = { x: p.x, id: e.pointerId };
        vel.reset();
        try {
          this.root.setPointerCapture(e.pointerId);
        } catch {
        }
        ;
        const top = this.items[this.items.length - 1];
        top.classList.add("moving");
      });
      this.root.addEventListener("pointermove", (e) => {
        if (!d || e.pointerId !== d.id) return;
        const p = ctx.pt(e);
        vel.push(p.x, 0);
        const dx = clamp(p.x - d.x, 0, W);
        const top = this.items[this.items.length - 1];
        const prev = this.items[this.items.length - 2];
        top._g.drive({ x: dx });
        prev._g.drive({ x: -W * 0.3 * (1 - dx / W) });
        prev._dim.style.opacity = 0.14 * (1 - dx / W);
      });
      const end = (e) => {
        if (!d) return;
        const x = top0(this).x;
        const top = this.items[this.items.length - 1];
        d = null;
        const vx = vel.get().x;
        if (vx > 450 || vx > -200 && top._g.values.x > W * 0.4) {
          this.pop();
        } else {
          top._g.to({ x: 0 }, { velocity: { x: vx } });
          const prev = this.items[this.items.length - 2];
          prev._g.to({ x: -W * 0.3 });
          prev._dim.style.opacity = 0.14;
        }
      };
      const top0 = (s) => ({ x: s.items[s.items.length - 1]._g.values.x });
      this.root.addEventListener("pointerup", end);
      this.root.addEventListener("pointercancel", end);
    }
  };

  // js/apps/settings.js
  var ic = (d, f = "none") => `<svg viewBox="0 0 24 24" fill="${f}" stroke="${f === "none" ? "#fff" : "none"}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  var I2 = {
    air: ic(`<path d="M21 16v-2l-8-5V3.500a1.500 1.500 0 0 0-3 0V9l-8 5v2l8-2.500V19l-2 1.500V22l3.500-1 3.500 1v-1.500L13 19v-5.500z"/>`, "#fff"),
    wifi: ic(`<path d="M2 9a15 15 0 0 1 20 0M5.500 12.500a10 10 0 0 1 13 0M9 16a5 5 0 0 1 6 0"/>`),
    bt: ic(`<path d="M7 7l10 10-5 4.500V2.500L17 7 7 17"/>`),
    cell: ic(`<path d="M4 18V14M9 18V10M14 18V6M19 18V2"/>`),
    bell: ic(`<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.700 21a2 2 0 0 1-3.400 0"/>`),
    snd: ic(`<polygon points="3 9 7 9 12 4.500 12 19.500 7 15 3 15"/><path d="M16 8.500a5 5 0 0 1 0 7"/>`),
    moon: ic(`<path d="M20 14.500A8.500 8.500 0 1 1 9.500 4a7 7 0 0 0 10.500 10.500z"/>`),
    gear: ic(`<circle cx="12" cy="12" r="3.500"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.900 4.900l2.100 2.100M17 17l2.100 2.100M4.900 19.100 7 17M17 7l2.100-2.100"/>`),
    sun: ic(`<circle cx="12" cy="12" r="4.200"/><path d="M12 2.500v2.500M12 19v2.500M2.500 12H5M19 12h2.500M5.300 5.300l1.800 1.800M16.900 16.900l1.800 1.800M5.300 18.700l1.800-1.800M16.900 7.100l1.800-1.800"/>`),
    wall: ic(`<rect x="3.500" y="3.500" width="17" height="17" rx="4"/><circle cx="9" cy="9" r="1.800"/><path d="M4 17l5-5 4 4 3-3 4 4"/>`),
    home: ic(`<rect x="4" y="4" width="6.500" height="6.500" rx="1.600"/><rect x="13.500" y="4" width="6.500" height="6.500" rx="1.600"/><rect x="4" y="13.500" width="6.500" height="6.500" rx="1.600"/><rect x="13.500" y="13.500" width="6.500" height="6.500" rx="1.600"/>`),
    phone: ic(`<rect x="7" y="2.500" width="10" height="19" rx="2.600"/><path d="M10.500 5.500h3"/>`),
    sw: ic(`<path d="M4 7h16M4 12h16M4 17h16"/>`)
  };
  function initSettings() {
    registerApp({
      id: "settings",
      name: "Settings",
      status: "auto",
      build(root) {
        const app = h("div.app");
        root.append(app);
        const nav = new NavStack(app);
        const back = { onClick: () => nav.pop() };
        const sub = (title, ...kids) => {
          const p = page({ title, back });
          p.scroll.append(...kids);
          return nav.push(p.el);
        };
        const wifiPage = () => sub(
          "Wi-Fi",
          group([cell({ title: "Wi-Fi", right: (() => {
            const t = toggle(sys.get("wifi"), (v) => sys.set("wifi", v));
            sys.on("wifi", (v) => t.set(v));
            return t;
          })() })]),
          group([cell({ title: "Home Network", detail: "Connected" }), cell({ title: "Guest", chev: true })], "Simulated networks.")
        );
        const aboutPage = () => {
          const row = (a, b) => cell({ title: a, detail: b });
          sub(
            "About",
            group([row("Name", "iPhone"), row("iOS Version", "27.0"), row("Model Name", "iPhone 18 Pro Max"), row("Model Number", "A3xxx (simulated)")]),
            group([row("Display", "6.9-inch Super Retina XDR"), row("Resolution", "2868 \xD7 1320 \xB7 460 ppi"), row("Points", "440 \xD7 956 @3x"), row("Chip", "A20 Pro"), row("Memory", "12 GB")]),
            group([row("Dimensions", "163.4 \xD7 78 \xD7 8.75 mm"), row("Dynamic Island", "16.57 mm"), row("Finish", sys.get("color")[0].toUpperCase() + sys.get("color").slice(1))], "This is a web simulator. Not affiliated with Apple.")
          );
        };
        const displayPage = () => {
          const seg = segmented([["light", "Light"], ["dark", "Dark"]], sys.get("theme"), (v) => sys.set("theme", v));
          sys.on("theme", (v) => seg.set(v), false);
          const bright = slider(sys.get("brightness"), (v) => sys.set("brightness", Math.max(0.04, v)), { min: 0.04, max: 1 });
          const glass = slider(sys.get("glass"), (v) => sys.set("glass", v));
          const demo = h("div.gdemo", { style: { background: ctx.mod.home.wallpaperEl.style.background } }, h("div.glens", { "data-glass": "", "data-glass-lite": "", "data-glass-static": "", "data-glass-bezel": "30" }, "Liquid Glass"));
          sub(
            "Display & Brightness",
            group([cell({ title: "Appearance", right: seg })]),
            group([cell({ icon: I2.sun, color: "#0a84ff", title: "Brightness" }), h("div.pad", bright)]),
            h("div.grpw", [h("p.foot.up", "Liquid Glass"), h("div.grp", [demo, h("div.pad.lbls", [h("span", "Clear"), h("span", "Tinted")]), h("div.pad", glass)]), h("p.foot", "Choose how clear or tinted Liquid Glass looks across the system.")])
          );
          requestAnimationFrame(() => Promise.resolve().then(() => (init_glass(), glass_exports)).then((g2) => g2.registerGlass(demo.firstChild)));
        };
        const wallpaperPage = () => {
          const grid = h("div.wgrid");
          const draw = () => {
            grid.innerHTML = "";
            WALLPAPERS.forEach((w) => grid.append(h("button.wtile" + (sys.get("wallpaper") === w.id ? ".on" : ""), { style: { background: w.css }, on: { click: () => {
              sys.set("wallpaper", w.id);
              draw();
            } } }, h("span", w.name))));
            const f = h("input", { type: "file", accept: "image/*", style: { display: "none" }, on: { change: (e) => {
              const file = e.target.files[0];
              if (!file) return;
              const r = new FileReader();
              r.onload = () => {
                sys.set("customWallpaper", r.result, false);
                sys.set("wallpaper", "custom", false);
                draw();
              };
              r.readAsDataURL(file);
            } } });
            grid.append(h("button.wtile.add", { on: { click: () => f.click() } }, "+ Photo"), f);
          };
          draw();
          sub("Wallpaper", grid, group([cell({ title: "Compact Lock Screen Clock", right: toggle(sys.get("compactClock"), (v) => sys.set("compactClock", v)) })], "New in iOS 27: a smaller clock so more of your wallpaper shows."));
        };
        const colorPage = () => {
          const sw2 = h("div.cgrid");
          const draw = () => {
            sw2.innerHTML = "";
            [["black", "#2b2b2f"], ["silver", "#d8d8dd"], ["glacier", "#a7bfd4"], ["burgundy", "#6b2236"]].forEach(([id, c]) => sw2.append(h("button.csw" + (sys.get("color") === id ? ".on" : ""), { on: { click: () => (sys.set("color", id), draw()) } }, h("i", { style: { background: c } }), h("span", id[0].toUpperCase() + id.slice(1)))));
          };
          draw();
          sub("Device Color", sw2);
        };
        const soundsPage = () => {
          const t = toggle(sys.get("silent"), (v) => sys.set("silent", v));
          sys.on("silent", (v) => t.set(v), false);
          sub("Sounds & Haptics", group([cell({ title: "Silent Mode", right: t })]), group([cell({ title: "Ringer and Alerts" }), h("div.pad", slider(sys.get("volume"), (v) => {
            sys.set("volume", v);
            ctx.mod.showVolume();
          }))]), group([cell({ title: "UI Sounds", right: toggle(sys.get("sounds"), (v) => sys.set("sounds", v)) })]));
        };
        const root0 = page({ title: "Settings" });
        const air = toggle(sys.get("airplane"), (v) => {
          sys.set("airplane", v);
          if (v) ["wifi", "bt", "cellular"].forEach((k) => sys.set(k, false));
        });
        sys.on("airplane", (v) => air.set(v), false);
        root0.scroll.append(
          h("div.field", [h("span", { html: ICO2.search }), h("input", { placeholder: "Search", "data-kb": "", inputmode: "none" })]),
          group([cell({ icon: `<b style="font-size:17px">D</b>`, color: "linear-gradient(135deg,#7b5cff,#ff4fa3)", title: "Dat514", sub: "Apple Account, iCloud+, Media & Purchases", chev: true })]),
          group([
            cell({ icon: I2.air, color: "#ff9f0a", title: "Airplane Mode", right: air }),
            cell({ icon: I2.wifi, color: "#0a84ff", title: "Wi-Fi", detail: sys.get("wifi") ? "Home Network" : "Off", chev: true, onClick: wifiPage }),
            cell({ icon: I2.bt, color: "#0a84ff", title: "Bluetooth", detail: sys.get("bt") ? "On" : "Off", chev: true }),
            cell({ icon: I2.cell, color: "#30d158", title: "Cellular", chev: true })
          ]),
          group([
            cell({ icon: I2.bell, color: "#ff3b30", title: "Notifications", chev: true }),
            cell({ icon: I2.snd, color: "#ff2d55", title: "Sounds & Haptics", chev: true, onClick: soundsPage }),
            cell({ icon: I2.moon, color: "#5e5ce6", title: "Focus", chev: true })
          ]),
          group([
            cell({ icon: I2.gear, color: "#8e8e93", title: "General", chev: true, onClick: () => sub("General", group([cell({ title: "About", chev: true, onClick: aboutPage }), cell({ title: "Software Update", detail: "iOS 27.0", chev: true })])) }),
            cell({ icon: I2.sw, color: "#636366", title: "Control Center", chev: true }),
            cell({ icon: I2.sun, color: "#0a84ff", title: "Display & Brightness", chev: true, onClick: displayPage }),
            cell({ icon: I2.home, color: "#5e5ce6", title: "Home Screen & App Library", chev: true }),
            cell({ icon: I2.wall, color: "#30b0c7", title: "Wallpaper", chev: true, onClick: wallpaperPage })
          ]),
          group([cell({ icon: I2.phone, color: "#1c1c1e", title: "Device Color", detail: sys.get("color"), chev: true, onClick: colorPage })], "Simulator option: change the finish of the virtual iPhone 18 Pro Max.")
        );
        nav.push(root0.el);
        root0.el.classList.remove("pushed");
      }
    });
  }

  // js/apps/tools.js
  function initCalculator() {
    registerApp({
      id: "calculator",
      name: "Calculator",
      status: "light",
      bg: "#000",
      build(root) {
        const app = h("div.app.dk.calc");
        root.append(app);
        let cur = "0", prev = null, op = null, fresh = true, hot = null;
        const disp = h("div.cdisp");
        const grid = h("div.cgrid4");
        app.append(disp, grid);
        const fmt = (s) => {
          const n = Number(s);
          if (!isFinite(n)) return "Error";
          if (s.endsWith(".")) return Number(s.slice(0, -1)).toLocaleString("en") + ".";
          const [i, f] = s.split(".");
          return f != null && /^\d+$/.test(f) && Math.abs(n) < 1e15 ? Number(i).toLocaleString("en") + "." + f : Math.abs(n) >= 1e9 || Math.abs(n) < 1e-6 && n ? n.toExponential(4) : n.toLocaleString("en", { maximumFractionDigits: 8 });
        };
        const show = () => {
          const t = fmt(cur);
          disp.textContent = t;
          disp.style.fontSize = Math.max(44, 96 - Math.max(0, t.length - 6) * 9) + "px";
          grid.querySelector('[data-k="AC"]').textContent = cur !== "0" || !fresh && prev == null ? "C" : "AC";
          grid.querySelectorAll(".op").forEach((b) => b.classList.toggle("hot", b.dataset.k === hot));
        };
        const calc = (a, o, b) => ({ "+": a + b, "\u2212": a - b, "\xD7": a * b, "\xF7": b === 0 ? NaN : a / b })[o];
        const press = (k) => {
          if (/\d/.test(k)) {
            if (fresh) cur = k, fresh = false;
            else if (cur.replace(/[-.]/g, "").length < 9) cur = cur === "0" ? k : cur + k;
            hot = hot && op ? hot : null;
          } else if (k === ".") {
            if (fresh) cur = "0.", fresh = false;
            else if (!cur.includes(".")) cur += ".";
          } else if (k === "AC" || k === "C") {
            if (k === "C") cur = "0", fresh = true;
            else cur = "0", prev = null, op = null, fresh = true, hot = null;
          } else if (k === "\xB1") cur = String(-Number(cur));
          else if (k === "%") cur = String(Number(cur) / 100);
          else if (k === "=") {
            if (op && prev != null) cur = String(calc(prev, op, Number(cur)));
            prev = null;
            op = null;
            hot = null;
            fresh = true;
          } else {
            if (op && prev != null && !fresh) cur = String(calc(prev, op, Number(cur)));
            prev = Number(cur);
            op = k;
            hot = k;
            fresh = true;
          }
          show();
        };
        [["AC", "\xB1", "%", "\xF7"], ["7", "8", "9", "\xD7"], ["4", "5", "6", "\u2212"], ["1", "2", "3", "+"], ["0", ".", "="]].forEach((r) => r.forEach((k) => {
          const cls = "\xF7\xD7\u2212+=".includes(k) ? "op" : ["AC", "\xB1", "%"].includes(k) ? "fn" : "num";
          const b = h("button.cb." + cls + (k === "0" ? ".zero" : ""), { "data-k": k }, k);
          b.addEventListener("pointerdown", () => {
            b.classList.add("hit");
            sfx.tap();
          });
          ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => b.addEventListener(ev, () => b.classList.remove("hit")));
          b.addEventListener("click", () => press(k));
          grid.append(b);
        }));
        show();
      }
    });
  }
  var CITIES = [["Ho Chi Minh City", "Asia/Ho_Chi_Minh"], ["Cupertino", "America/Los_Angeles"], ["New York", "America/New_York"], ["London", "Europe/London"], ["Tokyo", "Asia/Tokyo"], ["Sydney", "Australia/Sydney"]];
  var TI = {
    world: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>`,
    sw: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="13.500" r="8"/><path d="M12 9v4.500l3 1.500M9.500 2.500h5"/></svg>`,
    timer: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 3h12M6 21h12M7 3c0 6 10 6 10 9s-10 3-10 9"/></svg>`
  };
  function initClock() {
    registerApp({
      id: "clock",
      name: "Clock",
      status: "light",
      bg: "#000",
      build(root) {
        const app = h("div.app.dk.clk");
        root.append(app);
        const views = { world: h("div.cv"), sw: h("div.cv"), timer: h("div.cv") };
        Object.values(views).forEach((v) => app.append(v));
        const wlist = h("div.wlist");
        views.world.append(h("h1.lt", "World Clock"), wlist);
        const paintWorld = () => {
          const now = /* @__PURE__ */ new Date();
          const base = -now.getTimezoneOffset();
          wlist.innerHTML = "";
          CITIES.forEach(([n, tz]) => {
            const t = now.toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit" });
            const off = new Date(now.toLocaleString("en-US", { timeZone: tz }));
            const d = Math.round((off - new Date(now.toLocaleString("en-US"))) / 36e5);
            wlist.append(h("div.wrow", [h("div", [h("small", d === 0 ? "Today, +0HRS" : `Today, ${d > 0 ? "+" : ""}${d}HRS`), h("b", n)]), h("span", t)]));
          });
        };
        let swStart = 0, swAcc = 0, swRun = false, laps = [], raf2 = 0;
        const swTime = h("div.swt", "00:00.00");
        const swL = h("button.rb.gray", "Lap");
        const swR = h("button.rb.green", "Start");
        const lapEl = h("div.laps");
        views.sw.append(swTime, h("div.rbs", [swL, swR]), lapEl);
        const f = (ms) => `${String(Math.floor(ms / 6e4)).padStart(2, "0")}:${String(Math.floor(ms / 1e3) % 60).padStart(2, "0")}.${String(Math.floor(ms / 10) % 100).padStart(2, "0")}`;
        const el = () => swAcc + (swRun ? performance.now() - swStart : 0);
        const loop = () => {
          swTime.textContent = f(el());
          if (swRun) raf2 = requestAnimationFrame(loop);
        };
        const swPaint = () => {
          swR.textContent = swRun ? "Stop" : "Start";
          swR.className = "rb " + (swRun ? "red" : "green");
          swL.textContent = swRun || !swAcc ? "Lap" : "Reset";
          swL.classList.toggle("dis", !swRun && !swAcc);
        };
        swR.onclick = () => {
          if (swRun) {
            swAcc = el();
            swRun = false;
          } else {
            swStart = performance.now();
            swRun = true;
            loop();
          }
          swPaint();
          loop();
        };
        swL.onclick = () => {
          if (swRun) {
            laps.unshift(el());
          } else {
            swAcc = 0;
            laps = [];
            swTime.textContent = f(0);
          }
          lapEl.innerHTML = laps.map((l, i) => `<div><span>Lap ${laps.length - i}</span><span>${f(l)}</span></div>`).join("");
          swPaint();
        };
        const wheel = (max) => {
          const w = h("div.wheel");
          w.append(h("i.pad"));
          for (let i = 0; i <= max; i++) w.append(h("div", String(i).padStart(2, "0")));
          w.append(h("i.pad"));
          w.val = () => clamp(Math.round(w.scrollTop / 48), 0, max);
          return w;
        };
        const wm_ = wheel(59), ws_ = wheel(59);
        const tStart = h("button.rb.green", "Start");
        const tCancel = h("button.rb.gray", "Cancel");
        const tRun = h("div.trun", "");
        const tPick = h("div.tpick", [h("div.wh", [wm_, h("small", "min")]), h("div.wh", [ws_, h("small", "sec")])]);
        views.timer.append(tPick, tRun, h("div.rbs", [tCancel, tStart]));
        let tEnd = 0, ticking = 0;
        const showTimer = (on) => {
          tPick.style.display = on ? "none" : "";
          tRun.style.display = on ? "" : "none";
          tStart.textContent = on ? "Pause" : "Start";
          tStart.className = "rb " + (on ? "orange" : "green");
        };
        const tick = () => {
          const left = Math.max(0, tEnd - Date.now());
          tRun.textContent = `${Math.floor(left / 6e4)}:${String(Math.floor(left / 1e3) % 60).padStart(2, "0")}`;
        };
        const api = ctx.mod.clock = {
          cancelTimer() {
            clearInterval(ticking);
            tEnd = 0;
            ctx.mod.island.update("timer", null);
            showTimer(false);
          }
        };
        tStart.onclick = () => {
          if (tEnd) return api.cancelTimer();
          const secs = wm_.val() * 60 + ws_.val();
          if (!secs) return;
          tEnd = Date.now() + secs * 1e3;
          showTimer(true);
          tick();
          ticking = setInterval(tick, 250);
          ctx.mod.island.update("timer", { end: tEnd, onDone: () => {
            api.cancelTimer();
            [0, 1, 2].forEach((i) => setTimeout(() => sfx.notif(), i * 900));
          } });
        };
        tCancel.onclick = api.cancelTimer;
        showTimer(false);
        setTimeout(() => {
          wm_.scrollTop = 48 * 5;
        }, 50);
        let curTab = "world", timer0 = 0;
        const show = (id) => {
          Object.entries(views).forEach(([k, v]) => v.classList.toggle("on", k === id));
          curTab = id;
          if (id === "world") {
            paintWorld();
            clearInterval(timer0);
            timer0 = setInterval(paintWorld, 1e3);
          } else clearInterval(timer0);
        };
        const tabs = tabBar([{ id: "world", icon: TI.world, label: "World Clock" }, { id: "sw", icon: TI.sw, label: "Stopwatch" }, { id: "timer", icon: TI.timer, label: "Timer" }], "world", show);
        app.append(tabs);
        show("world");
        swPaint();
      },
      onOpen() {
      }
    });
  }
  function initNotes() {
    registerApp({
      id: "notes",
      name: "Notes",
      status: "auto",
      build(root) {
        const app = h("div.app.notes");
        root.append(app);
        const nav = new NavStack(app);
        let notes = store.get("notes", [{ id: 1, text: "Welcome\nThis is a working Notes app. Tap the compose button, type with the on-screen keyboard (or your own).", t: Date.now() }]);
        const save = () => store.set("notes", notes);
        const list = page({ title: "Notes", right: btn(ICO2.compose, () => edit({ id: Date.now(), text: "", t: Date.now(), isNew: true }), "circle") });
        const body = h("div.grp");
        list.scroll.append(body);
        const paint = () => {
          body.innerHTML = "";
          if (!notes.length) body.append(h("p.empty2", "No Notes"));
          notes.sort((a, b) => b.t - a.t).forEach((n) => {
            const [title, ...rest] = n.text.split("\n");
            body.append(h("div.cell.tap.note", { on: { click: () => edit(n) } }, h("span.ct", { html: `<b>${title.trim() || "New Note"}</b><em>${new Date(n.t).toLocaleDateString("en", { month: "short", day: "numeric" })}  ${rest.join(" ").trim().slice(0, 40) || "No additional text"}</em>` })));
          });
        };
        const edit = (n) => {
          const ta = h("textarea.nta", { "data-kb": "", inputmode: "none", placeholder: "Start typing\u2026" });
          ta.value = n.text;
          const del = btn(ICO2.trash, () => {
            notes = notes.filter((x) => x.id !== n.id);
            save();
            paint();
            nav.pop();
          }, "circle");
          const p = page({ title: "", back: { onClick: () => {
            n.text = ta.value;
            n.t = Date.now();
            if (n.isNew) {
              delete n.isNew;
              if (n.text.trim()) notes.push(n);
            }
            if (!n.text.trim()) notes = notes.filter((x) => x.id !== n.id);
            save();
            paint();
            ctx.mod.kb.hide();
            nav.pop();
          } }, right: del, large: false });
          p.scroll.append(ta);
          nav.push(p.el);
          if (n.isNew) setTimeout(() => ta.focus(), 450);
        };
        paint();
        nav.push(list.el);
        list.el.classList.remove("pushed");
      }
    });
  }

  // js/apps/media.js
  init_glass();
  ctx.photos = [];
  var rnd = (seed) => () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  var sample = (i) => {
    const r = rnd(i * 977 + 13);
    const h1 = Math.floor(r() * 360), h2 = (h1 + 40 + Math.floor(r() * 120)) % 360, h3 = (h1 + 200) % 360;
    return { bg: `radial-gradient(90% 60% at ${20 + r() * 60}% ${r() * 50}%, hsl(${h1} 85% 62%), transparent 65%), radial-gradient(80% 70% at ${r() * 100}% 100%, hsl(${h2} 80% 55%), transparent 60%), hsl(${h3} 45% 22%)` };
  };
  var SAMPLES = Array.from({ length: 27 }, (_, i) => sample(i + 3));
  function initCamera() {
    registerApp({
      id: "camera",
      name: "Camera",
      status: "light",
      bg: "#000",
      build(root, api) {
        const app = h("div.app.dk.cam");
        root.append(app);
        const video = h("video", { autoplay: true, muted: true, playsinline: true });
        video.muted = true;
        const fb = h("div.vfa");
        const vf = h("div.vf", [fb, video]);
        const flash = h("div.shutflash");
        const zoom = h("div.zoom", ["0.5", "1\xD7", "2", "5"].map((z2, i) => h("button" + (i === 1 ? ".on" : ""), { on: { click: (e) => setZoom(z2, e.currentTarget) } }, z2)));
        const thumb = h("button.cthumb", { on: { click: () => ctx.mod.wm.open("photos", ctx.rect(thumb)) } });
        const shut = h("button.shutter", h("i"));
        const flip = h("button.cflip", { html: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#fff" stroke-width="2.200" stroke-linecap="round" stroke-linejoin="round"><path d="M20 8a8 8 0 0 0-14-2M4 4v3h3M4 16a8 8 0 0 0 14 2m2 2v-3h-3"/></svg>`, on: { click: () => {
          facing = facing === "user" ? "environment" : "user";
          start();
        } } });
        const modes = h("div.modes", ["Cinematic", "Video", "Photo", "Portrait", "Pano"].map((m) => h("span" + (m === "Photo" ? ".on" : ""), m)));
        app.append(vf, flash, zoom, modes, h("div.cbar", [thumb, shut, flip]));
        let stream = null, facing = "environment", z = 1;
        const setZoom = (label, b) => {
          zoom.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
          z = label === "0.5" ? 0.6 : parseFloat(label);
          video.style.transform = fb.style.transform = `scale(${z})`;
        };
        async function start() {
          stop();
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: false });
            video.srcObject = stream;
            app.classList.add("live");
          } catch {
            app.classList.remove("live");
          }
        }
        function stop() {
          stream?.getTracks().forEach((t) => t.stop());
          stream = null;
          app.classList.remove("live");
        }
        const paintThumb = () => {
          const p = ctx.photos[0];
          thumb.style.background = p ? p.src ? `center / cover url(${p.src})` : p.bg : "#2c2c2e";
        };
        shut.addEventListener("click", () => {
          let item;
          if (app.classList.contains("live") && video.videoWidth) {
            const c = document.createElement("canvas");
            c.width = 720;
            c.height = 960;
            const sx = video.videoWidth, sy = video.videoHeight;
            const k = Math.max(720 / sx, 960 / sy) / z;
            c.getContext("2d").drawImage(video, (sx - 720 / k) / 2, (sy - 960 / k) / 2, 720 / k, 960 / k, 0, 0, 720, 960);
            item = { src: c.toDataURL("image/jpeg", 0.82) };
          } else item = sample(Date.now() % 997);
          ctx.photos.unshift(item);
          flash.classList.remove("go");
          void flash.offsetWidth;
          flash.classList.add("go");
          tone(2400, 0.03, 0.12, "square");
          setTimeout(() => tone(1500, 0.05, 0.1, "square"), 45);
          thumb.classList.remove("pop");
          void thumb.offsetWidth;
          thumb.classList.add("pop");
          paintThumb();
        });
        paintThumb();
        api.hooks = { open: start, close: stop, destroy: stop };
      }
    });
  }
  function initPhotos() {
    registerApp({
      id: "photos",
      name: "Photos",
      status: "auto",
      build(root, api) {
        const app = h("div.app.photos");
        root.append(app);
        const p = page({ title: "Library", large: true });
        const grid = h("div.pgrid");
        p.scroll.append(grid);
        p.scroll.style.padding = "96px 0 120px";
        app.append(p.el);
        const all = () => [...ctx.photos, ...SAMPLES];
        const paint = () => {
          grid.innerHTML = "";
          all().forEach((it, i) => {
            const t = h("button.pth", { style: it.src ? { background: `center / cover url(${it.src})` } : { background: it.bg }, on: { click: () => openViewer(it, t) } });
            grid.append(t);
          });
        };
        function openViewer(it, thumb) {
          const r = ctx.rect(thumb);
          const bg = h("div.vbg");
          const img = h("div.vimg", { style: it.src ? { background: `center / cover url(${it.src})` } : { background: it.bg } });
          const close = btn(ICO2.back, () => dismiss(), "circle");
          close.classList.add("vclose");
          const view = h("div.viewer", [bg, img, close]);
          app.append(view);
          registerGlass(close);
          const full = { x: 0, y: (H - 600) / 2, w: W, h: 600, r: 0 };
          const g2 = new Group({ x: r.x, y: r.y, w: r.w, h: r.h, r: 0 }, { response: 0.5, damping: 0.88 }, (v) => {
            Object.assign(img.style, { transform: `translate3d(${v.x}px,${v.y}px,0)`, width: v.w + "px", height: v.h + "px", borderRadius: v.r + "px" });
          });
          g2.snap({ x: r.x, y: r.y, w: r.w, h: r.h, r: 0 });
          requestAnimationFrame(() => {
            bg.style.opacity = 1;
            g2.to(full);
            close.classList.add("in");
          });
          let sy = null, sx = null, vy = 0, lastY = 0, lastT = 0;
          const dismiss = (v) => {
            bg.style.opacity = 0;
            close.classList.remove("in");
            const rr = ctx.rect(thumb);
            g2.to({ x: rr.x, y: rr.y, w: rr.w, h: rr.h, r: 0 }, { params: { response: 0.46, damping: 0.9 }, velocity: v, done: () => view.remove() });
          };
          img.addEventListener("pointerdown", (e) => {
            const q = ctx.pt(e);
            sy = q.y;
            sx = q.x;
            lastY = q.y;
            lastT = performance.now();
            try {
              img.setPointerCapture(e.pointerId);
            } catch {
            }
            ;
          });
          img.addEventListener("pointermove", (e) => {
            if (sy == null) return;
            const q = ctx.pt(e);
            const dy = q.y - sy, dx = q.x - sx;
            const now = performance.now();
            vy = (q.y - lastY) / Math.max(8e-3, (now - lastT) / 1e3);
            lastY = q.y;
            lastT = now;
            const k = clamp(dy / 500, 0, 1);
            const s = 1 - 0.4 * k;
            bg.style.opacity = 1 - k * 1.2;
            g2.drive({ x: dx + (W - W * s) / 2 * 0, y: full.y + dy, w: full.w * s, h: full.h * s, r: 28 * k });
            img.style.transformOrigin = "50% 50%";
          });
          img.addEventListener("pointerup", () => {
            if (sy == null) return;
            const moved = g2.values.y - full.y;
            sy = null;
            if (moved > 130 || vy > 700) dismiss({ y: vy });
            else {
              bg.style.opacity = 1;
              g2.to(full, { velocity: { y: vy } });
            }
          });
        }
        paint();
        api.hooks = { open: paint };
      }
    });
  }
  var SONGS = [
    { title: "Neon Drift", artist: "Synth Lab", bpm: 86, root: 57, prog: [[0, 3, 7, 10], [5, 8, 12, 15], [3, 7, 10, 14], [7, 10, 14, 17]], art: "linear-gradient(135deg,#ff7a18,#af002d 60%,#319197)" },
    { title: "Glass Garden", artist: "Liquid Pad", bpm: 72, root: 52, prog: [[0, 4, 7, 11], [5, 9, 12, 16], [7, 11, 14, 17], [2, 5, 9, 12]], art: "linear-gradient(135deg,#7b5cff,#00d4ff)" },
    { title: "Midnight Loop", artist: "Dat514", bpm: 98, root: 50, prog: [[0, 3, 7], [8, 12, 15], [5, 8, 12], [10, 14, 17]], art: "linear-gradient(135deg,#0f2027,#2c5364 55%,#ff4fa3)" }
  ];
  function initMusic() {
    registerApp({
      id: "music",
      name: "Music",
      status: "auto",
      build(root, api) {
        const app = h("div.app.music");
        root.append(app);
        const p = page({ title: "Library", large: true });
        app.append(p.el);
        const fileIn = h("input", { type: "file", accept: "audio/*", style: { display: "none" }, on: { change: (e) => {
          const f = e.target.files[0];
          if (!f) return;
          SONGS.push({ title: f.name.replace(/\.[^.]+$/, ""), artist: "On This iPhone", url: URL.createObjectURL(f), art: "linear-gradient(135deg,#444,#999)" });
          paint();
          play(SONGS.length - 1);
        } } });
        const list = h("div.grp");
        p.scroll.append(list, h("button.addm", { on: { click: () => fileIn.click() } }, "+ Add song from device"), fileIn);
        const mini = h("div.mini-p", { "data-glass": "", "data-glass-lite": "", "data-glass-bezel": "30", "data-glass-static": "" });
        const np = h("div.np");
        app.append(mini, np);
        requestAnimationFrame(() => registerGlass(mini));
        let ac2 = null, master = null, timer = 0, nextT = 0, step = 0, i = 0, playing = false, t0 = 0, acc = 0, audio = null;
        const DUR = 180;
        const song = () => SONGS[i];
        const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
        const note = (f, t, d, type, v) => {
          const o = ac2.createOscillator(), g2 = ac2.createGain();
          o.type = type;
          o.frequency.value = f;
          g2.gain.setValueAtTime(1e-4, t);
          g2.gain.linearRampToValueAtTime(v, t + Math.min(0.08, d / 3));
          g2.gain.exponentialRampToValueAtTime(1e-4, t + d);
          o.connect(g2).connect(master);
          o.start(t);
          o.stop(t + d + 0.05);
        };
        const sched = () => {
          const s = song();
          const beat = 60 / s.bpm;
          while (nextT < ac2.currentTime + 0.25) {
            const bar = Math.floor(step / 4) % s.prog.length, ch = s.prog[bar], b = step % 4;
            if (b === 0) ch.forEach((n, k) => note(midi(s.root + n - 12), nextT, beat * 4.2, "sine", 0.1 - k * 0.012));
            note(midi(s.root + 12 + ch[(step * 3 + (step >> 2)) % ch.length]), nextT, beat * 0.9, "triangle", 0.09);
            if (b % 2 === 0) note(midi(s.root - 12 + ch[0]), nextT, beat * 0.5, "sine", 0.13);
            nextT += beat / 2 * 2 / 2 * 1;
            step++;
          }
        };
        const gainNow = () => sys.get("silent") ? 0 : sys.get("volume") * 0.9;
        sys.on("volume", () => {
          if (master) master.gain.value = gainNow();
          if (audio) audio.volume = sys.get("volume");
        }, false);
        const prog = () => ({ cur: audio ? audio.currentTime : acc + (playing ? (performance.now() - t0) / 1e3 : 0), dur: audio ? audio.duration || 0 : DUR });
        function push() {
          const s = song();
          const m = { title: s.title, artist: s.artist, playing, art: s.art, getProgress: prog };
          mini.style.display = "";
          ctx.mod.island.update("music", m.title ? m : null);
          ctx.mod.ccMedia(m);
          mini.innerHTML = `<span class="ma" style="background:${s.art}"></span><b>${s.title}</b><button data-a="t">${playing ? "\u275A\u275A" : "\u25B6"}</button><button data-a="n">\u25B6\u25B6</button>`;
          np.querySelector?.(".npt") && (np.querySelector(".npt").textContent = s.title);
          paintNP();
        }
        function start() {
          const s = song();
          if (s.url) {
            audio || (audio = new Audio());
            if (audio.src !== s.url) audio.src = s.url;
            audio.volume = sys.get("volume");
            audio.onended = () => api2.next();
            audio.play();
            playing = true;
            push();
            return;
          }
          audio?.pause();
          audio = null;
          ac2 || (ac2 = new (window.AudioContext || window.webkitAudioContext)());
          ac2.resume();
          master = ac2.createGain();
          master.gain.value = gainNow();
          master.connect(ac2.destination);
          nextT = ac2.currentTime + 0.05;
          step = 0;
          t0 = performance.now();
          playing = true;
          clearInterval(timer);
          timer = setInterval(() => {
            sched();
            if (prog().cur > DUR) api2.next();
          }, 60);
          push();
        }
        function stop() {
          if (audio) {
            acc = audio.currentTime;
            audio.pause();
          } else {
            acc += (performance.now() - t0) / 1e3;
            clearInterval(timer);
            master?.disconnect();
            master = null;
          }
          playing = false;
          push();
        }
        const play = (k) => {
          if (audio) {
            audio.pause();
            audio = null;
          }
          clearInterval(timer);
          master?.disconnect();
          acc = 0;
          i = (k + SONGS.length) % SONGS.length;
          start();
        };
        const api2 = ctx.mod.player = { toggle: () => playing ? stop() : start(), next: () => play(i + 1), prev: () => play(i - 1), get playing() {
          return playing;
        } };
        const paint = () => {
          list.innerHTML = "";
          SONGS.forEach((s, k) => list.append(h("div.cell.tap.song", { on: { click: () => k === i && playing ? openNP() : play(k) } }, [h("span.sa", { style: { background: s.art } }), h("span.ct", { html: `<b>${s.title}</b><em>${s.artist}</em>` })])));
        };
        mini.addEventListener("click", (e) => {
          const b = e.target.closest("button");
          if (b) return b.dataset.a === "t" ? api2.toggle() : api2.next();
          openNP();
        });
        function paintNP() {
          const s = song();
          np.style.setProperty("--art", s.art);
          np.innerHTML = `<div class="npbg" style="background:${s.art}"></div><button class="npx">\u2304</button><div class="nart ${playing ? "big" : ""}" style="background:${s.art}"></div><div class="npt">${s.title}</div><div class="npa">${s.artist}</div><div class="npctl"><button data-a="p">${ctx.mod.ICO.prev}</button><button data-a="t" class="big">${playing ? ctx.mod.ICO.pause : ctx.mod.ICO.play}</button><button data-a="n">${ctx.mod.ICO.next}</button></div>`;
        }
        np.addEventListener("click", (e) => {
          const b = e.target.closest("button");
          if (!b) return;
          if (b.classList.contains("npx")) return closeNP();
          ({ p: api2.prev, t: api2.toggle, n: api2.next })[b.dataset.a]?.();
        });
        const openNP = () => (paintNP(), np.classList.add("on"));
        const closeNP = () => np.classList.remove("on");
        paint();
        push();
        ctx.mod.island.update("music", null);
        ctx.mod.ccMedia(null);
        const _push = push;
        api.hooks = { open: paint };
        mini.style.display = "none";
      }
    });
  }

  // js/apps/social.js
  init_glass();
  var CONVOS = [
    { id: "bot", name: "Dat514", g: "linear-gradient(135deg,#7b5cff,#ff4fa3)", msgs: [{ them: 1, text: "Hey! Welcome to the iPhone 18 Pro Max simulator." }, { them: 1, text: "Try the app switcher: swipe up from the bottom edge and hold." }] },
    { id: "mom", name: "Mom", g: "linear-gradient(135deg,#ff9f0a,#ff453a)", msgs: [{ them: 1, text: "Don't forget dinner tonight!" }] },
    { id: "team", name: "Liquid Glass Team", g: "linear-gradient(135deg,#00c2a8,#0a84ff)", msgs: [{ them: 1, text: "Refraction looks great on the new build." }] }
  ];
  var REPLIES = [
    [/hi|hello|hey|xin chào/i, "Hello! Nice to meet you."],
    [/glass|liquid/i, "Liquid Glass bends the content behind it \u2014 try dragging the dock lens on the web version."],
    [/time|giờ/i, () => `It's ${(/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`],
    [/iphone|18/i, 'iPhone 18 Pro Max: 6.9", 2868\xD71320, smaller Dynamic Island, iOS 27.'],
    [/thanks|thank|cảm ơn/i, "Anytime!"]
  ];
  function initMessages() {
    registerApp({
      id: "messages",
      name: "Messages",
      status: "auto",
      build(root, api) {
        const app = h("div.app.msgs");
        root.append(app);
        const nav = new NavStack(app);
        const data = store.get("convos", null) || JSON.parse(JSON.stringify(CONVOS));
        const save = () => store.set("convos", data);
        const list = page({ title: "Messages", right: btn(ICO2.compose, () => {
        }, "circle") });
        const grp = h("div.grp");
        list.scroll.append(grp);
        const paint = () => {
          grp.innerHTML = "";
          data.forEach((c) => {
            const last2 = c.msgs[c.msgs.length - 1];
            grp.append(h("div.cell.tap.conv", { on: { click: () => thread(c) } }, [h("span.av", { style: { background: c.g } }, c.name[0]), h("span.ct", { html: `<b>${c.name}</b><em>${last2 ? last2.text.slice(0, 44) : ""}</em>` }), h("span.det", "now")]));
          });
        };
        function thread(c) {
          const p = page({ title: c.name, back: { onClick: () => {
            ctx.mod.kb.hide();
            nav.pop();
            paint();
          } }, large: false });
          const flow = h("div.flow");
          p.scroll.append(flow);
          p.scroll.style.padding = "104px 14px 150px";
          const input = h("input", { "data-kb": "", inputmode: "none", placeholder: "iMessage", autocomplete: "off" });
          const send = h("button.send", { html: ICO2.up });
          const bar = h("div.mbar", [h("div.minput", { "data-glass": "", "data-glass-lite": "", "data-glass-static": "", "data-glass-bezel": "22" }, [input, send])]);
          p.el.append(bar);
          requestAnimationFrame(() => registerGlass(bar.firstChild));
          const toEnd = () => p.scroll.scrollTo({ top: 1e5, behavior: "smooth" });
          const add = (m, animate2) => {
            const b = h("div.bub" + (m.them ? ".them" : ".me"), m.text);
            if (animate2) b.classList.add("in");
            flow.append(b);
            toEnd();
            return b;
          };
          c.msgs.forEach((m) => add(m));
          const reply = (text) => {
            const typing = h("div.bub.them.typing.in", [h("i"), h("i"), h("i")]);
            flow.append(typing);
            toEnd();
            const hit = REPLIES.find(([re]) => re.test(text));
            const out = hit ? typeof hit[1] === "function" ? hit[1]() : hit[1] : ["Got it.", "Interesting!", "Tell me more.", "Haha, nice."][Math.floor(Math.random() * 4)];
            setTimeout(() => {
              typing.remove();
              const m = { them: 1, text: out };
              c.msgs.push(m);
              save();
              add(m, true);
              sfx.tap();
            }, 900 + Math.random() * 600);
          };
          const doSend = () => {
            const t = input.value.trim();
            if (!t) return;
            input.value = "";
            const m = { me: 1, text: t };
            c.msgs.push(m);
            save();
            add(m, true);
            sfx.tap();
            reply(t);
          };
          send.addEventListener("click", doSend);
          input.addEventListener("keydown", (e) => e.key === "Enter" && doSend());
          input.addEventListener("kb-return", doSend);
          nav.push(p.el);
          requestAnimationFrame(toEnd);
        }
        paint();
        nav.push(list.el);
        list.el.classList.remove("pushed");
      }
    });
  }
  var KEYS = [["1", ""], ["2", "ABC"], ["3", "DEF"], ["4", "GHI"], ["5", "JKL"], ["6", "MNO"], ["7", "PQRS"], ["8", "TUV"], ["9", "WXYZ"], ["*", ""], ["0", "+"], ["#", ""]];
  function initPhone() {
    registerApp({
      id: "phone",
      name: "Phone",
      status: "auto",
      build(root) {
        const app = h("div.app.phone");
        root.append(app);
        let num = "";
        const out = h("div.pnum");
        const grid = h("div.pad3");
        const call = h("button.pcall", { html: `<svg viewBox="0 0 24 24" width="34" height="34" fill="#fff"><path d="M6.600 10.800a15.100 15.100 0 0 0 6.600 6.600l2.200-2.200a1 1 0 0 1 1-.25 11.400 11.400 0 0 0 3.600.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.500a1 1 0 0 1 1 1c0 1.250.2 2.450.57 3.600a1 1 0 0 1-.25 1z"/></svg>` });
        const del = h("button.pdel", { html: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.800" stroke-linejoin="round"><path d="M9 5h11a1.500 1.500 0 0 1 1.500 1.500v11A1.500 1.500 0 0 1 20 19H9l-6-7z"/><path d="M12.500 9.500l5 5M17.500 9.500l-5 5" stroke-linecap="round"/></svg>` });
        KEYS.forEach(([d, l]) => {
          const b = h("button.pk", { html: `<b>${d}</b><small>${l}</small>` });
          b.addEventListener("pointerdown", () => {
            b.classList.add("hit");
            sfx.tap();
          });
          ["pointerup", "pointerleave", "pointercancel"].forEach((e) => b.addEventListener(e, () => b.classList.remove("hit")));
          b.addEventListener("click", () => {
            if (num.length < 15) num += d;
            paint();
          });
          grid.append(b);
        });
        grid.append(h("span"), call, del);
        const paint = () => out.textContent = num.replace(/(\d{4})(\d{3})(\d{0,4})/, "$1 $2 $3").trim();
        del.addEventListener("click", () => (num = num.slice(0, -1), paint()));
        const tabs = tabBar([
          { id: "f", icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 3 2.700 5.600 6.100.9-4.400 4.300 1 6.100L12 17l-5.400 2.900 1-6.100L3.200 9.500l6.100-.9z"/></svg>`, label: "Favorites" },
          { id: "r", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`, label: "Recents" },
          { id: "k", icon: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="6" cy="5" r="2"/><circle cx="12" cy="5" r="2"/><circle cx="18" cy="5" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="18" cy="12" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="12" cy="19" r="2"/><circle cx="18" cy="19" r="2"/></svg>`, label: "Keypad" }
        ], "k", () => tabs.select("k", true));
        app.append(h("div.pwrap", [out, grid]), tabs);
        const scr = h("div.callscr");
        let tm = 0;
        const end = () => {
          clearInterval(tm);
          scr.classList.remove("on");
          ctx.mod.island.update("call", null);
        };
        ctx.mod.phone = { hangup: end };
        call.addEventListener("click", () => {
          const name = num || "Unknown";
          scr.innerHTML = `<div class="cav">${name[0]}</div><h2>${name}</h2><p class="cst">calling\u2026</p><div class="cgr">${["mute", "keypad", "speaker", "add call", "FaceTime", "contacts"].map((x) => `<span><i></i>${x}</span>`).join("")}</div><button class="cend"><svg viewBox="0 0 24 24" width="36" height="36" fill="#fff" style="rotate:135deg"><path d="M6.600 10.800a15.100 15.100 0 0 0 6.600 6.600l2.200-2.200a1 1 0 0 1 1-.25 11.400 11.400 0 0 0 3.600.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.500a1 1 0 0 1 1 1c0 1.250.2 2.450.57 3.600a1 1 0 0 1-.25 1z"/></svg></button>`;
          scr.querySelector(".cend").addEventListener("click", end);
          scr.classList.add("on");
          setTimeout(() => {
            if (!scr.classList.contains("on")) return;
            const start = Date.now();
            scr.querySelector(".cst").textContent = "0:00";
            tm = setInterval(() => {
              const s = Math.floor((Date.now() - start) / 1e3);
              scr.querySelector(".cst").textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
            }, 500);
            ctx.mod.island.update("call", { name, start });
          }, 1800);
        });
        app.append(scr);
      }
    });
  }
  var FAV = [["Wikipedia", "https://en.m.wikipedia.org", "#fff", "W"], ["Example", "https://example.com", "#0a84ff", "E"], ["MDN", "https://developer.mozilla.org", "#1c1c1e", "M"], ["Anthropic", "https://www.anthropic.com", "#d97757", "A"], ["GitHub", "https://github.com", "#24292f", "G"], ["OpenStreetMap", "https://www.openstreetmap.org", "#7ebc6f", "O"]];
  function initSafari() {
    registerApp({
      id: "safari",
      name: "Safari",
      status: "auto",
      build(root) {
        const app = h("div.app.safari");
        root.append(app);
        const start = h("div.sstart", [h("h1.lt", "Favorites"), h("div.favs", FAV.map(([n, u, c, l]) => h("button.fav", { on: { click: () => go(u) } }, [h("i", { style: { background: c, color: c === "#fff" ? "#000" : "#fff" } }, l), h("span", n)])))]);
        const frame2 = h("iframe.sframe", { referrerpolicy: "no-referrer", sandbox: "allow-scripts allow-same-origin allow-forms allow-popups" });
        const note = h("div.snote", ["Some sites can\u2019t be shown inside a simulator. ", h("button", { on: { click: () => window.open(cur, "_blank") } }, "Open in browser")]);
        const input = h("input", { "data-kb": "", inputmode: "none", placeholder: "Search or enter website name", autocomplete: "off" });
        const bar = h("div.sbar", { "data-glass": "", "data-glass-lite": "", "data-glass-static": "", "data-glass-bezel": "28" }, [h("span", { html: ICO2.search }), input]);
        app.append(start, frame2, note, bar);
        requestAnimationFrame(() => registerGlass(bar));
        let cur = "";
        function go(raw) {
          let u = raw.trim();
          if (!u) return;
          if (!/^https?:\/\//.test(u)) u = /\.[a-z]{2,}/i.test(u) && !/\s/.test(u) ? "https://" + u : "https://en.m.wikipedia.org/w/index.php?search=" + encodeURIComponent(u);
          cur = u;
          input.value = u.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
          frame2.src = u;
          app.classList.add("browsing");
          ctx.mod.kb.hide();
        }
        input.addEventListener("keydown", (e) => e.key === "Enter" && go(input.value));
        input.addEventListener("kb-return", () => go(input.value));
        input.addEventListener("focus", () => {
          input.select();
        });
        bar.addEventListener("dblclick", () => {
          app.classList.remove("browsing");
          frame2.src = "about:blank";
          input.value = "";
        });
      }
    });
  }

  // js/apps/info.js
  var EVENTS = { 0: ["Liquid Glass design review", "10:00"], 2: ["Lunch with team", "12:30"], 5: ["Ship iOS 27 build", "16:00"], 9: ["Dinner", "19:00"] };
  function initCalendar() {
    registerApp({
      id: "calendar",
      name: "Calendar",
      status: "auto",
      build(root) {
        const app = h("div.app.cal");
        root.append(app);
        const now = /* @__PURE__ */ new Date();
        let view = new Date(now.getFullYear(), now.getMonth(), 1);
        let sel = now.getDate();
        const p = page({ title: "", large: false, right: btn(ICO2.plus, () => {
        }, "circle") });
        const head = h("div.chead");
        const dow = h("div.dow", ["S", "M", "T", "W", "T", "F", "S"].map((d) => h("span", d)));
        const grid = h("div.mgrid");
        const ev = h("div.evl");
        p.scroll.style.padding = "96px 16px 40px";
        p.scroll.append(head, dow, grid, ev);
        app.append(p.el);
        const paint = (dir = 0) => {
          head.innerHTML = `<h1>${view.toLocaleDateString("en", { month: "long" })} <small>${view.getFullYear()}</small></h1>`;
          const first = view.getDay(), days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
          grid.innerHTML = "";
          grid.style.animation = "none";
          void grid.offsetWidth;
          if (dir) grid.style.animation = `cal${dir > 0 ? "R" : "L"} 0.55s var(--spring-gentle)`;
          for (let i = 0; i < first; i++) grid.append(h("span"));
          for (let d = 1; d <= days; d++) {
            const today = d === now.getDate() && view.getMonth() === now.getMonth() && view.getFullYear() === now.getFullYear();
            const b = h("button.day" + (today ? ".today" : "") + (d === sel ? ".sel" : ""), { on: { click: () => {
              sel = d;
              paint();
            } } }, [h("b", d), EVENTS[d % 10] && d % 3 !== 1 ? h("i") : null]);
            grid.append(b);
          }
          const e = EVENTS[sel % 10];
          ev.innerHTML = e && sel % 3 !== 1 ? `<div class="evr"><i></i><div><b>${e[0]}</b><small>${e[1]}</small></div></div>` : `<p class="noev">No Events</p>`;
        };
        const nav = (d) => {
          view = new Date(view.getFullYear(), view.getMonth() + d, 1);
          paint(d);
        };
        p.bar.firstChild.replaceWith(h("div.cnav", [btn(ICO2.back, () => nav(-1), "circle"), btn(ICO2.back.replace("M15 5l-7 7 7 7", "M9 5l7 7-7 7"), () => nav(1), "circle")]));
        paint();
      }
    });
  }
  var HOURS = ["Now", "15", "16", "17", "18", "19", "20", "21"];
  var DAYS = [["Today", 33, 26, "\u2600"], ["Sat", 32, 26, "\u26C5"], ["Sun", 31, 25, "\u{1F326}"], ["Mon", 30, 25, "\u{1F327}"], ["Tue", 32, 26, "\u26C5"], ["Wed", 33, 26, "\u2600"], ["Thu", 33, 27, "\u2600"]];
  function initWeather() {
    registerApp({
      id: "weather",
      name: "Weather",
      status: "light",
      bg: "#1e5bd6",
      build(root) {
        const hr = (/* @__PURE__ */ new Date()).getHours();
        const night = hr >= 18 || hr < 6;
        const app = h("div.app.dk.wx" + (night ? ".night" : ""));
        root.append(app);
        app.innerHTML = `<div class="wsky"><i class="sun"></i><i class="cl c1"></i><i class="cl c2"></i><i class="cl c3"></i></div>
            <div class="wscroll"><div class="whead"><h2>Ho Chi Minh City</h2><div class="wbig">${night ? 27 : 31}\xB0</div><p>Mostly Cloudy</p><small>H:33\xB0  L:26\xB0</small></div>
            <div class="wcard"><p class="wh">HOURLY FORECAST</p><div class="hrs">${HOURS.map((x, i) => `<div><small>${x}</small><span>${i % 3 === 2 ? "\u26C5" : night ? "\u263E" : "\u2600"}</span><b>${31 - (i > 4 ? i - 4 : 0)}\xB0</b></div>`).join("")}</div></div>
            <div class="wcard"><p class="wh">7-DAY FORECAST</p>${DAYS.map(([d, hi, lo, ic2]) => `<div class="drow"><span>${d}</span><span>${ic2}</span><em>${lo}\xB0</em><i><u style="left:${(lo - 24) * 10}%;width:${(hi - lo) * 10}%"></u></i><b>${hi}\xB0</b></div>`).join("")}</div>
            <p class="wnote">Demo data \u2014 the simulator is offline.</p></div>`;
      }
    });
  }

  // js/apps/all.js
  var APP_INITS = [initSettings, initCalculator, initClock, initNotes, initCamera, initPhotos, initMusic, initMessages, initPhone, initSafari, initCalendar, initWeather];

  // js/main.js
  sys.init({
    theme: "light",
    color: "black",
    brightness: 1,
    volume: 0.5,
    glass: 0.35,
    wallpaper: "aurora",
    customWallpaper: null,
    airplane: false,
    wifi: true,
    bt: true,
    cellular: true,
    focus: false,
    rotlock: false,
    silent: false,
    flash: false,
    lowpower: false,
    sounds: true,
    compactClock: false
  });
  sys.set("flash", false, false);
  async function boot() {
    buildDevice();
    ctx.mod.wm = wm;
    initStatusBar();
    initHud();
    await registerAllApps(APP_INITS);
    initHome();
    initWM();
    initIsland();
    initNotifications();
    initLock();
    initControl();
    initSpotlight();
    initKeyboard();
    initPower();
    initGestures();
    ctx.mod.canHome = () => wm.mode === "home" && !ctx.mod.lock.shown && !ctx.mod.cc.open && !ctx.mod.spot.open && ctx.mod.power.on;
    initGlass();
    ctx.mod.setStatusTone("light");
    ctx.mod.setIndicatorTone("light");
    const hide = ctx.mod.lock.hide;
    let once = false;
    ctx.mod.lock.hide = (...a) => {
      hide.apply(ctx.mod.lock, a);
      if (!once) {
        once = true;
        setTimeout(() => ctx.mod.notif.post({ app: "messages", title: "Dat514", body: "Try swiping up from the bottom edge while an app is open." }), 7e3);
      }
    };
    window.__ios = ctx;
  }
  boot();
})();
