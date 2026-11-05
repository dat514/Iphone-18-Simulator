# RESEARCH — iOS 27 · Liquid Glass · iPhone 18 Pro Max

Ngày: 01/11/2026. Tài liệu này ghi **nguồn, quan sát, thông số** theo quy tắc số 1 của prompt. Mức độ chắc chắn được đánh dấu rõ:

- **[ĐÃ XÁC MINH]** có nguồn tra được trong lần này (ghi URL).
- **[ẢNH]** quan sát hoặc đo trực tiếp trên 20 ảnh bạn gửi (nguồn chân lý cao nhất theo prompt). Ảnh rộng 590px ứng với 440pt, 1pt ≈ 1,341px, sai số đo ±2px ≈ ±1,5pt.
- **[TRÍ NHỚ]** kiến thức của mình, **chưa tra lại** trong lần này.
- **[GIẢ ĐỊNH]** chưa có nguồn; phải là tham số chỉnh được trong Debug Panel.
- **[CHƯA TRA]** thuộc phase sau, chưa nghiên cứu.

**Phạm vi thật của lần nghiên cứu này:** 2 lượt tìm kiếm web (Liquid Glass ở iOS 27; thông số iPhone 18 Pro Max), đối chiếu 20 ảnh, đọc mã của repo. Các yêu cầu 7, 8, 11, 12, 13, 14, 20 chưa được tra cứu; chúng nằm ở Phase 3–4 và sẽ được nghiên cứu ngay trước khi làm.

---

## 1. Sửa lại các điểm trong prompt gốc

Ba chỗ prompt đang nói khác với nguồn hoặc ảnh. Nên sửa trước khi giao cho AI viết code, nếu không nó sẽ làm theo chỗ sai.

### 1.1 Thanh trượt Liquid Glass của iOS 27 là **một thanh trượt duy nhất**, không có ô Trong suốt/Mặc định/Pha màu

- Prompt (mục 4.2) yêu cầu phân đoạn **Clear / Mặc định / Tinted + thanh trượt 0–100**.
- Nguồn nói: iOS 26 có hai lựa chọn Clear và Tinted; iOS 27 **thay hai lựa chọn đó bằng một thanh trượt**, nằm ở **Cài đặt › Giao diện (Appearance) › Liquid Glass**; vị trí **giữa là mặc định của Apple**; kéo trái trong hơn, kéo phải đục và pha màu hơn. Apple mô tả "từ cực trong đến pha màu hoàn toàn". Thanh trượt cũng xuất hiện ở màn hình thiết lập ban đầu.
- Ảnh 11 (Cài đặt, đoạn giữa) có hàng **Giao diện**, khớp với nguồn.
- **Đề xuất:** một thanh trượt 0–100, mặc định 50, không có phân đoạn. Biến CSS điều khiển độ trong, blur, tint, tương phản chữ cùng lúc như prompt đã mô tả. Giữ "Giảm độ trong" (Reduce Transparency) và "Tăng tương phản" trong Trợ năng, vì nguồn nói Liquid Glass tự thích ứng với hai cài đặt này.
- Nguồn: MacRumors "How Liquid Glass Is Changing in iOS 27" (macrumors.com/2026/06/10/how-liquid-glass-is-changing-in-ios-27), MacRumors "Tone Down Liquid Glass Transparency" (macrumors.com/how-to/ios-27-tone-down-liquid-glass-transparency), 9to5Mac 15/06/2026 (9to5mac.com/2026/06/15/ios-27-adds-new-liquid-glass-slider-on-iphone-heres-what-it-lets-you-do/), BGR (bgr.com/2191219/ios-27-liquid-glass-fix-customization/). **[ĐÃ XÁC MINH]**, nhiều nguồn khớp nhau.

### 1.2 Dynamic Island của iPhone 18 Pro Max: ≈ 100pt, không phải 126pt

