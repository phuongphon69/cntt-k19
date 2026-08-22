# Báo Cáo Phân Tích Cấu Trúc Google Sheets Thực Tế

- **Spreadsheet URL**: `https://docs.google.com/spreadsheets/d/1nXlSGJq9DlsHsf4YFkw4ZiqQpZ2y8b4_h_EiHbhX9ec/edit`
- **Spreadsheet ID**: `1nXlSGJq9DlsHsf4YFkw4ZiqQpZ2y8b4_h_EiHbhX9ec`
- **Lớp**: CNTT - K19 CĐ
- **Thời gian phân tích**: 22/08/2026

---

## 1. Các Sheet Đã Phát Hiện Trong Workbook

1. `TKB` (Thời khóa biểu các buổi học)
2. `DANH SÁCH LỚP` (Danh sách học viên chính thức của lớp)
3. `CNTT - K19` (Danh sách chi tiết có CCCD, nơi sinh, SĐT)
4. `DD CHÍNH TRỊ` (Sheet điểm danh môn Chính trị)
5. `DD TIN HỌC` (Sheet điểm danh môn Tin học)
6. `DD TIẾNG ANH` (Sheet điểm danh môn Tiếng Anh)
7. `DD GDTC` (Sheet điểm danh môn Giáo dục thể chất)
8. `MẪU MÔN HỌC` (Sheet template chuẩn để nhân bản khi thêm môn mới)
9. `TỔNG HỢP` (Bảng tổng hợp tham khảo)
10. Các sheet hệ thống khởi tạo động: `_SYS_STUDENT_MAP`, `_SYS_ZOOM_ALIAS`, `_SYS_MON_HOC`, `_SYS_TIET_HOC`, `_SYS_THOI_KHOA_BIEU`, `_SYS_CAU_HINH`, `_SYS_AUDIT_LOG`.

---

## 2. Cấu Trúc Sheet Roster: `DANH SÁCH LỚP`

- **Hàng bắt đầu học viên**: Hàng 4 (sau header hàng 1-3)
- **Các cột**:
  - `A`: STT
  - `B`: HỌ VÀ
  - `C`: TÊN
  - `D`: NGÀY SINH
  - `E`: NƠI SINH
  - `F`: VĂN BẰNG / NGÀNH HỌC
  - `G`: NGÀY TỐT NGHIỆP
  - `H`: SỐ ĐIỆN THOẠI (Bảo mật riêng tư, không public ra API)
  - `I`: NGÀNH ĐĂNG KÝ
  - `J`: HỆ HỌC (CQ, LT)
  - `K`: NGÀY VÀO NHÓM LỚP
  - `L`: GHI CHÚ
  - `M`: TỔNG X HIỆN TẠI
- **Quy tắc tạo họ tên đầy đủ**: `fullName = `${hoVa} ${ten}`.trim()`, loại bỏ khoảng trắng thừa.
- **Quy tắc tạo student_id**: Bỏ dấu tiếng Việt, viết thường, thay khoảng trắng bằng dấu gạch dưới (e.g. `nguyen_van_chung`).

---

## 3. Cấu Trúc Các Sheet Điểm Danh (`DD *`)

### Hàng 1: Metadata môn học
- `B1`/`A1`: Tên môn học (e.g. "Chính trị", "Tin học", "Tiếng Anh", "Giáo dục thể chất")
- `D1`: Tên giảng viên phụ trách
- `F1`: Số buổi học dự kiến (e.g. 10, 12, 16, 3)
- Chú thích: `X = Có mặt`, `P = Có phép`, `M = Muộn`, `% = Tỷ lệ có mặt X / 3`

### Hàng 2: Header thông tin SV & Ngày học
- `A2`: STT
- `B2`: HỌ VÀ TÊN
- `C2`: NGÀY SINH
- `D2`: HỆ HỌC
- `E2`: NGÀY VÀO NHÓM
- `F2 trở đi`: Ngày học của từng buổi (mỗi buổi chiếm 4 cột: Cột 1 = LẦN 1, Cột 2 = LẦN 2, Cột 3 = LẦN 3, Cột 4 = %)

### Hàng 3: Tên cột con của từng buổi
- LẦN 1
- LẦN 2
- LẦN 3
- %

### Hàng 4+: Dữ liệu sinh viên & Giá trị điểm danh
- Các giá trị ô:
  - `X`: Có mặt
  - `P`: Nghỉ có phép
  - `M`: Muộn
  - ` ` (Blank): Chưa ghi nhận

---

## 4. Công Thức Tính Toán Chuyên Cần Trong Ứng Dụng

1. **Điểm danh từng buổi (Session Rate)**:
   - Nếu ít nhất 1 trong 3 lần có dữ liệu: `sessionRate = (Số lượng X / 3) * 100`
   - Nếu cả 3 lần đều trống (blank): Trạng thái `Chưa ghi nhận`, **không tính buổi này vào mẫu số**.
2. **Tổng chuyên cần môn học (Subject Attendance Rate)**:
   - `subjectRate = (Tổng số X) / (Số buổi đã ghi nhận * 3) * 100`
3. **Quy tắc thành viên (Membership)**:
   - Sinh viên trong danh sách lớp nhưng không có trong sheet môn cũ: Hiển thị `Không áp dụng`, tuyệt đối **không tự ý đánh Vắng**.
   - Sinh viên có ngày vào lớp sau ngày diễn ra buổi học: Buổi học đó được tính là `Không áp dụng`.

---

## 5. Quy Trình Điểm Danh Bằng Ảnh Zoom OCR

1. Admin chọn Môn, Ngày học, và Lần điểm danh (Lần 1, Lần 2, Lần 3).
2. Tải 1 hoặc nhiều ảnh chụp màn hình Zoom.
3. Bộ xử lý OCR bóc tách văn bản, loại bỏ các nhãn `K19`, `CNTT`, `CĐ`, ký tự phân cách thừa, tách ngày sinh làm signal so khớp.
4. Thuật toán Fuzzy Matching so sánh tên tiếng Việt có dấu/không dấu và đối chiếu với danh sách sinh viên:
   - `Score >= 90`: Tự động đánh dấu Khớp (MATCHED)
   - `Score 75 - 89`: Cần kiểm tra (NEEDS_REVIEW)
   - `Score < 75`: Chưa xác định (UNMATCHED)
5. Phát hiện xung đột: Nếu ô trong Google Sheets đang có dữ liệu (ví dụ `P`), hệ thống sẽ hiển thị cảnh báo để Admin chọn giữ `P` hoặc đổi thành `X`.
6. Preview trước khi ghi: Chỉ ghi chính xác cột Lần được chọn, không làm ảnh hưởng các Lần khác.
