import { registerApp } from "../core/apps.js";
import { h, sys, clamp, store } from "../core/util.js";
import { page, btn, ICO, NavStack, tabBar, cell, group } from "../core/ui.js";
import { ctx } from "../core/ctx.js";
import { registerGlass } from "../glass.js";
import { sfx } from "../core/audio.js";

/* =============================== Messages =============================== */
const CONVOS = [
    { id: "bot", name: "Dat514", g: "linear-gradient(135deg,#7b5cff,#ff4fa3)", msgs: [{ them: 1, text: "Hey! Welcome to the iPhone 18 Pro Max simulator." }, { them: 1, text: "Try the app switcher: swipe up from the bottom edge and hold." }] },
    { id: "mom", name: "Mom", g: "linear-gradient(135deg,#ff9f0a,#ff453a)", msgs: [{ them: 1, text: "Don't forget dinner tonight!" }] },
    { id: "team", name: "Liquid Glass Team", g: "linear-gradient(135deg,#00c2a8,#0a84ff)", msgs: [{ them: 1, text: "Refraction looks great on the new build." }] },
];
const REPLIES = [
    [/hi|hello|hey|xin chào/i, "Hello! Nice to meet you."],
    [/glass|liquid/i, "Liquid Glass bends the content behind it — try dragging the dock lens on the web version."],
    [/time|giờ/i, () => `It's ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`],
    [/iphone|18/i, "iPhone 18 Pro Max: 6.9\", 2868×1320, smaller Dynamic Island, iOS 27."],
    [/thanks|thank|cảm ơn/i, "Anytime!"],
];
export function initMessages() {
    registerApp({
        id: "messages", name: "Messages", status: "auto",
        build(root, api) {
            const app = h("div.app.msgs");
            root.append(app);
            const nav = new NavStack(app);
            const data = store.get("convos", null) || JSON.parse(JSON.stringify(CONVOS));
            const save = () => store.set("convos", data);
            const list = page({ title: "Messages", right: btn(ICO.compose, () => {}, "circle") });
            const grp = h("div.grp");
            list.scroll.append(grp);
            const paint = () => {
                grp.innerHTML = "";
                data.forEach((c) => {
                    const last = c.msgs[c.msgs.length - 1];
                    grp.append(h("div.cell.tap.conv", { on: { click: () => thread(c) } }, [h("span.av", { style: { background: c.g } }, c.name[0]), h("span.ct", { html: `<b>${c.name}</b><em>${last ? last.text.slice(0, 44) : ""}</em>` }), h("span.det", "now")]));
                });
            };
            function thread(c) {
                const p = page({ title: c.name, back: { onClick: () => { ctx.mod.kb.hide(); nav.pop(); paint(); } }, large: false });
                const flow = h("div.flow");
                p.scroll.append(flow);
                p.scroll.style.padding = "104px 14px 150px";
                const input = h("input", { "data-kb": "", inputmode: "none", placeholder: "iMessage", autocomplete: "off" });
                const send = h("button.send", { html: ICO.up });
                const bar = h("div.mbar", [h("div.minput", { "data-glass": "", "data-glass-lite": "", "data-glass-static": "", "data-glass-bezel": "22" }, [input, send])]);
                p.el.append(bar);
                requestAnimationFrame(() => registerGlass(bar.firstChild));
                const toEnd = () => p.scroll.scrollTo({ top: 1e5, behavior: "smooth" });
                const add = (m, animate) => {
                    const b = h("div.bub" + (m.them ? ".them" : ".me"), m.text);
                    if (animate) b.classList.add("in");
                    flow.append(b);
                    toEnd();
                    return b;
                };
                c.msgs.forEach((m) => add(m));
                const reply = (text) => {
                    const typing = h("div.bub.them.typing.in", [h("i"), h("i"), h("i")]);
                    flow.append(typing); toEnd();
                    const hit = REPLIES.find(([re]) => re.test(text));
                    const out = hit ? (typeof hit[1] === "function" ? hit[1]() : hit[1]) : ["Got it.", "Interesting!", "Tell me more.", "Haha, nice."][Math.floor(Math.random() * 4)];
                    setTimeout(() => { typing.remove(); const m = { them: 1, text: out }; c.msgs.push(m); save(); add(m, true); sfx.tap(); }, 900 + Math.random() * 600);
                };
                const doSend = () => {
                    const t = input.value.trim();
                    if (!t) return;
                    input.value = "";
                    const m = { me: 1, text: t };
                    c.msgs.push(m); save(); add(m, true); sfx.tap();
                    reply(t);
                };
                send.addEventListener("click", doSend);
                input.addEventListener("keydown", (e) => e.key === "Enter" && doSend());
                input.addEventListener("kb-return", doSend);
                nav.push(p.el);
                requestAnimationFrame(toEnd);
            }
            paint();
            nav.push(list.el);
            list.el.classList.remove("pushed");
        },
    });
}

