import { ctx } from "../core/ctx.js";
import { W, H } from "../core/metrics.js";
import { Velocity } from "../core/util.js";

/**
 * One arbiter for the system edge gestures (home indicator, Control Center, notification pull-down).
 * Everything else is left to the component under the finger.
 */
export function initGestures() {
    const screen = ctx.screen;
    const vel = new Velocity();
    let g = null;

    screen.addEventListener("pointerdown", (e) => {
        if (!ctx.mod.power.on || g) return;
        if (e.target.closest("#island, .kb-keys")) return;
        const p = ctx.pt(e);
        const wm = ctx.mod.wm;
        const lock = ctx.mod.lock;
        const cc = ctx.mod.cc;
        let type = null;
        if (p.y > H - 36) type = "bottom";
        else if (p.y < 46) type = p.x > W * 0.55 ? "cc" : "notif";
        if (!type) return;
        if (type === "notif" && (lock.shown || cc.open || wm.mode === "switcher")) type = null;
        if (type === "cc" && (cc.open || wm.mode === "switcher")) type = null;
        if (!type) return;
        e.stopPropagation();
        e.preventDefault();
        g = { type, x: p.x, y: p.y, id: e.pointerId, axis: null, started: false };
        vel.reset();
        vel.push(p.x, p.y);
        try { screen.setPointerCapture(e.pointerId); } catch {};
    }, true);

    screen.addEventListener("pointermove", (e) => {
        if (!g || e.pointerId !== g.id) return;
        const p = ctx.pt(e);
        vel.push(p.x, p.y);
        const dx = p.x - g.x;
        const dy = p.y - g.y;
        const up = -dy;
        const wm = ctx.mod.wm;
        const lock = ctx.mod.lock;
        const cc = ctx.mod.cc;

        const k = (d) => Math.min(1, Math.max(0, d));
        if (g.type === "cc") {
            if (!g.started && dy > 6) (g.started = true), cc.begin();
            if (g.started) cc.drag(k(dy / (H * 0.42)));
            return;
        }
        if (g.type === "notif") {
            if (!g.started && dy > 6) (g.started = true), lock.peek.start();
            if (g.started) lock.peek.move(dy);
            return;
        }
        // ---- bottom edge: meaning depends on what is on screen ----
        if (cc.open) return void ((g.started = true), cc.drag(1 - k(up / (H * 0.42))));
        if (ctx.mod.spot.open) return void ((g.started = true), ctx.mod.spot.drag(1 - k(up / (H * 0.35))));
        if (lock.shown) {
            g.started = true;
            return lock.dragMove(Math.max(0, up));
        }
        if (wm.mode === "switcher") return void (g.started = true);
        if (g.started && g.axis) {
            if (g.axis === "x") wm.swipeMove(dx);
            else wm.dragMove(dx, Math.max(0, up));
            return;
        }
        if (wm.mode === "app" && !g.axis && Math.hypot(dx, dy) > 8) {
            g.axis = Math.abs(dx) > Math.abs(dy) * 1.4 ? "x" : "y";
            g.started = g.axis === "x" ? wm.swipeStart() : wm.dragStart();
            if (g.started) g.axis === "x" ? wm.swipeMove(dx) : wm.dragMove(dx, Math.max(0, up));
        }
    });

    const end = (e) => {
        if (!g || e.pointerId !== g.id) return;
        const d = g;
        g = null;
        const p = ctx.pt(e);
        const v = vel.get();
        const dx = p.x - d.x;
        const up = d.y - p.y;
        const wm = ctx.mod.wm;
        if (d.type === "cc") return d.started && ctx.mod.cc.release(v.y);
        if (d.type === "notif") return d.started && ctx.mod.lock.peek.end(v.y);
        if (ctx.mod.cc.open) return ctx.mod.cc.release(v.y);
        if (ctx.mod.spot.open) return ctx.mod.spot.release(v.y);
        if (ctx.mod.lock.shown) return d.started && ctx.mod.lock.dragEnd(-v.y);
        if (wm.mode === "switcher") return up > 40 && wm.exitSwitcher(null);
        if (d.started && d.axis) return d.axis === "x" ? wm.swipeEnd(v, dx) : wm.dragEnd(v, dx, Math.max(0, up));
    };
    screen.addEventListener("pointerup", end);
    screen.addEventListener("pointercancel", end);
}
