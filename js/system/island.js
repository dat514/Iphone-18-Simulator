import { ctx } from "../core/ctx.js";
import { Group } from "../core/motion.js";
import { ISLAND } from "../core/metrics.js";
import { $ } from "../core/util.js";

const SIZES = {
    idle: { w: ISLAND.w, h: ISLAND.h, r: ISLAND.h / 2 },
    compact: { w: 196, h: ISLAND.h, r: ISLAND.h / 2 },
    alert: { w: 276, h: 64, r: 32 },
    "x-music": { w: 404, h: 176, r: 46 },
    "x-timer": { w: 404, h: 112, r: 46 },
    "x-call": { w: 404, h: 112, r: 46 },
};
const ICO = {
    timer: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff9f0a" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9.5 2.5h5"/></svg>`,
    call: `<svg width="18" height="18" viewBox="0 0 24 24" fill="#30d158"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.6a1 1 0 0 1-.25 1z"/></svg>`,
    play: `<svg width="30" height="30" viewBox="0 0 24 24" fill="#fff"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>`,
    pause: `<svg width="30" height="30" viewBox="0 0 24 24" fill="#fff"><rect x="6" y="5" width="4.2" height="14" rx="1.4"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.4"/></svg>`,
    next: `<svg width="30" height="30" viewBox="0 0 24 24" fill="#fff"><path d="M5 6.2v11.6a.8.8 0 0 0 1.25.66l8.2-5.8a.8.8 0 0 0 0-1.32l-8.2-5.8A.8.8 0 0 0 5 6.2zM16.5 5.5h2.3v13h-2.3z"/></svg>`,
    prev: `<svg width="30" height="30" viewBox="0 0 24 24" fill="#fff"><path d="M19 6.2v11.6a.8.8 0 0 1-1.25.66l-8.2-5.8a.8.8 0 0 1 0-1.32l8.2-5.8A.8.8 0 0 1 19 6.2zM7.5 5.5H5.2v13h2.3z"/></svg>`,
    bell: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ff453a" stroke-width="2.2" stroke-linecap="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0M3 3l18 18"/></svg>`,
    bellon: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/></svg>`,
};
const WAVE = `<span class="wave"><i></i><i></i><i></i><i></i><i></i></span>`;

export function initIsland() {
    const el = ctx.el.island;
    el.innerHTML = `
        <div class="isl-v" data-v="compact-music"><span class="mini-art"></span>${WAVE}</div>
        <div class="isl-v" data-v="compact-timer">${ICO.timer}<b class="t"></b></div>
        <div class="isl-v" data-v="compact-call">${ICO.call}<b class="t g"></b></div>
        <div class="isl-v" data-v="alert"><span class="ai"></span><span class="at"></span></div>
        <div class="isl-v x" data-v="x-music">
            <div class="xm-top"><span class="art"></span><span class="meta"><b class="xm-title"></b><em class="xm-artist"></em></span>${WAVE}</div>
            <div class="xm-bar"><span class="cur">0:00</span><div class="track"><i></i></div><span class="dur">0:00</span></div>
            <div class="xm-ctl"><button data-a="prev">${ICO.prev}</button><button data-a="toggle" class="pp"></button><button data-a="next">${ICO.next}</button></div>
        </div>
        <div class="isl-v x" data-v="x-timer"><div class="xt"><span class="xt-l">${ICO.timer}<b class="xt-t"></b></span><button class="xt-x" data-a="cancel">Stop</button></div></div>
        <div class="isl-v x" data-v="x-call"><div class="xt"><span class="xt-l"><em class="xc-n"></em><b class="xt-t g"></b></span><button class="xt-x red" data-a="hangup">End</button></div></div>`;

    const g = new Group({ ...SIZES.idle }, { response: 0.46, damping: 0.74 }, (v) => {
        el.style.width = v.w + "px";
        el.style.height = v.h + "px";
        el.style.borderRadius = v.r + "px";
    });
    g.snap(SIZES.idle);

    const act = { music: null, timer: null, call: null };
    let expanded = null;
    let view = "idle";
    let alertTimer = 0;
    let collapseTimer = 0;
    let alertShown = null;
    const order = ["call", "timer", "music"];
    const top = () => order.find((k) => act[k]);

    const fmt = (s) => {
        s = Math.max(0, Math.round(s));
        const m = Math.floor(s / 60);
        return `${Math.floor(m / 60) ? Math.floor(m / 60) + ":" : ""}${String(m % 60).padStart(Math.floor(m / 60) ? 2 : 1, "0")}:${String(s % 60).padStart(2, "0")}`;
    };

    function setView(v) {
        if (v === view) return;
        view = v;
        el.dataset.view = v;
        el.querySelectorAll(".isl-v").forEach((n) => n.classList.toggle("on", n.dataset.v === v));
        const size = SIZES[v] || SIZES.compact;
        g.to({ w: size.w, h: size.h, r: size.r }, { params: v === "idle" || v.startsWith("compact") ? { response: 0.42, damping: 0.8 } : { response: 0.48, damping: 0.72 } });
    }

    function render() {
        let v = "idle";
        if (alertShown) v = "alert";
        else {
            const k = top();
            if (k) v = expanded === k ? "x-" + k : "compact-" + k;
        }
        setView(v);
        const m = act.music;
        el.querySelectorAll(".wave").forEach((w) => w.classList.toggle("on", !!m?.playing));
        if (m) {
            el.querySelector(".xm-title").textContent = m.title || "";
            el.querySelector(".xm-artist").textContent = m.artist || "";
            el.querySelector(".pp").innerHTML = m.playing ? ICO.pause : ICO.play;
            el.querySelectorAll(".mini-art,.art").forEach((a) => (a.style.background = m.art || "linear-gradient(135deg,#fc5c7d,#6a82fb)"));
        }
        ticker();
    }

    let tk = 0;
    function ticker() {
        const need = act.timer || act.call || (expanded === "music" && act.music);
        if (need && !tk) tk = setInterval(updateTimes, 250);
        if (!need && tk) {
            clearInterval(tk);
            tk = 0;
        }
        updateTimes();
    }
    function updateTimes() {
        if (act.timer) {
            const left = Math.max(0, (act.timer.end - Date.now()) / 1000);
            el.querySelector('[data-v="compact-timer"] .t').textContent = fmt(left);
            el.querySelector(".xt-t").textContent = fmt(left);
            if (left <= 0) {
                const done = act.timer;
                ctx.mod.island.update("timer", null);
                done.onDone?.();
                ctx.mod.island.alert(`<span style="font-weight:700">Timer</span> done`, "timer", 3500);
            }
        }
        if (act.call) {
            const s = (Date.now() - act.call.start) / 1000;
            el.querySelector('[data-v="compact-call"] .t').textContent = fmt(s);
            el.querySelector('[data-v="x-call"] .xt-t').textContent = fmt(s);
            el.querySelector(".xc-n").textContent = act.call.name;
        }
        if (act.music && expanded === "music") {
            const p = act.music.getProgress?.() || { cur: 0, dur: 0 };
            el.querySelector(".cur").textContent = fmt(p.cur);
            el.querySelector(".dur").textContent = fmt(p.dur);
            el.querySelector(".track i").style.width = (p.dur ? (p.cur / p.dur) * 100 : 0) + "%";
        }
    }

    const api = (ctx.mod.island = {
        update(kind, data) {
            act[kind] = data;
            if (!data && expanded === kind) expanded = null;
            render();
        },
        expand(kind) {
            expanded = kind || top();
            clearTimeout(collapseTimer);
            render();
            collapseTimer = setTimeout(api.collapse, 9000);
        },
        collapse() {
            expanded = null;
            render();
        },
        alert(html, icon, ms = 2200) {
            alertShown = true;
            el.querySelector(".ai").innerHTML = ICO[icon] || "";
            el.querySelector(".at").innerHTML = html;
            render();
            clearTimeout(alertTimer);
            alertTimer = setTimeout(() => {
                alertShown = null;
                render();
            }, ms);
        },
    });

    el.addEventListener("click", (e) => {
        const b = e.target.closest("[data-a]");
        if (b) {
            const a = b.dataset.a;
            if (a === "toggle") ctx.mod.player?.toggle();
            else if (a === "next") ctx.mod.player?.next();
            else if (a === "prev") ctx.mod.player?.prev();
            else if (a === "cancel") ctx.mod.clock?.cancelTimer();
            else if (a === "hangup") ctx.mod.phone?.hangup();
            e.stopPropagation();
            return;
        }
        if (expanded) api.collapse();
        else if (top()) api.expand();
    });
    ctx.screen.addEventListener("pointerdown", (e) => {
        if (expanded && !e.target.closest("#island")) api.collapse();
    }, true);
    ctx.mod.ICO = ICO;
    render();
}
