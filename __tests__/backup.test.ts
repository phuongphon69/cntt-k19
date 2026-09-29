import { describe, it, expect } from "vitest";
import {
  performGoogleSheetBackup,
  getBackupHistory,
  exportAttendanceCsv,
  getGoogleAppsScriptSnippet,
} from "../lib/google-sheets/backup";

describe("Google Sheet Attendance Backup Engine", () => {
  it("should successfully generate and perform an attendance backup", async () => {
    const res = await performGoogleSheetBackup("test-admin");
    expect(res.success).toBe(true);
    expect(res.backupId).toBeDefined();
    expect(res.studentsCount).toBeGreaterThan(0);
    expect(res.subjectsCount).toBeGreaterThan(0);
    expect(res.destinationSheet).toBe("SAO_LUU_DIEM_DANH");
    expect(typeof res.message).toBe("string");
  }, 15000);

  it("should record the backup in the backup history list", () => {
    const history = getBackupHistory();
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].destinationSheet).toBe("SAO_LUU_DIEM_DANH");
  });

  it("should export CSV formatted with UTF-8 BOM for flawless Vietnamese display", async () => {
    const csv = await exportAttendanceCsv();
    expect(typeof csv).toBe("string");
    // Verify UTF-8 BOM (\uFEFF)
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    // Verify key Vietnamese columns and titles
    expect(csv).toContain("BẢNG SAO LƯU KẾT QUẢ ĐIỂM DANH LỚP CNTT - K19 CĐ");
    expect(csv).toContain("Họ và Tên");
    expect(csv).toContain("Ngày Vào Lớp");
    expect(csv).toContain("Chuyên Cần Chung (%)");
    expect(csv).toContain("Nguyễn Huy Phương");
  }, 15000);

  it("should provide valid Google Apps Script deployment code snippet", () => {
    const snippet = getGoogleAppsScriptSnippet();
    expect(snippet).toContain("function doPost(e)");
    expect(snippet).toContain("BACKUP_ATTENDANCE");
    expect(snippet).toContain("SAO_LUU_DIEM_DANH");
    expect(snippet).toContain("function doGet(e)");
  });
});
