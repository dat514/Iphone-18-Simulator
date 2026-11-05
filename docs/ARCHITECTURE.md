# ARCHITECTURE — iPhone 18 Pro Max Simulator v2.0

Tài liệu này mô tả kiến trúc **đích** và cách đi từ repo hiện tại tới đó mà **không làm mất tính năng đang chạy**. Căn cứ: `docs/AUDIT.md` (hiện trạng, mã lỗi B*/C*) và `docs/RESEARCH.md` (thông số).

Đây là bản thiết kế, chưa phải mã. Chữ ký hàm bên dưới là hợp đồng đề xuất; chi tiết sẽ chốt khi cài đặt từng phase.

---

## 1. Nguyên tắc

1. **Tiến hoá, không viết lại.** Repo đã là ES modules với spring solver, engine kính và window manager đúng hướng. Giữ nguyên tên file/thư mục ở mức có thể; chỉ di chuyển khi có lý do (xem bảng ở mục 3).
2. **Không còn hằng số thiết bị rải rác.** Mọi kích thước đi qua `DeviceProfile` (AUDIT C9).
3. **Mọi thứ có vòng đời.** Cái gì đăng ký (kính, listener, interval, rAF) đều phải huỷ được qua một `Scope` (AUDIT C1, C2).
4. **Một cách duy nhất cho mỗi việc**: một `rubber`, một `clamp`, một cách đăng ký app, một cách phát chuyển cảnh.
5. **Hiệu năng theo luật prompt**: chỉ animate `transform`, `opacity`, `clip-path`, `filter` có kiểm soát (AUDIT C3).
6. **Chạy được bằng static hosting.** Giữ `index.html` + một bundle; thêm chế độ dev dùng ES modules trực tiếp.
7. **Có hàng rào kiểm tra.** Một test khói bằng Playwright chặn các lỗi dạng B1 ngay từ commit đầu.

---

## 2. Cây thư mục đích

```
index.html            manifest.webmanifest     version.js     config.js
CHANGELOG.md          README.md                package.json
css/    tokens.css  springs.css  base.css  glass.css  device.css  shell.css  apps/*.css
js/
  main.js                       khởi tạo theo thứ tự có kiểm tra phụ thuộc
  core/
    spring.js                   Spring, animate, token spring, toLinear(), project()
    motion.js                   Group (có hàng đợi done)
    store.js                    sys (thay util.sys): on() trả về hàm huỷ
    scope.js                    Scope: gom mọi thứ cần dọn khi app/trang đóng
    bus.js                      event bus
    i18n.js                     vi / en, định dạng ngày, số, dấu chấm nghìn kiểu Việt
    gestures.js                 recognizer + ưu tiên + vùng cạnh
    glass.js                    createGlass / destroyGlass, tier, tint theo hình nền
    util.js                     h(), Velocity, store (localStorage), rubber duy nhất
    audio.js                    âm thanh tổng hợp + DTMF
    haptics-visual.js           rung nhẹ bằng hình khi không có navigator.vibrate
  devices/  iphone18promax.js   ipad.stub.js   index.js
  shell/    device-frame  status-bar  home  app-library  lockscreen
            app-switcher  spotlight  control-center  notification-center
            island  siri  assistive-touch  keyboard  face-id  install
            device-picker  debug-panel
  system/   window-manager  power  hud  (giữ tên cũ, xem mục 3)
  apps/     phone  messages  safari  tiktok  settings  clock  calculator
            notes  camera  photos  music  calendar  weather  appstore  ...
docs/       AUDIT.md  RESEARCH.md  ARCHITECTURE.md  MOTION.md
tests/      smoke.mjs
```

Ghi chú: prompt đề xuất `js/core/` + `js/shell/` + `js/apps/` + `js/devices/`. Repo hiện có `js/system/`. Để giảm xáo trộn, **Phase 1 giữ `js/system/`** cho `wm.js`, `power.js`, `hud.js`, `gestures.js` và chỉ tạo `js/shell/` cho các thành phần mới hoặc viết lại. Việc đổi tên hàng loạt là thay đổi sau cùng, nếu còn cần.

---

## 3. Bản đồ di chuyển từ repo hiện tại

