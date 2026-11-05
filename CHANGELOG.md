# Changelog

## 2.0.0-alpha.9 (2026-11-05)
- Màn hình khoá theo ảnh thật: ổ khoá nằm trong Dynamic Island (viên dài, ổ khoá bên trái), ẩn thanh trạng thái, hai nút đèn pin và camera cùng tối, bỏ dòng chữ hướng dẫn.
- Trình chuyển app theo ảnh thật: thẻ cao ~70% màn hình, bo góc 46pt, thẻ chồng lên nhau, nhãn (icon nhỏ + tên) căn trái phía trên mỗi thẻ.

## 2.0.0-alpha.8 (2026-11-03)
- Đối chiếu với 4 ảnh iPhone thật bạn gửi (Thư viện ứng dụng, màn hình khoá, chuyển app, Spotlight) và sửa phần khác biệt lớn nhất:
- Spotlight bố cục lại theo iOS 26: "Gợi ý của Siri" + "Hiển thị thêm", thẻ kính 4 app, mục "Thư giãn", ô tìm kiếm kính nằm sát bàn phím; nền tối mờ.
- Bàn phím: chữ thường (ô tìm kiếm không tự viết hoa), nhãn "VI EN" trên phím cách, giao diện tối khi bật chế độ tối, nằm trên lớp Spotlight (trước đó bị làm mờ).
- Thư viện ứng dụng: thư mục tối và gần đặc, nhãn đậm hơn, ẩn dấu trang.

## 2.0.0-alpha.7 (2026-11-03)
- Mở khoá (yêu cầu 1/17): widget và icon hiện lần lượt từ trên xuống (độ trễ theo hàng/cột), mỗi icon đi từ lớn + mờ về đúng cỡ; Dock và dấu trang hiện sau cùng. Chạy theo ngón tay khi kéo và theo spring khi thả.

## 2.0.0-alpha.6 (2026-11-03)
- App Store (yêu cầu 11): 3 tab (Hôm nay, Ứng dụng, Tìm kiếm), trang chi tiết, API mở rộng `AppStore.register({...})`. Hiện có TikTok (chưa cài).
- Luồng cài đặt: Nhận → Cài đặt → lớp "Nhấn đúp để cài đặt" với vạch xanh ở nút Side → nhấn đúp (nút Side, Shift hai lần, hoặc chạm đúp vạch xanh) → Face ID vẽ nét trong Dynamic Island, dấu ✓ khi thành công, lắc khi thất bại rồi nhập mật mã (Cài đặt › Face ID & Mật mã › Mô phỏng thất bại) → icon mờ có vòng tiến độ trên Màn hình chính (Đang chờ → Đang tải → Đang cài đặt) → hiệu ứng pop. Trạng thái cài đặt được lưu; xoá app ở chế độ sửa đưa nó về đám mây.
- App chưa cài không mở được và không hiện trong Spotlight.
- Sửa lỗi C4 một phần: khi chuyển cảnh bị ngắt, cửa sổ app cũ không còn sót lại sau khi về màn hình chính.
- TikTok hiện là màn hình tạm; trình phát nhúng (phương án A) làm ở bước sau.

## 2.0.0-alpha.5 (2026-11-03)
- AssistiveTouch (yêu cầu 13): nút kính kéo được, tự hít cạnh trái/phải và lưu vị trí, mờ sau 3 giây; bấm mở menu 6 ô theo ảnh 9 (Tìm kiếm hình ảnh, Music Finder, Xoay màn hình, Khoá xoay, Tắt tiếng, Google Dịch), bấm đúp về màn hình chính, nhấn giữ gọi Siri. Bật/tắt ở Cài đặt › Trợ năng.
- Siri (yêu cầu 12): hai kiểu, iOS 27 (viên sáng nở ra từ Dynamic Island) và iOS 26 (vầng sáng chạy quanh viền), đổi ở Cài đặt › Siri. Gọi bằng phím S, giữ nút Side 0,7 giây, AssistiveTouch hoặc "Xem thử". Hiểu lệnh tiếng Việt/Anh: mở app, đèn pin, chế độ tối/sáng, Wi-Fi, Bluetooth, chế độ máy bay, độ sáng/âm lượng theo %, mấy giờ, ngày. Có ô gõ chữ và nhận giọng nói nếu trình duyệt hỗ trợ.

## 2.0.0-alpha.4 (2026-11-02)
- **Sửa lỗi nghiêm trọng của alpha.3:** `js/version.js` bị ghi rỗng khi đóng gói nên app không khởi động. Đã khôi phục; quy trình đóng gói giờ chạy test khói trên chính bản zip đã giải nén.
- Cài đặt viết lại theo ảnh 10-12: 31 hàng, thanh tìm kiếm kính nổi ở dưới (lọc không dấu), huy hiệu cập nhật, trang Giao diện mới với thanh trượt Liquid Glass duy nhất (chuyển từ Màn hình & Độ sáng, theo iOS 27), mọi hàng đều mở được trang con.
- "Giảm độ trong" trong Trợ năng hoạt động thật (làm kính đục hơn trên toàn hệ thống). Các công tắc khác trong trang con chỉ lưu trạng thái, chưa điều khiển hành vi.

## 2.0.0-alpha.3 (2026-11-02)
- Control Center 3 trang dọc (Yêu thích / Nhạc / Kết nối), chấm chuyển trang ở mép phải, vuốt dọc để đổi trang; trang Nhạc có thanh âm lượng ngang; trang Kết nối có 7 nút (thêm AirDrop, Điểm truy cập cá nhân, VPN).
- Đèn pin hiện trên Dynamic Island (chấm vàng), bấm vào để tắt. Hành vi này là giả định, chưa đối chiếu máy thật.
- Test khói chờ animation dừng hẳn trước khi đo (hết lỗi chập chờn ở app Ảnh).

## 2.0.0-alpha.2 (2026-11-01)
- Phone viết lại theo ảnh 1: tab Cuộc gọi / Danh bạ / Bàn phím chạy thật, nút Tìm kiếm tròn, phím 89pt (bước 114,5 × 110pt), nút gọi 90pt.
- Thư viện ứng dụng (vuốt trái hết cỡ): 6 thư mục, bấm icon để mở app, Dock ẩn ở trang này.

## 2.0.0-alpha.1 (2026-11-01)
- Sửa giao diện Phone (trùng class `.phone`).
- Khung máy luôn bo góc trên điện thoại, nền ngoài đen; hỗ trợ manifest + standalone.
- i18n Tiếng Việt / English, đổi trong Cài đặt › Cài đặt chung › Ngôn ngữ & Vùng.
- Thêm `js/version.js`, hiển thị trong Giới thiệu và console.
- Thêm test khói `tests/smoke.mjs`.
