# Hệ thống Điểm danh & Thời khóa biểu CNTT - K19 CĐ

Hệ thống web production-ready toàn diện phục vụ quản lý chuyên cần, thời khóa biểu, điểm danh bằng ảnh chụp Zoom OCR và đồng bộ trực tiếp với Google Sheets dành cho lớp **CNTT - K19 CĐ**.

---

## 🌟 Tính Năng Nổi Bật

1. **Kết nối Google Sheets hai chiều**:
   - Đọc tự động các sheet `DANH SÁCH LỚP`, `TKB`, `DD CHÍNH TRỊ`, `DD TIN HỌC`, `DD TIẾNG ANH`, `DD GDTC` và bất kỳ sheet `DD *` nào mới thêm.
   - Cơ chế ghi cell chính xác theo cột Lần và hàng sinh viên mà không ghi đè toàn bộ sheet, không phá công thức, không đổi thứ tự dòng.
   - Cache thông minh 45 giây với nút "Đồng bộ ngay" tức thì.
2. **Điểm danh bằng ảnh chụp Zoom OCR**:
   - Tải lên nhiều ảnh chụp danh sách người tham gia Zoom cùng lúc (PNG, JPG, WEBP, HEIC từ điện thoại/máy tính).
   - Tự động tách tên tiếng Việt, loại bỏ các nhãn `K19`, `CNTT`, `CĐ`, trích xuất ngày sinh.
   - Thuật toán Fuzzy Matching tiếng Việt có dấu và không dấu, chấm điểm độ tin cậy (`>=90%` Khớp, `75-89%` Kiểm tra, `<75%` Chưa khớp).
   - Tự động học từ các lần xác nhận của Admin thông qua bảng alias `_SYS_ZOOM_ALIAS`.
   - Phát hiện xung đột dữ liệu cũ (ví dụ ô đang có `P` vs OCR `X`) và hiển thị preview trước khi ghi.
3. **Quản lý Môn học & Tự động tạo Sheet**:
   - Thêm môn học mới mọi lúc trên giao diện Admin.
   - Tự động nhân bản sheet `MẪU MÔN HỌC` thành `DD <TÊN MÔN>` và nạp 100% sinh viên Active từ `DANH SÁCH LỚP` mà không cần sửa source code.
4. **Thời khóa biểu & Tiết học**:
   - Xem TKB dạng danh sách và dạng tuần trực quan.
   - Nút "VÀO LỚP" trực tiếp mở link Zoom/Google Meet.
   - Quản lý tiết học và tự động tính khung giờ bắt đầu - kết thúc từ dải tiết chọn.
   - Tạo lịch học lặp hàng loạt nhanh chóng.
5. **Kiểm tra Toàn vẹn Dữ liệu (Data Health)**:
   - Tự động quét lỗi `#REF!`, `#VALUE!`, học viên chưa map, ngày học trùng lặp và đưa ra cảnh báo mà không tự ý sửa file Excel.
6. **Bảo mật & Phân quyền**:
   - Phân quyền `VIEWER` (chỉ xem, bảo vệ riêng tư CCCD/SĐT) và `ADMIN` (toàn quyền).
   - Xác thực Admin bằng JWT Session bảo mật qua cookie HttpOnly.

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Môi Trường Local

### 1. Yêu cầu hệ thống
- Node.js version 18.17 trở lên (khuyên dùng Node 20+)
- npm version 9+

### 2. Cài đặt các gói phụ thuộc
```bash
git clone <repository-url>
cd "diem danh"
npm install
```

### 3. Cấu hình biến môi trường
Tạo file `.env.local` từ mẫu `.env.example`:
```bash
cp .env.example .env.local
```

Điền các thông tin trong `.env.local`:
```env
NEXT_PUBLIC_APP_NAME="CNTT K19 CĐ"
GOOGLE_SHEET_ID="1nXlSGJq9DlsHsf4YFkw4ZiqQpZ2y8b4_h_EiHbhX9ec"

# Service Account Google Sheets (để ghi dữ liệu)
GOOGLE_SERVICE_ACCOUNT_EMAIL="your-service-account@project.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# Mật khẩu Admin
AUTH_SECRET="chuoi-bi-mat-jwt-tu-chon"
ADMIN_PASSWORD="admin123"

# Google Cloud Vision OCR (Tùy chọn)
GOOGLE_CLOUD_VISION_API_KEY=""
```

### 4. Chạy ứng dụng ở chế độ phát triển
```bash
npm run dev
```
Truy cập ứng dụng tại: `http://localhost:3000`

---

## 🔑 Hướng Dẫn Cấu Hình Google Sheets Service Account

Để ứng dụng có thể ghi điểm danh và tự động tạo sheet môn mới vào Google Sheets:
1. Truy cập [Google Cloud Console](https://console.cloud.google.com/).
2. Tạo một Project mới (ví dụ: `cntt-k19-attendance`).
3. Bật **Google Sheets API** trong mục **APIs & Services** > **Library**.
4. Vào mục **IAM & Admin** > **Service Accounts** > Chọn **Create Service Account**.
5. Đặt tên (ví dụ: `sheets-writer`), bấm **Create and Continue**.
6. Vào tab **Keys** của Service Account vừa tạo > **Add Key** > **Create new key** > Chọn định dạng **JSON** và tải file về.
7. Mở file JSON và copy:
   - `client_email` dán vào `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` dán vào `GOOGLE_PRIVATE_KEY`
8. **QUAN TRỌNG NHẤT**: Mở Google Spreadsheet `1nXlSGJq9DlsHsf4YFkw4ZiqQpZ2y8b4_h_EiHbhX9ec`, bấm nút **Chia sẻ (Share)** ở góc phải trên, thêm email Service Account với quyền **Người chỉnh sửa (Editor)**.

---

## ☁️ Hướng Dẫn Deploy Lên Vercel

1. Đẩy mã nguồn lên GitHub/GitLab.
2. Đăng nhập [Vercel](https://vercel.com/) và bấm **Add New Project**.
3. Chọn repository chứa mã nguồn dự án.
4. Trong phần **Environment Variables**, cấu hình đầy đủ các biến:
   - `GOOGLE_SHEET_ID`
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY` (chú ý giữ đúng ký tự `\n` hoặc dán toàn bộ key)
   - `AUTH_SECRET`
   - `ADMIN_PASSWORD`
   - `GOOGLE_CLOUD_VISION_API_KEY` (nếu có)
5. Bấm **Deploy**. Sau 1-2 phút, hệ thống sẽ sẵn sàng chạy trên production!

---

## 🧪 Chạy Kiểm Thử (Unit Tests)

```bash
npm run test
```
Bộ kiểm thử bao gồm:
- Tính toán điểm danh theo chuẩn yêu cầu (X X X -> 100%, X X M -> 66.7%, X P M -> 33.3%, bỏ qua buổi trống).
- Chuẩn hóa tên tiếng Việt và loại bỏ dấu.
- Bóc tách chuỗi tên Zoom và thuật toán Fuzzy Matching.
- Phát hiện và giải quyết xung đột dữ liệu.
- Kiểm tra loại trừ sinh viên chưa tham gia môn ("Không áp dụng").