- Prompt (mục 4.1) đặt 126×37pt và gắn [XÁC MINH].
- Một nguồn (Ubergizmo, bài công bố iPhone 18 Pro) nói Island nhỏ đi khoảng 20% còn **16,57 mm** nhờ Face ID dưới màn hình, và iOS 27 hiển thị **tối đa 3 Live Activity cùng lúc**. Với màn hình rộng 72,9 mm ứng với 440pt (≈ 6,04pt/mm), 16,57 mm ≈ **100pt**. Repo hiện đã dùng 100×30 và comment cũng ghi 16,57 mm nên repo đúng hơn prompt ở chiều rộng.
- Các nguồn tin đồn trước đó nói giảm 25–35% (rộng khoảng 13,5 mm), không khớp nhau và không khớp với bài công bố. **Chiều cao 30pt vẫn là [GIẢ ĐỊNH].**
- Nguồn: ubergizmo.com/2026/09/apple-unveils-iphone-18-pro-and-pro-max-smaller-dynamic-island-bigger-batteries/ (một nguồn duy nhất cho 16,57 mm; nên đối chiếu thêm bằng ảnh máy thật khi có). **[ĐÃ XÁC MINH một phần]**.
- **Đề xuất:** `island: { w: 100, h: 30, y: 11 }` trong `DeviceProfile`, chỉnh được trong Debug Panel.

### 1.3 Số thứ tự ảnh

Ảnh bạn gửi lần đầu bị xáo thứ tự. Đã đối chiếu: ảnh `n` trong prompt = file `preview (20−n)`; ảnh 20 là `preview.webp` (màn hình khoá simulator hiện tại), bạn đã gửi bổ sung. Bảng đầy đủ nằm trong tin nhắn trả lời; nên đổi tên file thành `01.webp`…`20.webp`.

---

## 2. Thông số thiết bị

| Thông số | Giá trị | Mức | Nguồn |
|---|---|---|---|
| Màn hình | 6,9", 2868×1320 px, 460 ppi, 120 Hz LTPO | ĐÃ XÁC MINH | Ubergizmo; MacRumors (kích thước giữ nguyên 6,3"/6,9") |
| Điểm logic | 440×956 pt @3x | Suy ra từ 1320/3 và 2868/3 | — |
| Thân máy | 163,4 × 78,0 × 8,75 mm (≈ 13,13 mm gồm cụm camera) | ĐÃ XÁC MINH (PhoneArena, bảng so sánh) | phonearena.com/reviews/apple-iphone-18-pro-max-vs-iphone-17-pro-max_id7931 |
| Bán kính góc màn hình | 62pt (repo) | GIẢ ĐỊNH, cần đo trên ảnh khung máy thật | — |
| Dynamic Island | 100 × 30pt, cách mép trên 11pt | Chiều rộng ĐÃ XÁC MINH một nguồn; cao và vị trí GIẢ ĐỊNH | mục 1.2 |
| Màu máy | Repo có Đen/Bạc/Băng/Burgundy. Một nguồn nhắc màu mới **Dark Cherry** | Màu tên gọi chưa kiểm | PhoneArena |
| Chip, RAM | A20 Pro, 12 GB (trang Giới thiệu) | Có trong nhiều nguồn, mức tin đồn/tin công bố chưa phân biệt | — |

Ghi chú: các bài viết về iPhone 18 Pro có lẫn nhiều tin đồn từ trước ngày công bố; chỉ nên dùng làm giá trị khởi điểm, hiệu chỉnh lại bằng ảnh máy thật.

---

## 3. Quan sát từ 20 ảnh tham chiếu [ẢNH]

### 3.1 Bàn phím Phone (ảnh 1) — đo trực tiếp

