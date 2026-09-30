// lib/google-sheets/backup.ts
import fs from "fs";
import path from "path";
import { getStudents, getSubjects, getWorkbookSheetNames, fetchSheetMatrix } from "./reader";
import { getComprehensiveAttendanceReport, StudentComprehensiveStat } from "@/lib/attendance/stats";
import { getRecordedAttendanceRounds, RecordedAttendanceRound } from "./sync-store";
import { getGoogleSheetsClient, getSpreadsheetId } from "./client";
import { invalidateCache, updateSyncTimestamp } from "./cache";
import { logAuditEvent } from "./writer";

const BACKUP_DIR = path.join(process.cwd(), "data", "backups");
const HISTORY_FILE = path.join(BACKUP_DIR, "history.json");

export interface BackupRecord {
  id: string;
  timestamp: string;
  formattedTime: string;
  adminUser: string;
  studentsCount: number;
  subjectsCount: number;
  roundsCount: number;
  writtenToGoogleSheets: boolean;
  destinationSheet: string;
  status: "SUCCESS" | "PARTIAL" | "SAVED_LOCAL";
  message: string;
}

import os from "os";

let memoryBackupHistory: BackupRecord[] = [];

export function getBackupDir(): string {
  // 1. Try local data/backups folder (for local development)
  try {
    const localDir = path.join(process.cwd(), "data", "backups");
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    return localDir;
  } catch (e) {
    // 2. On Vercel / serverless (read-only filesystem), fallback to os.tmpdir()
    try {
      const tmpDir = path.join(os.tmpdir(), "cntt-k19-backups");
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      return tmpDir;
    } catch (err) {
      return os.tmpdir();
    }
  }
}

export function getBackupHistory(): BackupRecord[] {
  try {
    const dir = getBackupDir();
    const historyFile = path.join(dir, "history.json");
    if (fs.existsSync(historyFile)) {
      const raw = fs.readFileSync(historyFile, "utf-8");
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) {
        return list;
      }
    }
  } catch (e) {
    console.warn("[getBackupHistory] Reading history file failed, falling back to memory:", e);
  }
  return memoryBackupHistory;
}

function saveBackupRecord(record: BackupRecord) {
  try {
    memoryBackupHistory.unshift(record);
    memoryBackupHistory = memoryBackupHistory.slice(0, 50);

    const dir = getBackupDir();
    const historyFile = path.join(dir, "history.json");
    fs.writeFileSync(historyFile, JSON.stringify(memoryBackupHistory, null, 2), "utf-8");
  } catch (e) {
    console.warn("[saveBackupRecord] Could not persist history to file, kept safely in memory:", e);
  }
}

/**
 * Perform a complete backup of attendance results to Google Sheets:
 * 1. Collects all student attendance statistics across all subjects.
 * 2. Writes/updates the dedicated sheet "SAO_LUU_DIEM_DANH" in Google Sheets.
 * 3. Also updates all recorded rounds into their corresponding "DD <MÔN>" sheets.
 * 4. Saves a timestamped snapshot locally.
 */
