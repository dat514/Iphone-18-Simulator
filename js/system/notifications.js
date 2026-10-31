import { ctx } from "../core/ctx.js";
import { Group } from "../core/motion.js";
import { h, sys, Velocity } from "../core/util.js";
import { APPS, iconHTML } from "../core/apps.js";
import { registerGlass } from "../glass.js";
import { sfx, buzz } from "../core/audio.js";

export function initNotifications() {
    const list = [];
    let lockBox = null;
    const host = ctx.el.banners;

    const item = (n) => {
        const app = APPS[n.app];
        return h("div.notif", { "data-glass": "", "data-glass-lite": "", "data-glass-static": "", "data-glass-bezel": "22" },
            h("span.ni", { html: iconHTML(n.app, app.name) }),
            h("span.nt", { html: `<strong>${n.title}</strong><em>${n.body}</em>` }),
            h("time", "now"));
    };

    function renderLock() {
        if (!lockBox) return;
        lockBox.innerHTML = "";
        list.slice(0, 4).forEach((n, i) => {
            const el = item(n);
            el.style.setProperty("--i", i);
            el.addEventListener("click", () => open(n));
            lockBox.append(el);
            registerGlass(el);
        });
    }
    function open(n) {
        if (ctx.mod.lock.shown) ctx.mod.lock.hide(true);
        ctx.mod.wm.open(n.app);
    }

    function banner(n) {
        const el = item(n);
        el.classList.add("banner");
        const g = new Group({ y: -130, s: 0.82 }, { response: 0.5, damping: 0.74 }, (v) => (el.style.transform = `translate3d(0,${v.y}px,0) scale(${v.s})`));
        g.snap({ y: -130, s: 0.82 });
        host.append(el);
        registerGlass(el);
        g.to({ y: 0, s: 1 });
        let gone = false;
        const dismiss = () => {
            if (gone) return;
            gone = true;
            g.to({ y: -140, s: 0.88 }, { params: { response: 0.4, damping: 1 }, done: () => el.remove() });
        };
        const t = setTimeout(dismiss, 4600);
        const vel = new Velocity();
        let sy = null;
        el.addEventListener("pointerdown", (e) => {
            clearTimeout(t);
            sy = ctx.pt(e).y;
            vel.reset();
            try { el.setPointerCapture(e.pointerId); } catch {};
        });
        el.addEventListener("pointermove", (e) => {
            if (sy == null) return;
            const y = ctx.pt(e).y;
            vel.push(0, y);
            g.drive({ y: Math.min(8, y - sy), s: 1 });
        });
        el.addEventListener("pointerup", (e) => {
            if (sy == null) return;
            const moved = ctx.pt(e).y - sy;
            sy = null;
            if (Math.abs(moved) < 6) {
                dismiss();
                open(n);
            } else if (moved < -20 || vel.get().y < -300) dismiss();
            else g.to({ y: 0, s: 1 });
        });
    }

    ctx.mod.notif = {
        bindLock(box) {
            lockBox = box;
            renderLock();
        },
        post(n) {
            list.unshift(n);
            renderLock();
            if (!ctx.mod.power.on) {
                ctx.mod.power.wake();
                return;
            }
            sfx.notif();
            buzz([20, 30, 20]);
            if (!ctx.mod.lock.shown) banner(n);
        },
        clear() {
            list.length = 0;
            renderLock();
        },
    };
    ctx.mod.lockBindNotifs?.(ctx.mod.notif);
    // welcome notifications waiting on the lock screen
    list.push({ app: "messages", title: "Dat514", body: "Welcome to the iPhone 18 Pro Max simulator. Swipe up to open." });
    list.push({ app: "calendar", title: "Calendar", body: "Liquid Glass design review — today" });
    renderLock();
}