| Hiện tại | Đích | Hành động | Mã lỗi liên quan |
|---|---|---|---|
| `js/spring.js` | `core/spring.js` | Giữ. Thêm `toLinear(params)` sinh `linear()` cho CSS (hiện `springs.css` dán bảng số cứng), `project(pos, vel)` theo công thức `+ vận tốc × 0,2s`, token spring đọc từ Debug Panel | C6 |
| `js/core/motion.js` (`Group`) | `core/motion.js` | Giữ. `to()` không ghi đè `done` mà đẩy vào hàng đợi, kèm token để biết chuyển cảnh nào đã bị thay | C4 |
| `js/core/util.js` (`sys`, `store`, `h`, `Velocity`, `rubber`) | `core/store.js`, `core/util.js` | Tách `sys`; `sys.on()` trả về `off()`. Giữ một `rubber` (bản UIKit) | C2, C6 |
| `js/core/metrics.js` | `devices/iphone18promax.js` | **Thay.** Xem mục 4 | C9 |
| `js/core/ctx.js` | giữ `ctx` nhưng thu hẹp | `ctx` chỉ giữ tham chiếu DOM + `pt()`/`rect()` + `device`; cắt `ctx.mod.*` dần sang `import` trực tiếp hoặc `bus` | C8 |
| `js/glass.js` | `core/glass.js` | Giữ phần quang học. Thêm `destroyGlass(el)`, tier, tint, API thấu kính | C1, C17 |
| `js/system/wm.js` | giữ | Gỡ vá `Win.prototype.apply`, đưa chuyển cảnh thành đối tượng có tên (mục 6) | C4, C7 |
| `js/system/gestures.js` | `core/gestures.js` + `system/gestures.js` | Tách engine recognizer; `system/gestures.js` chỉ cấu hình vùng cạnh | — |
| `js/system/home.js` | `shell/home.js` + `shell/app-library.js` | Giữ; thêm hợp nhất layout có phiên bản, trang Thư viện, nút Tìm kiếm, mở khoá so le | C5 |
| `js/system/island.js` | `shell/island.js` | **Viết lại** dùng `transform` + `clip-path`, Live Activity API | C3 |
| `js/system/control.js` | `shell/control-center.js` | **Viết lại** 3 trang | C12 |
| `js/system/keyboard.js` | `shell/keyboard.js` | **Viết lại** `GlassKeyboard` (Telex, VI/EN) | C11 |
| `js/system/spotlight.js` | `shell/spotlight.js` | Mở rộng | C16 |
| `js/system/lock.js`, `statusbar.js`, `notifications.js` | `shell/…` | Giữ, mở rộng | — |
| `js/core/ui.js` | giữ; `tabBar` → `shell/glass-tab-bar.js` | `GlassTabBar` có thấu kính | yêu cầu 5 |
| `js/apps/social.js` | `apps/phone.js`, `messages.js`, `safari.js` | Tách file; **viết lại** Phone và Safari | B1, B2, C15 |
| `js/apps/settings.js` | `apps/settings/*` | **Viết lại** theo cây mục | C13 |
| `css/*.css` | thêm `tokens.css` | Đưa màu, độ trong, bán kính, kích thước ra biến | — |
| `js/bundle.js` | sinh ra khi build | Giữ commit để Pages chạy ngay; thêm kiểm tra bundle khớp nguồn trong test | C20 |

---

## 4. DeviceProfile

Thay `core/metrics.js`. Một đối tượng đóng băng, truyền qua `ctx.device`, **không** import hằng số trực tiếp ở bất kỳ module nào khác.

```
{
  id: 'iphone18promax', name: 'iPhone 18 Pro Max', os: 'iOS', osVersion: '27.0',
  viewport:   { w: 440, h: 956 },           // pt
  cornerRadius: 62,                          // GIẢ ĐỊNH, đo lại trên ảnh khung máy
  island:     { w: 100, h: 30, y: 11 },      // RESEARCH §1.2
  safeArea:   { top: 54, bottom: 34 },       // 54 = chiều cao thanh trạng thái hiện tại của repo
  iconGrid:   { cols: 4, iconSize: 62, colPitch: 96.5, rowPitch: 112, originX: 28, originY: 92 },
  dock:       { x: 12, y: 836, w: 416, h: 96, radius: 48, slots: 4 },
  body:       { w: 471, h: 987, bezel: 15.5, radius: 77 },   // khung titan trên desktop
  buttons:    ['action','volUp','volDown','side','cameraControl'],
  capabilities: { faceID: true, dynamicIsland: true, actionButton: true, cameraControl: true,
                  multitasking: 'single' },
  layoutClass: 'phone'                      // iPad: 'tablet' → Dock lớn, đa nhiệm, 2 cột
}
```

