import { registerApp, APPS, iconHTML } from "../core/apps.js";
import { h } from "../core/util.js";

const NAMES = {
    phone: "Phone", messages: "Messages", safari: "Safari", music: "Music", camera: "Camera", photos: "Photos", clock: "Clock", calendar: "Calendar",
    notes: "Notes", calculator: "Calculator", settings: "Settings", weather: "Weather", maps: "Maps", mail: "Mail", appstore: "App Store", wallet: "Wallet",
    health: "Health", files: "Files", stocks: "Stocks", tv: "TV", translate: "Translate", home: "Home", podcasts: "Podcasts", reminders: "Reminders", compass: "Compass",
};

/** Registers every real app module, then fills the rest with a generic "not in this simulator" app. */
export async function registerAllApps(mods) {
    for (const m of mods) m();
    for (const [id, name] of Object.entries(NAMES)) {
        if (APPS[id]) continue;
        registerApp({
            id, name, placeholder: true, status: "auto",
            get icon() { return iconHTML(id, name); },
            build(root) {
                root.append(h("div.ph", { html: `<span class="mini big">${iconHTML(id, name)}</span><h2>${name}</h2><p>This app isn’t part of the simulator yet.<br>Swipe up from the bottom edge to go home.</p>` }));
            },
        });
    }
    // real apps need their icon markup for the switcher / spotlight labels
    for (const [id, a] of Object.entries(APPS)) if (!("icon" in a)) Object.defineProperty(a, "icon", { get: () => iconHTML(id, a.name) });
}
export const NAME_LIST = NAMES;
