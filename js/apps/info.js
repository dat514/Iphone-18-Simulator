import { registerApp } from "../core/apps.js";
import { h, sys } from "../core/util.js";
import { page, btn, ICO } from "../core/ui.js";

/* =============================== Calendar =============================== */
const EVENTS = { 0: ["Liquid Glass design review", "10:00"], 2: ["Lunch with team", "12:30"], 5: ["Ship iOS 27 build", "16:00"], 9: ["Dinner", "19:00"] };
export function initCalendar() {
    registerApp({
        id: "calendar", name: "Calendar", status: "auto",
        build(root) {
            const app = h("div.app.cal");
            root.append(app);
            const now = new Date();
            let view = new Date(now.getFullYear(), now.getMonth(), 1);
            let sel = now.getDate();
            const p = page({ title: "", large: false, right: btn(ICO.plus, () => {}, "circle") });
            const head = h("div.chead");
            const dow = h("div.dow", ["S", "M", "T", "W", "T", "F", "S"].map((d) => h("span", d)));
            const grid = h("div.mgrid");
            const ev = h("div.evl");
            p.scroll.style.padding = "96px 16px 40px";
            p.scroll.append(head, dow, grid, ev);
            app.append(p.el);
            const paint = (dir = 0) => {
                head.innerHTML = `<h1>${view.toLocaleDateString("en", { month: "long" })} <small>${view.getFullYear()}</small></h1>`;
                const first = view.getDay(), days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
                grid.innerHTML = "";
                grid.style.animation = "none"; void grid.offsetWidth;
                if (dir) grid.style.animation = `cal${dir > 0 ? "R" : "L"} 0.55s var(--spring-gentle)`;
                for (let i = 0; i < first; i++) grid.append(h("span"));
                for (let d = 1; d <= days; d++) {
                    const today = d === now.getDate() && view.getMonth() === now.getMonth() && view.getFullYear() === now.getFullYear();
                    const b = h("button.day" + (today ? ".today" : "") + (d === sel ? ".sel" : ""), { on: { click: () => { sel = d; paint(); } } }, [h("b", d), EVENTS[d % 10] && d % 3 !== 1 ? h("i") : null]);
                    grid.append(b);
                }
                const e = EVENTS[sel % 10];
                ev.innerHTML = e && sel % 3 !== 1 ? `<div class="evr"><i></i><div><b>${e[0]}</b><small>${e[1]}</small></div></div>` : `<p class="noev">No Events</p>`;
            };
            const nav = (d) => { view = new Date(view.getFullYear(), view.getMonth() + d, 1); paint(d); };
            p.bar.firstChild.replaceWith(h("div.cnav", [btn(ICO.back, () => nav(-1), "circle"), btn(ICO.back.replace("M15 5l-7 7 7 7", "M9 5l7 7-7 7"), () => nav(1), "circle")]));
            paint();
        },
    });
}

/* ================================ Weather =============================== */
const HOURS = ["Now", "15", "16", "17", "18", "19", "20", "21"];
const DAYS = [["Today", 33, 26, "☀"], ["Sat", 32, 26, "⛅"], ["Sun", 31, 25, "🌦"], ["Mon", 30, 25, "🌧"], ["Tue", 32, 26, "⛅"], ["Wed", 33, 26, "☀"], ["Thu", 33, 27, "☀"]];
export function initWeather() {
    registerApp({
        id: "weather", name: "Weather", status: "light", bg: "#1e5bd6",
        build(root) {
            const hr = new Date().getHours();
            const night = hr >= 18 || hr < 6;
            const app = h("div.app.dk.wx" + (night ? ".night" : ""));
            root.append(app);
            app.innerHTML = `<div class="wsky"><i class="sun"></i><i class="cl c1"></i><i class="cl c2"></i><i class="cl c3"></i></div>
            <div class="wscroll"><div class="whead"><h2>Ho Chi Minh City</h2><div class="wbig">${night ? 27 : 31}°</div><p>Mostly Cloudy</p><small>H:33°  L:26°</small></div>
            <div class="wcard"><p class="wh">HOURLY FORECAST</p><div class="hrs">${HOURS.map((x, i) => `<div><small>${x}</small><span>${i % 3 === 2 ? "⛅" : night ? "☾" : "☀"}</span><b>${31 - (i > 4 ? i - 4 : 0)}°</b></div>`).join("")}</div></div>
            <div class="wcard"><p class="wh">7-DAY FORECAST</p>${DAYS.map(([d, hi, lo, ic]) => `<div class="drow"><span>${d}</span><span>${ic}</span><em>${lo}°</em><i><u style="left:${(lo - 24) * 10}%;width:${(hi - lo) * 10}%"></u></i><b>${hi}°</b></div>`).join("")}</div>
            <p class="wnote">Demo data — the simulator is offline.</p></div>`;
        },
    });
}
