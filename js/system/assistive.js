import { h, store, sys, clamp } from "../core/util.js";
import { ctx } from "../core/ctx.js";
import { W, H } from "../core/metrics.js";
import { locale } from "../core/i18n.js";
import { registerGlass } from "../glass.js";

const T = (s) => { const [vi, en] = s.split("|"); return locale === "vi" ? vi : en || vi; };
const svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const open = (id) => () => ctx.mod.wm.open(id);
const note = (m) => ctx.mod.island.alert(m, "bell", 2200);

/** Hành động có thể gán cho ô menu hoặc cử chỉ: [nhãn, icon, hàm] */
export const AT_ACTIONS = {
    home: ["Màn hình chính|Home", svg(`<path d="M4 11l8-7 8 7v9H4z"/>`), () => ctx.mod.wm.goHome()],
    cc: ["Trung tâm điều khiển|Control Center", svg(`<path d="M4 8h10M18 8h2M4 16h2M10 16h10"/><circle cx="16" cy="8" r="2"/><circle cx="8" cy="16" r="2"/>`), () => ctx.mod.cc.openIt()],
    siri: ["Siri", svg(`<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>`), () => ctx.mod.siri.start()],
    lock: ["Khoá màn hình|Lock Screen", svg(`<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>`), () => ctx.mod.lock.lock()],
    search: ["Tìm kiếm|Search", svg(`<circle cx="11" cy="11" r="6"/><path d="M16 16l4 4"/>`), () => ctx.mod.spot.openIt()],
    img: ["Tìm kiếm hình ảnh bằng Google|Google Image Search", svg(`<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 12l9 5 9-5M3 16l9 5 9-5"/>`), open("safari")],
    music: ["Music Finder", svg(`<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>`), open("music")],
    rotate: ["Xoay màn hình|Rotate Screen", svg(`<path d="M20 12a8 8 0 1 1-3-6.200M20 4v4h-4"/>`), () => note(T("Chưa hỗ trợ xoay ngang|Landscape is not supported yet"))],
    rotlock: [() => (sys.get("rotlock") ? T("Mở khoá xoay màn hình|Unlock Rotation") : T("Khoá xoay màn hình|Lock Rotation")), svg(`<rect x="8" y="11" width="8" height="7" rx="1.500"/><path d="M10 11V9a2 2 0 0 1 4 0v2M20 12a8 8 0 1 1-3-6.200"/>`), () => sys.set("rotlock", !sys.get("rotlock"))],
    silent: [() => (sys.get("silent") ? T("Bật tiếng|Unmute") : T("Tắt tiếng|Mute")), svg(`<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4M4 4l16 16"/>`), () => sys.set("silent", !sys.get("silent"))],
    translate: ["Google Dịch|Translate", svg(`<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>`), open("translate")],
    volup: ["Tăng âm lượng|Volume Up", svg(`<path d="M4 9h4l5-4v14l-5-4H4zM17 9a4 4 0 0 1 0 6"/>`), () => sys.set("volume", clamp(sys.get("volume") + 0.1, 0, 1))],
    voldown: ["Giảm âm lượng|Volume Down", svg(`<path d="M4 9h4l5-4v14l-5-4H4z"/>`), () => sys.set("volume", clamp(sys.get("volume") - 0.1, 0, 1))],
    shot: ["Chụp màn hình|Screenshot", svg(`<path d="M4 8V5h3M17 5h3v3M20 16v3h-3M7 19H4v-3"/><circle cx="12" cy="12" r="3"/>`), () => {
        const f = h("div.shot-flash"); ctx.screen.append(f); setTimeout(() => f.remove(), 500);
    }],
};
const POS = [[50, 14], [16, 38], [84, 38], [16, 68], [84, 68], [50, 90]]; // bố cục 6 ô theo ảnh 9
const lab = (a) => (typeof a[0] === "function" ? a[0]() : T(a[0]));