Quy tắc cho mọi module:

- CSS dùng biến `--vw`, `--vh`, `--island-w`… do `device-frame` đặt; JS đọc từ `ctx.device`.
- App và overlay dùng `@container` thay vì số cố định (yêu cầu 21).
- Nghiệm thu: đổi `DeviceProfile` sang một profile giả (ví dụ 390×844) không làm vỡ bố cục hệ thống.

### Khung máy và điện thoại thật (yêu cầu 2)

`device-frame` quyết định chế độ bằng `pointer: coarse` **và** tỉ lệ khung, không chỉ bề rộng (AUDIT B3, B4):

- Có khung titan: desktop/con trỏ chính xác.
- Không khung nhưng **luôn bo góc**: màn hình mô phỏng có `border-radius = cornerRadius × k`, `overflow:hidden`, nền ngoài đen tuyệt đối, viền bezel đen mỏng 4–8px.
- Xoay ngang: hiện gợi ý xoay hoặc xoay nội dung (liên kết với AssistiveTouch "Xoay màn hình").
- Thêm `manifest.webmanifest`, `apple-mobile-web-app-capable`, `theme-color`, `viewport-fit=cover` (đã có), safe-area (AUDIT B7).

---

## 5. Các dịch vụ lõi (hợp đồng)

| Dịch vụ | Chữ ký chính | Trách nhiệm |
|---|---|---|
| `Scope` | `scope.on(target, ev, fn)`, `scope.interval(fn, ms)`, `scope.glass(el, opts)`, `scope.add(disposer)`, `scope.dispose()` | Mọi app, trang, banner, menu tạo một Scope và `dispose()` khi bị gỡ. Sửa C1, C2 |
| `sys` | `sys.get(k)`, `sys.set(k, v, persist?)`, `off = sys.on(k, fn)` | Store phản ứng. Giữ khoá cũ để không mất dữ liệu người dùng; thêm `locale`, `glassLevel`, `reduceMotion`, `device`, `layoutVersion` |
| `i18n` | `t('settings.title')`, `fmtDate(d, style)`, `fmtNumber(n)`, `setLocale('vi'\|'en')` | Chuỗi, ngày, số theo locale. Mặc định `vi` nếu bạn xác nhận (RESEARCH §7) |
| `createGlass` | `createGlass(el, {shape, radius, thickness, tint, interactive, refraction, dispersion, blur})` → `{refresh, destroy, press, hover}` | Bọc `registerGlass` hiện tại; thêm `destroy`, tier tự động, tint lấy từ `--wall-tint` |
| `GlassTier` | `tier = 1 \| 2 \| 3`, `setTier(n)`, tự hạ khi FPS < 45 trong 2 giây | Tier 1 Chromium: khúc xạ + tán sắc. Tier 2 Safari/Firefox: blur + viền + "magnifier clone". Tier 3: blur nhẹ |
| `Gestures` | `gestures.recognizer({zone, axis, priority, onStart, onMove, onEnd})` | Ngưỡng 8px, ưu tiên, không tranh chấp với cuộn; vùng cạnh theo `device.safeArea` |
| `WindowManager` | `open(id, from?)`, `goHome(v?)`, `enterSwitcher`, `exitSwitcher`, `destroy(id)`, `transition(name, args)` | Giữ API hiện có; thêm đối tượng chuyển cảnh có tên (mục 6) |
| `Island` | `island.start(activity)`, `island.update(id, patch)`, `island.end(id)`, tối đa 3 activity | Live Activity chung cho cuộc gọi, hẹn giờ, nhạc, đèn pin, Face ID, ghi màn hình, Duolingo-giả…; bấm vào mở app, thoát app "nhảy vào" Island |
| `Flashlight` | `flashlight.set({on, level})` | Một nguồn sự thật cho khoá, Control Center, AssistiveTouch, Siri (yêu cầu 20) |
| `Keyboard` | `keyboard.attach(el, {layout, returnKey, ime})` | `ime: 'telex' \| 'vni' \| 'none'`, phím 🌐 chuyển VI/EN |
| `Debug` | phím `~` | Chỉnh response/damping từng token, tốc độ 0,1×–2×, vùng cử chỉ, FPS, tier kính, xuất/nhập JSON token |