| Đại lượng | Ảnh máy thật | Repo hiện tại | Chênh |
|---|---|---|---|
| Đường kính phím số | ≈ 120px ≈ **89pt** | 84pt | −5pt |
| Bước giữa các cột | ≈ 153,5px ≈ **114,5pt** | ≈ 106,5pt | −8pt |
| Bước giữa các hàng | ≈ 148px ≈ **110pt** | ≈ 98pt | −12pt |
| Nút gọi xanh | ≈ 121px ≈ **90pt** | 84pt | −6pt |
| Nền | tối, kính trong mờ trên nền đen | sáng (`--bg2`), mặc định theme "light" | khác chủ đề |
| Thanh tab dưới | viên thuốc kính 3 tab (Cuộc gọi, Danh bạ, Bàn phím) + **nút Tìm kiếm tròn tách riêng bên phải** | thanh 3 tab (Yêu thích, Gần đây, Bàn phím), không có nút Tìm kiếm | khác nhãn và bố cục |

Khớp với số trong prompt (88 / 115 / 110 / 90). Đặt các số này làm giá trị khởi điểm trong `DeviceProfile`/CSS token và hiệu chỉnh bằng Debug Panel.

### 3.2 Các điểm bố cục đáng chú ý (đã đối chiếu mô tả trong prompt với ảnh thật)

| Ảnh | Quan sát | Khớp prompt? |
|---|---|---|
| 1 (Phone) | Ảnh đang chụp lúc giữ-kéo trên tab bar: thấu kính phóng đại có viền khúc xạ **xanh dương** ở tab Bàn phím; hai tab còn lại bị che một phần | Khớp |
| 2 (Tin nhắn) | Nút **Sửa** và nút lọc dạng kính ở trên; thanh tìm kiếm kính nổi + nút soạn tin tròn ở dưới; chấm xanh chưa đọc | Khớp |
| 3 (Spotlight) | "Gợi ý của Siri" 4 app, mục "Thư giãn" gợi ý từ Safari, ô tìm kiếm kính ngay trên bàn phím có nhãn **VI EN** trên phím cách | Khớp. Chú ý nhãn mục Safari là "Thư giãn" chứ không phải "Danh sách đọc/Lịch sử" |
| 4 (Thư viện ứng dụng) | Thư mục 2 cột; nền thư mục là kính tối ăn màu tím của hình nền. Ô **Gợi ý** có 4 icon lớn; các ô còn lại có 3 icon lớn (2 trên, 1 dưới) + cụm 4 icon nhỏ | Khớp (prompt nói "Gợi ý có thể 4 icon lớn") |
| 5 (Khoá) | Ổ khoá trong Island; Live Activity dạng thẻ kính đỏ sẫm (Duolingo: chuỗi 29 ngày, đếm 1:08:34); nút đèn pin/camera kính tròn; ở giữa hai nút là biểu tượng tai nghe + tên thiết bị âm thanh | Khớp |
| 6 (App switcher) | Nhãn app (icon + tên) **nằm phía trên** thẻ; thẻ bo góc lớn; Island hiện Live Activity | Khớp |
| 7–8 (Safari) | Trang khởi đầu có thẻ Phần mở rộng, Mục ưa thích, Danh sách đọc; thanh 4 nút ở trên cùng; khi focus ô địa chỉ hiện "Tìm kiếm gần đây" + nút ✕ bên phải | Khớp |
| 9 (Home + AssistiveTouch) | Menu AssistiveTouch là **ô kính bo tròn lớn** với 6 mục (Tìm kiếm hình ảnh, Music Finder, Xoay màn hình, Mở khoá xoay màn hình, Tắt tiếng, Google Dịch); nút "Tìm kiếm" nhỏ phía trên Dock; huy hiệu đỏ "25" trên Tin nhắn | Khớp |
| 10–12 (Cài đặt) | Có dòng "Có bản cập nhật phần mềm" huy hiệu 1; **Giao diện** nằm giữa Chế độ chờ và Hình nền; "Màn hình chính & Thư viện ứng dụng" xuống 2 dòng; thanh tìm kiếm kính nổi dưới cùng | Khớp |
| 13 (Home trang 2) | Lưới 4 cột; huy hiệu đỏ số lớn (2.761, 3.404…) có dấu chấm ngăn nghìn kiểu Việt | Khớp |
| 14 (TikTok) | Tab trên: Live / Cộng đồng / Lân cận / Bạn bè / Đã follow / Đề xuất; tab dưới 5 mục có nút "+" ở giữa; dòng "Tìm kiếm · …" phía trên tab; nhãn thông báo hồng "42 · 6 · 1" | Khớp |
| 15–17 (Control Center) | 3 trang xếp dọc; ba chấm ở mép phải: ♥ (Yêu thích), ♪ (Nhạc), ((•)) (Kết nối). Trang chính: cụm kết nối 2×2 (máy bay, AirDrop; Wi-Fi to xanh; cụm 4 nút nhỏ di động/Bluetooth/hotspot/VPN), thẻ nhạc "Không phát", khoá xoay (đỏ-hồng), phản chiếu màn hình, hai thanh dọc sáng/âm lượng, ô tai nghe, đèn pin, quét QR (vàng), AirDrop (xanh), ghi màn hình, báo thức, pin, chế độ tối (trắng), nghe, ô rộng "Mở Cài đặt Ứng dụng" | Khớp |
| 18–20 (simulator) | Hiện trạng: ô kính nhạt, icon phẳng; màn hình khoá có hai thông báo ("Dat514", "Calendar") và chưa có Live Activity | — |

