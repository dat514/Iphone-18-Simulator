import { ctx } from "../core/ctx.js";
import { Group } from "../core/motion.js";
import { W, H } from "../core/metrics.js";
import { clamp, h, sys, sleep } from "../core/util.js";
import { wallpaperCSS } from "../core/wallpapers.js";
import { registerGlass, getGlass } from "../glass.js";
import { sfx, buzz } from "../core/audio.js";

const LOCK_SVG = `<svg viewBox="0 0 24 30" width="22" height="27"><path class="shackle" d="M6.500 13V9.500a5.500 5.500 0 0 1 11 0V13" fill="none" stroke="#fff" stroke-width="2.600" stroke-linecap="round"/><rect x="3.500" y="12.500" width="17" height="14" rx="4" fill="#fff"/></svg>`;
const FLASH = `<svg viewBox="0 0 24 24" width="22" height="22" fill="#fff"><path d="M8 2h8v4.500l-1.700 3.200V22H9.700V9.700L8 6.500z"/></svg>`;
const CAM = `<svg viewBox="0 0 24 24" width="24" height="24" fill="#fff"><path d="M8.500 5 9.700 3h4.600l1.200 2H19a2.500 2.500 0 0 1 2.500 2.500v10A2.500 2.500 0 0 1 19 20H5a2.500 2.500 0 0 1-2.500-2.500v-10A2.500 2.500 0 0 1 5 5z"/><circle cx="12" cy="12.500" r="4" fill="#3a3a3f"/></svg>`;

export function initLock() {
    const el = ctx.el.lock;
    el.innerHTML = `
        <div class="lwp"></div>
        <div class="lock-c">
            <div class="padlock">${LOCK_SVG}</div>
            <div class="ldate"></div>
            <div class="ltime"></div>
            <div class="lnotifs"></div>
            <button class="lbtn flash" data-glass data-glass-surface="circle" data-glass-bezel="20" data-glass-thickness="40" data-glass-blur="4" data-press-scale="1.12">${FLASH}</button>
            <button class="lbtn cam" data-glass data-glass-surface="circle" data-glass-bezel="20" data-glass-thickness="40" data-glass-blur="4" data-press-scale="1.12">${CAM}</button>
            <div class="lhint">Swipe up to open</div>
        </div>`;
    const lwp = el.querySelector(".lwp");
    const content = el.querySelector(".lock-c");
    const padlock = el.querySelector(".padlock");
    const timeEl = el.querySelector(".ltime");
    const dateEl = el.querySelector(".ldate");
    el.querySelectorAll("[data-glass]").forEach(registerGlass);

    sys.on("wallpaper", () => (lwp.style.background = wallpaperCSS(sys.get("wallpaper"), sys.get("customWallpaper"))));
    sys.on("customWallpaper", () => (lwp.style.background = wallpaperCSS(sys.get("wallpaper"), sys.get("customWallpaper"))), false);
    sys.on("compactClock", (c) => el.classList.toggle("compact", !!c));

    const tick = () => {
        const d = new Date();
        timeEl.textContent = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: false }).replace(/^0/, "");
        dateEl.textContent = d.toLocaleDateString("en", { weekday: "long", day: "numeric", month: "long" });
    };
    tick();
    setInterval(tick, 1000);

    const st = { locked: true, shown: true, faceOk: false, u: 0 };
    const g = new Group({ u: 0 }, { response: 0.5, damping: 0.88 }, (v) => {
        const u = clamp(v.u, 0, 1);
        st.u = v.u;
        el.style.transform = u === 0 ? "" : `translate3d(0,${(-u * H * 0.5).toFixed(1)}px,0)`;
        el.style.opacity = (1 - clamp(u * 1.15, 0, 1)).toFixed(3);
        el.style.visibility = u >= 0.995 ? "hidden" : "";
        ctx.mod.home.setUnlock(u >= 0.995 ? 1 : clamp(u, 0, 1));
        el.style.pointerEvents = u > 0.5 ? "none" : "";
    });

    function faceID() {
        st.faceOk = false;
        padlock.classList.remove("open", "scan");
        void padlock.offsetWidth;
        padlock.classList.add("scan");
        el.classList.remove("ready");
        clearTimeout(st.fid);
        st.fid = setTimeout(() => {
            padlock.classList.remove("scan");
            padlock.classList.add("open");
            st.faceOk = true;
            el.classList.add("ready");
            buzz(12);
        }, 950);
    }

    /* flashlight + camera: press & hold, like iOS */
    const flash = el.querySelector(".flash");
    const cam = el.querySelector(".cam");
    sys.on("flash", (on) => flash.classList.toggle("on", !!on));
    const hold = (btn, fn) => {
        let t = 0;
        btn.addEventListener("pointerdown", () => {
            clearTimeout(t);
            t = setTimeout(() => {
                buzz(20);
                fn();
            }, 380);
        });
        const c = () => clearTimeout(t);
        btn.addEventListener("pointerup", c);
        btn.addEventListener("pointerleave", c);
    };
    hold(flash, () => sys.set("flash", !sys.get("flash"), false));
    hold(cam, () => {
        const r = ctx.rect(cam);
        api.hide(true);
        ctx.mod.wm.open("camera", r);
    });

    const api = (ctx.mod.lock = {
        get locked() { return st.locked; },
        get shown() { return st.u < 0.995; },
        get faceOk() { return st.faceOk; },
        el,
        lock() {
            st.locked = true;
            g.snap({ u: 0 });
            ctx.mod.home.setUnlock(0);
            faceID();
            ctx.mod.cc?.close(true);
            ctx.mod.kb?.hide();
            ctx.mod.spot?.close(true);
        },
        /** screen just woke up */
        wake() {
            if (st.locked) faceID();
            content.classList.remove("wakein");
            void content.offsetWidth;
            content.classList.add("wakein");
        },
        hide(openApp) {
            st.locked = false;
            g.to({ u: 1 }, { params: { response: 0.48, damping: 0.9 } });
            if (!openApp) sfx.unlock();
            ctx.mod.wm.syncTone();
            padlock.classList.add("open");
        },
        show() {
            // pull-down notification centre (already unlocked)
            g.to({ u: 0 }, { params: { response: 0.5, damping: 0.86 } });
            ctx.mod.setStatusTone("light");
            ctx.mod.setIndicatorTone("light");
        },
        peek: {
            start() { el.style.visibility = ""; g.drive({ u: 1 }); },
            move(dy) { g.drive({ u: 1 - clamp(dy / (H * 0.5), 0, 1) }); },
            end(vy) { (vy > 450 || st.u < 0.55) ? api.show() : (g.to({ u: 1 }), ctx.mod.wm.syncTone()); },
        },
        /* swipe up from the bottom edge */
        dragMove(up) {
            if (st.locked && !st.faceOk) {
                g.drive({ u: clamp(up / 900, 0, 0.1) }); // not authenticated yet: resists
                padlock.classList.add("nope");
                return;
            }
            g.drive({ u: clamp(up / (H * 0.5), 0, 1) });
        },
        dragEnd(vy) {
            padlock.classList.remove("nope");
            if (st.locked && !st.faceOk) return g.to({ u: 0 });
            if (st.u > 0.3 || vy > 600) api.hide();
            else g.to({ u: 0 });
        },
    });
    // release resets when fully hidden
    faceID();
    ctx.mod.notif?.bindLock?.(el.querySelector(".lnotifs"));
    ctx.mod.lockBindNotifs = (n) => n.bindLock(el.querySelector(".lnotifs"));
}
