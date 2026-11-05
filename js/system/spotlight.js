import { ctx } from "../core/ctx.js";
import { Group } from "../core/motion.js";
import { H } from "../core/metrics.js";
import { APPS, iconHTML } from "../core/apps.js";
import { clamp, h } from "../core/util.js";
import { registerGlass } from "../glass.js";
import { t, locale } from "../core/i18n.js";

export function initSpotlight() {
    const el = ctx.el.spot;
    el.innerHTML = `<div class="sp-bg"></div>
        <div class="sp-list"></div>
        <div class="sp-field" data-glass data-glass-lite data-glass-static data-glass-bezel="28"><svg viewBox="0 0 24 24" width="20" height="20"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" stroke-width="2.4" fill="none"/><path d="M15.5 15.5 21 21" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg><input data-kb inputmode="none" enterkeyhint="search" placeholder="${t("Search")}" autocomplete="off"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg></div>`;
    registerGlass(el.querySelector(".sp-field"));
    const input = el.querySelector("input");
    const list = el.querySelector(".sp-list");
    let isOpen = false;

    const g = new Group({ p: 0 }, { response: 0.44, damping: 0.9 }, (v) => {
        const p = clamp(v.p, 0, 1);
        el.style.visibility = p < 0.004 ? "hidden" : "visible";
        el.style.pointerEvents = p > 0.5 ? "auto" : "none";
        el.querySelector(".sp-bg").style.opacity = p;
        const top = el.querySelector(".sp-field");
        top.style.opacity = clamp(p * 1.5 - 0.2, 0, 1);
        top.style.transform = `translate3d(0,${(1 - p) * 24}px,0)`;
        list.style.opacity = clamp(p * 1.5 - 0.3, 0, 1);
    });
    g.snap({ p: 0 });

    const norm = (x) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase();
    const WEB = [["Apple iPhone 18 Pro", "apple.com/iphone-18-pro"], ["Liquid Glass - Apple Developer", "developer.apple.com/design"]];
    const openApp = (id) => () => { const r = ctx.mod.home.iconRect(id); api.close(); ctx.mod.wm.open(id, r); };
    function fill(q) {
        list.innerHTML = "";
        if (!q) {
            const ids = ["tiktok", "settings", "files", "messages", "safari", "music"].filter((id) => APPS[id] && !APPS[id].cloud).slice(0, 4);
            list.append(h("div.sp-hd", { html: `<b>${t("Siri Suggestions")}</b><span>${locale === "vi" ? "Hiển thị thêm" : "Show More"}</span>` }));
            list.append(h("div.sp-sug", ids.map((id) => h("button", { on: { click: openApp(id) }, html: `${iconHTML(id, APPS[id].name)}<span>${APPS[id].name}</span>` }))));
            list.append(h("div.sp-sec", locale === "vi" ? "Thư giãn" : "Relax"));
            WEB.forEach(([ti, u]) => list.append(h("div.sp-web", { html: `<span class="mini">${iconHTML("safari", "Safari")}</span><div><b>${ti}</b><em>${u}</em></div>` })));
            return;
        }
        const apps = Object.values(APPS).filter((a) => !a.cloud && norm(a.name).includes(norm(q)));
        if (!apps.length) return void list.append(h("p.empty", t("No Results")));
        list.append(h("div.sp-hd", { html: `<b>${t("Applications")}</b>` }));
        apps.slice(0, 8).forEach((a) => list.append(h("button.sp-row", { on: { click: openApp(a.id) }, html: `<span class="mini">${iconHTML(a.id, a.name)}</span><span>${a.name}</span>` })));
    }
    input.addEventListener("input", () => fill(input.value));
    el.querySelector(".sp-bg").addEventListener("click", () => api.close());

    const api = (ctx.mod.spot = {
        get open() { return isOpen; },
        drag(p) { g.drive({ p }); if (p > 0.02) fill(input.value); },
        release(vyDown) {
            const p = g.values.p;
            const want = vyDown > 450 ? true : vyDown < -450 ? false : p > 0.4;
            want ? api.openIt() : api.close();
        },
        openIt() {
            isOpen = true;
            fill("");
            g.to({ p: 1 });
            setTimeout(() => input.focus(), 120);
            ctx.mod.setStatusTone("light");
        },
        close(instant) {
            if (!isOpen && g.values.p < 0.01) return;
            isOpen = false;
            input.value = "";
            ctx.mod.kb?.hide();
            if (instant) g.snap({ p: 0 });
            else g.to({ p: 0 }, { params: { response: 0.4, damping: 1 } });
            ctx.mod.wm.syncTone();
        },
    });
}
