export const APPS = {};
export const registerApp = (def) => (APPS[def.id] = { status: "dark", bg: "var(--bg)", ...def });

const g = (a, b) => `linear-gradient(180deg, ${a}, ${b})`;
const svg = (inner) => `<svg viewBox="0 0 64 64" width="100%" height="100%">${inner}</svg>`;
const star = (cx, cy, r) => Array.from({ length: 8 }, (_, i) => `<ellipse cx="${cx}" cy="${cy - r / 2}" rx="${r / 3}" ry="${r / 2}" transform="rotate(${i * 45} ${cx} ${cy})"/>`).join("");

/** Original icon artwork (gradients + simple glyphs), styled like iOS 26 layered glass icons. */
export const ICONS = {
    phone: [g("#72e57f", "#1fae3b"), svg(`<path fill="#fff" d="M19.5 14.5c1-1.3 2.9-1.5 4.1-.4l3.1 2.8c1 .9 1.2 2.3.5 3.4l-1.6 2.5c2.1 3.7 5.1 6.7 8.8 8.8l2.5-1.6c1.1-.7 2.5-.5 3.4.5l2.8 3.1c1.1 1.2.9 3.1-.4 4.1-2.2 1.7-5.1 2.4-7.7 1.6C25.4 42.5 17.700 34.800 14.100 22.900c-.8-2.600-.1-5.500 1.600-7.700z" transform="translate(.5 .5) scale(.97)"/>`)],
    messages: [g("#72e57f", "#1fae3b"), svg(`<path fill="#fff" d="M32 13c-11.600 0-21 7.300-21 16.300 0 4.900 2.800 9.300 7.200 12.200-.4 2.600-1.600 5-3.400 6.800 3.400-.2 6.400-1.600 8.700-3.500 2.700.9 5.600 1.400 8.500 1.400 11.600 0 21-7.300 21-16.300S43.600 13 32 13z"/>`)],
    safari: [g("#4cc0ff", "#1166e6"), svg(`<circle cx="32" cy="32" r="22" fill="none" stroke="#fff" stroke-width="2.4" opacity=".9"/><path d="M32 8v6M32 50v6M8 32h6M50 32h6" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><path d="M42.500 21.500 35 35l-13.500 7.500L29 29z" fill="#fff"/><path d="M42.500 21.500 35 35 29 29z" fill="#ff453a"/>`)],
    music: [g("#ff7a90", "#f5213f"), svg(`<path fill="#fff" d="M43 12.500 26 16.200c-1.100.2-1.800 1.100-1.800 2.200v19.100a6.800 6.800 0 1 0 3.600 6V24.800l11.800-2.600v11.700a6.800 6.800 0 1 0 3.600 6V14.700c0-1.500-1.200-2.500-2.200-2.200z" transform="translate(-1 0)"/>`)],
    camera: [g("#c9c9ce", "#6e6e73"), svg(`<path fill="#1c1c1e" d="M22 18l3-4.500h14L42 18h6.500A5.500 5.500 0 0 1 54 23.500v20A5.500 5.500 0 0 1 48.500 49h-33A5.500 5.500 0 0 1 10 43.500v-20A5.500 5.500 0 0 1 15.500 18z"/><circle cx="32" cy="33" r="9.500" fill="#3a3a3f" stroke="#8e8e93" stroke-width="2"/><circle cx="32" cy="33" r="5" fill="#0b0b10"/><circle cx="46" cy="23.500" r="1.700" fill="#ff9f0a"/>`)],
    photos: ["#fff", svg(`<g style="mix-blend-mode:multiply" opacity=".9"><ellipse cx="32" cy="19" rx="8.5" ry="13" fill="#ff9f0a" transform="rotate(0 32 32)"/><ellipse cx="32" cy="19" rx="8.5" ry="13" fill="#ff453a" transform="rotate(45 32 32)"/><ellipse cx="32" cy="19" rx="8.5" ry="13" fill="#ff375f" transform="rotate(90 32 32)"/><ellipse cx="32" cy="19" rx="8.5" ry="13" fill="#bf5af2" transform="rotate(135 32 32)"/><ellipse cx="32" cy="19" rx="8.5" ry="13" fill="#0a84ff" transform="rotate(180 32 32)"/><ellipse cx="32" cy="19" rx="8.5" ry="13" fill="#30d158" transform="rotate(225 32 32)"/><ellipse cx="32" cy="19" rx="8.5" ry="13" fill="#ffd60a" transform="rotate(270 32 32)"/><ellipse cx="32" cy="19" rx="8.5" ry="13" fill="#ff9f0a" transform="rotate(315 32 32)"/></g>`)],
    clock: ["#0b0b0d", svg(`<circle cx="32" cy="32" r="25" fill="#fff"/><g stroke="#1c1c1e" stroke-width="2" stroke-linecap="round">${Array.from({ length: 12 }, (_, i) => `<path d="M32 10v${i % 3 ? 3 : 5}" transform="rotate(${i * 30} 32 32)"/>`).join("")}</g><path d="M32 32V18M32 32l9 5" stroke="#1c1c1e" stroke-width="3.200" stroke-linecap="round"/><path d="M32 32L24 44" stroke="#ff9f0a" stroke-width="1.800" stroke-linecap="round"/><circle cx="32" cy="32" r="2.500" fill="#ff9f0a"/>`)],
    weather: [g("#2f80ff", "#68c3ff"), svg(`<circle cx="24" cy="24" r="9" fill="#ffd60a"/><path d="M24 8v4M10 24H6M12 12l3 3M36 12l-3 3" stroke="#ffd60a" stroke-width="2.600" stroke-linecap="round"/><path fill="#fff" d="M25 44a8 8 0 0 1 1.500-15.800A11 11 0 0 1 47.500 31 7 7 0 0 1 47 44z"/>`)],
    notes: [g("#ffe66b", "#ffc400"), svg(`<rect x="0" y="22" width="64" height="42" fill="#fff"/><g stroke="#e0e0e5" stroke-width="2"><path d="M8 34h48M8 44h48M8 54h30"/></g><rect y="0" width="64" height="22" fill="none"/>`)],
    calculator: [g("#4a4a50", "#1c1c1f"), svg(`<rect x="12" y="12" width="40" height="13" rx="3.500" fill="#2c2c30"/><g fill="#8e8e93"><circle cx="19" cy="35" r="4.500"/><circle cx="32" cy="35" r="4.500"/><circle cx="19" cy="48" r="4.500"/><circle cx="32" cy="48" r="4.500"/></g><g fill="#ff9f0a"><circle cx="45" cy="35" r="4.500"/><circle cx="45" cy="48" r="4.500"/></g>`)],
    settings: [g("#b9bcc4", "#6e7078"), svg(`<g fill="#2a2a2e"><circle cx="32" cy="32" r="15"/>${Array.from({ length: 8 }, (_, i) => `<rect x="28" y="9" width="8" height="12" rx="2.500" transform="rotate(${i * 45} 32 32)"/>`).join("")}</g><circle cx="32" cy="32" r="8.500" fill="#b9bcc4"/><circle cx="32" cy="32" r="4.200" fill="#2a2a2e"/>`)],
    maps: [g("#7be08a", "#3ba7ff"), svg(`<path d="M0 44 64 22v12L0 56z" fill="#fff" opacity=".9"/><path d="M32 12a11 11 0 0 1 11 11c0 9-11 21-11 21S21 32 21 23a11 11 0 0 1 11-11z" fill="#ff453a"/><circle cx="32" cy="23" r="4.200" fill="#fff"/>`)],
    mail: [g("#5cc8ff", "#0a6cff"), svg(`<rect x="10" y="17" width="44" height="31" rx="5" fill="#fff"/><path d="M12 21l20 14 20-14" fill="none" stroke="#0a6cff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`)],
    appstore: [g("#4dc6ff", "#0a6cff"), svg(`<g stroke="#fff" stroke-width="5" stroke-linecap="round"><path d="M32 13 21 33M32 13l11 20M17 41h30M23 30l8 11"/></g>`)],
    wallet: ["#0b0b0d", svg(`<rect x="10" y="17" width="44" height="9" rx="3" fill="#ff453a"/><rect x="10" y="24" width="44" height="9" rx="3" fill="#ffd60a"/><rect x="10" y="31" width="44" height="9" rx="3" fill="#30d158"/><rect x="10" y="38" width="44" height="12" rx="4" fill="#0a84ff"/>`)],
    health: ["#fff", svg(`<path d="M32 50C14 38 10 28 10 22a10.500 10.500 0 0 1 22-4 10.500 10.500 0 0 1 22 4c0 6-4 16-22 28z" fill="#ff2d55"/>`)],
    files: [g("#5cc8ff", "#0a6cff"), svg(`<path d="M10 20a4 4 0 0 1 4-4h12l5 5h19a4 4 0 0 1 4 4v22a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4z" fill="#fff"/>`)],
    tv: ["#0b0b0d", svg(`<text x="32" y="40" text-anchor="middle" font-family="Inter,sans-serif" font-weight="700" font-size="22" fill="#fff">tv</text>`)],
    stocks: ["#0b0b0d", svg(`<path d="M8 44l12-12 9 8 14-18 13 10" fill="none" stroke="#30d158" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`)],
    translate: [g("#5cc8ff", "#0a6cff"), svg(`<text x="22" y="34" text-anchor="middle" font-family="Inter,sans-serif" font-weight="700" font-size="22" fill="#fff">A</text><text x="42" y="48" text-anchor="middle" font-family="Inter,sans-serif" font-weight="700" font-size="18" fill="#fff" opacity=".85">文</text>`)],
    home: [g("#ffb340", "#ff8a00"), svg(`<path d="M32 12 10 32h6v18h12V38h8v12h12V32h6z" fill="#fff"/>`)],
    podcasts: [g("#c07bff", "#7a2cf0"), svg(`<circle cx="32" cy="27" r="6" fill="#fff"/><path d="M32 36v14" stroke="#fff" stroke-width="5" stroke-linecap="round"/><path d="M20 27a12 12 0 0 1 24 0M14 27a18 18 0 0 1 36 0" fill="none" stroke="#fff" stroke-width="3.500" stroke-linecap="round"/>`)],
    reminders: ["#fff", svg(`<g fill="none" stroke="#ff9f0a" stroke-width="3.500"><circle cx="16" cy="20" r="4.500" stroke="#0a84ff"/><circle cx="16" cy="32" r="4.500" stroke="#ff9f0a"/><circle cx="16" cy="44" r="4.500" stroke="#ff453a"/></g><g stroke="#c7c7cc" stroke-width="3" stroke-linecap="round"><path d="M28 20h24M28 32h24M28 44h24"/></g>`)],
    compass: ["#0b0b0d", svg(`<circle cx="32" cy="32" r="22" fill="none" stroke="#fff" stroke-width="2.500"/><path d="M32 14 38 32H26z" fill="#ff453a"/><path d="M32 50 26 32h12z" fill="#fff"/>`)],
};

export function iconHTML(id, name) {
    if (id === "calendar") {
        const d = new Date();
        return `<div class="icon cal"><span class="cd">${d.toLocaleDateString("en", { weekday: "short" }).toUpperCase()}</span><b>${d.getDate()}</b></div>`;
    }
    const [bg, art] = ICONS[id] || ICONS.compass;
    return `<div class="icon" style="background:${bg}">${art}</div>`;
}
