# AUDIT — iPhone 18 Pro Max Simulator (bản hiện tại → v2.0)

Ngày audit: 01/11/2026 · Phạm vi: toàn bộ file trong `iphone18-promax-simulator.zip` (40 file).

**Cách đánh dấu bằng chứng** (để biết chỗ nào chắc, chỗ nào chưa):

- **[ĐÃ TÁI HIỆN]** chạy thật bằng Chromium headless (Playwright 1.56) trên bản gốc, có số đo hoặc ảnh chụp trong `screens/`.
- **[ĐỌC CODE]** thấy trong mã nguồn nhưng chưa tái hiện được lỗi hiển thị.
- **[RỦI RO]** có thể gây lỗi trong điều kiện nhất định, chưa chứng minh.

Giới hạn của lần audit này: chỉ chạy Chromium trên Linux (không có Safari/Firefox/thiết bị cảm ứng thật), không đo FPS có ý nghĩa (headless dùng render phần mềm), chưa kiểm tra Android.

---

## 1. Tóm tắt

Repo **không phải đống code thô**: đã là ES modules thuần, có spring solver, engine Liquid Glass tính khúc xạ theo định luật Snell, window manager giữ app sống trong DOM, bộ cử chỉ cạnh màn hình và Dynamic Island nhiều trạng thái. Nền tảng đủ tốt để **giữ lại và mở rộng**, không cần viết lại từ đầu.

Ba vấn đề lớn nhất:

1. **Giao diện Phone hỏng vì trùng tên class CSS** (nguyên nhân gốc, đã chứng minh, sửa 1 dòng). Đây chính là lỗi bạn báo ở yêu cầu 4.
2. **Mọi kích thước thiết bị là hằng số cứng** (`metrics.js`, 12 file import trực tiếp) nên chưa thể có `DeviceProfile` hay iPad (yêu cầu 21).
3. **Hệ thống chưa có lớp i18n, Control Center một trang, Settings thiếu nhiều mục, bàn phím chỉ có tiếng Anh**, nên khoảng cách so với ảnh máy thật (tiếng Việt, iOS 27) còn lớn.

Số liệu: ≈ 4.650 dòng mã nguồn (JS ≈ 3.900 + CSS ≈ 700 + HTML) và `js/bundle.js` 3.987 dòng sinh ra bằng esbuild. 12 app thật, 13 app chỉ là placeholder.

---

## 2. Cấu trúc file và vai trò

| Nhóm | File | Vai trò |
|---|---|---|
| Entry | `index.html`, `js/main.js`, `js/bundle.js` | `index.html` chỉ nạp `bundle.js` (script thường, mở bằng double-click được). `main.js` khởi tạo theo thứ tự cố định. |
| Engine | `js/spring.js`, `js/core/motion.js` | `Spring` (response/damping kiểu SwiftUI, giữ vận tốc khi đổi đích), vòng rAF dùng chung, `Group` gom nhiều spring. |
| Engine | `js/glass.js` (546 dòng) | Liquid Glass: displacement map sinh bằng canvas từ biên dạng + Snell, SVG filter, tán sắc (mặc định tắt), rim light, spring khi nhấn/kéo. Chỉ Blink có khúc xạ thật. |
| Core | `js/core/{ctx,util,metrics,apps,audio,ui,wallpapers}.js` | `ctx` (service locator), `sys` (store phản ứng + localStorage), hằng số thiết bị, đăng ký app + 24 icon SVG, âm thanh tổng hợp, thư viện UI (page, cell, toggle, tabBar, NavStack). |
| Hệ thống | `js/system/*.js` (13 file) | device, statusbar, hud, home, lock, wm (window manager + app switcher), island, control (Control Center), spotlight, keyboard, notifications, gestures, power. |
| App | `js/apps/{settings,tools,media,social,info}.js` | Settings; Calculator/Clock/Notes; Camera/Photos/Music; Messages/Phone/Safari; Calendar/Weather. |
| CSS | `css/{main,springs,base,glass,system,apps}.css` | `main.css` dùng 5 `@import` nối tiếp. |
| Tài liệu | `BUILD.md` | Chỉ hướng dẫn build esbuild. |

Không có: `package.json`, test, CI, manifest, service worker, i18n, `version.js`, `CHANGELOG.md`.

---

## 3. Danh sách lỗi

### 3.1 Lỗi đã tái hiện

