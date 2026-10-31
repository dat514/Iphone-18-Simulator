import { registerApp } from "../core/apps.js";
import { h, sys } from "../core/util.js";
import { page, cell, group, toggle, segmented, slider, NavStack, ICO } from "../core/ui.js";
import { WALLPAPERS } from "../core/wallpapers.js";
import { ctx } from "../core/ctx.js";

const ic = (d, f = "none") => `<svg viewBox="0 0 24 24" fill="${f}" stroke="${f === "none" ? "#fff" : "none"}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const I = {
    air: ic(`<path d="M21 16v-2l-8-5V3.500a1.500 1.500 0 0 0-3 0V9l-8 5v2l8-2.500V19l-2 1.500V22l3.500-1 3.500 1v-1.500L13 19v-5.500z"/>`, "#fff"),
    wifi: ic(`<path d="M2 9a15 15 0 0 1 20 0M5.500 12.500a10 10 0 0 1 13 0M9 16a5 5 0 0 1 6 0"/>`),
    bt: ic(`<path d="M7 7l10 10-5 4.500V2.500L17 7 7 17"/>`),
    cell: ic(`<path d="M4 18V14M9 18V10M14 18V6M19 18V2"/>`),
    bell: ic(`<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.700 21a2 2 0 0 1-3.400 0"/>`),
    snd: ic(`<polygon points="3 9 7 9 12 4.500 12 19.500 7 15 3 15"/><path d="M16 8.500a5 5 0 0 1 0 7"/>`),
    moon: ic(`<path d="M20 14.500A8.500 8.500 0 1 1 9.500 4a7 7 0 0 0 10.500 10.500z"/>`),
    gear: ic(`<circle cx="12" cy="12" r="3.500"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.900 4.900l2.100 2.100M17 17l2.100 2.100M4.900 19.100 7 17M17 7l2.100-2.100"/>`),
    sun: ic(`<circle cx="12" cy="12" r="4.200"/><path d="M12 2.500v2.500M12 19v2.500M2.500 12H5M19 12h2.500M5.300 5.300l1.800 1.800M16.900 16.900l1.800 1.800M5.300 18.700l1.800-1.800M16.900 7.100l1.800-1.800"/>`),
    wall: ic(`<rect x="3.500" y="3.500" width="17" height="17" rx="4"/><circle cx="9" cy="9" r="1.800"/><path d="M4 17l5-5 4 4 3-3 4 4"/>`),
    home: ic(`<rect x="4" y="4" width="6.500" height="6.500" rx="1.600"/><rect x="13.500" y="4" width="6.500" height="6.500" rx="1.600"/><rect x="4" y="13.500" width="6.500" height="6.500" rx="1.600"/><rect x="13.500" y="13.500" width="6.500" height="6.500" rx="1.600"/>`),
    phone: ic(`<rect x="7" y="2.500" width="10" height="19" rx="2.600"/><path d="M10.500 5.500h3"/>`),
    sw: ic(`<path d="M4 7h16M4 12h16M4 17h16"/>`),
};