export function initAssistive() {
    const S = 60, M = 8;
    const el = h("button.atb", { "data-glass": "", "data-glass-lite": "", "data-glass-bezel": "20", "aria-label": "AssistiveTouch", html: svg(`<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5.500"/><circle cx="12" cy="12" r="2"/>`) });
    const bg = h("div.at-bg");
    const menu = h("div.at-menu", { "data-glass": "", "data-glass-lite": "", "data-glass-bezel": "46" });
    ctx.screen.append(bg, menu, el);
    requestAnimationFrame(() => { registerGlass(el); registerGlass(menu); });

    const saved = store.get("atpos", { side: "r", y: 620 });
    const pos = { x: 0, y: clamp(saved.y, 70, H - 130), side: saved.side };
    const sideX = (s) => (s === "l" ? M : W - S - M);
    const render = () => (el.style.translate = `${pos.x}px ${pos.y}px`); // dùng `translate` vì glass.js ghi đè style.transform
    pos.x = sideX(pos.side); render();
    sys.on("at", (v) => (el.style.display = v ? "" : "none"));

    let menuOpen = false, idleT, tapT, longT, lastTap = 0, d = null;
    const wake = () => { el.classList.remove("idle"); clearTimeout(idleT); idleT = setTimeout(() => !menuOpen && el.classList.add("idle"), 3000); };
    const run = (a) => (a === "menu" ? openMenu() : AT_ACTIONS[a]?.[2]());

    function openMenu() {
        if (menuOpen) return;
        menuOpen = true; wake();
        const ids = sys.get("atItems");
        menu.querySelectorAll(".at-i").forEach((n) => n.remove());
        ids.forEach((id, i) => {
            const a = AT_ACTIONS[id]; if (!a) return;
            const [x, y] = POS[i] || [50, 50];
            const b = h("button.at-i", { style: { left: x + "%", top: y + "%", "--i": i }, html: `${a[1]}<span>${lab(a)}</span>` });
            b.addEventListener("click", () => { closeMenu(); setTimeout(() => a[2](), 180); });
            menu.append(b);
        });
        const mx = (W - 300) / 2, my = (H - 300) / 2;
        menu.style.left = mx + "px"; menu.style.top = my + "px";
        menu.style.transformOrigin = `${pos.x + S / 2 - mx}px ${pos.y + S / 2 - my}px`;
        el.classList.add("away"); bg.classList.add("on");
        requestAnimationFrame(() => menu.classList.add("open"));
    }
    function closeMenu() {
        if (!menuOpen) return;
        menuOpen = false; menu.classList.remove("open"); bg.classList.remove("on"); el.classList.remove("away"); wake();
    }
    bg.addEventListener("pointerdown", closeMenu);

    el.addEventListener("pointerdown", (e) => {
        const p = ctx.pt(e);
        d = { x: p.x, y: p.y, ox: pos.x, oy: pos.y, id: e.pointerId, drag: false, long: false };
        try { el.setPointerCapture(e.pointerId); } catch {}
        wake();
        longT = setTimeout(() => { if (d && !d.drag) { d.long = true; run(sys.get("atLong")); } }, 650);
    });
    el.addEventListener("pointermove", (e) => {
        if (!d || e.pointerId !== d.id) return;
        const p = ctx.pt(e), dx = p.x - d.x, dy = p.y - d.y;
        if (!d.drag && Math.abs(dx) + Math.abs(dy) > 6) { d.drag = true; clearTimeout(longT); el.classList.add("drag"); }
        if (d.drag) { pos.x = clamp(d.ox + dx, 0, W - S); pos.y = clamp(d.oy + dy, 70, H - 130); render(); }
    });
    const up = (e) => {
        if (!d || e.pointerId !== d.id) return;
        clearTimeout(longT);
        const was = d; d = null;
        el.classList.remove("drag");
        if (was.drag) {
            pos.side = pos.x + S / 2 < W / 2 ? "l" : "r"; pos.x = sideX(pos.side);
            store.set("atpos", { side: pos.side, y: pos.y }); render();
        } else if (!was.long) {
            const now = performance.now();
            if (now - lastTap < 280) { clearTimeout(tapT); lastTap = 0; run(sys.get("atDouble")); }
            else { lastTap = now; tapT = setTimeout(() => run(sys.get("atTap")), 280); }
        }
    };
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    addEventListener("keydown", (e) => e.key === "Escape" && closeMenu());
    wake();
    ctx.mod.at = { openMenu, closeMenu, get open() { return menuOpen; } };
}
