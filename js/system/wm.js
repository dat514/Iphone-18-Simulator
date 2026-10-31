import { ctx } from "../core/ctx.js";
import { Group, SPRING } from "../core/motion.js";
import { W, H, R, ICON, ICON_R } from "../core/metrics.js";
import { APPS } from "../core/apps.js";
import { clamp, h, sys, rubber } from "../core/util.js";

const wins = new Map();
let order = []; // recency: last = front
let current = null;
let mode = "home"; // home | app | anim | switcher
const S0 = ICON / W;
const FULL = { cx: W / 2, cy: H / 2, mw: W, mh: H, s: 1, r: R };
const stateFromRect = (r) => ({ cx: r.x + r.w / 2, cy: r.y + r.h / 2, mw: r.w, mh: r.h, s: Math.max(r.w / W, S0 * (r.w / ICON)), r: Math.min(r.w, r.h) * 0.2237 });

class Win {
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
        const full = Math.abs(s - 1) < 0.002 && Math.abs(v.mw - W) < 0.5 && Math.abs(v.mh - H) < 0.5 && Math.abs(v.cx - W / 2) < 0.5 && Math.abs(v.cy - H / 2) < 0.5;
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
}
let onWinApply = null;

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
    order.forEach((id, i) => (wins.get(id).el.style.zIndex = i + 1));
}
const iconRect = (id) => ctx.mod.home.iconRect(id);

export const wm = {
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
        if (!w) wins.set(id, (w = new Win(app)));
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
            },
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
        // while closing, the home layer follows the shrinking window
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
            },
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
        if (up > 70 && (vy > 650 || (up > 300 && vy > 80))) {
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
                },
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
        const sw = wm.sw;
        if (!sw) return;
        const x = dx > 0 && order.length > 1 ? dx : dx < 0 ? dx : 0;
        const e = Math.abs(x) > W * 0.5 ? rubber(x, W) : x;
        const k = clamp(Math.abs(e) / W, 0, 1);
        const s = 1 - 0.1 * k;
        sw.w.g.drive({ s, mw: W * s, mh: H * s, cx: W / 2 + e, cy: H / 2, r: R });
    },
    swipeEnd(vel, dx) {
        const sw = wm.sw;
        if (!sw) return;
        wm.sw = null;
        const idx = order.indexOf(current);
        const dir = dx > 0 ? -1 : 1; // swipe right => older app (iOS)
        const j = idx + dir;
        const go = Math.abs(dx) > 90 || Math.abs(vel.x) > 600;
        const w = sw.w;
        if (!go || j < 0 || j >= order.length) {
            w.g.to(FULL, { params: SPRING.open, velocity: { cx: vel.x }, done: () => { mode = "app"; w.el.classList.remove("moving"); } });
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
        w.g.to({ ...off, cx: W / 2 + side * W * 0.62 }, { params: SPRING.open, velocity: { cx: vel.x }, done: () => { w.el.style.display = "none"; w.el.classList.remove("moving"); } });
        nw.g.to(FULL, { params: SPRING.open, done: () => { mode = "app"; nw.el.classList.remove("moving"); nw.api.hooks?.open?.(); } });
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
            w.g.to(cardState(i, 0), { params: SPRING.ui, velocity: id === current ? velocity : undefined });
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
                },
            });
            ctx.mod.home.setApp(1);
        } else {
            // tap on wallpaper => home; front card goes to its icon
            const id = sw.ids[0];
            ctx.mod.home.setApp(0);
            sw.ids.forEach((x, i) => {
                const w = wins.get(x);
                w.el.classList.remove("inert");
                if (i === 0 && id) {
                    ctx.mod.home.revealIcon(id);
                    w.g.to(stateFromRect(iconRect(id)), { params: SPRING.close, done: () => { w.el.style.display = "none"; w.el.classList.remove("moving"); } });
                } else {
                    w.el.style.opacity = "0";
                    setTimeout(() => { w.el.style.display = "none"; w.el.style.opacity = ""; w.el.classList.remove("moving"); }, 300);
                }
            });
            mode = "home";
        }
        sw.labels.forEach((l) => (l.style.opacity = 0));
    },
    destroy(id) {
        const w = wins.get(id);
        if (!w) return;
        w.api.hooks?.destroy?.();
        w.el.remove();
        wins.delete(id);
        order = order.filter((x) => x !== id);
    },
};

/* ---------- switcher internals ---------- */
const CS = 0.56;
const CW = W * CS;
const CH = H * CS;
const GAP = 30;
const cardState = (i, scroll) => ({ cx: W / 2 + i * (CW + GAP) + scroll, cy: H / 2 - 12, mw: CW, mh: CH, s: CS, r: 38 });
const sw = { ids: [], scroll: 0, el: null, bg: null, labels: [], active: null };

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
        if (springy) w.g.to(st, { params: SPRING.ui, velocity: velocity ? { cx: velocity } : undefined });
        else w.g.drive(st);
    });
}

export function initWM() {
    sw.bg = h("div.sw-bg");
    ctx.el.windows.before(sw.bg);
    sw.el = ctx.el.switcher;
    onWinApply = () => mode === "switcher" && syncLabels();
    const baseOnApply = () => {};
    // keep labels glued to cards while they animate
    const origApply = Win.prototype.apply;
    Win.prototype.apply = function (v) {
        origApply.call(this, v);
        if (mode === "switcher") syncLabels();
    };

    // switcher pointer handling
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
        try { sw.el.setPointerCapture(e.pointerId); } catch {};
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
        const dt = Math.max(0.016, (b.t - a.t) / 1000);
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
                    },
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
