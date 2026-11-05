import { registerApp, APPS, ICONS, iconHTML } from "../core/apps.js";
import { h, store, sys } from "../core/util.js";
import { ctx } from "../core/ctx.js";
import { tabBar } from "../core/ui.js";
import { locale } from "../core/i18n.js";
import { registerGlass } from "../glass.js";

const T = (s) => { const [vi, en] = s.split("|"); return locale === "vi" ? vi : en || vi; };
const tk = (c, tr) => `<path d="M33 16v23a8.500 8.500 0 1 1-8.500-8.500M33 16c.8 5.500 4 8.500 9.500 9" stroke="${c}" transform="${tr}"/>`;
ICONS.tiktok = ["#000", `<svg viewBox="0 0 62 62" fill="none" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">${tk("#25f4ee", "translate(-1.800 -1.800)")}${tk("#fe2c55", "translate(1.800 1.800)")}${tk("#fff", "")}</svg>`];

/** Kho ứng dụng mở rộng: thêm app chỉ cần AppStore.register({...}) */
export const AppStore = {
    items: [], progress: {}, pending: null,
    isInstalled: (id) => store.get("installed", []).includes(id),
    register(item) {
        this.items.push(item);
        const cloud = !this.isInstalled(item.id);
        if (APPS[item.id]) return Object.assign(APPS[item.id], { installable: true, cloud });
        registerApp({ id: item.id, name: item.name, status: "dark", bg: "#000", installable: true, cloud, build: item.build });
    },
};

AppStore.register({
    id: "tiktok", name: "TikTok", subtitle: "Video ngắn, nhiều cảm hứng|Make Your Day", category: "social", rating: "4,8 ★ · 12+",
    desc: "Khám phá những video ngắn thú vị từ khắp nơi trên thế giới.|Discover short, entertaining videos from around the world.",
    build(root) { root.append(h("div.app.tkph", { html: `<div class="tkl">${iconHTML("tiktok", "TikTok")}</div><h2>TikTok</h2><p>${T("Trình phát video sẽ được thêm ở bước sau.|The video player arrives in a later build.")}</p>` })); },
});

const stateOf = (id) => (id in AppStore.progress ? "busy" : AppStore.isInstalled(id) ? "open" : AppStore.pending === id ? "install" : "get");
const LABEL = { get: "Nhận|Get", install: "Cài đặt|Install", open: "Mở|Open", busy: "" };

