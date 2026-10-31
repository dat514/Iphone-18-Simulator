import { ctx } from "../core/ctx.js";
import { Group } from "../core/motion.js";
import { H } from "../core/metrics.js";
import { clamp, h, sys } from "../core/util.js";
import { registerGlass } from "../glass.js";
import { sfx, buzz } from "../core/audio.js";

const I = {
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
    prev: `<path d="M19 6.200v11.600a.8.8 0 0 1-1.250.66l-8.200-5.800a.8.8 0 0 1 0-1.320l8.200-5.800A.8.8 0 0 1 19 6.200zM7.500 5.500H5.200v13h2.300z" fill="currentColor"/>`,
};
const svg = (n, s = 26) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}">${I[n]}</svg>`;
const G = (cls, extra = "") => `data-glass data-glass-lite data-glass-bezel="26" ${extra} class="${cls}"`;

export function initControl() {
    const el = ctx.el.cc;
    const cb = (key, ico, color) => `<button class="cbtn" data-key="${key}" data-glass data-glass-surface="circle" data-glass-bezel="20" data-glass-thickness="40" data-glass-blur="4" data-press-scale="1.1" style="--on:${color}">${svg(ico, 28)}</button>`;
    const tile = (key, ico, label) => `<button class="tile" data-key="${key}" data-glass data-glass-lite data-glass-bezel="30" data-press-scale="1.08">${svg(ico, 30)}</button>`;
    el.innerHTML = `
    <div class="cc-bg"></div>
    <div class="cc-grid">
        <div class="mod s22 conn" ${G("")}>${cb("airplane", "air", "#ff9f0a")}${cb("cellular", "cell", "#30d158")}${cb("wifi", "wifi", "#0a84ff")}${cb("bt", "bt", "#0a84ff")}</div>
        <div class="mod s22 media" ${G("")}>
            <div class="m-art"></div><div class="m-t"><b>Not Playing</b><em></em></div>
            <div class="m-c"><button data-m="prev">${svg("prev", 28)}</button><button data-m="toggle" class="pp">${svg("play", 34)}</button><button data-m="next">${svg("next", 28)}</button></div>
        </div>
        ${tile("rotation", "rot")}${tile("silent", "bell")}
        <div class="mod vs s12 bright" data-slider="brightness" ${G("")}><i class="vsf"></i>${svg("sun", 30)}</div>
        <div class="mod vs s12 volume" data-slider="volume" ${G("")}><i class="vsf"></i>${svg("vol", 30)}</div>
        <button class="mod s21 focus" data-key="focus" ${G("", 'data-press-scale="1.05"')}>${svg("moon", 28)}<b>Focus</b></button>
        ${tile("flash", "flash")}${tile("timer", "timer")}${tile("calc", "calc")}${tile("cam", "cam")}
        ${tile("dark", "half")}${tile("lowpower", "batt")}
    </div>`;
    el.querySelectorAll("[data-glass]").forEach(registerGlass);

    const g = new Group({ p: 0 }, { response: 0.46, damping: 0.84 }, (v) => {
        const p = clamp(v.p, 0, 1.04);
        const bg = el.querySelector(".cc-bg");
        const grid = el.querySelector(".cc-grid");
        bg.style.opacity = clamp(p, 0, 1).toFixed(3);
        grid.style.opacity = clamp(p * 1.4 - 0.1, 0, 1).toFixed(3);
        grid.style.transform = `scale(${(0.55 + 0.45 * p).toFixed(4)})`;
        el.style.visibility = p < 0.004 ? "hidden" : "visible";
        el.style.pointerEvents = p > 0.6 ? "auto" : "none";
    });
    g.snap({ p: 0 });
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
        lowpower: () => sys.set("lowpower", !sys.get("lowpower")),
    };
    const stateOf = {
        airplane: () => sys.get("airplane"), cellular: () => sys.get("cellular") && !sys.get("airplane"), wifi: () => sys.get("wifi"), bt: () => sys.get("bt"),
        focus: () => sys.get("focus"), rotation: () => sys.get("rotlock"), silent: () => sys.get("silent"), flash: () => sys.get("flash"), dark: () => sys.get("theme") === "dark", lowpower: () => sys.get("lowpower"),
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
    // the tile buttons for apps share [data-key]; stop them toggling state
    ["timer", "calc", "cam"].forEach((k) => delete toggles[k]);

    // vertical sliders (brightness / volume)
    el.querySelectorAll("[data-slider]").forEach((s) => {
        const key = s.dataset.slider;
        const fill = s.querySelector(".vsf");
        const draw = (v) => (fill.style.height = `${(v * 100).toFixed(1)}%`);
        sys.on(key, draw);
        const set = (e) => {
            const r = s.getBoundingClientRect();
            const v = clamp(1 - (e.clientY - r.top) / r.height, key === "brightness" ? 0.04 : 0, 1);
            sys.set(key, v, false);
            if (key === "volume") ctx.mod.showVolume?.();
        };
        s.addEventListener("pointerdown", (e) => {
            try { s.setPointerCapture(e.pointerId); } catch {};
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

    // now playing mirror
    ctx.mod.ccMedia = (m) => {
        el.querySelector(".m-t b").textContent = m?.title || "Not Playing";
        el.querySelector(".m-t em").textContent = m?.artist || "";
        el.querySelector(".m-art").style.background = m?.art || "rgba(255,255,255,.15)";
        el.querySelector(".pp").innerHTML = svg(m?.playing ? "pause" : "play", 34);
    };

    const api = (ctx.mod.cc = {
        get open() { return isOpen; },
        begin() { el.style.visibility = "visible"; g.drive({ p: 0 }); },
        drag(p) { g.drive({ p }); },
        release(vyDown) {
            const p = g.values.p;
            const want = vyDown > 450 ? true : vyDown < -450 ? false : p > 0.45;
            want ? api.openIt() : api.close();
        },
        openIt() {
            isOpen = true;
            g.to({ p: 1 }, { params: { response: 0.5, damping: 0.78 } });
            ctx.mod.setStatusTone("light");
            ctx.mod.setIndicatorTone("light");
        },
        close(instant) {
            isOpen = false;
            if (instant) g.snap({ p: 0 });
            else g.to({ p: 0 }, { params: { response: 0.42, damping: 1 } });
            ctx.mod.wm.syncTone();
        },
    });
    refresh();
}
