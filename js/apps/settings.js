import { registerApp } from "../core/apps.js";
import { h, sys } from "../core/util.js";
import { page, cell, group, toggle, segmented, slider, NavStack, ICO } from "../core/ui.js";
import { WALLPAPERS } from "../core/wallpapers.js";
import { ctx } from "../core/ctx.js";
import { registerGlass } from "../glass.js";
import { t, locale, LOCALES, setLocale } from "../core/i18n.js";
import { VERSION } from "../version.js";

const ic = (d, f = "none") => `<svg viewBox="0 0 24 24" fill="${f}" stroke="${f === "none" ? "#fff" : "none"}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const I = {
    air: ic(`<path d="M21 16v-2l-8-5V3.500a1.500 1.500 0 0 0-3 0V9l-8 5v2l8-2.500V19l-2 1.500V22l3.500-1 3.500 1v-1.500L13 19v-5.500z"/>`, "#fff"),
    wifi: ic(`<path d="M2 9a15 15 0 0 1 20 0M5.500 12.500a10 10 0 0 1 13 0M9 16a5 5 0 0 1 6 0"/>`),
    bt: ic(`<path d="M7 7l10 10-5 4.500V2.500L17 7 7 17"/>`),
    cell: ic(`<path d="M4 18V14M9 18V10M14 18V6M19 18V2"/>`),
    bell: ic(`<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.700 21a2 2 0 0 1-3.400 0"/>`),
    snd: ic(`<polygon points="3 9 7 9 12 4.500 12 19.500 7 15 3 15"/><path d="M16 8.500a5 5 0 0 1 0 7"/>`),
    moon: ic(`<path d="M20 14.500A8.500 8.500 0 1 1 9.500 4a7 7 0 0 0 10.500 10.500z"/>`),
    gear: ic(`<circle cx="12" cy="12" r="3.500"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.900 4.900l2.100 2.100M17 17l2.100 2.100M4.900 19.100 7 17M17 7l2.100-2.100"/>`),
    sun: ic(`<circle cx="12" cy="12" r="4.200"/><path d="M12 2.500v2.500M12 19v2.500M2.500 12H5M19 12h2.500M5.300 5.300l1.800 1.800M16.900 16.900l1.800 1.800M5.300 18.700l1.800-1.800M16.900 7.100l1.800-1.800"/>`),
    wall: ic(`<rect x="3.500" y="3.500" width="17" height="17" rx="4"/><circle cx="9" cy="9" r="1.800"/><path d="M4 17l5-5 4 4 3-3 4 4"/>`),
    home: ic(`<rect x="4" y="4" width="6.500" height="6.500" rx="1.600"/><rect x="13.500" y="4" width="6.500" height="6.500" rx="1.600"/><rect x="4" y="13.500" width="6.500" height="6.500" rx="1.600"/><rect x="13.500" y="13.500" width="6.500" height="6.500" rx="1.600"/>`),
    phone: ic(`<rect x="7" y="2.500" width="10" height="19" rx="2.600"/><path d="M10.500 5.500h3"/>`),
    sw: ic(`<path d="M4 7h16M4 12h16M4 17h16"/>`),
};