export function initAppStore() {
    registerApp({
        id: "appstore", name: "App Store", status: "auto", bg: "var(--bg2)",
        build(root) {
            const app = h("div.app.store");
            root.append(app);
            const btns = [];
            const getBtn = (item) => {
                const b = h("button.getb", { "data-id": item.id });
                b.addEventListener("click", (e) => { e.stopPropagation(); press(item.id); });
                btns.push(b); paint(b); return b;
            };
            const paint = (b) => { const s = stateOf(b.dataset.id); b.className = "getb " + s; b.textContent = T(LABEL[s]); b.style.setProperty("--p", ((AppStore.progress[b.dataset.id] || 0) * 100).toFixed(1)); };
            const refresh = () => btns.forEach(paint);
            const row = (it) => h("div.srow", { on: { click: () => detail(it) } }, [h("div.sic", { html: iconHTML(it.id, it.name) }), h("div.stx", { html: `<b>${it.name}</b><em>${T(it.subtitle)}</em>` }), getBtn(it)]);
            const card = (it) => h("div.scard", { on: { click: () => detail(it) } }, [h("div.sct", { html: `<em>${T("App của ngày|App of the Day")}</em><b>${it.name}</b><span>${T(it.subtitle)}</span>` }), h("div.scb", [h("div.sic", { html: iconHTML(it.id, it.name) }), h("div.stx", { html: `<b>${it.name}</b>` }), getBtn(it)])]);
            const views = {
                today: h("div.sview", [h("h1.lt", T("Hôm nay|Today")), ...AppStore.items.map(card)]),
                apps: h("div.sview", [h("h1.lt", T("Ứng dụng|Apps")), h("div.grp", AppStore.items.map(row))]),
                search: h("div.sview", [h("h1.lt", T("Tìm kiếm|Search")), h("input.sin", { placeholder: T("Trò chơi, Ứng dụng, Câu chuyện|Games, Apps, Stories"), "data-kb": "", inputmode: "none" }), h("div.grp", AppStore.items.map(row))]),
            };
            const show = (id) => Object.entries(views).forEach(([k, v]) => (v.style.display = k === id ? "" : "none"));
            const IC = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
            const tabs = tabBar([
                { id: "today", icon: IC('<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 9h8M8 13h5"/>'), label: T("Hôm nay|Today") },
                { id: "apps", icon: IC('<path d="M12 3l9 5-9 5-9-5zM3 12l9 5 9-5"/>'), label: T("Ứng dụng|Apps") },
                { id: "search", icon: IC('<circle cx="11" cy="11" r="6.500"/><path d="M16 16l4.500 4.500"/>'), label: T("Tìm kiếm|Search") },
            ], "today", show);
            app.append(...Object.values(views), tabs); show("today");
            function detail(it) {
                const back = h("button.sback", { html: "‹ " + T("Quay lại|Back"), on: { click: () => { d.classList.remove("in"); setTimeout(() => d.remove(), 350); } } });
                const d = h("div.sdet", [back, h("div.shead", [h("div.sic.big", { html: iconHTML(it.id, it.name) }), h("div.stx", { html: `<b>${it.name}</b><em>${T(it.subtitle)}</em>` })]), h("div.sact", [getBtn(it), h("span", it.rating)]), h("div.shots", [1, 2, 3].map((i) => h("i", { style: { background: `linear-gradient(${150 + i * 40}deg,#25f4ee33,#fe2c5555)` } }))), h("p.sdesc", T(it.desc))]);
                app.append(d); requestAnimationFrame(() => d.classList.add("in"));
            }
            ctx.mod.appstore = { refresh, confirm: () => confirm(), get pending() { return AppStore.pending; } };
        },
    });

    /* ---------- luồng cài đặt: Nhận → nhấn đúp nút Side → Face ID → tải/cài ---------- */
    const ov = h("div.dbl", [h("div.dbl-bar"), h("div.dbl-card", { html: `<svg viewBox="0 0 24 24" fill="none" stroke="#0a84ff" stroke-width="1.800" stroke-linecap="round"><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M9 10v1.500M15 10v1.500M12 10v4h-1M9.500 16.500c1.500 1 3.500 1 5 0"/></svg><b>${T("Nhấn đúp để cài đặt|Double Click to Install")}</b>` })]);
    let last = 0, pwEl = null;
    const refreshAll = () => ctx.mod.appstore?.refresh();
    function press(id) {
        if (stateOf(id) === "open") return ctx.mod.wm.open(id);
        if (stateOf(id) === "busy") return;
        AppStore.pending = id; refreshAll();
        if (!ov.isConnected) ctx.screen.append(ov);
        const s = ctx.screen.getBoundingClientRect(), k = s.width / 440, r = pwEl?.getBoundingClientRect();
        ov.querySelector(".dbl-bar").style.top = (r ? (r.top - s.top) / k : 200) + "px";
        ov.querySelector(".dbl-bar").style.height = (r ? r.height / k : 90) + "px";
        pwEl?.classList.add("hw-glow");
        requestAnimationFrame(() => ov.classList.add("on"));
    }
    function cancel() { AppStore.pending = null; ov.classList.remove("on"); pwEl?.classList.remove("hw-glow"); refreshAll(); }
    async function confirm() {
        const id = AppStore.pending; if (!id) return;
        ov.classList.remove("on"); pwEl?.classList.remove("hw-glow");
        const ok = !sys.get("faceidFail");
        await ctx.mod.island.faceID(ok);
        if (!ok) { ctx.mod.island.alert(`<b>${T("Nhập mật mã…|Enter Passcode…")}</b>`, "faceid", 1500); await new Promise((r) => setTimeout(r, 1700)); }
        AppStore.pending = null; install(id);
    }
    function install(id) {
        AppStore.progress[id] = 0; refreshAll();
        ctx.mod.home.addApp(id, { installing: true });
        const dur = 2500 + Math.random() * 3000, t0 = performance.now();
        const tick = () => {
            const p = Math.min(1, (performance.now() - t0) / dur);
            AppStore.progress[id] = p;
            ctx.mod.home.setInstall(id, p, T(p < 0.12 ? "Đang chờ…|Waiting…" : p < 0.85 ? "Đang tải…|Downloading…" : "Đang cài đặt…|Installing…"));
            refreshAll();
            if (p < 1) return requestAnimationFrame(tick);
            delete AppStore.progress[id];
            store.set("installed", [...new Set([...store.get("installed", []), id])]);
            APPS[id].cloud = false; ctx.mod.home.finishInstall(id); refreshAll();
        };
        requestAnimationFrame(tick);
    }
    AppStore.uninstall = (id) => { store.set("installed", store.get("installed", []).filter((x) => x !== id)); APPS[id].cloud = true; refreshAll(); };
    // nhấn đúp: nút Side (khung máy), vùng sáng ở mép phải, hoặc Shift hai lần
    const tap = () => { const n = performance.now(); if (n - last < 500) { last = 0; confirm(); } else last = n; };
    requestAnimationFrame(() => {
        pwEl = ctx.phone.querySelector('[data-hw="power"]');
        pwEl?.addEventListener("click", (e) => { if (AppStore.pending) { e.stopImmediatePropagation(); tap(); } }, true);
    });
    ov.addEventListener("click", (e) => { if (e.target.closest(".dbl-bar")) tap(); else cancel(); });
    addEventListener("keyup", (e) => { if (e.key === "Shift" && AppStore.pending) tap(); else if (e.key === "Escape" && AppStore.pending) cancel(); });
}
