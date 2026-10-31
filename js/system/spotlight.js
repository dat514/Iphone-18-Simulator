import { ctx } from "../core/ctx.js";
import { Group } from "../core/motion.js";
import { H } from "../core/metrics.js";
import { APPS, iconHTML } from "../core/apps.js";
import { clamp, h } from "../core/util.js";
import { registerGlass } from "../glass.js";

export function initSpotlight() {
    const el = ctx.el.spot;
    el.innerHTML = `<div class="sp-bg"></div>
        <div class="sp-top"><div class="sp-field" data-glass data-glass-lite data-glass-static data-glass-bezel="22"><svg viewBox="0 0 24 24" width="18" height="18"><circle cx="10.500" cy="10.500" r="6.500" stroke="currentColor" stroke-width="2.200" fill="none"/><path d="M15.500 15.500 21 21" stroke="currentColor" stroke-width="2.200" stroke-linecap="round"/></svg><input data-kb inputmode="none" placeholder="Search" autocomplete="off"></div><button class="sp-cancel">Cancel</button></div>
        <div class="sp-list"></div>`;
    registerGlass(el.querySelector(".sp-field"));
    const input = el.querySelector("input");
    const list = el.querySelector(".sp-list");
    let isOpen = false;

    const g = new Group({ p: 0 }, { response: 0.44, damping: 0.9 }, (v) => {
        const p = clamp(v.p, 0, 1);
        el.style.visibility = p < 0.004 ? "hidden" : "visible";
        el.style.pointerEvents = p > 0.5 ? "auto" : "none";
        el.querySelector(".sp-bg").style.opacity = p;
        const top = el.querySelector(".sp-top");
        top.style.opacity = clamp(p * 1.5 - 0.2, 0, 1);
        top.style.transform = `translate3d(0,${(1 - p) * -24}px,0)`;
        list.style.opacity = clamp(p * 1.5 - 0.3, 0, 1);
    });
    g.snap({ p: 0 });

    function fill(q) {
        list.innerHTML = "";
        const apps = Object.values(APPS).filter((a) => !q || a.name.toLowerCase().includes(q.toLowerCase()));
        if (!apps.length) return void list.append(h("p.empty", "No Results"));
        list.append(h("div.sp-h", q ? "Applications" : "Siri Suggestions"));
        apps.slice(0, 8).forEach((a) => {
            list.append(h("button.sp-row", { on: { click: () => { const r = ctx.mod.home.iconRect(a.id); api.close(); ctx.mod.wm.open(a.id, r); } }, html: `<span class="mini">${iconHTML(a.id, a.name)}</span><b>${a.name}</b>` }));
        });
    }
    input.addEventListener("input", () => fill(input.value));
    el.querySelector(".sp-cancel").addEventListener("click", () => api.close());
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