| # | Mức | Lỗi | Bằng chứng | Nguyên nhân gốc | Cách sửa |
|---|---|---|---|---|---|
| B1 | **Nghiêm trọng** | **Giao diện Phone vỡ**: bàn phím số bị đẩy lên góc trên trái và cắt mất, thanh tab nằm giữa màn hình, phần còn lại trắng trơn | `screens/03b-phone-clean.png`. Đo trong DOM: `.app.phone` rộng 471×987pt tại (−235,5; −493,5), đúng ra phải 440×956 tại (0, 0) | App Phone dùng class `phone` (`h("div.app.phone")`), **trùng với class của khung máy** `.phone` trong `css/base.css` (`position:absolute; left:50%; top:50%; translate:-50% -50%; width:471px; height:987px; transform:scale(var(--s)); border-radius:77px`). Mọi luật của khung máy bị áp lên app. | Đổi class app thành `dialer`. Đã kiểm chứng: sau sửa app đo đúng 440×956 và bàn phím hiện đủ (`screens/03c-phone-after-1line-fix.png`). Patch: `patches/0001-fix-phone-app-class-collision.patch` (đã thử `patch --dry-run`, áp được sạch) |
| B2 | Cao | Tab **Yêu thích** và **Gần đây** của Phone không làm gì: bấm xong tab tự nhảy về Bàn phím | `--i` của thanh tab vẫn bằng 2 sau khi bấm tab 0 | `social.js`: callback là `() => tabs.select("k", true)`, luôn ép về tab `k`; app cũng không có view nào khác để chuyển | Viết lại Phone (yêu cầu 4) với 3 view thật |
| B3 | Cao | **Điện thoại thấy màn hình vuông** (yêu cầu 2) | Viewport 390×844: `.phone.bare` bật, `border-radius` của `.screen` = `0px` | `base.css`: `.phone.bare .screen { border-radius: 0 }` và `.phone.bare { border-radius: 0 }` | Làm theo mục 4.1 của prompt |
| B4 | Trung bình | **Xoay ngang trên điện thoại**: khung máy co còn 175×366px ở viewport 844×390 | Đo `#phone.getBoundingClientRect()` | Chế độ `bare` chỉ bật khi `innerWidth < 520`; viewport ngang 844px lọt sang chế độ có khung nên bị co theo chiều cao | Dùng `pointer: coarse` + tỉ lệ thay vì chỉ chiều rộng; thêm gợi ý xoay |
| B5 | Thấp | Chrome cảnh báo console: `navigator.vibrate` bị chặn vì chưa có thao tác người dùng | `buzz(12)` chạy ở lần quét Face ID lúc khởi động | `lock.js` gọi `buzz` không kiểm tra `navigator.userActivation.hasBeenActive` | Chỉ rung sau lần chạm đầu tiên |
| B6 | Thấp | Font Inter tải từ Google Fonts. Offline: `ERR_NAME_NOT_RESOLVED`. Trang vẫn chạy nhờ font dự phòng | Log request thất bại | `index.html` phụ thuộc CDN ngoài | Tự host font hoặc bỏ, dùng stack `-apple-system, Inter` |
| B7 | Trung bình | Thiếu cấu hình để chạy full-screen trên điện thoại | Không có `manifest.webmanifest`, không có `apple-mobile-web-app-capable`. Có `user-scalable=no` | — | Mục 4.1(d) của prompt |
| B8 | Thấp | Phím bàn phím số Phone nhỏ hơn máy thật khoảng 5–8% | Repo: phím Ø 84pt, bước cột ≈ 106,5pt, bước hàng ≈ 98pt. Ảnh máy thật (ảnh 1): Ø ≈ 89pt, bước cột ≈ 114,5pt, bước hàng ≈ 110pt (đo trên ảnh, sai số ±2px ≈ ±1,5pt) | Hằng số CSS `repeat(3, 84px)`, `gap 14px 22px` | Hiệu chỉnh khi viết lại Phone |

### 3.2 Lỗi và nợ kĩ thuật thấy khi đọc code

