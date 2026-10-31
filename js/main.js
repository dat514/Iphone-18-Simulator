import { sys } from "./core/util.js";
import { ctx } from "./core/ctx.js";
import { initGlass } from "./glass.js";
import { buildDevice } from "./system/device.js";
import { initStatusBar } from "./system/statusbar.js";
import { initHud } from "./system/hud.js";
import { initHome } from "./system/home.js";
import { wm, initWM } from "./system/wm.js";
import { initLock } from "./system/lock.js";
import { initNotifications } from "./system/notifications.js";
import { initIsland } from "./system/island.js";
import { initControl } from "./system/control.js";
import { initSpotlight } from "./system/spotlight.js";
import { initKeyboard } from "./system/keyboard.js";
import { initGestures } from "./system/gestures.js";
import { initPower } from "./system/power.js";
import { registerAllApps } from "./apps/index.js";
import { APP_INITS } from "./apps/all.js";

sys.init({
    theme: "light", color: "black", brightness: 1, volume: 0.5, glass: 0.35, wallpaper: "aurora", customWallpaper: null,
    airplane: false, wifi: true, bt: true, cellular: true, focus: false, rotlock: false, silent: false, flash: false,
    lowpower: false, sounds: true, compactClock: false,
});
sys.set("flash", false, false);

async function boot() {
    buildDevice();
    ctx.mod.wm = wm;
    initStatusBar();
    initHud();
    await registerAllApps(APP_INITS);
    initHome();
    initWM();
    initIsland();
    initNotifications();
    initLock();
    initControl();
    initSpotlight();
    initKeyboard();
    initPower();
    initGestures();
    ctx.mod.canHome = () => wm.mode === "home" && !ctx.mod.lock.shown && !ctx.mod.cc.open && !ctx.mod.spot.open && ctx.mod.power.on;
    initGlass();
    ctx.mod.setStatusTone("light");
    ctx.mod.setIndicatorTone("light");

    // first unlock => a message arrives a few seconds later
    const hide = ctx.mod.lock.hide;
    let once = false;
    ctx.mod.lock.hide = (...a) => {
        hide.apply(ctx.mod.lock, a);
        if (!once) {
            once = true;
            setTimeout(() => ctx.mod.notif.post({ app: "messages", title: "Dat514", body: "Try swiping up from the bottom edge while an app is open." }), 7000);
        }
    };
    window.__ios = ctx; // handy for debugging in DevTools
}
boot();