### AppDefinition

Mở rộng định dạng hiện có `registerApp({ id, name, status, bg, build(root, api), icon })`:

```
{ id, name: {vi, en}, icon, bg, status,
  supportedDevices: ['iphone', 'ipad'],
  build(root, api, scope),          // gọi một lần
  hooks: { open, close, suspend, resume, destroy },
  liveActivity?: (store) => Activity | null }
```

`api.hooks` hiện có (`open`, `close`, `destroy`) được giữ tương thích. App nhận thêm `scope` để dọn tài nguyên khi `destroy`.

---

## 6. Chuyển cảnh có tên

Hiện `wm.js` có sẵn mở/đóng/Switcher nhưng dưới dạng hàm rời. Mục tiêu: mỗi chuyển cảnh là một đối tượng `{ name, from, to, drive(p), settle(v), cancel() }` để có thể chỉnh trong Debug Panel và kiểm thử.

| Tên | Trạng thái hiện tại | Ghi chú |
|---|---|---|
| `iconToApp`, `appToIcon` | **Có** (`wm.open`, `wm.goHome`) | Spring + `clip-path`; cần hiệu chỉnh theo video thật |
| `appToSwitcher`, `switcherToApp` | **Có** (`enterSwitcher`, `exitSwitcher`) | Chỉnh theo ảnh 6 |
| `unlock`, `lock` | **Một phần** (`lock.hide`, `lock.show`, `dragMove`) | Thêm blur và so le theo hàng/icon (yêu cầu 1, 17) |
| `islandToApp`, `appToIsland` | **Chưa có** | Yêu cầu 7 |
| `homeToLibrary` | **Chưa có** | Yêu cầu 18 |
| `homeToSpotlight` | **Có** (kéo xuống) | Thêm bàn phím kính, nút Tìm kiếm |
| `ccOpen`, `ccPage` | **Một phần** | 3 trang, từng ô nở so le (yêu cầu 6) |

Mọi chuyển cảnh phải **ngắt được và giữ vận tốc**; `Group.to()` cần sửa C4 trước khi thêm chuyển cảnh mới.

---

## 7. Hiệu năng và chất lượng kính

- Quy tắc cứng: không animate `width/height/top/left`. Vi phạm hiện có: Island (C3), `.vol b` (`transition: height`), `.batt b` (`transition: width`), khung xem ảnh của Photos. Sửa dần; Island trước.
- Giới hạn số lớp `backdrop-filter` đang hiện: Control Center một mình có ≥ 15 phần tử kính. Dùng `data-glass-lite` hoặc một lớp backdrop dùng chung cho nhóm ô nằm sát nhau.
- Mỗi app dùng `contain: layout paint` và ẩn bằng `content-visibility` khi bị suspend (hiện chỉ `display:none`).
- `will-change` bật khi bắt đầu animate, gỡ khi xong (hiện chỉ có 3 chỗ).
- Tự hạ tier: đo FPS bằng rAF; xuống dưới 45 trong 2 giây liên tục thì giảm một tier, thông báo trong Debug Panel.
- `prefers-reduced-motion` và công tắc "Giảm chuyển động" được đọc ở **một nơi** (`core/spring.js`) và áp cho cả `Group` lẫn CSS (đặt `data-reduce-motion` trên `.screen`) (C18).

---

## 8. Build, chạy, kiểm thử

