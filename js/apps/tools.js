import { registerApp } from "../core/apps.js";
import { h, sys, store, clamp } from "../core/util.js";
import { page, btn, ICO, NavStack, tabBar, cell, group } from "../core/ui.js";
import { ctx } from "../core/ctx.js";
import { sfx } from "../core/audio.js";

/* ============================== Calculator ============================== */
export function initCalculator() {
    registerApp({
        id: "calculator", name: "Calculator", status: "light", bg: "#000",
        build(root) {
            const app = h("div.app.dk.calc");
            root.append(app);
            let cur = "0", prev = null, op = null, fresh = true, hot = null;
            const disp = h("div.cdisp");
            const grid = h("div.cgrid4");
            app.append(disp, grid);
            const fmt = (s) => {
                const n = Number(s);
                if (!isFinite(n)) return "Error";
                if (s.endsWith(".")) return Number(s.slice(0, -1)).toLocaleString("en") + ".";
                const [i, f] = s.split(".");
                return f != null && /^\d+$/.test(f) && Math.abs(n) < 1e15 ? Number(i).toLocaleString("en") + "." + f : Math.abs(n) >= 1e9 || (Math.abs(n) < 1e-6 && n) ? n.toExponential(4) : n.toLocaleString("en", { maximumFractionDigits: 8 });
            };
            const show = () => {
                const t = fmt(cur);
                disp.textContent = t;
                disp.style.fontSize = Math.max(44, 96 - Math.max(0, t.length - 6) * 9) + "px";
                grid.querySelector('[data-k="AC"]').textContent = cur !== "0" || (!fresh && prev == null) ? "C" : "AC";
                grid.querySelectorAll(".op").forEach((b) => b.classList.toggle("hot", b.dataset.k === hot));
            };
            const calc = (a, o, b) => ({ "+": a + b, "−": a - b, "×": a * b, "÷": b === 0 ? NaN : a / b }[o]);
            const press = (k) => {
                if (/\d/.test(k)) {
                    if (fresh) (cur = k), (fresh = false);
                    else if (cur.replace(/[-.]/g, "").length < 9) cur = cur === "0" ? k : cur + k;
                    hot = hot && op ? hot : null;
                } else if (k === ".") {
                    if (fresh) (cur = "0."), (fresh = false);
                    else if (!cur.includes(".")) cur += ".";
                } else if (k === "AC" || k === "C") {
                    if (k === "C") (cur = "0"), (fresh = true);
                    else (cur = "0"), (prev = null), (op = null), (fresh = true), (hot = null);
                } else if (k === "±") cur = String(-Number(cur));
                else if (k === "%") cur = String(Number(cur) / 100);
                else if (k === "=") {
                    if (op && prev != null) cur = String(calc(prev, op, Number(cur)));
                    prev = null; op = null; hot = null; fresh = true;
                } else {
                    if (op && prev != null && !fresh) cur = String(calc(prev, op, Number(cur)));
                    prev = Number(cur); op = k; hot = k; fresh = true;
                }
                show();
            };
            [["AC", "±", "%", "÷"], ["7", "8", "9", "×"], ["4", "5", "6", "−"], ["1", "2", "3", "+"], ["0", ".", "="]].forEach((r) =>
                r.forEach((k) => {
                    const cls = "÷×−+=".includes(k) ? "op" : ["AC", "±", "%"].includes(k) ? "fn" : "num";
                    const b = h("button.cb." + cls + (k === "0" ? ".zero" : ""), { "data-k": k }, k);
                    b.addEventListener("pointerdown", () => { b.classList.add("hit"); sfx.tap(); });
                    ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => b.addEventListener(ev, () => b.classList.remove("hit")));
                    b.addEventListener("click", () => press(k));
                    grid.append(b);
                }));
            show();
        },
    });
}

