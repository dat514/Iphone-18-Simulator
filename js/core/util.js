export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** UIKit's rubber-band: x = overshoot distance, d = dimension, c = 0.55 */
export const rubber = (x, d, c = 0.55) => (x < 0 ? -1 : 1) * (1 - 1 / ((Math.abs(x) * c) / d + 1)) * d;

/** Tiny hyperscript: h("div.cls#id", {on:{click}}, child, ...) */
export function h(sel, props, ...kids) {
    const m = sel.match(/^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i);
    const el = document.createElement(m?.[1] || "div");
    (m?.[2].match(/[.#][\w-]+/g) || []).forEach((t) => (t[0] === "." ? el.classList.add(t.slice(1)) : (el.id = t.slice(1))));
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

export const store = {
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
        } catch {}
    },
};

/** Finger velocity over the last ~90ms (pt/s), like UIPanGestureRecognizer. */
export class Velocity {
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
        if (!a || a === b || b.t - a.t < 8 || performance.now() - b.t > 90) return { x: 0, y: 0 }; // finger paused => no velocity
        const dt = (b.t - a.t) / 1000;
        return { x: (b.x - a.x) / dt, y: (b.y - a.y) / dt };
    }
}

/** Minimal reactive settings store. */
export const sys = {
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
        (this.subs[k] ||= []).push(f);
        if (immediate && k !== "*") f(this.v[k]);
    },
};