Điểm cần lưu ý mà prompt chưa nói rõ: **ngày trong ảnh simulator là Thứ Bảy 31/10**; ảnh máy thật chụp 22:34–22:54 cùng ngày, giờ ở góc trái là kiểu 24 giờ ("22:48"), ngày dùng định dạng Việt (`15/10/26`).

### 3.3 Thanh trạng thái ở ảnh máy thật

Giờ hiển thị 24 giờ ("22:44"); bên phải có Wi-Fi và pin dạng **ô chữ nhật có số %** (ví dụ 81). Khi Island đang mở rộng thành Live Activity (ảnh 2, 4, 14…), vùng giữa của thanh trạng thái rộng ra rất nhiều, nên bố cục trạng thái phải co giãn theo kích thước Island chứ không cố định.

---

## 4. Liquid Glass: nguyên tắc vật liệu

| Điều | Mức | Nguồn / ghi chú |
|---|---|---|
| Liquid Glass gồm lớp khúc xạ ở rìa (như thấu kính), phản chiếu specular, và thích ứng với nền; có thể thay đổi độ trong bằng người dùng ở iOS 27 | ĐÃ XÁC MINH (phần slider/thích ứng) | MacRumors/9to5Mac ở mục 1.1 |
| Repo đã dùng kỹ thuật displacement map + định luật Snell + bề mặt "squircle" (nguồn ghi trong comment đầu `glass.js`: kube.io / Glisse / liquid-web) | ĐÃ ĐỌC | `js/glass.js` |
| Chỉ Blink cho phép SVG filter làm `backdrop-filter`; Safari/Firefox phải dùng blur + viền gradient + (đề xuất) "magnifier clone" | ĐÃ ĐỌC trong code; hành vi trình duyệt chưa kiểm lại trong lần này, **cần kiểm trên Safari thật** | — |
| HIG "Materials", tài liệu Liquid Glass của Apple, phiên WWDC25 "Meet Liquid Glass", các phiên WWDC26 | TRÍ NHỚ / CHƯA TRA LẠI | Cần đọc trước Phase 1 để chốt thông số blur, độ dày, tương phản |
| Tán sắc xanh/đỏ ở viền khi giữ-kéo thấu kính (ảnh 1) | ẢNH | Repo có `ca` (chromatic aberration) nhưng mặc định 0 và tắt trên cảm ứng |

---

## 5. Tham số khởi điểm (đều phải chỉnh được trong Debug Panel)