/* ================================ Clock ================================= */
const CITIES = [["Ho Chi Minh City", "Asia/Ho_Chi_Minh"], ["Cupertino", "America/Los_Angeles"], ["New York", "America/New_York"], ["London", "Europe/London"], ["Tokyo", "Asia/Tokyo"], ["Sydney", "Australia/Sydney"]];
const TI = {
    world: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>`,
    sw: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="13.500" r="8"/><path d="M12 9v4.500l3 1.500M9.500 2.500h5"/></svg>`,
    timer: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 3h12M6 21h12M7 3c0 6 10 6 10 9s-10 3-10 9"/></svg>`,
};
export function initClock() {
    registerApp({
        id: "clock", name: "Clock", status: "light", bg: "#000",
        build(root) {
            const app = h("div.app.dk.clk");
            root.append(app);
            const views = { world: h("div.cv"), sw: h("div.cv"), timer: h("div.cv") };
            Object.values(views).forEach((v) => app.append(v));

            // --- world clock
            const wlist = h("div.wlist");
            views.world.append(h("h1.lt", "World Clock"), wlist);
            const paintWorld = () => {
                const now = new Date();
                const base = -now.getTimezoneOffset();
                wlist.innerHTML = "";
                CITIES.forEach(([n, tz]) => {
                    const t = now.toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit" });
                    const off = new Date(now.toLocaleString("en-US", { timeZone: tz }));
                    const d = Math.round((off - new Date(now.toLocaleString("en-US"))) / 3.6e6);
                    wlist.append(h("div.wrow", [h("div", [h("small", d === 0 ? "Today, +0HRS" : `Today, ${d > 0 ? "+" : ""}${d}HRS`), h("b", n)]), h("span", t)]));
                });
            };

            // --- stopwatch
            let swStart = 0, swAcc = 0, swRun = false, laps = [], raf = 0;
            const swTime = h("div.swt", "00:00.00");
            const swL = h("button.rb.gray", "Lap");
            const swR = h("button.rb.green", "Start");
            const lapEl = h("div.laps");
            views.sw.append(swTime, h("div.rbs", [swL, swR]), lapEl);
            const f = (ms) => `${String(Math.floor(ms / 60000)).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}.${String(Math.floor(ms / 10) % 100).padStart(2, "0")}`;
            const el = () => swAcc + (swRun ? performance.now() - swStart : 0);
            const loop = () => { swTime.textContent = f(el()); if (swRun) raf = requestAnimationFrame(loop); };
            const swPaint = () => {
                swR.textContent = swRun ? "Stop" : "Start"; swR.className = "rb " + (swRun ? "red" : "green");
                swL.textContent = swRun || !swAcc ? "Lap" : "Reset"; swL.classList.toggle("dis", !swRun && !swAcc);
            };
            swR.onclick = () => { if (swRun) { swAcc = el(); swRun = false; } else { swStart = performance.now(); swRun = true; loop(); } swPaint(); loop(); };
            swL.onclick = () => {
                if (swRun) { laps.unshift(el()); } else { swAcc = 0; laps = []; swTime.textContent = f(0); }
                lapEl.innerHTML = laps.map((l, i) => `<div><span>Lap ${laps.length - i}</span><span>${f(l)}</span></div>`).join("");
                swPaint();
            };

            // --- timer
            const wheel = (max) => {
                const w = h("div.wheel");
                w.append(h("i.pad"));
                for (let i = 0; i <= max; i++) w.append(h("div", String(i).padStart(2, "0")));
                w.append(h("i.pad"));
                w.val = () => clamp(Math.round(w.scrollTop / 48), 0, max);
                return w;
            };
            const wm_ = wheel(59), ws_ = wheel(59);
            const tStart = h("button.rb.green", "Start");
            const tCancel = h("button.rb.gray", "Cancel");
            const tRun = h("div.trun", "");
            const tPick = h("div.tpick", [h("div.wh", [wm_, h("small", "min")]), h("div.wh", [ws_, h("small", "sec")])]);
            views.timer.append(tPick, tRun, h("div.rbs", [tCancel, tStart]));
            let tEnd = 0, ticking = 0;
            const showTimer = (on) => { tPick.style.display = on ? "none" : ""; tRun.style.display = on ? "" : "none"; tStart.textContent = on ? "Pause" : "Start"; tStart.className = "rb " + (on ? "orange" : "green"); };
            const tick = () => { const left = Math.max(0, tEnd - Date.now()); tRun.textContent = `${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, "0")}`; };
            const api = (ctx.mod.clock = {
                cancelTimer() { clearInterval(ticking); tEnd = 0; ctx.mod.island.update("timer", null); showTimer(false); },
            });
            tStart.onclick = () => {
                if (tEnd) return api.cancelTimer();
                const secs = wm_.val() * 60 + ws_.val();
                if (!secs) return;
                tEnd = Date.now() + secs * 1000;
                showTimer(true); tick(); ticking = setInterval(tick, 250);
                ctx.mod.island.update("timer", { end: tEnd, onDone: () => { api.cancelTimer(); [0, 1, 2].forEach((i) => setTimeout(() => sfx.notif(), i * 900)); } });
            };
            tCancel.onclick = api.cancelTimer;
            showTimer(false);
            setTimeout(() => { wm_.scrollTop = 48 * 5; }, 50);

            // --- tabs
            let curTab = "world", timer0 = 0;
            const show = (id) => {
                Object.entries(views).forEach(([k, v]) => v.classList.toggle("on", k === id));
                curTab = id;
                if (id === "world") { paintWorld(); clearInterval(timer0); timer0 = setInterval(paintWorld, 1000); } else clearInterval(timer0);
            };
            const tabs = tabBar([{ id: "world", icon: TI.world, label: "World Clock" }, { id: "sw", icon: TI.sw, label: "Stopwatch" }, { id: "timer", icon: TI.timer, label: "Timer" }], "world", show);
            app.append(tabs);
            show("world");
            swPaint();
        },
        onOpen() { },
    });
}