| # | Mức | Vấn đề | Chi tiết |
|---|---|---|---|
| C1 | Cao | **Rò đăng ký kính** | `glass.js` giữ mọi phần tử trong `states` (Map) và `ResizeObserver`, không có `unregisterGlass`. `NavStack.pop()`, banner thông báo, menu ngữ cảnh đều `.remove()` phần tử mà không gỡ. Đo thử: mở/đóng 40 lần một cuộc trò chuyện trong Messages làm heap tăng 2,84 → 3,12 MB (+9 phần tử DOM). Số nhỏ, chạy 1 lần nên chưa đủ kết luận về tốc độ rò, nhưng cấu trúc giữ tham chiếu là chắc chắn. Prompt yêu cầu "không memory leak sau 100 lần mở/đóng" nên cần sửa. |
| C2 | Cao | **`sys.on()` không có cách huỷ** | Mỗi lần mở trang con của Settings (Wi-Fi, Âm thanh, Hiển thị) thêm một listener mới và không bao giờ gỡ (`settings.js` 4 chỗ, `media.js` 1 chỗ). |
| C3 | Cao | **Dynamic Island animate `width`/`height`/`border-radius`** | `island.js` gán `style.width/height/borderRadius` mỗi frame → layout lại mỗi frame. Vi phạm quy tắc hiệu năng số 5 của prompt (chỉ `transform/opacity/clip-path`). Cần chuyển sang `transform: scale` kèm `clip-path` hoặc 9-slice. |
| C4 | Trung bình | **`Group.to()` ghi đè `done`** | Nếu một chuyển cảnh bị ngắt giữa chừng (ví dụ `goHome` rồi `open` ngay), callback `done` của chuyển cảnh trước mất, các bước dọn dẹp (`hideIcon(false)`, `setFactors(0)`, `mode="home"`, khôi phục `onWinApply`) không chạy. **Thử `goHome` rồi `open` lại sau 120ms: trạng thái cuối vẫn đúng**, nên đây là rủi ro chứ chưa phải lỗi thấy được. Cần hàng đợi/token cho `done`. |
| C5 | Trung bình | **App mới không xuất hiện với người dùng đã sắp xếp lại Home** | `home.js`: layout chỉ được lưu vào localStorage khi người dùng kéo-thả hoặc xoá icon; sau đó mỗi lần tải chỉ lọc bớt app lạ, không bao giờ thêm app mới. Ai đã sửa layout một lần sẽ không thấy TikTok, App Store thật… khi thêm ở bản sau. Cần phiên bản hoá layout + hợp nhất. (Đọc code, chưa tái hiện.) |
| C6 | Thấp | Hàm trùng nhưng khác nghĩa | `rubber()` có 2 bản với công thức khác nhau: `spring.js` dùng `tanh`, `util.js` dùng công thức UIKit (đúng với prompt). `clamp()` có ở `spring.js` và `util.js`. Dễ import nhầm. |
| C7 | Thấp | Vá chồng nhau, mã chết | `initWM` ghi đè `Win.prototype.apply`; `main.js` ghi đè `ctx.mod.lock.hide`; biến `baseOnApply` không dùng; `delete toggles[...]` trong `control.js` xoá khoá chưa từng tồn tại. |
| C8 | Trung bình | **Service locator `ctx.mod`** | Mọi module gọi nhau qua `ctx.mod.x?.y()`. Thứ tự `init*` trong `main.js` quyết định có chạy hay âm thầm bỏ qua (optional chaining nuốt lỗi). `media.js` còn gán `ctx.photos = []` ngay lúc import. Khó test, khó thay thiết bị. |
| C9 | Cao (cho yêu cầu 21) | **Hằng số thiết bị cứng** | `metrics.js` export `W,H,R,ICON,ISLAND,DOCK,COL_PITCH…`; 12 file import trực tiếp; `device.js` hard-code 471×987. Không thể có `DeviceProfile` nếu không tách ra. |
| C10 | Cao (cho yêu cầu 10, 19) | **Không có i18n** | Toàn bộ chuỗi tiếng Anh; ngày giờ gọi `toLocale…("en")` ở 13 chỗ; `<html lang="en">`. Ảnh tham chiếu đều là giao diện tiếng Việt. |
| C11 | Trung bình | **Bàn phím chỉ QWERTY tiếng Anh** | Không có nút 🌐, không Telex/VNI, phím `#+=` là no-op, tên "return" cố định. Tooltip bong bóng phím dùng hằng số mò (`H - KB_H + 6`). |
| C12 | Trung bình | **Control Center một trang, 15 ô** | Ảnh máy thật có 3 trang dọc (Yêu thích / Nhạc / Kết nối). Chưa có nhấn giữ mở rộng, chưa có chế độ sửa. Hiệu ứng mở là scale cả khối từ gốc `92% 0` + mờ dần, chưa có từng ô "nở" so le. |
| C13 | Trung bình | **Settings thiếu nhiều** | Trang gốc 17 hàng (ảnh thật khoảng 30). 13 hàng có mũi tên `›` nhưng chỉ 9 hàng bấm được (Bluetooth, Di động, Thông báo, Tập trung, Trung tâm điều khiển, Màn hình chính… chưa mở được gì). Chưa có mục **Giao diện** của iOS 27. |
| C14 | Thấp | App giả lập dữ liệu | Calendar sự kiện cố định theo `ngày % 10`; Weather số liệu tĩnh và dòng "Demo data"; widget Thời tiết ở Home ghi cứng "Ho Chi Minh City", 27°/31°. |
| C15 | Trung bình | **Safari dùng `<iframe>`** | Nhiều trang cấm nhúng (`X-Frame-Options`/CSP `frame-ancestors`) nên trắng. Hiện có dòng chú thích + nút mở ra tab mới. Chưa có trang khởi đầu, thanh 4 tab, lịch sử, danh sách đọc. Yêu cầu 14 cần chiến lược khác. |
| C16 | Thấp | Spotlight chỉ tìm tên app | `includes()` không bỏ dấu; không có Siri Suggestions thật, danh bạ, tin nhắn, tính nhanh. |
| C17 | Trung bình | **Hiệu năng kính chưa có tự hạ cấp** | `[data-glass]` luôn bật `backdrop-filter` + `saturate`; có `data-glass-lite` nhưng chọn thủ công trong HTML. Không có tier tự phát hiện, không đo FPS. Phát hiện trình duyệt bằng UA sniffing (`isBlink`). |
| C18 | Thấp | `prefers-reduced-motion` chỉ được đọc trong `spring.js` (cho kính); CSS và `Group` không tôn trọng. Chưa có công tắc "Giảm chuyển động". |
| C19 | Thấp | Không có `aria-label`, phím tắt chỉ `Esc` và `Ctrl+L`. Nút vật lý chỉ có `title`. |
| C20 | Trung bình | **Không có hàng rào chất lượng** | Không test, không CI. `bundle.js` được commit; kiểm tra bằng cách so chuỗi trong nguồn với bundle hiện **khớp** (không phát hiện lệch), nhưng không có gì ngăn lệch ở lần sửa sau. |
| C21 | Thấp | `main.css` dùng 5 `@import` nối tiếp → 6 request CSS tuần tự trên GitHub Pages | Gộp bằng bước build hoặc `<link>` song song. |

