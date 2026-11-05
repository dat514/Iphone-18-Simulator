import { store } from "./util.js";

/** i18n tối giản: khoá là câu tiếng Anh; thiếu bản dịch thì trả lại chính nó. Đổi ngôn ngữ = lưu + tải lại (giống iOS khởi động lại giao diện). */
export const LOCALES = [["vi", "Tiếng Việt"], ["en", "English"]];
export const locale = store.get("locale", "vi");
export const LOC = locale === "vi" ? "vi-VN" : "en-US";
document.documentElement.lang = locale;

const VI = {"Bluetooth":"Bluetooth","AirDrop":"AirDrop","Personal Hotspot":"Điểm truy cập cá nhân","VPN":"VPN","On":"Bật","Off":"Tắt","Not Playing":"Không phát","Calls":"Cuộc gọi","Contacts":"Danh bạ","Keypad":"Bàn phím","Missed":"Nhỡ","Outgoing":"Gọi đi","Unknown":"Không rõ","calling…":"đang gọi…","App Library":"Thư viện ứng dụng","Suggestions":"Gợi ý","Recently Added":"Đã thêm gần đây","Social":"Xã hội","Entertainment":"Giải trí","Utilities":"Tiện ích","Productivity & Finance":"Hiệu suất & Tài chính",
 "Phone": "Điện thoại",
 "Messages": "Tin nhắn",
 "Music": "Nhạc",
 "Photos": "Ảnh",
 "Clock": "Đồng hồ",
 "Calendar": "Lịch",
 "Notes": "Ghi chú",
 "Calculator": "Máy tính",
 "Settings": "Cài đặt",
 "Weather": "Thời tiết",
 "Maps": "Bản đồ",
 "Wallet": "Ví",
 "Health": "Sức khỏe",
 "Files": "Tệp",
 "Stocks": "Chứng khoán",
 "Translate": "Dịch thuật",
 "Home": "Nhà",
 "Reminders": "Lời nhắc",
 "Compass": "La bàn",
 "Airplane Mode": "Chế độ máy bay",
 "Wi-Fi": "Wi-Fi",
 "Cellular": "Di động",
 "Notifications": "Thông báo",
 "Sounds & Haptics": "Âm thanh & Cảm ứng",
 "Focus": "Tập trung",
 "General": "Cài đặt chung",
 "Control Center": "Trung tâm điều khiển",
 "Display & Brightness": "Màn hình & Độ sáng",
 "Home Screen & App Library": "Màn hình chính & Thư viện ứng dụng",
 "Wallpaper": "Hình nền",
 "Device Color": "Màu thiết bị",
 "About": "Giới thiệu",
 "Software Update": "Cập nhật phần mềm",
 "Language & Region": "Ngôn ngữ & Vùng",
 "Language": "Ngôn ngữ",
 "Search": "Tìm kiếm",
 "Cancel": "Hủy",
 "No Results": "Không có kết quả",
 "Siri Suggestions": "Gợi ý của Siri",
 "Applications": "Ứng dụng",
 "Swipe up to open": "Vuốt lên để mở",
 "Done": "Xong",
 "Edit Home Screen": "Sửa màn hình chính",
 "Open": "Mở",
 "Name": "Tên",
 "iOS Version": "Phiên bản iOS",
 "Simulator Version": "Phiên bản Simulator",
 "Model Name": "Tên model",
 "Appearance": "Giao diện",
 "Light": "Sáng",
 "Dark": "Tối",
 "Brightness": "Độ sáng",
 "Silent Mode": "Chế độ im lặng",
 "UI Sounds": "Âm thanh giao diện",
 "No events today": "Không có sự kiện hôm nay",
 "Mostly Cloudy": "Nhiều mây",
 "Ho Chi Minh City": "Hồ Chí Minh",
 "Liquid Glass": "Liquid Glass",
 "Clear": "Trong",
 "Tinted": "Pha màu"
};

export const t = (s) => (locale === "vi" && VI[s]) || s;
export function setLocale(l) {
    if (l === locale) return;
    store.set("locale", l);
    document.body.classList.add("restarting");
    setTimeout(() => location.reload(), 350);
}
