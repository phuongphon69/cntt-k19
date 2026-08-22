// lib/google-sheets/reader.ts
import { getGoogleSheetsClient, getSpreadsheetId } from "./client";
import { getCached, setCached } from "./cache";
import {
  Student,
  PublicStudent,
  Subject,
  ScheduleItem,
  Period,
  ZoomAlias,
  AttendanceConfig,
} from "@/types";
import { normalizeVietnameseName, normalizeVietnameseNameWithoutAccent } from "@/lib/vietnamese/normalize";
import { parseAttendanceSheet, ParsedAttendanceSheet } from "@/lib/attendance/parser";
import { DEFAULT_ATTENDANCE_CONFIG } from "@/lib/attendance/calculator";

/**
 * Fetch raw matrix from a given sheet with caching and public gviz fallback
 */
export async function fetchSheetMatrix(sheetName: string): Promise<any[][]> {
  const spreadsheetId = getSpreadsheetId();
  const cacheKey = `sheet_matrix_${spreadsheetId}_${sheetName}`;
  const cached = getCached<any[][]>(cacheKey);
  if (cached) return cached;

  const client = getGoogleSheetsClient();

  // 1. Try Google Sheets API v4 if configured
  if (client) {
    try {
      const res = await client.spreadsheets.values.get({
        spreadsheetId,
        range: `'${sheetName}'!A1:ZZ500`,
      });
      const rows = res.data.values || [];
      setCached(cacheKey, rows);
      return rows;
    } catch (err: any) {
      console.warn(`[Google Sheets API Error for ${sheetName}]:`, err?.message || err);
      // Fallback to gviz below
    }
  }

  // 2. Fallback: Query via public gviz endpoint
  try {
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
      sheetName
    )}`;
    const res = await fetch(url, { next: { revalidate: 30 } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const jsonStr = text.substring(text.indexOf("{"), text.lastIndexOf("}") + 1);
    const parsed = JSON.parse(jsonStr);

    const cols = parsed.table?.cols || [];
    const rows = parsed.table?.rows || [];

    const matrix: any[][] = [];

    // Check if column labels contain header row data
    const headerRow: any[] = cols.map((c: any) => c.label || "");
    const hasHeaderLabels = headerRow.some((h) => h && h.trim().length > 0);
    if (hasHeaderLabels) {
      matrix.push(headerRow);
    }

    for (const r of rows) {
      const rowArr: any[] = [];
      if (r.c) {
        for (const cell of r.c) {
          if (!cell) {
            rowArr.push("");
          } else {
            rowArr.push(cell.f !== undefined && cell.f !== null ? cell.f : cell.v !== null ? cell.v : "");
          }
        }
      }
      matrix.push(rowArr);
    }

    setCached(cacheKey, matrix);
    return matrix;
  } catch (err) {
    console.error(`Failed to fetch sheet ${sheetName}:`, err);
    return [];
  }
}

/**
 * Fetch all available sheet names in workbook
 */
export async function getWorkbookSheetNames(): Promise<string[]> {
  const spreadsheetId = getSpreadsheetId();
  const cacheKey = `sheet_names_${spreadsheetId}`;
  const cached = getCached<string[]>(cacheKey);
  if (cached) return cached;

  const client = getGoogleSheetsClient();
  if (client) {
    try {
      const res = await client.spreadsheets.get({ spreadsheetId });
      const names = res.data.sheets?.map((s) => s.properties?.title || "").filter(Boolean) || [];
      if (names.length > 0) {
        setCached(cacheKey, names);
        return names;
      }
    } catch (err) {
      console.warn("Failed to get sheet names via API:", err);
    }
  }

  // Fallback known default sheets
  const defaultSheets = [
    "TKB",
    "DANH SÁCH LỚP",
    "DD CHÍNH TRỊ",
    "DD TIN HỌC",
    "DD TIẾNG ANH",
    "DD GDTC",
    "MẪU MÔN HỌC",
    "TỔNG HỢP",
    "CNTT - K19",
  ];
  setCached(cacheKey, defaultSheets);
  return defaultSheets;
}

/**
 * Read students from "DANH SÁCH LỚP"
 */
export async function getStudents(): Promise<Student[]> {
  const cacheKey = "students_all_roster";
  const cached = getCached<Student[]>(cacheKey);
  if (cached) return cached;

  const rawMatrix = await fetchSheetMatrix("DANH SÁCH LỚP");
  const students: Student[] = [];

  if (rawMatrix.length > 0) {
    // Find header row or skip top rows
    let startRow = 0;
    for (let r = 0; r < Math.min(5, rawMatrix.length); r++) {
      const rowStr = rawMatrix[r].join(" ").toUpperCase();
      if (rowStr.includes("HỌ VÀ") || rowStr.includes("TÊN") || rowStr.includes("STT")) {
        startRow = r + 1;
        break;
      }
    }

    for (let r = startRow; r < rawMatrix.length; r++) {
      const row = rawMatrix[r];
      if (!row || row.length === 0) continue;

      const sttRaw = String(row[0] || "").trim();
      const hoVa = String(row[1] || "").trim();
      const ten = String(row[2] || "").trim();

      if (!hoVa && !ten) continue;

      const fullName = normalizeVietnameseName(`${hoVa} ${ten}`);
      const normalizedName = normalizeVietnameseName(fullName);
      const normalizedNameNoAccent = normalizeVietnameseNameWithoutAccent(fullName);
      const studentId = normalizedNameNoAccent.replace(/\s+/g, "_");

      const dob = String(row[3] || "").trim();
      const placeOfBirth = String(row[4] || "").trim();
      const phone = String(row[7] || "").trim();
      const studySystem = String(row[9] || "").trim();
      const dateJoined = String(row[10] || "").trim();
      const notes = String(row[11] || "").trim();
      const totalX = parseInt(String(row[12] || "0"), 10) || 0;

      students.push({
        id: studentId,
        stt: !isNaN(parseInt(sttRaw, 10)) ? parseInt(sttRaw, 10) : students.length + 1,
        fullName,
        hoVa,
        ten,
        normalizedName,
        normalizedNameNoAccent,
        dateOfBirth: dob,
        placeOfBirth,
        phone,
        studySystem,
        dateJoinedGroup: dateJoined,
        notes,
        active: true,
        sourceSheet: "DANH SÁCH LỚP",
        sourceRow: r + 1,
        totalPresent: totalX,
      });
    }
  }

  // Enrich with and include any additional students from CNTT - K19
  const k19Matrix = await fetchSheetMatrix("CNTT - K19");
  if (k19Matrix.length > 0) {
    for (let r = 0; r < k19Matrix.length; r++) {
      const row = k19Matrix[r];
      const sttRaw = String(row[0] || "").trim();
      const hoVa = String(row[1] || "").trim();
      const ten = String(row[2] || "").trim();
      if (!hoVa && !ten) continue;
      if (
        (hoVa.toUpperCase().includes("HỌ") && ten.toUpperCase().includes("TÊN")) ||
        sttRaw.toUpperCase().includes("STT") ||
        hoVa.toUpperCase().includes("HỌ VÀ TÊN")
      ) {
        continue;
      }

      const fullName = normalizeVietnameseName(`${hoVa} ${ten}`);
      const fnNoAccent = normalizeVietnameseNameWithoutAccent(fullName);
      const studentId = fnNoAccent.replace(/\s+/g, "_");

      const match = students.find((s) => s.normalizedNameNoAccent === fnNoAccent || s.id === studentId);
      const dob = String(row[3] || "").trim();
      const cccd = String(row[5] || "").trim();
      const placeOfBirth = String(row[6] || "").trim();
      const phone = String(row[9] || "").trim();
      const studySystem = String(row[11] || "").trim();
      const dateJoined = String(row[12] || "").trim();

      if (match) {
        if (cccd) match.cccd = cccd;
        if (phone && !match.phone) match.phone = phone;
        if (dob && !match.dateOfBirth) match.dateOfBirth = dob;
        if (placeOfBirth && !match.placeOfBirth) match.placeOfBirth = placeOfBirth;
        if (studySystem && !match.studySystem) match.studySystem = studySystem;
        if (dateJoined && !match.dateJoinedGroup) match.dateJoinedGroup = dateJoined;
      } else {
        // Additional student from CNTT - K19 (e.g. students #36, #37, #38)
        students.push({
          id: studentId,
          stt: !isNaN(parseInt(sttRaw, 10)) ? parseInt(sttRaw, 10) : students.length + 1,
          fullName,
          hoVa,
          ten,
          normalizedName: fullName,
          normalizedNameNoAccent: fnNoAccent,
          dateOfBirth: dob,
          placeOfBirth,
          phone,
          cccd,
          studySystem,
          dateJoinedGroup: dateJoined,
          active: true,
          sourceSheet: "CNTT - K19",
          sourceRow: r + 1,
        });
      }
    }
  }

  setCached(cacheKey, students);
  return students;
}

/**
 * Get sanitized Public Student list (no phone, no CCCD, no private notes)
 */
export async function getPublicStudents(): Promise<PublicStudent[]> {
  const students = await getStudents();
  return students.map((s) => ({
    id: s.id,
    fullName: s.fullName,
    studySystem: s.studySystem,
    dateOfBirth: s.dateOfBirth,
    active: s.active,
  }));
}

/**
 * Get all Subjects (combining known sheets + dynamic DD* sheets)
 */
export async function getSubjects(): Promise<Subject[]> {
  const cacheKey = "subjects_all_list";
  const cached = getCached<Subject[]>(cacheKey);
  if (cached) return cached;

  const sheetNames = await getWorkbookSheetNames();
  const ddSheets = sheetNames.filter((s) => s.trim().toUpperCase().startsWith("DD "));

  const subjects: Subject[] = [];

  for (const sheetName of ddSheets) {
    const parsed = await getAttendanceSheetData(sheetName);
    const cleanSheetTitle = sheetName.replace(/^DD\s+/i, "").trim();
    const id = normalizeVietnameseNameWithoutAccent(cleanSheetTitle).replace(/\s+/g, "_");

    // Compute average attendance across all students
    let totalRate = 0;
    let applicableStudents = 0;
    for (const rec of parsed.records) {
      if (rec.isApplicable && rec.recordedSessions > 0) {
        totalRate += rec.attendanceRate;
        applicableStudents++;
      }
    }
    const avgRate = applicableStudents > 0 ? Math.round((totalRate / applicableStudents) * 10) / 10 : 0;

    subjects.push({
      id,
      code: id.toUpperCase().slice(0, 10),
      name: parsed.subjectName,
      shortName: parsed.subjectName,
      attendanceSheet: sheetName,
      teacher: parsed.teacherName || "Chưa cập nhật",
      totalSessions: parsed.totalSessions,
      status: "ACTIVE",
      isPublic: true,
      recordedSessionsCount: parsed.sessions.length,
      averageAttendanceRate: avgRate,
    });
  }

  setCached(cacheKey, subjects);
  return subjects;
}

/**
 * Get parsed Attendance Sheet data
 */
export async function getAttendanceSheetData(sheetName: string): Promise<ParsedAttendanceSheet> {
  const cacheKey = `parsed_attendance_${sheetName}`;
  const cached = getCached<ParsedAttendanceSheet>(cacheKey);
  if (cached) return cached;

  const matrix = await fetchSheetMatrix(sheetName);
  const parsed = parseAttendanceSheet(sheetName, matrix);
  setCached(cacheKey, parsed);
  return parsed;
}

/**
 * Get Default School Periods (Tiết 1 -> 07:00 - 07:45, etc.)
 */
export async function getPeriods(): Promise<Period[]> {
  const defaultPeriods: Period[] = [
    { id: "tiet-1", periodNumber: 1, name: "Tiết 1", startTime: "07:00", endTime: "07:45", sortOrder: 1, active: true },
    { id: "tiet-2", periodNumber: 2, name: "Tiết 2", startTime: "07:50", endTime: "08:35", sortOrder: 2, active: true },
    { id: "tiet-3", periodNumber: 3, name: "Tiết 3", startTime: "08:40", endTime: "09:25", sortOrder: 3, active: true },
    { id: "tiet-4", periodNumber: 4, name: "Tiết 4", startTime: "09:35", endTime: "10:20", sortOrder: 4, active: true },
    { id: "tiet-5", periodNumber: 5, name: "Tiết 5", startTime: "10:25", endTime: "11:10", sortOrder: 5, active: true },
    { id: "tiet-6", periodNumber: 6, name: "Tiết 6", startTime: "13:00", endTime: "13:45", sortOrder: 6, active: true },
    { id: "tiet-7", periodNumber: 7, name: "Tiết 7", startTime: "13:50", endTime: "14:35", sortOrder: 7, active: true },
    { id: "tiet-8", periodNumber: 8, name: "Tiết 8", startTime: "14:40", endTime: "15:25", sortOrder: 8, active: true },
    { id: "tiet-9", periodNumber: 9, name: "Tiết 9", startTime: "15:35", endTime: "16:20", sortOrder: 9, active: true },
    { id: "tiet-10", periodNumber: 10, name: "Tiết 10", startTime: "16:25", endTime: "17:10", sortOrder: 10, active: true },
    { id: "tiet-11", periodNumber: 11, name: "Tiết 11", startTime: "18:00", endTime: "18:45", sortOrder: 11, active: true },
    { id: "tiet-12", periodNumber: 12, name: "Tiết 12", startTime: "18:50", endTime: "19:35", sortOrder: 12, active: true },
    { id: "tiet-13", periodNumber: 13, name: "Tiết 13", startTime: "19:40", endTime: "20:25", sortOrder: 13, active: true },
    { id: "tiet-14", periodNumber: 14, name: "Tiết 14", startTime: "20:30", endTime: "21:15", sortOrder: 14, active: true },
  ];

  return defaultPeriods;
}

/**
 * Get Schedule (TKB)
 */
export async function getSchedule(): Promise<ScheduleItem[]> {
  const cacheKey = "schedule_all_items";
  const cached = getCached<ScheduleItem[]>(cacheKey);
  if (cached) return cached;

  const rawMatrix = await fetchSheetMatrix("TKB");
  const items: ScheduleItem[] = [];

  for (let r = 0; r < rawMatrix.length; r++) {
    const row = rawMatrix[r];
    if (!row || row.length === 0) continue;

    const dateAndDay = String(row[0] || "").trim();
    const subjectNameRaw = String(row[1] || "").trim();
    const teacherName = String(row[2] || "").trim();
    const teacherPhone = String(row[3] || "").trim();
    const zoomUrl = String(row[4] || "").trim();
    const zoomAccount = String(row[5] || "").trim();
    const notes = String(row[6] || "").trim();

    if (!dateAndDay || !subjectNameRaw || dateAndDay.toUpperCase().includes("THỨ / NGÀY")) {
      continue;
    }

    // Extract Day of week & Date
    // Format: "Thứ 4 Ngày 10/06/26" or "Thứ 7 Ngày 21/03/2026"
    let dayOfWeek = "Thứ 2";
    let dateStr = "";

    const dayMatch = dateAndDay.match(/(Thứ\s+\d+|Chủ\s+nhật)/i);
    if (dayMatch) dayOfWeek = dayMatch[1];

    const dateMatch = dateAndDay.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
    if (dateMatch) {
      dateStr = dateMatch[1];
      const parts = dateStr.split("/");
      if (parts.length === 3 && parts[2].length === 2) {
        dateStr = `${parts[0].padStart(2, "0")}/${parts[1].padStart(2, "0")}/20${parts[2]}`;
      }
    } else {
      dateStr = dateAndDay;
    }

    const subjectId = normalizeVietnameseNameWithoutAccent(subjectNameRaw).replace(/\s+/g, "_");

    items.push({
      id: `tkb-${r + 1}-${dateStr.replace(/[^0-9]/g, "")}`,
      subjectId,
      subjectName: normalizeVietnameseName(subjectNameRaw),
      date: dateStr,
      dayOfWeek,
      startPeriod: 11,
      endPeriod: 13,
      startTime: "18:00",
      endTime: "20:25",
      teacher: teacherName,
      teacherPhone,
      classUrl: zoomUrl,
      zoomAccount,
      sessionType: "Học online",
      status: "SCHEDULED",
      note: notes,
      sourceTkbRow: r + 1,
    });
  }

  setCached(cacheKey, items);
  return items;
}

/**
 * Get Saved Zoom Aliases
 */
export async function getZoomAliases(): Promise<ZoomAlias[]> {
  const cacheKey = "zoom_aliases_all";
  const cached = getCached<ZoomAlias[]>(cacheKey);
  if (cached) return cached;

  const matrix = await fetchSheetMatrix("_SYS_ZOOM_ALIAS");
  const aliases: ZoomAlias[] = [];

  for (let r = 1; r < matrix.length; r++) {
    const row = matrix[r];
    if (!row || row.length < 3) continue;
    const id = String(row[0] || "");
    const studentId = String(row[1] || "");
    const zoomAlias = String(row[2] || "");
    const normalizedAlias = String(row[3] || normalizeVietnameseNameWithoutAccent(zoomAlias));

    if (studentId && zoomAlias) {
      aliases.push({
        id: id || `alias-${r}`,
        studentId,
        zoomAlias,
        normalizedAlias,
        createdAt: String(row[4] || ""),
        lastUsedAt: String(row[5] || ""),
      });
    }
  }

  setCached(cacheKey, aliases);
  return aliases;
}

/**
 * Get System Settings
 */
export async function getSystemSettings(): Promise<AttendanceConfig> {
  const cacheKey = "system_settings_config";
  const cached = getCached<AttendanceConfig>(cacheKey);
  if (cached) return cached;

  // If _SYS_CAU_HINH exists in sheet, load it; otherwise return default config
  const matrix = await fetchSheetMatrix("_SYS_CAU_HINH");
  if (matrix.length > 1) {
    // Read from sheet
  }

  setCached(cacheKey, DEFAULT_ATTENDANCE_CONFIG);
  return DEFAULT_ATTENDANCE_CONFIG;
}