---

## 4. Đối chiếu 21 yêu cầu: hiện trạng

| # | Yêu cầu | Hiện trạng | Ghi chú |
|---|---|---|---|
| 1 | Vuốt lên mở khoá, icon xuất hiện so le | **Một phần** | Có kéo interactive: khối Home đi từ scale 1,1 và mờ về thật (`--hs`, `--ho`). Chưa có blur, chưa so le theo hàng/icon, Dock chưa trượt riêng. |
| 2 | Khung bo tròn trên điện thoại | **Lỗi** | B3, B4, B7 |
| 3 | Version | **Chưa có** | Không có `version.js`; "iOS 27.0" ghi cứng trong trang Giới thiệu |
| 4 | Phone | **Lỗi** | B1, B2, B8; chưa có DTMF, Gần đây, Danh bạ, cuộc gọi đến |
| 5 | Bong bóng tab bar | **Một phần** | Có viên kính trượt giữa các tab (`translate` + spring bouncy). Chưa có chạm-giữ phóng đại, kéo theo ngón tay, co giãn theo vận tốc, tán sắc xanh |
| 6 | Control Center | **Một phần** | C12 |
| 7 | Dynamic Island | **Một phần** | Có compact/expanded cho nhạc, hẹn giờ, cuộc gọi + alert, spring. Chưa có API Live Activity chung, chưa mở app khi bấm, chưa "nhảy vào" Island khi thoát app, C3 |
| 8 | TikTok | **Chưa có** | |
| 9 | Icon iOS 27 | **Một phần** | 24 icon SVG tự vẽ (gradient + glyph). Chưa đối chiếu với icon iOS 27 (ảnh 13), chưa có chế độ Tối/Pha màu |
| 10 | Settings | **Một phần** | C13 |
| 11 | Face ID + cài app | **Chưa có** | App Store là placeholder. Có animation quét Face ID ở ổ khoá màn hình khoá |
| 12 | Siri | **Chưa có** | |
| 13 | AssistiveTouch | **Chưa có** | |
| 14 | Safari | **Một phần** | C15 |
| 15 | App Switcher | **Khá tốt** | Thẻ là DOM sống, cuộn ngang, vuốt lên để đóng, nhãn icon + tên. Cần chỉnh theo ảnh 6 |
| 16 | Mở/đóng app | **Khá tốt** | Spring + `clip-path` từ icon, hỗ trợ ngắt, dùng vận tốc ngón tay. Cần hiệu chỉnh theo video thật, C4 |
| 17 | Khoá/mở khoá | **Một phần** | Có khoá, vuốt lên, Face ID giả, rèm kéo xuống. Chưa có Live Activity trên màn hình khoá, ổ khoá trong Island |
| 18 | Thư viện ứng dụng | **Chưa có** | Home chỉ có 2 trang, không có trang cuối |
| 19 | Spotlight + bàn phím kính | **Một phần** | C11, C16. Chưa có nút "Tìm kiếm" phía trên Dock |
| 20 | Đèn pin trong Island | **Chưa có** | Chỉ đổi trạng thái nút trên khoá và ô trong Control Center |
| 21 | Chọn thiết bị | **Chưa có** | C9 |

