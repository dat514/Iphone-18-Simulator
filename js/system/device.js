import { W, H } from "../core/metrics.js";
import { ctx } from "../core/ctx.js";
import { $, sys } from "../core/util.js";

export function buildDevice() {
    const stage = $("#stage");
    stage.innerHTML = `
    <div class="phone" id="phone" data-color="${sys.get("color")}">
        <div class="frame"></div><div class="bezel"></div>
        <div class="hw l action" data-hw="action" title="Action button"></div>
        <div class="hw l volup" data-hw="volup" title="Volume up"></div>
        <div class="hw l voldown" data-hw="voldown" title="Volume down"></div>
        <div class="hw r power" data-hw="power" title="Side button (lock / wake)"></div>
        <div class="hw r camctl" data-hw="camctl" title="Camera Control"></div>
        <div class="screen" id="screen" data-theme="light">
            <div class="home" id="home"></div>
            <div class="windows" id="windows"></div>
            <div class="switcher" id="switcher"></div>
            <div class="lock" id="lock"></div>
            <div class="cc" id="cc"></div>
            <div class="spot" id="spot"></div>
            <div class="kb" id="kb"></div>
            <div class="banners" id="banners"></div>
            <div class="statusbar" id="sb"></div>
            <div class="island" id="island"></div>
            <div class="indicator" id="ind"><i></i></div>
            <div class="hud" id="hud"></div>
            <div class="sheen"></div>
            <div class="dim" id="dim"></div>
            <div class="off" id="off"></div>
        </div>
    </div>`;
    ctx.phone = $("#phone");
    ctx.screen = $("#screen");
    for (const id of ["home", "windows", "switcher", "lock", "cc", "spot", "kb", "banners", "sb", "island", "ind", "hud", "dim", "off"]) ctx.el[id] = $("#" + id);

    const fit = () => {
        const vw = innerWidth;
        const vh = innerHeight;
        const bare = vw < 520;
        ctx.phone.classList.toggle("bare", bare);
        const s = bare ? Math.min(vw / W, vh / H) : Math.min((vw - 24) / 471, (vh - 24) / 987, 1.2);
        ctx.phone.style.setProperty("--s", s.toFixed(4));
    };
    fit();
    addEventListener("resize", fit);

    sys.on("theme", (t) => ctx.screen.setAttribute("data-theme", t));
    sys.on("color", (c) => ctx.phone.setAttribute("data-color", c));
    sys.on("brightness", (b) => (ctx.el.dim.style.opacity = ((1 - b) * 0.78).toFixed(3)));
    sys.on("glass", (g) => {
        // iOS 27 Liquid Glass slider: 0 = clear, 1 = tinted/opaque
        const a = sys.get("theme") === "dark" ? 0.04 + g * 0.3 : 0.07 + g * 0.45;
        ctx.screen.style.setProperty("--glass-fill", sys.get("theme") === "dark" ? `rgba(40,40,46,${a})` : `rgba(255,255,255,${a})`);
    });
    sys.on("theme", () => sys.set("glass", sys.get("glass"), false), false);
}
