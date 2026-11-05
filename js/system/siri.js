import { h, sys } from "../core/util.js";
import { ctx } from "../core/ctx.js";
import { APPS } from "../core/apps.js";
import { locale, LOC } from "../core/i18n.js";
import { registerGlass } from "../glass.js";

const T = (s) => { const [vi, en] = s.split("|"); return locale === "vi" ? vi : en || vi; };
const norm = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase().trim();

/** Parser ý định cục bộ (Việt + Anh). Trả về câu trả lời; tác dụng phụ chạy ngay. */
export function parse(raw) {
    const q = norm(raw);
    const on = /\b(bat|turn on|enable)\b/.test(q) ? true : /\b(tat|turn off|disable)\b/.test(q) ? false : null;
    const sw = (key, name) => { const v = on === null ? !sys.get(key) : on; sys.set(key, v); return T(`Đã ${v ? "bật" : "tắt"} ${name}.|${name} is ${v ? "on" : "off"}.`); };
    let m = q.match(/^(?:mo|open|launch|chay)\s+(?:ung dung\s+|app\s+)?(.+)$/);
    if (m) {
        const want = m[1].replace(/^app\s+/, "");
        const hit = Object.entries(APPS).find(([id, a]) => id === want || norm(a.name) === want) || Object.entries(APPS).find(([id, a]) => norm(a.name).includes(want));
        if (hit) { setTimeout(() => ctx.mod.wm.open(hit[0]), 450); return T(`Đang mở ${hit[1].name}.|Opening ${hit[1].name}.`); }
        return T(`Mình không tìm thấy “${m[1]}”.|I couldn't find “${m[1]}”.`);
    }
    if (/den pin|flashlight|torch/.test(q)) return sw("flash", T("đèn pin|the flashlight"));
    if (/che do toi|dark mode/.test(q)) { sys.set("theme", "dark"); return T("Đã chuyển sang chế độ tối.|Dark mode is on."); }
    if (/che do sang|light mode/.test(q)) { sys.set("theme", "light"); return T("Đã chuyển sang chế độ sáng.|Light mode is on."); }
    if (/wi-?fi/.test(q)) return sw("wifi", "Wi-Fi");
    if (/bluetooth/.test(q)) return sw("bt", "Bluetooth");
    if (/may bay|airplane/.test(q)) return sw("airplane", T("chế độ máy bay|Airplane Mode"));
    m = q.match(/(do sang|brightness|am luong|volume)\D*(\d{1,3})/);
    if (m) { const v = Math.min(100, +m[2]) / 100, br = /sang|bright/.test(m[1]); sys.set(br ? "brightness" : "volume", br ? Math.max(0.04, v) : v); return T(`Đã đặt ${br ? "độ sáng" : "âm lượng"} ${m[2]}%.|${br ? "Brightness" : "Volume"} set to ${m[2]}%.`); }
    if (/may gio|what time|\btime\b/.test(q)) return T("Bây giờ là |It's ") + new Date().toLocaleTimeString(LOC, { hour: "2-digit", minute: "2-digit" }) + ".";
    if (/ngay|hom nay|\bdate\b|today/.test(q)) return new Date().toLocaleDateString(LOC, { weekday: "long", day: "numeric", month: "long", year: "numeric" }) + ".";
    if (/phat nhac|play music/.test(q)) { setTimeout(() => ctx.mod.wm.open("music"), 450); return T("Đang mở Nhạc.|Opening Music."); }
    if (/^(tim|search)\b/.test(q)) { setTimeout(() => ctx.mod.wm.open("safari"), 450); return T("Đang tìm trên web.|Searching the web."); }
    return T("Mình chưa hiểu. Thử: “mở Cài đặt”, “bật đèn pin”, “mấy giờ rồi”.|I didn't get that. Try “open Settings”, “turn on the flashlight”, “what time is it”.");
}

export function initSiri() {
    const input = h("input.siri-in", { placeholder: T("Gõ cho Siri|Type to Siri"), "data-kb": "", inputmode: "none" });
    const sq = h("p.sq"), sa = h("p.sa");
    const card = h("div.siri-card", { "data-glass": "", "data-glass-lite": "", "data-glass-bezel": "30" }, [sq, sa, input]);
    const root = h("div.siri", [h("div.siri-bg"), h("div.siri-edge"), h("div.siri-orb", [h("i")]), card]);
    ctx.screen.append(root);
    requestAnimationFrame(() => registerGlass(card));
    let isOpen = false, timer, rec;

    const api = (ctx.mod.siri = {
        get open() { return isOpen; },
        start() {
            if (isOpen) return;
            isOpen = true; root.dataset.style = sys.get("siriStyle"); root.classList.add("on");
            sq.textContent = T("Mình đang nghe…|Listening…"); sa.textContent = ""; input.value = "";
            clearTimeout(timer); timer = setTimeout(api.stop, 8000);
            const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SR) { try { rec = new SR(); rec.lang = locale === "vi" ? "vi-VN" : "en-US"; rec.onresult = (e) => api.ask(e.results[0][0].transcript); rec.onerror = () => {}; rec.start(); } catch {} }
        },
        ask(text) {
            if (!isOpen) api.start();
            sq.textContent = text; sa.textContent = parse(text);
            clearTimeout(timer); timer = setTimeout(api.stop, 6000);
        },
        stop() {
            if (!isOpen) return;
            isOpen = false; root.classList.remove("on"); clearTimeout(timer);
            try { rec?.abort(); } catch {}
        },
    });
    input.addEventListener("keydown", (e) => { if (e.key === "Enter" && input.value.trim()) { api.ask(input.value); input.value = ""; } e.stopPropagation(); });
    root.querySelector(".siri-bg").addEventListener("pointerdown", api.stop);
    addEventListener("keydown", (e) => {
        if (e.key === "Escape") api.stop();
        else if (e.key.toLowerCase() === "s" && !e.ctrlKey && !e.metaKey && !e.target.closest?.("input,textarea")) api.start();
    });
    // giữ nút Side ~0.7s để gọi Siri
    const pw = ctx.phone.querySelector('[data-hw="power"]');
    if (pw) {
        let ht, held = false;
        pw.addEventListener("pointerdown", () => { held = false; ht = setTimeout(() => { held = true; api.start(); }, 700); });
        ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => pw.addEventListener(ev, () => clearTimeout(ht)));
        pw.addEventListener("click", (e) => { if (held) { e.stopImmediatePropagation(); held = false; } }, true);
    }
}
