import { describe, it, expect } from "vitest";
import {
  normalizeFundDate,
  parseExpenses,
  parseIncomes,
  parseMembers,
  parseMoney,
  parseMonths,
  parseOverview,
} from "../lib/google-sheets/fund";

describe("Fund sheet parsing", () => {
  it("parses money in Vietnamese format", () => {
    expect(parseMoney("21.500.000 đ")).toBe(21500000);
    expect(parseMoney("-784.000 đ")).toBe(-784000);
    expect(parseMoney("0 đ")).toBe(0);
    expect(parseMoney("93,0%")).toBe(93);
    expect(parseMoney("")).toBe(0);
  });

  it("normalizes dates that may be d/m/y or m/d/y", () => {
    expect(normalizeFundDate("04/10/2026")).toBe("04/10/2026");
    expect(normalizeFundDate("11/18/2026")).toBe("18/11/2026");
    expect(normalizeFundDate("4/1/26")).toBe("04/01/2026");
  });

  it("parses overview, members, income, expense and months", () => {
    const overview = [
      ["BẢNG ĐIỀU KHIỂN QUỸ LỚP"],
      ["CHỈ SỐ", "GIÁ TRỊ", "", "THEO DÕI ĐÓNG QUỸ", ""],
      ["Số thành viên", "43", "", "Tổng phải thu", "21.500.000 đ"],
      ["Tổng thu", "21.500.000 đ", "", "Đã thu từ thành viên", "20.500.000 đ"],
      ["Tổng chi", "1.284.000 đ", "", "Còn phải thu", "1.000.000 đ"],
      ["Số dư hiện tại", "20.216.000 đ", "", "Số người đã đủ", "42"],
      ["Tỷ lệ hoàn thành quỹ", "93,0%", "", "Số người chưa đủ", "1"],
    ];
    const s = parseOverview(overview);
    expect(s.balance).toBe(20216000);
    expect(s.totalDue).toBe(21500000);
    expect(s.paidCount).toBe(42);
    expect(s.unpaidCount).toBe(1);
    expect(s.completionRate).toBe(93);

    const members = parseMembers([
      ["DANH SÁCH"],
      ["STT", "Họ và tên", "Số điện thoại", "Ghi chú", "Mức phải nộp", "Đã nộp", "Còn thiếu", "Trạng thái"],
      ["1", "Trương Văn Trung", "", "", "500.000 đ", "500.000 đ", "0 đ", "Đã đủ"],
      ["2", "Nguyễn Sỹ Tuấn", "", "", "500.000 đ", "0 đ", "500.000 đ", "Chưa nộp"],
    ]);
    expect(members).toHaveLength(2);
    expect(members[1].missing).toBe(500000);

    const incomes = parseIncomes([
      ["SỔ THU QUỸ"],
      ["Ngày", "Mã phiếu", "Người nộp", "Nội dung", "Loại thu", "Số tiền", "Phương thức", "Ghi chú"],
      ["04/10/2026", "PT-1", "A", "Nop quy lop", "Thu quỹ định kỳ", "500.000 đ", "Chuyển khoản", ""],
    ]);
    expect(incomes[0].amount).toBe(500000);

    const expenses = parseExpenses([
      ["SỔ CHI QUỸ"],
      ["Ngày", "Mã phiếu", "Nội dung chi", "Nhóm chi", "Số tiền", "Người nhận", "Phương thức", "Chứng từ", "Ghi chú"],
      ["11/18/2026", "PC-1", "Chi phí 20.11", "Hoạt động lớp", "1.284.000 đ", "B", "Chuyển khoản", "", ""],
    ]);
    expect(expenses[0].amount).toBe(1284000);
    expect(expenses[0].date).toBe("18/11/2026");

    const months = parseMonths([
      ["BÁO CÁO"],
      [""],
      ["Tháng", "Tổng thu", "Tổng chi", "Chênh lệch", "Số dư lũy kế"],
      ["Tháng 11", "500.000 đ", "1.284.000 đ", "-784.000 đ", "20.216.000 đ"],
    ]);
    expect(months[0].diff).toBe(-784000);
  });
});