| Nhóm | Tham số | Giá trị | Mức |
|---|---|---|---|
| Spring | snappy (response · damping) | 0,35 · 0,86 | GIẢ ĐỊNH (prompt) |
| Spring | default | 0,50 · 0,825 | GIẢ ĐỊNH (prompt); repo `open` = 0,50 · 0,90 |
| Spring | bouncy | 0,45 · 0,70 | GIẢ ĐỊNH (prompt); repo `bouncy` giống |
| Spring | gentle | 0,60 · 1,00 | GIẢ ĐỊNH (prompt) |
| Rubber-band | hệ số | 0,55 | Công thức UIKit; dùng bản trong `util.js`, bỏ bản `tanh` |
| Kính | blur nền | 14px (CSS) + `data-glass-blur` theo từng phần tử | Repo hiện tại, GIẢ ĐỊNH |
| Kính | thanh trượt Liquid Glass mặc định | 50 | ĐÃ XÁC MINH (điểm giữa là mặc định) |
| Phone | Ø phím · bước cột · bước hàng · Ø nút gọi | 89 · 114,5 · 110 · 90 pt | ẢNH (mục 3.1) |
| Island | kích thước · vị trí | 100×30pt · y = 11pt | Rộng: ĐÃ XÁC MINH một nguồn; cao và y: GIẢ ĐỊNH (mục 1.2) |
| Control Center | lưới | 4 cột × 91pt, gap 12pt, bo 30pt | Repo hiện tại; cần đo lại trên ảnh 15–17 |
| Tab bar | kích thước | cao 66pt, cách mép dưới 30pt, bo 33pt | Repo hiện tại; cần đo lại trên ảnh 1 |

---

## 6. Việc chưa tra (kèm kế hoạch)

| Yêu cầu | Cần tra | Nguồn dự kiến |
|---|---|---|
| 1, 16, 17 | Thứ tự và độ trễ so le khi mở khoá/mở app | Video quay chậm iOS 26/27; cần bạn quay màn hình máy thật 120 fps nếu có |
| 5 | Tab bar thu gọn khi cuộn ở app nào của iOS 27 | Video review iOS 27 |
| 7, 11, 20 | Animation Island: cuộc gọi, quét Face ID khi tải app, bật đèn pin | Video iPhone 17/18 Pro; ảnh 5, 6 cho Live Activity |
| 8 | TikTok: điều khoản nhúng, `oEmbed`, API; Phương án A/B trong prompt | Tài liệu nhà phát triển TikTok; không scrape trái điều khoản |
| 12 | Siri iOS 27 (kiểu mới) và iOS 26; vùng "Search or Ask" ở giữa mép trên | Bài tổng hợp iOS 27 beta, video |
| 13 | AssistiveTouch trên iOS 27 (ảnh 9 là nguồn chính) | Ảnh + video |
| 14 | Safari: cách làm "dùng được thật" khi trang cấm nhúng iframe (proxy phía server, mở tab mới, hay chỉ trang do mình chọn) | Cân nhắc kĩ về bảo mật/điều khoản trước khi chọn |
| 18, 19 | Nội dung nhóm Thư viện ứng dụng theo ảnh 4; kết quả Spotlight iOS 27 | Ảnh 3, 4 |

---

## 7. Quyết định đã chốt (01/11/2026)

1. **Ngôn ngữ:** người dùng chọn được **Tiếng Việt hoặc English** trong Cài đặt › Cài đặt chung › Ngôn ngữ & Vùng. Mặc định Tiếng Việt. Đổi ngôn ngữ lưu lại rồi tải lại giao diện (giống iOS khởi động lại giao diện). Đã có nền i18n (`js/core/i18n.js`); phần còn lại của app sẽ được dịch dần theo từng phase.
2. **Safari:** chấp nhận giới hạn: trang cho phép nhúng thì hiện trong khung, trang cấm nhúng thì mở bằng tab mới. Không dùng proxy, nên chạy được trên GitHub Pages thuần.
3. **TikTok:** **Phương án A** (trình phát nhúng chính thức `tiktok.com/embed/v2/<id>`, danh sách ID cấu hình trong `config.js`, tối đa 3 iframe trong DOM). Khi embed lỗi hoặc mất mạng, tự chuyển sang Phương án B (video mẫu hợp pháp, cùng giao diện) như prompt mô tả. Việc tra điều khoản và khả năng `postMessage` của embed làm ngay trước Phase 4.
