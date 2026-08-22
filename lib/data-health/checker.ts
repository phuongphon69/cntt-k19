// lib/data-health/checker.ts
import { DataHealthReport, DataHealthIssue } from "@/types";
import { getWorkbookSheetNames, fetchSheetMatrix, getStudents, getAttendanceSheetData, getSchedule } from "@/lib/google-sheets/reader";
import { normalizeVietnameseNameWithoutAccent } from "@/lib/vietnamese/normalize";

export async function checkDataHealth(): Promise<DataHealthReport> {
  const issues: DataHealthIssue[] = [];

  const sheetNames = await getWorkbookSheetNames();
  const students = await getStudents();
  const studentIdSet = new Set(students.map((s) => s.id));
  const schedule = await getSchedule();

  const ddSheets = sheetNames.filter((s) => s.trim().toUpperCase().startsWith("DD "));

  // 1. Check Attendance Sheets
  for (const sheet of ddSheets) {
    const matrix = await fetchSheetMatrix(sheet);
    const parsed = await getAttendanceSheetData(sheet);

    // Check for #REF! or #VALUE! in raw matrix
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        const cell = String(matrix[r][c] || "");
        if (cell.includes("#REF!")) {
          issues.push({
            type: "WARNING",
            code: "EXCEL_REF_ERROR",
            sheetName: sheet,
            row: r + 1,
            message: `Phát hiện lỗi #REF! tại hàng ${r + 1}, cột ${c + 1} của sheet [${sheet}]. Website vẫn tự động tính toán trên dữ liệu gốc.`,
            recommendation: "Kiểm tra lại công thức Excel trong sheet nếu cần.",
          });
        } else if (cell.includes("#VALUE!")) {
          issues.push({
            type: "WARNING",
            code: "EXCEL_VALUE_ERROR",
            sheetName: sheet,
            row: r + 1,
            message: `Phát hiện lỗi #VALUE! tại hàng ${r + 1}, cột ${c + 1} của sheet [${sheet}].`,
            recommendation: "Kiểm tra công thức hoặc kiểu dữ liệu ô tính.",
          });
        }
      }
    }

    // Check students in DD sheet against roster
    for (const record of parsed.records) {
      if (!studentIdSet.has(record.studentId)) {
        issues.push({
          type: "WARNING",
          code: "UNMAPPED_STUDENT",
          sheetName: sheet,
          message: `Học viên "${record.studentName}" trong sheet [${sheet}] chưa được liên kết chính xác với DANH SÁCH LỚP.`,
          recommendation: "Vào trang 'Ghép sinh viên' (/admin/student-mapping) để xác nhận.",
        });
      }
    }

    // Check for duplicate dates in sessions
    const seenDates = new Set<string>();
    for (const sess of parsed.sessions) {
      if (sess.date && seenDates.has(sess.date)) {
        issues.push({
          type: "WARNING",
          code: "DUPLICATE_SESSION_DATE",
          sheetName: sheet,
          message: `Sheet [${sheet}] có ngày học trùng lặp: ${sess.date}`,
          recommendation: "Kiểm tra hàng ngày học số 2 của sheet.",
        });
      }
      if (sess.date) seenDates.add(sess.date);
    }

    // Check invalid values in attendance cells
    for (const rec of parsed.records) {
      for (const [date, sess] of Object.entries(rec.sessions)) {
        const rounds = [sess.round1, sess.round2, sess.round3];
        for (let i = 0; i < rounds.length; i++) {
          const val = String(rounds[i] || "").trim().toUpperCase();
          if (val && !["X", "P", "M", "V", "K"].includes(val)) {
            issues.push({
              type: "INFO",
              code: "UNUSUAL_ATTENDANCE_VALUE",
              sheetName: sheet,
              message: `Học viên "${rec.studentName}" ngày ${date} Lần ${i + 1} có giá trị lạ: "${val}"`,
              recommendation: "Kiểm tra lại xem có phải ký hiệu điểm danh đặc biệt.",
            });
          }
        }
      }
    }
  }

  // 2. Cross-check Schedule vs Attendance dates
  for (const item of schedule) {
    const matchingSubject = ddSheets.find((s) =>
      normalizeVietnameseNameWithoutAccent(s).includes(
        normalizeVietnameseNameWithoutAccent(item.subjectName)
      )
    );
    if (!matchingSubject) {
      issues.push({
        type: "INFO",
        code: "SCHEDULE_WITHOUT_SUBJECT_SHEET",
        message: `Lịch học môn "${item.subjectName}" (${item.date}) chưa có sheet điểm danh DD tương ứng.`,
        recommendation: "Tạo sheet điểm danh mới cho môn này trong mục Quản lý Môn học.",
      });
    }
  }

  return {
    timestamp: new Date().toISOString(),
    healthy: issues.filter((i) => i.type === "ERROR").length === 0,
    totalIssues: issues.length,
    issues,
  };
}
