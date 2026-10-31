import { ctx } from "../core/ctx.js";
import { Group } from "../core/motion.js";
import { W, H, ICON, COL_PITCH, ROW_PITCH, GRID_X, GRID_Y, slotXY, DOCK } from "../core/metrics.js";
import { APPS, iconHTML } from "../core/apps.js";
import { clamp, h, rubber, store, sys, Velocity } from "../core/util.js";
import { wallpaperCSS } from "../core/wallpapers.js";
import { registerGlass } from "../glass.js";

const DEFAULT = {
    pages: [
        ["calendar", "photos", "camera", "clock", "notes", "calculator", "weather", "settings", "maps", "mail", "appstore", "wallet", "health", "files", "stocks", "tv"],
        ["translate", "home", "podcasts", "reminders", "compass"],
    ],
    dock: ["phone", "safari", "messages", "music"],
};
const OFFSET = [8, 0]; // page 0 keeps its first two rows for widgets

export function initHome() {
    const home = ctx.el.home;
    let layout = store.get("layout", null) || JSON.parse(JSON.stringify(DEFAULT));
    // forget layouts that reference unknown apps
    layout.pages = layout.pages.map((p) => p.filter((id) => APPS[id]));
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

    sys.on("wallpaper", () => (wp.style.background = wallpaperCSS(sys.get("wallpaper"), sys.get("customWallpaper"))));
    sys.on("customWallpaper", () => (wp.style.background = wallpaperCSS(sys.get("wallpaper"), sys.get("customWallpaper"))), false);
    sys.on("theme", (t) => (wp.style.filter = t === "dark" ? "brightness(.72)" : ""));

    const icons = {}; // id -> {el, g, page, idx}
    const pageEls = [];

    function makeIcon(id, onDock) {
        const app = APPS[id];
        const el = h("div.hicon", { "data-app": id, html: `${iconHTML(id, app.name)}<span class="lbl">${app.name}</span>${app.placeholder ? '<button class="del">−</button>' : ""}` });
        el.style.setProperty("--j", (Math.random() * 2).toFixed(2));
        const g = new Group({ x: 0, y: 0 }, { response: 0.38, damping: 0.8 }, (v) => (el.style.transform = `translate3d(${v.x}px,${v.y}px,0)`));
        icons[id] = { el, g, id, dock: !!onDock };
        return icons[id];
    }

    function build() {
        track.innerHTML = "";
        dockRow.innerHTML = "";
        dots.innerHTML = "";
        pageEls.length = 0;
        layout.pages.forEach((ids, p) => {
            const page = h("div.page", { style: { left: p * W + "px" } });
            pageEls.push(page);
            track.append(page);
            if (p === 0) page.append(...makeWidgets());
            ids.forEach((id, i) => {
                const ic = makeIcon(id);
                ic.page = p;
                page.append(ic.el);
            });
            dots.append(h("i"));
        });
        layout.dock.forEach((id) => {
            const ic = makeIcon(id, true);
            dockRow.append(ic.el);
        });
        placeAll(true);
        setDot(state.page);
    }
    function placeAll(snap) {
        layout.pages.forEach((ids, p) => ids.forEach((id, i) => place(id, OFFSET[p] + i, snap)));
        layout.dock.forEach((id, i) => {
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
        const d = new Date();
        const w = COL_PITCH * 2 - 8;
        const ht = ROW_PITCH * 2 - 40;
        const cal = h("div.widget.cal", { "data-glass": "", "data-glass-lite": "", "data-glass-static": "", "data-glass-bezel": "26", style: { left: GRID_X + 4 + "px", top: GRID_Y + "px", width: w + "px", height: ht + "px" } });
        cal.innerHTML = `<span class="wd">${d.toLocaleDateString("en", { weekday: "long" })}</span><b class="wn">${d.getDate()}</b><em>${d.toLocaleDateString("en", { month: "long" })}</em><p>No events today</p>`;
        const hr = d.getHours();
        const wx = h("div.widget.wx", { "data-glass": "", "data-glass-lite": "", "data-glass-static": "", "data-glass-bezel": "26", style: { left: GRID_X + 4 + COL_PITCH * 2 + "px", top: GRID_Y + "px", width: w + "px", height: ht + "px" } });
        wx.innerHTML = `<span class="wl">Ho Chi Minh City</span><b class="wt">${hr > 17 || hr < 6 ? 27 : 31}°</b><svg viewBox="0 0 24 24" width="30" height="30"><circle cx="9" cy="10" r="4.2" fill="#ffd60a"/><path d="M9 2.500v1.500M2.500 10H4M4.500 5.500l1 1M13.500 5.500l-1 1" stroke="#ffd60a" stroke-width="1.400" stroke-linecap="round"/><path fill="#fff" d="M10 20a4 4 0 0 1 .8-7.900A5.500 5.500 0 0 1 21 14a3.500 3.500 0 0 1-.5 6z"/></svg><p>Mostly Cloudy</p><em>H:33°  L:26°</em>`;
        requestAnimationFrame(() => [cal, wx].forEach(registerGlass));
        return [cal, wx];
    }

    /* ---------- paging ---------- */
    const pg = new Group({ x: 0 }, { response: 0.5, damping: 0.88 }, (v) => (track.style.transform = `translate3d(${-v.x}px,0,0)`));
    const maxPage = () => layout.pages.length - 1;
    function setDot(p) {
        state.page = p;
        dots.querySelectorAll("i").forEach((d, i) => d.classList.toggle("on", i === p));
    }
    function goPage(p, vx) {
        p = clamp(p, 0, maxPage());
        setDot(p);
        pg.to({ x: p * W }, { velocity: vx != null ? { x: vx } : undefined });
    }

    /* ---------- interaction ---------- */
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
        try { home.setPointerCapture(e.pointerId); } catch {};
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

    /* ---------- edit mode ---------- */
    function setEdit(on) {
        state.editing = on;
        home.classList.toggle("edit", on);
        closeMenu();
    }
    function startDrag(el, p) {
        const id = el.dataset.app;
        const ic = icons[id];
        if (ic.dock) return;
        const page = layout.pages.findIndex((ids) => ids.includes(id));
        const s = ic.g.values;
        drag = { id, ic, page, ox: p.x + pg.values.x - page * W - s.x, oy: p.y - s.y };
        el.classList.add("lift");
        el.style.zIndex = 60;
    }
    function moveDrag(p) {
        const { ic, id, page } = drag;
        const px = p.x + pg.values.x - page * W;
        ic.g.drive({ x: px - drag.ox, y: p.y - drag.oy });
        const col = clamp(Math.floor((px - GRID_X) / COL_PITCH), 0, 3);
        const row = clamp(Math.floor((p.y - GRID_Y + 24) / ROW_PITCH), 0, 5);
        let slot = row * 4 + col;
        const ids = layout.pages[page];
        slot = clamp(slot - OFFSET[page], 0, ids.length - 1);
        const from = ids.indexOf(id);
        if (slot !== from) {
            ids.splice(from, 1);
            ids.splice(slot, 0, id);
            ids.forEach((x, i) => x !== id && place(x, OFFSET[page] + i));
        }
    }
    function endDrag() {
        const { id, ic, page } = drag;
        drag = null;
        const i = layout.pages[page].indexOf(id);
        place(id, OFFSET[page] + i);
        ic.g.p = { response: 0.4, damping: 0.7 };
        ic.el.classList.remove("lift");
        setTimeout(() => (ic.el.style.zIndex = ""), 350);
        store.set("layout", layout);
    }
    function removeIcon(id) {
        const ic = icons[id];
        ic.el.classList.add("gone");
        setTimeout(() => {
            ic.el.remove();
            layout.pages.forEach((ids) => ids.includes(id) && ids.splice(ids.indexOf(id), 1));
            delete icons[id];
            layout.pages.forEach((ids, p) => ids.forEach((x, i) => place(x, OFFSET[p] + i)));
            store.set("layout", layout);
        }, 220);
    }

    /* ---------- context menu (long press) ---------- */
    let menuOpen = null;
    function openMenu(iconEl) {
        if (state.editing) return;
        const id = iconEl.dataset.app;
        const r = ctx.rect(iconEl.querySelector(".icon"));
        const below = r.y < H / 2;
        const menu = h("div.cmenu", { "data-glass": "", "data-glass-lite": "", "data-glass-static": "", "data-glass-bezel": "20", style: { left: clamp(r.x - 50, 14, W - 14 - 240) + "px", [below ? "top" : "bottom"]: (below ? r.y + r.h + 22 : H - r.y + 14) + "px", transformOrigin: `${r.x + r.w / 2}px ${below ? "0%" : "100%"}` } },
            h("button", { on: { click: () => { closeMenu(); ctx.mod.wm.open(id); } } }, `Open ${APPS[id].name}`),
            h("button", { on: { click: () => setEdit(true) } }, "Edit Home Screen"),
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

    /* ---------- public ---------- */
    const factors = () => {
        const hs = 1 + 0.11 * state.appP + 0.1 * (1 - state.unlockU);
        const ho = clamp(1 - state.appP * 1.35, 0, 1) * clamp(state.unlockU * 1.2, 0, 1);
        home.style.setProperty("--hs", hs.toFixed(4));
        home.style.setProperty("--ho", ho.toFixed(3));
    };
    const api = (ctx.mod.home = {
        setApp(p) { state.appP = p; factors(); },
        setUnlock(u) { state.unlockU = u; factors(); },
        setHidden(b) { home.style.visibility = b ? "hidden" : ""; },
        hideIcon(id, b) { icons[id] && (icons[id].el.style.visibility = b ? "hidden" : ""); },
        revealIcon(id) {
            const p = layout.pages.findIndex((ids) => ids.includes(id));
            if (p >= 0 && p !== state.page) {
                setDot(p);
                pg.drive({ x: p * W });
            }
            if (icons[id]) icons[id].el.style.visibility = "hidden";
        },
        iconRect(id) {
            const ic = icons[id];
            if (!ic) return { x: W / 2 - ICON / 2, y: H - 120, w: ICON, h: ICON };
            const v = ic.g.values;
            const p = layout.pages.findIndex((ids) => ids.includes(id));
            const px = p >= 0 ? p * W - pg.values.x : 0;
            return { x: v.x + (84 - ICON) / 2 + px, y: v.y, w: ICON, h: ICON };
        },
        get editing() { return state.editing; },
        setEdit,
        firstPage() { goPage(0); },
        get wallpaperEl() { return wp; },
    });
    build();
    factors();
}
