import { ctx } from "../core/ctx.js";
import { sys, clamp } from "../core/util.js";

/** iOS 26 volume pill on the left edge. */
export function initHud() {
    const hud = ctx.el.hud;
    hud.innerHTML = `<div class="vol" data-glass data-glass-lite data-glass-static data-glass-bezel="14"><b></b><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="#fff"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/></svg></div>`;
    const vol = hud.querySelector(".vol");
    const fill = vol.querySelector("b");
    let timer = 0;
    ctx.mod.showVolume = () => {
        fill.style.height = `${sys.get("volume") * 100}%`;
        hud.classList.add("on");
        clearTimeout(timer);
        timer = setTimeout(() => hud.classList.remove("on"), 1600);
    };
    ctx.mod.bumpVolume = (d) => {
        sys.set("volume", clamp(Math.round((sys.get("volume") + d) * 16) / 16, 0, 1));
        ctx.mod.showVolume();
    };
}
