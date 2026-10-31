import { sys } from "./util.js";

let ac = null;
/** Tiny synthesized UI sounds (no assets). */
export function tone(freq = 880, dur = 0.08, vol = 0.05, type = "sine", slide = 0) {
    if (sys.get("silent") || !sys.get("sounds")) return;
    try {
        ac ||= new (window.AudioContext || window.webkitAudioContext)();
        const t = ac.currentTime;
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq, t);
        if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
        g.gain.setValueAtTime(vol * sys.get("volume"), t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g).connect(ac.destination);
        o.start(t);
        o.stop(t + dur + 0.02);
    } catch {}
}
export const sfx = {
    key: () => tone(1800, 0.025, 0.04, "square"),
    lock: () => tone(220, 0.09, 0.12, "triangle", 0.6),
    unlock: () => tone(520, 0.1, 0.1, "triangle", 1.5),
    notif: () => [880, 1175, 1568].forEach((f, i) => setTimeout(() => tone(f, 0.18, 0.08, "sine"), i * 110)),
    tap: () => tone(1200, 0.02, 0.03, "sine"),
};
export const buzz = (ms = 8) => navigator.vibrate?.(ms);