/* ================================= Phone ================================ */
const KEYS = [["1", ""], ["2", "ABC"], ["3", "DEF"], ["4", "GHI"], ["5", "JKL"], ["6", "MNO"], ["7", "PQRS"], ["8", "TUV"], ["9", "WXYZ"], ["*", ""], ["0", "+"], ["#", ""]];
export function initPhone() {
    registerApp({
        id: "phone", name: "Phone", status: "auto",
        build(root) {
            const app = h("div.app.phone");
            root.append(app);
            let num = "";
            const out = h("div.pnum");
            const grid = h("div.pad3");
            const call = h("button.pcall", { html: `<svg viewBox="0 0 24 24" width="34" height="34" fill="#fff"><path d="M6.600 10.800a15.100 15.100 0 0 0 6.600 6.600l2.200-2.200a1 1 0 0 1 1-.25 11.400 11.400 0 0 0 3.600.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.500a1 1 0 0 1 1 1c0 1.250.2 2.450.57 3.600a1 1 0 0 1-.25 1z"/></svg>` });
            const del = h("button.pdel", { html: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.800" stroke-linejoin="round"><path d="M9 5h11a1.500 1.500 0 0 1 1.500 1.500v11A1.500 1.500 0 0 1 20 19H9l-6-7z"/><path d="M12.500 9.500l5 5M17.500 9.500l-5 5" stroke-linecap="round"/></svg>` });
            KEYS.forEach(([d, l]) => {
                const b = h("button.pk", { html: `<b>${d}</b><small>${l}</small>` });
                b.addEventListener("pointerdown", () => { b.classList.add("hit"); sfx.tap(); });
                ["pointerup", "pointerleave", "pointercancel"].forEach((e) => b.addEventListener(e, () => b.classList.remove("hit")));
                b.addEventListener("click", () => { if (num.length < 15) num += d; paint(); });
                grid.append(b);
            });
            grid.append(h("span"), call, del);
            const paint = () => (out.textContent = num.replace(/(\d{4})(\d{3})(\d{0,4})/, "$1 $2 $3").trim());
            del.addEventListener("click", () => ((num = num.slice(0, -1)), paint()));
            const tabs = tabBar([
                { id: "f", icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 3 2.700 5.600 6.100.9-4.400 4.300 1 6.100L12 17l-5.400 2.900 1-6.100L3.200 9.500l6.100-.9z"/></svg>`, label: "Favorites" },
                { id: "r", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`, label: "Recents" },
                { id: "k", icon: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="6" cy="5" r="2"/><circle cx="12" cy="5" r="2"/><circle cx="18" cy="5" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="18" cy="12" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="12" cy="19" r="2"/><circle cx="18" cy="19" r="2"/></svg>`, label: "Keypad" },
            ], "k", () => tabs.select("k", true));
            app.append(h("div.pwrap", [out, grid]), tabs);

            const scr = h("div.callscr");
            let tm = 0;
            const end = () => { clearInterval(tm); scr.classList.remove("on"); ctx.mod.island.update("call", null); };
            ctx.mod.phone = { hangup: end };
            call.addEventListener("click", () => {
                const name = num || "Unknown";
                scr.innerHTML = `<div class="cav">${name[0]}</div><h2>${name}</h2><p class="cst">calling…</p><div class="cgr">${["mute", "keypad", "speaker", "add call", "FaceTime", "contacts"].map((x) => `<span><i></i>${x}</span>`).join("")}</div><button class="cend"><svg viewBox="0 0 24 24" width="36" height="36" fill="#fff" style="rotate:135deg"><path d="M6.600 10.800a15.100 15.100 0 0 0 6.600 6.600l2.200-2.200a1 1 0 0 1 1-.25 11.400 11.400 0 0 0 3.600.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.500a1 1 0 0 1 1 1c0 1.250.2 2.450.57 3.600a1 1 0 0 1-.25 1z"/></svg></button>`;
                scr.querySelector(".cend").addEventListener("click", end);
                scr.classList.add("on");
                setTimeout(() => {
                    if (!scr.classList.contains("on")) return;
                    const start = Date.now();
                    scr.querySelector(".cst").textContent = "0:00";
                    tm = setInterval(() => { const s = Math.floor((Date.now() - start) / 1000); scr.querySelector(".cst").textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; }, 500);
                    ctx.mod.island.update("call", { name, start });
                }, 1800);
            });
            app.append(scr);
        },
    });
}

/* ================================ Safari ================================ */
const FAV = [["Wikipedia", "https://en.m.wikipedia.org", "#fff", "W"], ["Example", "https://example.com", "#0a84ff", "E"], ["MDN", "https://developer.mozilla.org", "#1c1c1e", "M"], ["Anthropic", "https://www.anthropic.com", "#d97757", "A"], ["GitHub", "https://github.com", "#24292f", "G"], ["OpenStreetMap", "https://www.openstreetmap.org", "#7ebc6f", "O"]];
export function initSafari() {
    registerApp({
        id: "safari", name: "Safari", status: "auto",
        build(root) {
            const app = h("div.app.safari");
            root.append(app);
            const start = h("div.sstart", [h("h1.lt", "Favorites"), h("div.favs", FAV.map(([n, u, c, l]) => h("button.fav", { on: { click: () => go(u) } }, [h("i", { style: { background: c, color: c === "#fff" ? "#000" : "#fff" } }, l), h("span", n)])))]);
            const frame = h("iframe.sframe", { referrerpolicy: "no-referrer", sandbox: "allow-scripts allow-same-origin allow-forms allow-popups" });
            const note = h("div.snote", ["Some sites can’t be shown inside a simulator. ", h("button", { on: { click: () => window.open(cur, "_blank") } }, "Open in browser")]);
            const input = h("input", { "data-kb": "", inputmode: "none", placeholder: "Search or enter website name", autocomplete: "off" });
            const bar = h("div.sbar", { "data-glass": "", "data-glass-lite": "", "data-glass-static": "", "data-glass-bezel": "28" }, [h("span", { html: ICO.search }), input]);
            app.append(start, frame, note, bar);
            requestAnimationFrame(() => registerGlass(bar));
            let cur = "";
            function go(raw) {
                let u = raw.trim();
                if (!u) return;
                if (!/^https?:\/\//.test(u)) u = /\.[a-z]{2,}/i.test(u) && !/\s/.test(u) ? "https://" + u : "https://en.m.wikipedia.org/w/index.php?search=" + encodeURIComponent(u);
                cur = u;
                input.value = u.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
                frame.src = u;
                app.classList.add("browsing");
                ctx.mod.kb.hide();
            }
            input.addEventListener("keydown", (e) => e.key === "Enter" && go(input.value));
            input.addEventListener("kb-return", () => go(input.value));
            input.addEventListener("focus", () => { input.select(); });
            bar.addEventListener("dblclick", () => { app.classList.remove("browsing"); frame.src = "about:blank"; input.value = ""; });
        },
    });
}