---

## 5. Giữ / viết lại

| Module | Quyết định | Lý do |
|---|---|---|
| `spring.js`, `core/motion.js` | **Giữ**, bổ sung | Giải spring đúng, ngắt được. Thêm: sinh `linear()` CSS, chiếu vận tốc, token spring chỉnh được, hàng đợi `done` (C4), thống nhất `rubber` (C6) |
| `glass.js` | **Giữ lõi quang học**, bổ sung | Snell + displacement map là phần khó và đã đúng hướng. Thêm: `unregister` (C1), tier tự động (C17), tint theo hình nền, lớp "magnifier clone" cho Safari, API cho bong bóng tab bar |
| `core/util.js` | **Giữ**, thêm `sys.on` trả về hàm huỷ (C2) | |
| `core/metrics.js` | **Thay bằng `DeviceProfile`** | C9 |
| `system/wm.js` | **Giữ kiến trúc**, dọn vá chồng (C7), sửa C4, thêm Transition có tên | Ý tưởng DOM sống là đúng |
| `system/gestures.js` | **Giữ**, mở rộng vùng cạnh, vuốt từ cạnh trái để quay lại | |
| `system/home.js` | **Giữ**, thêm hợp nhất layout (C5), trang Thư viện ứng dụng, nút Tìm kiếm, mở khoá so le | |
| `system/lock.js`, `statusbar.js`, `notifications.js`, `power.js`, `hud.js` | **Giữ**, mở rộng | |
| `system/island.js` | **Viết lại** | C3, thêm Live Activity |
| `system/control.js` | **Viết lại** | 3 trang, giữ để mở rộng, sửa điều khiển |
| `system/keyboard.js` | **Viết lại** thành `GlassKeyboard` | C11 |
| `system/spotlight.js` | **Mở rộng** | C16 |
| `core/ui.js` | **Giữ** page/cell/toggle/segmented/slider/NavStack; **viết lại `tabBar`** thành `GlassTabBar` có thấu kính | yêu cầu 5 |
| `apps/social.js` | **Viết lại** Phone và Safari; giữ Messages, thêm tiếng Việt | B1, B2, C15 |
| `apps/settings.js` | **Viết lại** theo cây mục đầy đủ | C13 |
| `apps/{tools,media,info}.js` | **Giữ**, thêm i18n, dữ liệu thật (Weather: tuỳ chọn) | |
| CSS | **Tách token** (màu, độ trong, bán kính) ra `tokens.css`; giữ `springs.css` | |

---

## 6. Việc nên làm ngay (không đổi giao diện ngoài việc sửa lỗi)

1. Áp patch `0001-fix-phone-app-class-collision.patch` (sửa B1). Đây là commit đầu tiên.
2. Thêm `package.json` + script `build` (esbuild) + `dev` (mở thẳng `js/main.js` dạng `type="module"` để khỏi phải build khi sửa).
3. Thêm `version.js`, `CHANGELOG.md` và một test khói bằng Playwright: tải trang, mở từng app, kiểm tra kích thước `.win-c` = 440×956 và không có lỗi console. Test này sẽ bắt được ngay lỗi dạng B1.
4. Làm `unregisterGlass` và `sys.on` trả về hàm huỷ trước khi thêm tính năng (C1, C2), vì mọi app mới sẽ khuếch đại hai lỗi này.

Chi tiết kiến trúc đích: `docs/ARCHITECTURE.md`. Nghiên cứu và tham số: `docs/RESEARCH.md`.
