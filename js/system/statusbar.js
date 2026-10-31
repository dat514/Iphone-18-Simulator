import { ctx } from "../core/ctx.js";
import { sys } from "../core/util.js";

const SIGNAL = `<svg width="19" height="12" viewBox="0 0 19 12"><rect x="0" y="8" width="3.2" height="4" rx="1" fill="currentColor"/><rect x="5" y="5.5" width="3.2" height="6.5" rx="1" fill="currentColor"/><rect x="10" y="3" width="3.2" height="9" rx="1" fill="currentColor"/><rect x="15" y="0" width="3.2" height="12" rx="1" fill="currentColor"/></svg>`;
const WIFI = `<svg width="17" height="12" viewBox="0 0 17 12" fill="currentColor"><path d="M8.5 2.3c2.4 0 4.6.9 6.3 2.5.1.1.3.1.4 0l1.1-1.1c.1-.1.1-.3 0-.4C14.3 1.2 11.5 0 8.5 0S2.7 1.2.7 3.3c-.1.1-.1.3 0 .4l1.1 1.1c.1.1.3.1.4 0 1.7-1.6 3.9-2.5 6.3-2.5zm0 3.9c1.3 0 2.5.5 3.4 1.3.1.1.3.1.4 0l1.1-1.1c.1-.1.1-.3 0-.4-1.2-1.1-2.9-1.8-4.9-1.8s-3.7.7-4.9 1.8c-.1.1-.1.3 0 .4l1.1 1.1c.1.1.3.1.4 0 .9-.8 2.1-1.3 3.4-1.3zm2.1 2.6c.1-.1.1-.3 0-.4-.5-.5-1.3-.8-2.1-.8s-1.6.3-2.1.8c-.1.1-.1.3 0 .4l1.8 1.8c.2.2.4.2.6 0l1.8-1.8z"/></svg>`;

export function initStatusBar() {
    const sb = ctx.el.sb;
    sb.innerHTML = `<div class="sb-l"><span id="sb-time">9:41</span></div>
        <div class="sb-r"><span id="sb-sig">${SIGNAL}</span><span id="sb-5g">5G</span><span id="sb-wifi">${WIFI}</span>
        <span class="batt"><i class="body"><b id="sb-lvl"></b></i><i class="cap"></i><em id="sb-pct">100</em></span></div>`;
    const t = sb.querySelector("#sb-time");
    const tick = () => {
        const d = new Date();
        t.textContent = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: false }).replace(/^0/, "");
    };
    tick();
    setInterval(tick, 5000);

    const lvl = sb.querySelector("#sb-lvl");
    const pct = sb.querySelector("#sb-pct");
    const setBatt = (p, charging) => {
        lvl.style.width = `${Math.max(8, p * 100)}%`;
        pct.textContent = Math.round(p * 100);
        lvl.parentNode.parentNode.classList.toggle("low", p <= 0.2);
        lvl.parentNode.parentNode.classList.toggle("chg", !!charging);
    };
    setBatt(1);
    navigator.getBattery?.().then((b) => {
        const u = () => setBatt(b.level, b.charging);
        b.addEventListener("levelchange", u);
        b.addEventListener("chargingchange", u);
        u();
    });

    sys.on("airplane", (a) => {
        sb.querySelector("#sb-sig").style.opacity = a ? 0.35 : 1;
        sb.querySelector("#sb-5g").style.display = a ? "none" : "";
    });
    sys.on("wifi", (w) => (sb.querySelector("#sb-wifi").style.opacity = w ? 1 : 0.35));

    ctx.mod.setStatusTone = (tone) => sb.setAttribute("data-tone", tone); // "light" text or "dark" text
    ctx.mod.setIndicatorTone = (tone) => ctx.el.ind.setAttribute("data-tone", tone);
}
