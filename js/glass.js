/*
 * Liquid Glass engine
 * -------------------
 * Refraction : backdrop-filter: url(#svg) + feDisplacementMap. The displacement map is generated on a
 *              canvas from a real bezel profile + Snell's law (technique from kube.io / Glisse / liquid-web).
 *              Only Blink can use SVG filters as backdrop-filter, so other engines get a rich blur fallback.
 * Highlights : rim light (conic gradient ring) that follows the pointer, plus a shimmer that follows the finger.
 * Motion     : every interactive piece is driven by interruptible springs (see spring.js) so press, release,
 *              drag (rubber band + squash/stretch) and hover feel like iOS 26 glass.
 *
 * Markup:  <div data-glass data-glass-bezel="20" data-glass-thickness="50" ...>
 */
import { Spring, animate, rubber, clamp, angleDelta, prefersReducedMotion } from "./spring.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const XLINK_NS = "http://www.w3.org/1999/xlink";
const DEFAULT_LIGHT = -40; // degrees (conic angle, 0 = up). Light comes from the top-left until the pointer moves.

const ua = navigator.userAgent;
const isBlink =
    /Chrome\/|Chromium\//.test(ua) && !/(iPhone|iPad|iPod|CriOS|FxiOS|EdgiOS|OPiOS)/.test(ua);
const coarsePointer = window.matchMedia("(pointer: coarse)").matches;

export const supportsRefraction = isBlink && CSS.supports("backdrop-filter", "blur(1px)");
document.documentElement.classList.add(supportsRefraction ? "has-refraction" : "no-refraction");

const states = new Map();
const mapCache = new Map();
const profileCache = new Map();
let defs = null;
let uid = 0;

/* ------------------------------------------------------------------ */
/* Optics                                                              */
/* ------------------------------------------------------------------ */

const SURFACES = {
    // Apple-style squircle: soft transition into the flat interior, smooth refraction gradients.
    squircle: (t) => Math.pow(1 - Math.pow(1 - t, 4), 0.25),
    // Plain circular dome: harsher edge, stronger "lens" feel.
    circle: (t) => Math.sqrt(1 - (1 - t) * (1 - t)),
    // Convex outside, concave inside (used by iOS switches).
    lip: (t) => {
        const convex = Math.pow(1 - Math.pow(1 - t, 4), 0.25);
        const s = t * t * t * (t * (t * 6 - 15) + 10);
        return convex * (1 - s) + (1 - convex) * s;
    },
};

/** Displacement magnitude (px) along the bezel, from outer edge (t=0) to the end of the bezel (t=1). */
function getProfile(surface, bezel, thickness, n) {
    const key = `${surface}|${bezel}|${thickness}|${n}`;
    if (profileCache.has(key)) return profileCache.get(key);

    const f = SURFACES[surface] || SURFACES.squircle;
    const N = 128;
    const mags = new Float32Array(N);
    let max = 0;

    for (let i = 0; i < N; i++) {
        const t = i / (N - 1);
        const a = Math.max(0, t - 0.002);
        const b = Math.min(1, t + 0.002);
        const height = f(t) * thickness;
        const slope = ((f(b) - f(a)) / (b - a)) * (thickness / bezel);
        const incidence = Math.atan(slope); // vertical ray hitting the tilted surface
        const refracted = Math.asin(Math.min(1, Math.sin(incidence) / n)); // Snell: 1 * sin(i) = n * sin(r)
        const deviation = incidence - refracted;
        const m = Math.tan(deviation) * height; // lateral shift once the ray reaches the backdrop plane
        mags[i] = m;
        if (m > max) max = m;
    }

    const profile = { mags, max: Math.max(max, 0.0001) };
    profileCache.set(key, profile);
    return profile;
}

/** Canvas -> displacement map (R = x offset, G = y offset, 128 = neutral). Convex => samples from inside. */
function buildMap(w, h, r, bezel, profile) {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    const img = ctx.createImageData(w, h);
    const px = img.data;

    const hw = w / 2;
    const hh = h / 2;
    const ix = hw - r;
    const iy = hh - r;
    const N = profile.mags.length;
    const inv = 1 / profile.max;

    for (let y = 0; y < h; y++) {
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
                gx = (qx * sx) / len;
                gy = (qy * sy) / len;
            } else if (qx > qy) {
                sd = qx - r;
                gx = sx;
                gy = 0;
            } else {
                sd = qy - r;
                gx = 0;
                gy = sy;
            }

            const depth = -sd; // distance inside the shape, measured from the edge
            let R = 128;
            let G = 128;
            if (depth > 0 && depth < bezel) {
                const pos = (depth / bezel) * (N - 1);
                const i0 = Math.floor(pos);
                const fr = pos - i0;
                const m = (profile.mags[i0] * (1 - fr) + profile.mags[Math.min(N - 1, i0 + 1)] * fr) * inv;
                R = 128 - gx * m * 127; // inward = -gradient
                G = 128 - gy * m * 127;
            }
            const o = (y * w + x) * 4;
            px[o] = R;
            px[o + 1] = G;
            px[o + 2] = 128;
            px[o + 3] = 255;
        }
    }

    ctx.putImageData(img, 0, 0);
    return canvas.toDataURL("image/png");
}

