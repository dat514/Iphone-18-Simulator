import { ctx } from "./ctx.js";
import { Group } from "./motion.js";
import { W } from "./metrics.js";
import { h, clamp, Velocity, sys } from "./util.js";
import { registerGlass } from "../glass.js";

export const ICO = {
    back: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>`,
    chev: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>`,
    plus: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 4v16M4 12h16"/></svg>`,
    compose: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-6M18.5 3.500a2 2 0 0 1 3 3L12 16l-4 1 1-4z"/></svg>`,
    trash: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>`,
    search: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="10.500" cy="10.500" r="6.500"/><path d="M15.500 15.500 21 21"/></svg>`,
    up: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>`,
};

/** A page with iOS-26 style large title + glass scroll edge. */
export function page({ title, back, right, large = true, bg }) {
    const scroll = h("div.pg-s");
    const el = h("div.pg", { style: bg ? { background: bg } : {} });
    const bar = h("div.pg-bar");
    const left = back ? btn(ICO.back, back.onClick, "circle") : h("span");
    const r = right ? (Array.isArray(right) ? right : [right]) : [];
    bar.append(left, h("div.pg-t", title || ""), h("div.pg-r", r));
    if (large && title) scroll.append(h("h1.lt", title));
    if (!large) el.classList.add("scrolled");
    else scroll.addEventListener("scroll", () => el.classList.toggle("scrolled", scroll.scrollTop > 40), { passive: true });
    el.append(scroll, bar);
    return { el, scroll, bar };
}

export function btn(html, onClick, cls = "") {
    const b = h("button.gbtn" + (cls ? "." + cls : ""), { "data-glass": "", "data-glass-lite": "", "data-glass-bezel": "20", "data-press-scale": "1.1", html, on: { click: onClick } });
    requestAnimationFrame(() => registerGlass(b));
    return b;
}

export const cell = ({ icon, color, title, detail, chev, onClick, right, sub }) => {
    const c = h("div.cell" + (onClick ? ".tap" : ""), { on: onClick ? { click: onClick } : {} });
    if (icon) c.append(h("span.ico", { style: { background: color || "#8e8e93" }, html: icon }));
    c.append(h("span.ct", { html: `${title}${sub ? `<em>${sub}</em>` : ""}` }));
    if (detail != null) c.append(h("span.det", detail));
    if (right) c.append(right);
    if (chev) c.append(h("span.chev", { html: ICO.chev }));
    return c;
};
export const group = (cells, foot) => h("div.grpw", [h("div.grp", cells), foot ? h("p.foot", foot) : null]);

export function toggle(value, onChange) {
    const i = h("input", { type: "checkbox" });
    i.checked = !!value;
    i.addEventListener("change", () => onChange(i.checked));
    const l = h("label.sw", [i, h("i")]);
    l.set = (v) => (i.checked = !!v);
    return l;
}

export function segmented(items, value, onChange) {
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

export function slider(value, onInput, { min = 0, max = 1, step = 0.01 } = {}) {
    const i = h("input.rng", { type: "range", min, max, step });
    i.value = value;
    const paint = () => i.style.setProperty("--v", ((i.value - min) / (max - min)) * 100 + "%");
    i.addEventListener("input", () => (paint(), onInput(+i.value)));
    paint();
    i.set = (v) => ((i.value = v), paint());
    return i;
}

/** Floating glass tab bar with a lens that springs between tabs (iOS 26). */
export function tabBar(tabs, initial, onSelect) {
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

/** iOS navigation controller: push/pop with parallax, dimming and interactive edge-swipe back. */
export class NavStack {
    constructor(root) {
        this.root = root;
        this.items = [];
        root.classList.add("nav");
        this.bindEdge();
    }
    mk(el) {
        const g = new Group({ x: 0 }, { response: 0.46, damping: 0.92 }, (v) => this.apply(el, v.x));
        el._g = g;
        el._dim = h("div.pdim");
        el.append(el._dim);
        return g;
    }
    apply(el, x) {
        el.style.transform = x === 0 ? "" : `translate3d(${x}px,0,0)`;
    }
    push(pageEl) {
        const prev = this.items[this.items.length - 1];
        const g = this.mk(pageEl);
        pageEl.classList.add("pushed");
        this.root.append(pageEl);
        this.items.push(pageEl);
        g.snap({ x: W });
        g.to({ x: 0 }, { done: () => (pageEl.classList.remove("moving"), prev && (prev.style.visibility = "hidden")) });
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
            try { this.root.setPointerCapture(e.pointerId); } catch {};
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
            if (vx > 450 || (vx > -200 && top._g.values.x > W * 0.4)) {
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
}