/* ================================ Notes ================================= */
export function initNotes() {
    registerApp({
        id: "notes", name: "Notes", status: "auto",
        build(root) {
            const app = h("div.app.notes");
            root.append(app);
            const nav = new NavStack(app);
            let notes = store.get("notes", [{ id: 1, text: "Welcome\nThis is a working Notes app. Tap the compose button, type with the on-screen keyboard (or your own).", t: Date.now() }]);
            const save = () => store.set("notes", notes);
            const list = page({ title: "Notes", right: btn(ICO.compose, () => edit({ id: Date.now(), text: "", t: Date.now(), isNew: true }), "circle") });
            const body = h("div.grp");
            list.scroll.append(body);
            const paint = () => {
                body.innerHTML = "";
                if (!notes.length) body.append(h("p.empty2", "No Notes"));
                notes.sort((a, b) => b.t - a.t).forEach((n) => {
                    const [title, ...rest] = n.text.split("\n");
                    body.append(h("div.cell.tap.note", { on: { click: () => edit(n) } }, h("span.ct", { html: `<b>${title.trim() || "New Note"}</b><em>${new Date(n.t).toLocaleDateString("en", { month: "short", day: "numeric" })}  ${rest.join(" ").trim().slice(0, 40) || "No additional text"}</em>` })));
                });
            };
            const edit = (n) => {
                const ta = h("textarea.nta", { "data-kb": "", inputmode: "none", placeholder: "Start typing…" });
                ta.value = n.text;
                const del = btn(ICO.trash, () => { notes = notes.filter((x) => x.id !== n.id); save(); paint(); nav.pop(); }, "circle");
                const p = page({ title: "", back: { onClick: () => { n.text = ta.value; n.t = Date.now(); if (n.isNew) { delete n.isNew; if (n.text.trim()) notes.push(n); } if (!n.text.trim()) notes = notes.filter((x) => x.id !== n.id); save(); paint(); ctx.mod.kb.hide(); nav.pop(); } }, right: del, large: false });
                p.scroll.append(ta);
                nav.push(p.el);
                if (n.isNew) setTimeout(() => ta.focus(), 450);
            };
            paint();
            nav.push(list.el);
            list.el.classList.remove("pushed");
        },
    });
}