export async function performGoogleSheetBackup(adminUser = "admin"): Promise<{
  success: boolean;
  backupId: string;
  timestamp: string;
  studentsCount: number;
  subjectsCount: number;
  roundsCount: number;
  writtenToGoogleSheets: boolean;
  destinationSheet: string;
  message: string;
}> {
  const timestamp = new Date().toISOString();
  const backupId = `backup-${Date.now()}`;
  const formattedTime = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

  // 1. Gather all attendance data
  const students = await getStudents();
  const subjects = await getSubjects();
  const report = await getComprehensiveAttendanceReport();
  const recordedRounds = getRecordedAttendanceRounds();

  // 2. Prepare 2D matrix data for Google Sheets "SAO_LUU_DIEM_DANH"
  const matrixData: (string | number)[][] = [];

  // Title & Metadata Header
  matrixData.push(["BẢNG SAO LƯU KẾT QUẢ ĐIỂM DANH - LỚP CNTT K19 CĐ"]);
  matrixData.push([
    "Thời gian sao lưu:",
    formattedTime,
    "Người thực hiện:",
    adminUser,
    "Sĩ số lớp:",
    `${students.length} học viên`,
    "Số môn học:",
    `${subjects.length} môn`,
  ]);
  matrixData.push([]); // blank row

  // Table Columns Header
  const headerRow: string[] = [
    "STT",
    "Mã SV",
    "Họ và tên",
    "Ngày sinh",
    "Hệ đào tạo",
    "Ngày vào lớp",
  ];

  for (const sub of subjects) {
    headerRow.push(`${sub.name} (Buổi)`);
    headerRow.push(`${sub.name} (%)`);
  }

  headerRow.push("Tổng buổi tham gia");
  headerRow.push("Tổng buổi áp dụng");
  headerRow.push("Tỷ lệ chuyên cần chung (%)");
  headerRow.push("Tình trạng");
  headerRow.push("Cảnh báo");

  matrixData.push(headerRow);

  // Rows for each student
  report.studentStats.forEach((sStat, idx) => {
    const stu = sStat.student;
    const row: (string | number)[] = [
      idx + 1,
      stu.id,
      stu.fullName,
      stu.dateOfBirth || "",
      stu.studySystem || "",
      stu.dateJoinedGroup || "",
    ];

    for (const sub of subjects) {
      const subStat = sStat.subjects.find((s) => s.subjectId === sub.id || s.sheetName === sub.attendanceSheet);
      if (!subStat) {
        row.push("--");
        row.push("--");
      } else if (!subStat.isApplicable) {
        row.push("--");
        row.push("--");
      } else {
        row.push(subStat.sessionFraction || `${subStat.attendedSessions}/${subStat.totalSessionsInSheet}`);
        row.push(subStat.recordedSessions > 0 ? `${subStat.attendanceRate}%` : "--");
      }
    }

    row.push(sStat.totalAttendedSessionsAll);
    row.push(sStat.totalSessionsAll);
    row.push(`${sStat.overallAttendanceRate}%`);
    row.push(
      sStat.overallAttendanceRate >= 80
        ? "Đạt chuẩn"
        : sStat.totalSessionsAll === 0
        ? "Chưa học"
        : "Cần cải thiện"
    );
    row.push(sStat.overallWarning ? "CẢNH BÁO" : "Bình thường");

    matrixData.push(row);
  });

  // Summary Row at bottom
  matrixData.push([]);
  matrixData.push([
    "TỔNG KẾT TOÀN LỚP",
    "",
    `Tổng số học viên: ${students.length}`,
    "",
    "",
    "",
    ...subjects.flatMap(() => ["", ""]),
    `Tỷ lệ TB lớp: ${report.averageClassAttendanceRate}%`,
    "",
    `Học viên cần lưu ý: ${report.warningStudentsCount}`,
  ]);

  // 3. Write to Google Sheets if API client is available or call Apps Script Webhook
  let writtenToGoogleSheets = false;
  const spreadsheetId = getSpreadsheetId();
  const client = getGoogleSheetsClient();
  const destinationSheet = "SAO_LUU_DIEM_DANH";

  if (client) {
    try {
      // Check if sheet exists, if not create it
      const meta = await client.spreadsheets.get({ spreadsheetId });
      const sheetExists = meta.data.sheets?.some(
        (s) => s.properties?.title?.trim().toUpperCase() === destinationSheet
      );

      if (!sheetExists) {
        await client.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: destinationSheet,
                    gridProperties: {
                      rowCount: Math.max(100, matrixData.length + 10),
                      columnCount: Math.max(26, headerRow.length + 5),
                    },
                  },
                },
              },
            ],
          },
        });
      }

      // Write matrix values
      await client.spreadsheets.values.update({
        spreadsheetId,
        range: `'${destinationSheet}'!A1`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: matrixData,
        },
      });

      writtenToGoogleSheets = true;
    } catch (err) {
      console.warn("[performGoogleSheetBackup] Error writing to Google Sheet:", err);
    }
  }

  // 4. Try Apps Script Webhook if configured in environment
  const appsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
  if (!writtenToGoogleSheets && appsScriptUrl) {
    try {
      const webhookRes = await fetch(appsScriptUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "BACKUP_ATTENDANCE",
          backupId,
          timestamp,
          spreadsheetId,
          sheetName: destinationSheet,
          matrixData,
          recordedRounds,
        }),
      });
      const webhookData = await webhookRes.json();
      if (webhookData.success) {
        writtenToGoogleSheets = true;
      }
    } catch (err) {
      console.warn("[performGoogleSheetBackup] Apps Script webhook error:", err);
    }
  }

  // 5. Always persist full snapshot JSON locally in data/backups/
  const snapshot = {
    backupId,
    timestamp,
    formattedTime,
    adminUser,
    spreadsheetId,
    destinationSheet,
    writtenToGoogleSheets,
    studentsCount: students.length,
    subjectsCount: subjects.length,
    roundsCount: recordedRounds.length,
    report,
    matrixData,
    recordedRounds,
  };

  try {
    const dir = getBackupDir();
    fs.writeFileSync(
      path.join(dir, `${backupId}.json`),
      JSON.stringify(snapshot, null, 2),
      "utf-8"
    );
  } catch (snapErr) {
    console.warn("[performGoogleSheetBackup] Could not save snapshot to disk, continuing:", snapErr);
  }

  const backupRecord: BackupRecord = {
    id: backupId,
    timestamp,
    formattedTime,
    adminUser,
    studentsCount: students.length,
    subjectsCount: subjects.length,
    roundsCount: recordedRounds.length,
    writtenToGoogleSheets,
    destinationSheet,
    status: writtenToGoogleSheets ? "SUCCESS" : "SAVED_LOCAL",
    message: writtenToGoogleSheets
      ? `Đã sao lưu thành công toàn bộ kết quả điểm danh vào sheet [${destinationSheet}] trên Google Sheets!`
      : `Đã lưu trữ an toàn bản sao lưu kết quả điểm danh (${students.length} học viên, ${subjects.length} môn). Bạn có thể tải file CSV/JSON hoặc cấu hình Apps Script để đẩy trực tiếp lên Google Sheets.`,
  };

  saveBackupRecord(backupRecord);

  invalidateCache();
  updateSyncTimestamp();

  await logAuditEvent("BACKUP_ATTENDANCE", "GOOGLE_SHEETS", destinationSheet, {
    backupId,
    writtenToGoogleSheets,
    studentsCount: students.length,
    subjectsCount: subjects.length,
    adminUser,
  });

  return {
    success: true,
    backupId,
    timestamp,
    studentsCount: students.length,
    subjectsCount: subjects.length,
    roundsCount: recordedRounds.length,
    writtenToGoogleSheets,
    destinationSheet,
    message: backupRecord.message,
  };
}