export function initSettings() {
    registerApp({
        id: "settings", name: "Settings", status: "auto",
        build(root) {
            const app = h("div.app");
            root.append(app);
            const nav = new NavStack(app);
            const back = { onClick: () => nav.pop() };
            const sub = (title, ...kids) => {
                const p = page({ title, back });
                p.scroll.append(...kids);
                return nav.push(p.el);
            };

            const wifiPage = () => sub("Wi-Fi", group([cell({ title: "Wi-Fi", right: (() => { const t = toggle(sys.get("wifi"), (v) => sys.set("wifi", v)); sys.on("wifi", (v) => t.set(v)); return t; })() })]),
                group([cell({ title: "Home Network", detail: "Connected" }), cell({ title: "Guest", chev: true })], "Simulated networks."));

            const aboutPage = () => {
                const row = (a, b) => cell({ title: a, detail: b });
                sub("About",
                    group([row("Name", "iPhone"), row("iOS Version", "27.0"), row("Model Name", "iPhone 18 Pro Max"), row("Model Number", "A3xxx (simulated)")]),
                    group([row("Display", '6.9-inch Super Retina XDR'), row("Resolution", "2868 × 1320 · 460 ppi"), row("Points", "440 × 956 @3x"), row("Chip", "A20 Pro"), row("Memory", "12 GB")]),
                    group([row("Dimensions", "163.4 × 78 × 8.75 mm"), row("Dynamic Island", "16.57 mm"), row("Finish", sys.get("color")[0].toUpperCase() + sys.get("color").slice(1))], "This is a web simulator. Not affiliated with Apple."));
            };

            const displayPage = () => {
                const seg = segmented([["light", "Light"], ["dark", "Dark"]], sys.get("theme"), (v) => sys.set("theme", v));
                sys.on("theme", (v) => seg.set(v), false);
                const bright = slider(sys.get("brightness"), (v) => sys.set("brightness", Math.max(0.04, v)), { min: 0.04, max: 1 });
                const glass = slider(sys.get("glass"), (v) => sys.set("glass", v));
                const demo = h("div.gdemo", { style: { background: ctx.mod.home.wallpaperEl.style.background } }, h("div.glens", { "data-glass": "", "data-glass-lite": "", "data-glass-static": "", "data-glass-bezel": "30" }, "Liquid Glass"));
                sub("Display & Brightness",
                    group([cell({ title: "Appearance", right: seg })]),
                    group([cell({ icon: I.sun, color: "#0a84ff", title: "Brightness" }), h("div.pad", bright)]),
                    h("div.grpw", [h("p.foot.up", "Liquid Glass"), h("div.grp", [demo, h("div.pad.lbls", [h("span", "Clear"), h("span", "Tinted")]), h("div.pad", glass)]), h("p.foot", "Choose how clear or tinted Liquid Glass looks across the system.")]),
                );
                requestAnimationFrame(() => import("../glass.js").then((g) => g.registerGlass(demo.firstChild)));
            };

            const wallpaperPage = () => {
                const grid = h("div.wgrid");
                const draw = () => {
                    grid.innerHTML = "";
                    WALLPAPERS.forEach((w) => grid.append(h("button.wtile" + (sys.get("wallpaper") === w.id ? ".on" : ""), { style: { background: w.css }, on: { click: () => { sys.set("wallpaper", w.id); draw(); } } }, h("span", w.name))));
                    const f = h("input", { type: "file", accept: "image/*", style: { display: "none" }, on: { change: (e) => { const file = e.target.files[0]; if (!file) return; const r = new FileReader(); r.onload = () => { sys.set("customWallpaper", r.result, false); sys.set("wallpaper", "custom", false); draw(); }; r.readAsDataURL(file); } } });
                    grid.append(h("button.wtile.add", { on: { click: () => f.click() } }, "+ Photo"), f);
                };
                draw();
                sub("Wallpaper", grid, group([cell({ title: "Compact Lock Screen Clock", right: toggle(sys.get("compactClock"), (v) => sys.set("compactClock", v)) })], "New in iOS 27: a smaller clock so more of your wallpaper shows."));
            };

            const colorPage = () => {
                const sw = h("div.cgrid");
                const draw = () => {
                    sw.innerHTML = "";
                    [["black", "#2b2b2f"], ["silver", "#d8d8dd"], ["glacier", "#a7bfd4"], ["burgundy", "#6b2236"]].forEach(([id, c]) => sw.append(h("button.csw" + (sys.get("color") === id ? ".on" : ""), { on: { click: () => (sys.set("color", id), draw()) } }, h("i", { style: { background: c } }), h("span", id[0].toUpperCase() + id.slice(1)))));
                };
                draw();
                sub("Device Color", sw);
            };

            const soundsPage = () => {
                const t = toggle(sys.get("silent"), (v) => sys.set("silent", v));
                sys.on("silent", (v) => t.set(v), false);
                sub("Sounds & Haptics", group([cell({ title: "Silent Mode", right: t })]), group([cell({ title: "Ringer and Alerts" }), h("div.pad", slider(sys.get("volume"), (v) => { sys.set("volume", v); ctx.mod.showVolume(); }))]), group([cell({ title: "UI Sounds", right: toggle(sys.get("sounds"), (v) => sys.set("sounds", v)) })]));
            };

            const root0 = page({ title: "Settings" });
            const air = toggle(sys.get("airplane"), (v) => { sys.set("airplane", v); if (v) ["wifi", "bt", "cellular"].forEach((k) => sys.set(k, false)); });
            sys.on("airplane", (v) => air.set(v), false);
            root0.scroll.append(
                h("div.field", [h("span", { html: ICO.search }), h("input", { placeholder: "Search", "data-kb": "", inputmode: "none" })]),
                group([cell({ icon: `<b style="font-size:17px">D</b>`, color: "linear-gradient(135deg,#7b5cff,#ff4fa3)", title: "Dat514", sub: "Apple Account, iCloud+, Media & Purchases", chev: true })]),
                group([
                    cell({ icon: I.air, color: "#ff9f0a", title: "Airplane Mode", right: air }),
                    cell({ icon: I.wifi, color: "#0a84ff", title: "Wi-Fi", detail: sys.get("wifi") ? "Home Network" : "Off", chev: true, onClick: wifiPage }),
                    cell({ icon: I.bt, color: "#0a84ff", title: "Bluetooth", detail: sys.get("bt") ? "On" : "Off", chev: true }),
                    cell({ icon: I.cell, color: "#30d158", title: "Cellular", chev: true }),
                ]),
                group([
                    cell({ icon: I.bell, color: "#ff3b30", title: "Notifications", chev: true }),
                    cell({ icon: I.snd, color: "#ff2d55", title: "Sounds & Haptics", chev: true, onClick: soundsPage }),
                    cell({ icon: I.moon, color: "#5e5ce6", title: "Focus", chev: true }),
                ]),
                group([
                    cell({ icon: I.gear, color: "#8e8e93", title: "General", chev: true, onClick: () => sub("General", group([cell({ title: "About", chev: true, onClick: aboutPage }), cell({ title: "Software Update", detail: "iOS 27.0", chev: true })])) }),
                    cell({ icon: I.sw, color: "#636366", title: "Control Center", chev: true }),
                    cell({ icon: I.sun, color: "#0a84ff", title: "Display & Brightness", chev: true, onClick: displayPage }),
                    cell({ icon: I.home, color: "#5e5ce6", title: "Home Screen & App Library", chev: true }),
                    cell({ icon: I.wall, color: "#30b0c7", title: "Wallpaper", chev: true, onClick: wallpaperPage }),
                ]),
                group([cell({ icon: I.phone, color: "#1c1c1e", title: "Device Color", detail: sys.get("color"), chev: true, onClick: colorPage })], "Simulator option: change the finish of the virtual iPhone 18 Pro Max."),
            );
            nav.push(root0.el);
            root0.el.classList.remove("pushed");
        },
    });
}