/* ------------------------------------------------------------------ */
/* SVG filter plumbing                                                 */
/* ------------------------------------------------------------------ */

function ensureDefs() {
    if (defs) return defs;
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", "glass-defs");
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");
    svg.setAttribute("aria-hidden", "true");
    defs = document.createElementNS(SVG_NS, "defs");
    svg.appendChild(defs);
    document.body.appendChild(svg);
    return defs;
}

const ns = (name) => document.createElementNS(SVG_NS, name);

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
        // Chromatic aberration: refract each colour channel by a slightly different amount.
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
    const boost = supportsRefraction && !state.opts.lite ? 1 : 1.5; // no refraction => lean harder on frost
    const value =
        (withFilter ? `url(#${state.id}) ` : "") +
        `blur(${(o.blur * boost).toFixed(1)}px) saturate(${(o.saturate + (supportsRefraction ? 0 : 0.2)).toFixed(2)}) brightness(${o.brightness})`;
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
    const h = Math.round(el.offsetHeight);
    if (w < 4 || h < 4) return;

    const cs = getComputedStyle(el);
    let r = cs.borderTopLeftRadius;
    r = r.endsWith("%") ? (parseFloat(r) / 100) * Math.min(w, h) : parseFloat(r) || 0;
    r = Math.min(r, w / 2, h / 2);
    const bezel = clamp(opts.bezel, 2, Math.min(w, h) / 2);

    const key = [w, h, r.toFixed(1), bezel, opts.thickness, opts.index, opts.surface].join("|");
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
        entry = { url: buildMap(w, h, r, bezel, profile), max: profile.max };
        mapCache.set(key, entry);
        if (mapCache.size > 80) mapCache.delete(mapCache.keys().next().value);
    }

    state.baseScale = 2 * entry.max * opts.refraction;
    state.filter.setAttribute("width", w);
    state.filter.setAttribute("height", h);
    state.image.setAttribute("width", w);
    state.image.setAttribute("height", h);
    setImageHref(state.image, entry.url);
    updateScale(state);

    if (!state.applied) {
        applyBackdrop(state, true);
        state.applied = true;
    }
}

/* ------------------------------------------------------------------ */
/* Motion                                                              */
/* ------------------------------------------------------------------ */

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
        pointerId: null,
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
        const resting =
            m.scale.atRest && m.x.atRest && m.y.atRest && m.sx.atRest && m.sy.atRest && m.scale.value === 1 && m.x.value === 0 && m.y.value === 0 && m.sx.value === 1 && m.sy.value === 1;
        el.style.transform = resting
            ? ""
            : `translate3d(${m.x.value.toFixed(2)}px, ${m.y.value.toFixed(2)}px, 0) scale(${(m.scale.value * m.sx.value).toFixed(4)}, ${(m.scale.value * m.sy.value).toFixed(4)})`;
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

    // Press: quick and firm. Release: slower and bouncier, so it overshoots like iOS.
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
    state.el.style.setProperty("--mx", `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
    state.el.style.setProperty("--my", `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
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

        // The glass follows the finger with resistance and stretches along the drag like a jelly.
        m.x.set(rubber(dx, lim));
        m.y.set(rubber(dy, lim));
        const ax = clamp(Math.abs(dx) / 70, 0, 1);
        const ay = clamp(Math.abs(dy) / 70, 0, 1);
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
    // Rim light only follows the pointer while it is over this piece (cheap: no global listener).
    const aim = (e) => {
        const r = el.getBoundingClientRect();
        const a = (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI + 90;
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

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

function readOptions(el) {
    const d = el.dataset;
    const num = (v, def) => (v === undefined || v === "" || Number.isNaN(+v) ? def : +v);
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
        dragLimit: num(d.dragLimit, 16),
    };
}

let layoutQueue = new Set();
let layoutScheduled = false;

function scheduleLayout(state) {
    layoutQueue.add(state);
    if (layoutScheduled) return;
    layoutScheduled = true;
    requestAnimationFrame(() => {
        layoutScheduled = false;
        const batch = layoutQueue;
        layoutQueue = new Set();
        batch.forEach(layout);
    });
}

const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
        const state = states.get(entry.target);
        if (state) scheduleLayout(state);
    }
});

export function registerGlass(el) {
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
        },
    };

    if (!state.opts.manual) bindPointer(state);
    resizeObserver.observe(el, { box: "border-box" });
    scheduleLayout(state);
    render(state);
    return state;
}

export function getGlass(el) {
    return states.get(el)?.api;
}

export function refreshGlass() {
    states.forEach((s) => s.api.refresh());
}

export function initGlass() {
    document.querySelectorAll("[data-glass]").forEach(registerGlass);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refreshGlass);
}