const I2 = {
    upd: ic(`<path d="M12 4v10M8 10l4 4 4-4M5 19h14"/>`),
    acc: ic(`<circle cx="12" cy="5" r="1.800"/><path d="M5 9h14M12 9v6M8.500 21l3.500-6 3.500 6"/>`),
    cam: ic(`<rect x="3" y="7" width="18" height="13" rx="3"/><circle cx="12" cy="13.500" r="3.500"/>`),
    stby: ic(`<rect x="3" y="6" width="18" height="12" rx="3"/><path d="M8 12h3"/>`),
    appr: ic(`<circle cx="12" cy="12" r="8.500"/><path d="M12 3.500a8.500 8.500 0 0 1 0 17z" fill="#fff"/>`),
    siri: ic(`<circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2.500"/>`),
    srch: ic(`<circle cx="11" cy="11" r="6.500"/><path d="M16 16l4.500 4.500"/>`),
    batt: ic(`<rect x="3" y="8" width="16" height="9" rx="2.500"/><path d="M21 11v3"/>`),
    vpn: ic(`<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>`),
    link: ic(`<path d="M10 14a4 4 0 0 0 5.700 0l3-3a4 4 0 0 0-5.700-5.700l-1 1M14 10a4 4 0 0 0-5.700 0l-3 3a4 4 0 0 0 5.700 5.700l1-1"/>`),
    hour: ic(`<path d="M7 3h10M7 21h10M8 3c0 6 8 6 8 12v6M16 3c0 6-8 6-8 12v6"/>`),
    face: ic(`<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M9 10v2M15 10v2M9.500 16c1.500 1 3.500 1 5 0"/>`),
    hand: ic(`<path d="M8 21v-9a1 1 0 0 1 2 0v-4a1 1 0 0 1 2 0v-1a1 1 0 0 1 2 0v1a1 1 0 0 1 2 0v8c0 3-2 5-5 5s-5-1-5-3"/>`),
    game: ic(`<circle cx="9" cy="9" r="4"/><circle cx="15" cy="15" r="4"/>`),
    cloud: ic(`<path d="M7 18a4 4 0 0 1-.5-8A6 6 0 0 1 18 9a4.500 4.500 0 0 1 0 9z"/>`),
    wlt: ic(`<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18"/>`),
    sos: `<b style="font-size:11px;color:#fff">SOS</b>`,
};
const T = (s) => { const [vi, en] = s.split("|"); return locale === "vi" ? vi : en || vi; };
// Nội dung các trang con: [nhãn "vi|en", loại (t=công tắc, d=chi tiết, c=mục con), khoá/giá trị]
const SP = {
    upd: [[["Cập nhật tự động|Automatic Updates", "d", "Bật|On"]], [["iOS 27.0.1", "d", "Có sẵn|Available"]]],
    bt: [[["Bluetooth", "t", "bt"]], [["Thiết bị của tôi|My Devices", "d", "Không có|None"]]],
    cell: [[["Dữ liệu di động|Cellular Data", "t", "cellular"]], [["Chuyển vùng dữ liệu|Data Roaming", "t", "roam"], ["Chế độ dữ liệu thấp|Low Data Mode", "t", "lowdata"]]],
    hot: [[["Cho phép người khác kết nối|Allow Others to Join", "t", "hotspot"]]],
    batt: [[["Chế độ nguồn điện thấp|Low Power Mode", "t", "lowpower"], ["Phần trăm pin|Battery Percentage", "t", "battpct"]], [["Tình trạng pin|Battery Health", "d", "100%"]]],
    vpn: [[["VPN", "t", "vpn"]]],
    acc: [[["AssistiveTouch", "t", "at"], ["Giảm độ trong|Reduce Transparency", "t", "reduceTransp"], ["Giảm chuyển động|Reduce Motion", "t", "reduceMotion"], ["Tăng độ tương phản|Increase Contrast", "t", "hiContrast"]], [["VoiceOver", "d", "Tắt|Off"], ["Thu phóng|Zoom", "d", "Tắt|Off"]]],
    cam: [[["Lưới|Grid", "t", "camGrid"], ["Gương camera trước|Mirror Front Camera", "t", "camMirror"]]],
    stby: [[["Chế độ chờ|StandBy", "t", "standby"], ["Chế độ ban đêm|Night Mode", "t", "standbyNight"]]],
    hs: [[["Huy hiệu thông báo|Notification Badges", "t", "badges"], ["Thư viện ứng dụng|App Library", "d", "Bật|On"]]],
    siri: [[["Lắng nghe “Siri”|Listen for “Siri”", "t", "siriListen"], ["Nhấn nút sườn để dùng Siri|Press Side Button for Siri", "t", "siriSide"]], [["Ngôn ngữ|Language", "d", "Tiếng Việt|English"]]],
    srch: [[["Hiện Gợi ý của Siri|Show Siri Suggestions", "t", "srchSug"], ["Hiện khi tìm kiếm|Show in Search", "t", "srchShow"]]],
    cc: [[["Truy cập trong ứng dụng|Access Within Apps", "t", "ccApps"]]],
    notif: [[["Xem trước|Show Previews", "d", "Khi mở khoá|When Unlocked"], ["Tóm tắt theo lịch|Scheduled Summary", "t", "notifSum"]]],
    focus: [[["Không làm phiền|Do Not Disturb", "t", "dnd"]], [["Ngủ|Sleep", "c"], ["Làm việc|Work", "c"]]],
    sct: [[["Thời gian sử dụng|Screen Time", "t", "sct"]], [["Giới hạn ứng dụng|App Limits", "c"]]],
    fid: [[["Mô phỏng Face ID thất bại|Simulate Face ID Failure", "t", "faceidFail"], ["Mở khoá iPhone|Unlock iPhone", "t", "fidUnlock"], ["Face ID cho App Store|iTunes & App Store", "t", "fidStore"]], [["Đổi mật mã|Change Passcode", "c"]]],
    sos: [[["Gọi bằng nút sườn|Call with Side Button", "t", "sosSide"], ["Phát hiện va chạm|Crash Detection", "t", "sosCrash"]]],
    priv: [[["Dịch vụ định vị|Location Services", "t", "loc"]], [["Theo dõi|Tracking", "c"], ["Camera", "c"], ["Micro|Microphone", "c"]]],
    game: [[["Trạng thái hoạt động|Activity Status", "t", "gcStatus"]]],
    icloud: [[["Sao lưu iCloud|iCloud Backup", "t", "icBackup"], ["Ảnh|Photos", "d", "Tắt|Off"]]],
    wlt: [[["Nhấn đúp nút sườn|Double-Click Side Button", "t", "walletDbl"]]],
    apps: [[["Ứng dụng mặc định|Default Apps", "c"], ["Safari", "c"], ["Tin nhắn|Messages", "c"], ["Điện thoại|Phone", "c"]]],
};