| Việc | Cách |
|---|---|
| Dev | `index.dev.html` nạp `js/main.js` bằng `<script type="module">`; không cần build khi sửa |
| Build | `npm run build` = `esbuild js/main.js --bundle --format=iife --target=es2020 --outfile=js/bundle.js` (giữ lệnh trong `BUILD.md`), kèm gộp CSS để bỏ 5 `@import` (C21) |
| Phát hành | Static hosting (GitHub Pages). `version.js` là nguồn duy nhất, chèn `?v=` vào file tĩnh; nếu dùng service worker thì đổi tên cache theo version |
| Test khói | `tests/smoke.mjs` (đi kèm bản này): tải trang, mở từng app thật, kiểm tra `.win-c` được lấp đầy 440×956 và không có lỗi console. Chạy trên bản gốc: **Phone báo lỗi**; chạy sau patch: **tất cả đạt** |
| Test về sau | Kiểm tra bundle khớp nguồn; không rò sau 100 lần mở/đóng (đếm số phần tử đã đăng ký kính); ảnh chụp 360×640, 390×844, 430×932, 820×1180, 1920×1080 |

---

## 9. Lộ trình và tiêu chí nghiệm thu

Đã làm trong Phase 0 lần này: **audit, nghiên cứu một phần, kiến trúc, patch B1, test khói**. Chưa làm: tái cấu trúc repo thực tế (mình không đẩy được lên GitHub của bạn; chỉ đưa tài liệu và patch).

| Phase | Nội dung | Yêu cầu | Nghiệm thu chính |
|---|---|---|---|
| **0 (còn lại)** | Áp patch B1; thêm `package.json`, `version.js`, `CHANGELOG.md`, `index.dev.html`; chạy test khói trong CI | 3 (phần file) | Test khói xanh; Phone hiển thị đúng; không đổi giao diện khác |
| **1 Nền tảng** | `DeviceProfile`, khung máy/responsive/manifest, `Scope`, `i18n`, `destroyGlass`, tier kính, `Group` có hàng đợi `done`, Debug Panel, status bar co theo Island | 2, 3, 21 (khung) | Bo góc đúng ở 5 viewport; 100 lần mở/đóng không tăng số phần tử đã đăng ký; đổi profile không vỡ |
| **2 Vỏ hệ thống** | Mở khoá so le, khoá/mở khoá, mở-đóng app, Switcher, Thư viện ứng dụng, Spotlight + `GlassKeyboard` (Telex), icon iOS 27 | 1, 9, 15, 16, 17, 18, 19 | Đặt cạnh video 0,25× khớp thứ tự widget → icon → Dock |
| **3 Lớp phủ** | Control Center 3 trang, Island + Live Activity, Face ID + cài app, Siri, AssistiveTouch, đèn pin | 6, 7, 11, 12, 13, 20 | Ba nơi bật đèn đồng bộ; Island biến hình không chớp |
| **4 Ứng dụng** | Phone (viết lại), tab bar có thấu kính, Settings đầy đủ, Safari, TikTok, App Store, Đồng hồ… | 4, 5, 8, 10, 14 | Không phần tử nào tràn/cắt; gọi → Island → quay lại mượt |
| **5 QA** | Ma trận trình duyệt, hiệu năng, tài liệu, tag `v2.0.0` | — | Mục 6 của prompt |

---

## 10. Rủi ro và quyết định đang chờ

| Rủi ro | Mức | Cách giảm |
|---|---|---|
| Khúc xạ SVG chỉ chạy trên Chromium; Safari/iOS (đa số người dùng điện thoại) rơi vào Tier 2 | Cao | Tier 2 phải đẹp ngang tầm (magnifier clone + viền + blur), không chỉ "bản kém". Cần thử trên iPhone/Safari thật, mình **chưa kiểm** |
| Safari "dùng được thật" bị chặn nhúng iframe | Cao | RESEARCH §7 câu 2 |
| TikTok nhúng/xem thật có thể vướng điều khoản | Trung bình | RESEARCH §7 câu 3; tra trước khi làm |
| Khối lượng 21 yêu cầu quá lớn cho một lượt | Cao | Đi đúng từng phase, nghiệm thu rồi mới sang phase sau |
| Thông số iOS 27 còn thay đổi theo bản beta | Trung bình | Mọi thông số là token chỉnh được; ghi nguồn trong `MOTION.md` |

**Cần bạn xác nhận trước Phase 1** (ba câu hỏi nằm ở `RESEARCH.md` §7): ngôn ngữ mặc định, chiến lược Safari, phương án TikTok.