/**
 * Generate a UTF-8 CSV string (with BOM) for Google Sheets / Excel compatibility
 */
export async function exportAttendanceCsv(): Promise<string> {
  const students = await getStudents();
  const subjects = await getSubjects();
  const report = await getComprehensiveAttendanceReport();
  const formattedTime = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

  const rows: string[][] = [];

  // Title
  rows.push(["BẢNG SAO LƯU KẾT QUẢ ĐIỂM DANH LỚP CNTT - K19 CĐ"]);
  rows.push([
    "Thời gian xuất:",
    formattedTime,
    "Sĩ số lớp:",
    `${students.length} học viên`,
    "Số môn học:",
    `${subjects.length} môn`,
  ]);
  rows.push([]);

  // Headers
  const headers = [
    "STT",
    "Mã Sinh Viên",
    "Họ và Tên",
    "Ngày Sinh",
    "Hệ Đào Tạo",
    "Ngày Vào Lớp",
  ];

  for (const sub of subjects) {
    headers.push(`${sub.name} (Buổi đã học/Tổng)`);
    headers.push(`${sub.name} (Tỷ lệ %)`);
  }

  headers.push("Tổng Buổi Tham Gia");
  headers.push("Tổng Buổi Áp Dụng");
  headers.push("Chuyên Cần Chung (%)");
  headers.push("Tình Trạng");
  headers.push("Cảnh Báo Chuyên Cần");

  rows.push(headers);

  // Student rows
  report.studentStats.forEach((sStat, idx) => {
    const stu = sStat.student;
    const row: string[] = [
      String(idx + 1),
      stu.id,
      stu.fullName,
      stu.dateOfBirth || "",
      stu.studySystem || "",
      stu.dateJoinedGroup || "",
    ];

    for (const sub of subjects) {
      const subStat = sStat.subjects.find((s) => s.subjectId === sub.id || s.sheetName === sub.attendanceSheet);
      if (!subStat) {
        row.push("--");
        row.push("--");
      } else if (!subStat.isApplicable) {
        row.push("--");
        row.push("--");
      } else {
        row.push(subStat.sessionFraction || `${subStat.attendedSessions}/${subStat.totalSessionsInSheet}`);
        row.push(subStat.recordedSessions > 0 ? `${subStat.attendanceRate}%` : "--");
      }
    }

    row.push(String(sStat.totalAttendedSessionsAll));
    row.push(String(sStat.totalSessionsAll));
    row.push(`${sStat.overallAttendanceRate}%`);
    row.push(
      sStat.overallAttendanceRate >= 80
        ? "Đạt chuẩn"
        : sStat.totalSessionsAll === 0
        ? "Chưa học"
        : "Cần cải thiện"
    );
    row.push(sStat.overallWarning ? "CẢNH BÁO" : "Bình thường");

    rows.push(row);
  });

  // Convert to CSV with escaping
  const csvContent = rows
    .map((r) =>
      r
        .map((cell) => {
          const str = String(cell ?? "");
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(",")
    )
    .join("\r\n");

  // Prepend UTF-8 BOM (\uFEFF) to make Excel / Google Sheets open Vietnamese characters flawlessly
  return "\uFEFF" + csvContent;
}

/**
 * Returns the ready-to-use Google Apps Script code snippet
 */
export function getGoogleAppsScriptSnippet(): string {
  return `/**
 * GOOGLE APPS SCRIPT WEB APP - HỆ THỐNG ĐIỂM DANH & SAO LƯU CNTT - K19 CĐ
 * Hỗ trợ 3 tính năng:
 * 1. Tự động tạo Sheet môn mới chuẩn sĩ số toàn bộ lớp (43 học sinh) từ template MẪU MÔN HỌC
 * 2. Tự động ghi điểm danh trực tiếp vào ô tương ứng
 * 3. Sao lưu toàn bộ báo cáo chuyên cần vào sheet SAO_LUU_DIEM_DANH
 */

function doPost(e) {
  try {
    var contents = e.postData ? e.postData.contents : "";
    var data = JSON.parse(contents || "{}");
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // Hàm lấy danh sách 43 sinh viên đầy đủ từ CNTT - K19 hoặc payload
    function getFullClassRoster() {
      if (data.students && Array.isArray(data.students) && data.students.length > 0) {
        return data.students;
      }
      var masterSheet = ss.getSheetByName("CNTT - K19");
      if (!masterSheet) return [];
      var values = masterSheet.getDataRange().getValues();
      var roster = [];
      var headerRowIdx = -1;
      for (var r = 0; r < Math.min(5, values.length); r++) {
        var rowStr = values[r].join(" ").toUpperCase();
        if (rowStr.indexOf("HỌ VÀ") !== -1 || rowStr.indexOf("TÊN") !== -1) {
          headerRowIdx = r;
          break;
        }
      }
      var startRow = headerRowIdx !== -1 ? headerRowIdx + 1 : 1;
      for (var r = startRow; r < values.length; r++) {
        var row = values[r];
        var hoVa = String(row[1] || "").trim();
        var ten = String(row[2] || "").trim();
        if (!hoVa && !ten) continue;
        if (hoVa.toUpperCase().indexOf("HỌ") !== -1 && ten.toUpperCase().indexOf("TÊN") !== -1) continue;
        var fullName = (hoVa + " " + ten).replace(/\\s+/g, " ").trim();
        var dob = row[3] instanceof Date ? Utilities.formatDate(row[3], "GMT+7", "dd/MM/yyyy") : String(row[3] || "").trim();
        var studySystem = String(row[11] || "").trim();
        var dateJoined = String(row[12] || "").trim();
        roster.push({
          stt: roster.length + 1,
          fullName: fullName,
          dateOfBirth: dob,
          studySystem: studySystem,
          dateJoinedGroup: dateJoined
        });
      }
      return roster;
    }

    // Hàm mở rộng và nạp đầy đủ 43 sinh viên vào sheet môn học
    function ensureFullRosterInSheet(targetSheet) {
      var roster = getFullClassRoster();
      if (!roster || roster.length === 0) return;
      var neededRows = 3 + roster.length;
      if (targetSheet.getMaxRows() < neededRows) {
        targetSheet.insertRowsAfter(targetSheet.getMaxRows(), neededRows - targetSheet.getMaxRows());
      }
      var rowsToWrite = roster.map(function(s, idx) {
        return [idx + 1, s.fullName, s.dateOfBirth || "", s.studySystem || "", s.dateJoinedGroup || ""];
      });
      targetSheet.getRange(4, 1, rowsToWrite.length, 5).setValues(rowsToWrite);
      targetSheet.getRange(4, 1, rowsToWrite.length, 1).setHorizontalAlignment("center");
      targetSheet.getRange(4, 2, rowsToWrite.length, 1).setHorizontalAlignment("left");
      targetSheet.getRange(4, 3, rowsToWrite.length, 3).setHorizontalAlignment("center");
    }

    // 1. TỰ ĐỘNG TẠO SHEET MÔN MỚI
    if (data.action === "createSheet" || (data.sheetName && !ss.getSheetByName(data.sheetName))) {
      var sheet = ss.getSheetByName(data.sheetName);
      var sheetCreated = false;
      if (!sheet) {
        var template = ss.getSheetByName("MẪU MÔN HỌC");
        sheet = template ? template.copyTo(ss).setName(data.sheetName) : ss.insertSheet(data.sheetName);
        sheetCreated = true;
      }
      // Đưa sheet vừa tạo lên vị trí hiển thị số 4 (ngay cạnh DANH SÁCH LỚP)
      ss.setActiveSheet(sheet);
      try { ss.moveActiveSheet(4); } catch (e) {}

      var subjName = data.subjectName || data.sheetName.replace(/^DD\\s+/i, "");
      sheet.getRange(1, 2).setValue(subjName);
      if (data.teacherName) sheet.getRange(1, 4).setValue(data.teacherName);
      if (data.totalSessions) sheet.getRange(1, 6).setValue(data.totalSessions);
      ensureFullRosterInSheet(sheet);

      if (data.action === "createSheet") {
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          sheetCreated: sheetCreated,
          sheetName: data.sheetName,
          totalStudents: sheet.getLastRow() - 3
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // 2. GHI ĐIỂM DANH TRỰC TIẾP
    if (data.action === "writeAttendance") {
      var sheet = ss.getSheetByName(data.sheetName);
      if (!sheet) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Không tìm thấy sheet " + data.sheetName })).setMimeType(ContentService.MimeType.JSON);
      }
      // Luôn đảm bảo đủ 43 học viên và đưa sheet lên tab hiển thị nổi bật
      ss.setActiveSheet(sheet);
      try { ss.moveActiveSheet(4); } catch (e) {}
      ensureFullRosterInSheet(sheet);
      var matrix = sheet.getDataRange().getValues();
      var sessionDate = String(data.sessionDate || "").trim();
      var roundNumber = Number(data.roundNumber || 1);
      var sessionIndex = Number(data.sessionIndex || 1);
      var targetCol = -1;
      for (var c = 5; c < (matrix[0] ? matrix[0].length : 0); c++) {
        var cellDate = String(matrix[0][c] || "").trim();
        if (cellDate && sessionDate && (cellDate === sessionDate || cellDate.indexOf(sessionDate) !== -1 || sessionDate.indexOf(cellDate) !== -1)) {
          targetCol = c + roundNumber;
          break;
        }
      }
      if (targetCol === -1) {
        targetCol = 6 + (sessionIndex - 1) * 4 + (roundNumber - 1);
      }
      var updateMap = {};
      (data.updates || []).forEach(function(u) { updateMap[u.studentId] = u.value; });
      var updatedCount = 0;
      for (var r = 3; r < matrix.length; r++) {
        var rawName = String(matrix[r][1] || "").trim();
        if (!rawName) continue;
        var norm = rawName.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "d").replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_");
        for (var sId in updateMap) {
          if (norm.indexOf(sId) !== -1 || sId.indexOf(norm) !== -1) {
            sheet.getRange(r + 1, targetCol).setValue(updateMap[sId]);
            updatedCount++;
            break;
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        updatedCount: updatedCount,
        sheetName: data.sheetName,
        targetCol: targetCol,
        totalStudents: sheet.getLastRow() - 3
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. SAO LƯU ĐIỂM DANH TOÀN DIỆN
    if (data.action === "BACKUP_ATTENDANCE") {
      var sheetName = data.sheetName || "SAO_LUU_DIEM_DANH";
      var sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
      sheet.clearContents();
      var matrix = data.matrixData || [];
      if (matrix.length > 0) {
        var numRows = matrix.length;
        var numCols = matrix[0].length;
        for (var i = 1; i < numRows; i++) {
          if (matrix[i].length > numCols) numCols = matrix[i].length;
        }
        var cleanMatrix = matrix.map(function(row) {
          while (row.length < numCols) row.push("");
          return row;
        });
        sheet.getRange(1, 1, numRows, numCols).setValues(cleanMatrix);
        sheet.getRange(1, 1).setFontSize(14).setFontWeight("bold");
        sheet.getRange(4, 1, 1, numCols).setBackground("#EEF2FF").setFontWeight("bold");
      }
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Sao lưu thành công vào sheet " + sheetName,
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Hành động không hợp lệ" })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ONLINE",
    app: "CNTT K19 CĐ Google Sheet Attendance & Backup Web App",
    time: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}
`;
}