export function initSettings() {
    requestAnimationFrame(() => sys.on("reduceTransp", (v) => ctx.screen.toggleAttribute("data-reduce-transp", !!v)));
    registerApp({
        id: "settings", name: "Settings", status: "auto",
        build(root) {
            const app = h("div.app");
            root.append(app);
            const nav = new NavStack(app);
            const back = { onClick: () => nav.pop() };
            const sub = (title, ...kids) => {
                const p = page({ title, back });
                p.scroll.append(...kids);
                return nav.push(p.el);
            };

            const wifiPage = () => sub(t("Wi-Fi"), group([cell({ title: t("Wi-Fi"), right: (() => { const t = toggle(sys.get("wifi"), (v) => sys.set("wifi", v)); sys.on("wifi", (v) => t.set(v)); return t; })() })]),
                group([cell({ title: "Home Network", detail: "Connected" }), cell({ title: "Guest", chev: true })], "Simulated networks."));

            const aboutPage = () => {
                const row = (a, b) => cell({ title: a, detail: b });
                sub(t("About"),
                    group([row(t("Name"), "iPhone"), row(t("iOS Version"), VERSION.ios), row(t("Simulator Version"), VERSION.simulator), row(t("Model Name"), VERSION.device), row("Model Number", "A3xxx (simulated)")]),
                    group([row("Display", '6.9-inch Super Retina XDR'), row("Resolution", "2868 × 1320 · 460 ppi"), row("Points", "440 × 956 @3x"), row("Chip", "A20 Pro"), row("Memory", "12 GB")]),
                    group([row("Dimensions", "163.4 × 78 × 8.75 mm"), row("Dynamic Island", "16.57 mm"), row("Finish", sys.get("color")[0].toUpperCase() + sys.get("color").slice(1))], "This is a web simulator. Not affiliated with Apple."));
            };

            const displayPage = () => {
                const seg = segmented([["light", t("Light")], ["dark", t("Dark")]], sys.get("theme"), (v) => sys.set("theme", v));
                sys.on("theme", (v) => seg.set(v), false);
                const bright = slider(sys.get("brightness"), (v) => sys.set("brightness", Math.max(0.04, v)), { min: 0.04, max: 1 });
                sub(t("Display & Brightness"),
                    group([cell({ title: t("Appearance"), right: seg })]),
                    group([cell({ icon: I.sun, color: "#0a84ff", title: t("Brightness") }), h("div.pad", bright)]),
                );
            };

            const appearancePage = () => {
                const seg = segmented([["light", t("Light")], ["dark", t("Dark")]], sys.get("theme"), (v) => sys.set("theme", v));
                sys.on("theme", (v) => seg.set(v), false);
                const glass = slider(sys.get("glass"), (v) => sys.set("glass", v));
                const demo = h("div.gdemo", { style: { background: ctx.mod.home.wallpaperEl.style.background } }, h("div.glens", { "data-glass": "", "data-glass-lite": "", "data-glass-static": "", "data-glass-bezel": "30" }, "Liquid Glass"));
                sub(T("Giao diện|Appearance"), group([cell({ title: T("Chế độ|Mode"), right: seg })]),
                    h("div.grpw", [h("p.foot.up", "Liquid Glass"), h("div.grp", [demo, h("div.pad.lbls", [h("span", T("Trong|Clear")), h("span", T("Pha màu|Tinted"))]), h("div.pad", glass)]), h("p.foot", T("Kéo thanh trượt để chọn Liquid Glass trong hay pha màu trên toàn hệ thống. Điểm giữa là mặc định.|Drag the slider to choose how clear or tinted Liquid Glass looks across the system. The middle is the default."))]));
                requestAnimationFrame(() => import("../glass.js").then((g) => g.registerGlass(demo.firstChild)));
            };

            const wallpaperPage = () => {
                const grid = h("div.wgrid");
                const draw = () => {
                    grid.innerHTML = "";
                    WALLPAPERS.forEach((w) => grid.append(h("button.wtile" + (sys.get("wallpaper") === w.id ? ".on" : ""), { style: { background: w.css }, on: { click: () => { sys.set("wallpaper", w.id); draw(); } } }, h("span", w.name))));
                    const f = h("input", { type: "file", accept: "image/*", style: { display: "none" }, on: { change: (e) => { const file = e.target.files[0]; if (!file) return; const r = new FileReader(); r.onload = () => { sys.set("customWallpaper", r.result, false); sys.set("wallpaper", "custom", false); draw(); }; r.readAsDataURL(file); } } });
                    grid.append(h("button.wtile.add", { on: { click: () => f.click() } }, "+ Photo"), f);
                };
                draw();
                sub(t("Wallpaper"), grid, group([cell({ title: "Compact Lock Screen Clock", right: toggle(sys.get("compactClock"), (v) => sys.set("compactClock", v)) })], "New in iOS 27: a smaller clock so more of your wallpaper shows."));
            };

            const colorPage = () => {
                const sw = h("div.cgrid");
                const draw = () => {
                    sw.innerHTML = "";
                    [["black", "#2b2b2f"], ["silver", "#d8d8dd"], ["glacier", "#a7bfd4"], ["burgundy", "#6b2236"]].forEach(([id, c]) => sw.append(h("button.csw" + (sys.get("color") === id ? ".on" : ""), { on: { click: () => (sys.set("color", id), draw()) } }, h("i", { style: { background: c } }), h("span", id[0].toUpperCase() + id.slice(1)))));
                };
                draw();
                sub(t("Device Color"), sw);
            };

            const soundsPage = () => {
                const t = toggle(sys.get("silent"), (v) => sys.set("silent", v));
                sys.on("silent", (v) => t.set(v), false);
                sub(t("Sounds & Haptics"), group([cell({ title: t("Silent Mode"), right: t })]), group([cell({ title: "Ringer and Alerts" }), h("div.pad", slider(sys.get("volume"), (v) => { sys.set("volume", v); ctx.mod.showVolume(); }))]), group([cell({ title: t("UI Sounds"), right: toggle(sys.get("sounds"), (v) => sys.set("sounds", v)) })]));
            };

            const langPage = () => sub(t("Language"), group(LOCALES.map(([id, name]) => cell({ title: name, detail: id === locale ? "✓" : "", onClick: () => setLocale(id) }))));
            const generalPage = () => sub(t("General"), group([cell({ title: t("About"), chev: true, onClick: aboutPage }), cell({ title: t("Language & Region"), detail: LOCALES.find((l) => l[0] === locale)[1], chev: true, onClick: langPage }), cell({ title: t("Software Update"), detail: "iOS 27.0", chev: true })]));
            const row = ([lab, k, a]) => {
                const title = T(lab);
                if (k === "t") { const tg = toggle(!!sys.get(a), (v) => sys.set(a, v)); return cell({ title, right: tg }); }
                if (k === "d") return cell({ title, detail: T(a) });
                return cell({ title, chev: true });
            };
            const stub = (title, key) => () => sub(title, ...SP[key].map((g) => group(g.map(row))));
            const siriPage = () => {
                const seg = segmented([["27", "iOS 27"], ["26", "iOS 26"]], sys.get("siriStyle"), (v) => sys.set("siriStyle", v));
                sub("Siri", group([cell({ title: T("Kiểu giao diện Siri|Siri Appearance"), right: seg })], T("iOS 27: viên sáng nở ra từ Dynamic Island. iOS 26: vầng sáng chạy quanh viền màn hình.|iOS 27: a glowing orb grows from the Dynamic Island. iOS 26: a glow runs around the screen edge.")), group([cell({ title: T("Xem thử|Preview"), chev: true, onClick: () => ctx.mod.siri.start() })]), ...SP.siri.map((g) => group(g.map(row))));
            };
            const R = (icon, color, lab, key, fn, extra) => cell({ icon: I2[icon] || I[icon], color, title: T(lab), chev: true, onClick: fn || stub(T(lab), key), ...extra });
            const root0 = page({ title: t("Settings") });
            const air = toggle(sys.get("airplane"), (v) => { sys.set("airplane", v); if (v) ["wifi", "bt", "cellular"].forEach((k) => sys.set(k, false)); });
            sys.on("airplane", (v) => air.set(v), false);
            const sbar = h("div.sbar", { "data-glass": "", "data-glass-lite": "", "data-glass-bezel": "26" }, [h("span", { html: ICO.search }), h("input", { placeholder: t("Search"), "data-kb": "", inputmode: "none" }), h("span", { html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>' })]);
            const norm = (x) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase();
            sbar.querySelector("input").addEventListener("input", (e) => {
                const q = norm(e.target.value.trim());
                root0.scroll.querySelectorAll(".cell").forEach((c) => (c.style.display = !q || norm(c.textContent).includes(q) ? "" : "none"));
                root0.scroll.querySelectorAll(".grp").forEach((g) => (g.style.display = [...g.querySelectorAll(".cell")].some((c) => c.style.display !== "none") ? "" : "none"));
            });
            root0.scroll.append(
                group([cell({ icon: I2.upd, color: "#8e8e93", title: T("Có bản cập nhật phần mềm|Software Update Available"), right: h("span.badge", "1"), chev: true, onClick: stub(T("Cập nhật phần mềm|Software Update"), "upd") })]),
                group([
                    cell({ icon: I.air, color: "#ff9f0a", title: t("Airplane Mode"), right: air }),
                    cell({ icon: I.wifi, color: "#0a84ff", title: t("Wi-Fi"), detail: sys.get("wifi") ? "Cau Hai kho tinh" : T("Tắt|Off"), chev: true, onClick: wifiPage }),
                    R("bt", "#0a84ff", "Bluetooth", "bt", null, { detail: sys.get("bt") ? T("Bật|On") : T("Không được kết nối|Not Connected") }),
                    R("cell", "#30d158", "Di động|Cellular", "cell", null, { detail: sys.get("cellular") ? T("Bật|On") : T("Tắt|Off") }),
                    R("link", "#30d158", "Điểm truy cập cá nhân|Personal Hotspot", "hot", null, { detail: T("Tắt|Off") }),
                    R("batt", "#30d158", "Pin|Battery", "batt"),
                    R("vpn", "#0a84ff", "VPN", "vpn", null, { detail: T("Không được kết nối|Not Connected") }),
                ]),
                group([
                    R("gear", "#8e8e93", "Cài đặt chung|General", "gen", generalPage),
                    R("acc", "#0a84ff", "Trợ năng|Accessibility", "acc"),
                    R("cam", "#8e8e93", "Camera", "cam"),
                    R("stby", "#1c1c1e", "Chế độ chờ|StandBy", "stby"),
                    R("appr", "#1c1c1e", "Giao diện|Appearance", "app", appearancePage),
                    R("wall", "#30b0c7", "Hình nền|Wallpaper", "wall", wallpaperPage),
                    R("sun", "#0a84ff", "Màn hình & Độ sáng|Display & Brightness", "disp", displayPage),
                    R("home", "#0a84ff", "Màn hình chính & Thư viện ứng dụng|Home Screen & App Library", "hs"),
                    R("siri", "#5e5ce6", "Siri", "siri", siriPage),
                    R("srch", "#8e8e93", "Tìm kiếm|Search", "srch"),
                    R("sw", "#636366", "Trung tâm điều khiển|Control Center", "cc"),
                ]),
                group([
                    R("bell", "#ff3b30", "Thông báo|Notifications", "notif"),
                    R("snd", "#ff2d55", "Âm thanh & Cảm ứng|Sounds & Haptics", "snd", soundsPage),
                    R("moon", "#5e5ce6", "Tập trung|Focus", "focus"),
                    R("hour", "#5e5ce6", "Thời gian sử dụng|Screen Time", "sct"),
                ]),
                group([R("face", "#30d158", "Face ID & Mật mã|Face ID & Passcode", "fid"), R("sos", "#ff3b30", "SOS khẩn cấp|Emergency SOS", "sos"), R("hand", "#0a84ff", "Quyền riêng tư & Bảo mật|Privacy & Security", "priv")]),
                group([R("game", "#ff2d55", "Game Center", "game"), R("cloud", "#0a84ff", "iCloud", "icloud"), R("wlt", "#1c1c1e", "Ví & Apple Pay|Wallet & Apple Pay", "wlt")]),
                group([R("home", "#5e5ce6", "Ứng dụng|Apps", "apps")]),
                group([cell({ icon: I.phone, color: "#1c1c1e", title: t("Device Color"), detail: sys.get("color"), chev: true, onClick: colorPage })], T("Tuỳ chọn của simulator: đổi màu máy ảo.|Simulator option: change the finish of the virtual iPhone.")),
            );
            root0.scroll.style.paddingBottom = "120px";
            root0.el.append(sbar);
            requestAnimationFrame(() => registerGlass(sbar));
            nav.push(root0.el);
            root0.el.classList.remove("pushed");
        },
    });
}
