import { ctx } from "../core/ctx.js";
import { sys } from "../core/util.js";
import { sfx } from "../core/audio.js";

export function initPower() {
    const off = ctx.el.off;
    const st = { on: true };
    const api = (ctx.mod.power = {
        get on() { return st.on; },
        sleep() {
            if (!st.on) return;
            st.on = false;
            sfx.lock();
            ctx.mod.kb?.hide();
            ctx.mod.cc?.close(true);
            ctx.mod.spot?.close(true);
            ctx.mod.lock.lock();
            off.classList.add("on");
            ctx.mod.island?.collapse();
        },
        wake() {
            if (st.on) return;
            st.on = true;
            off.classList.remove("on");
            ctx.mod.lock.wake();
        },
        toggle() { st.on ? api.sleep() : api.wake(); },
    });

    const press = (name) => {
        switch (name) {
            case "power": api.toggle(); break;
            case "volup": api.on && ctx.mod.bumpVolume(+1 / 16); break;
            case "voldown": api.on && ctx.mod.bumpVolume(-1 / 16); break;
            case "action": {
                if (!api.on) return api.wake();
                const s = !sys.get("silent");
                sys.set("silent", s);
                ctx.mod.island.alert(s ? "Silent" : "Ring", s ? "bell" : "bellon", 1800);
                navigator.vibrate?.(s ? [30, 40, 30] : 30);
                break;
            }
            case "camctl":
                if (!api.on) api.wake();
                if (ctx.mod.lock.shown) ctx.mod.lock.hide(true);
                setTimeout(() => ctx.mod.wm.open("camera", { x: 392, y: 640, w: 40, h: 40 }), 80);
                break;
        }
    };
    ctx.phone.querySelectorAll("[data-hw]").forEach((b) => b.addEventListener("click", () => press(b.dataset.hw)));
    // tapping the dark screen wakes it too (double tap on real iPhones)
    off.addEventListener("click", () => api.wake());
    addEventListener("keydown", (e) => {
        if (e.target.closest?.("input,textarea,[contenteditable]")) return;
        if (e.key === "Escape") ctx.mod.wm.goHome?.();
        if (e.key === "l" && e.ctrlKey) { e.preventDefault(); api.toggle(); }
    });
}
