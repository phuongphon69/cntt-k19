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
import {
  getSessionOverride,
  getCustomSubjects,
  getRecordedAttendanceRounds,
  isSubjectSheetCreated,
  getCreatedSheets,
} from "./sync-store";
import { parseVNDate } from "@/lib/utils";
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
    const res = await fetch(url, { signal: AbortSignal.timeout(3000), next: { revalidate: 30 } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const jsonStr = text.substring(text.indexOf("{"), text.lastIndexOf("}") + 1);
    const parsed = JSON.parse(jsonStr);

    const cols = parsed.table?.cols || [];
    const rows = parsed.table?.rows || [];

    // If the requested sheet is NOT "TKB", check if GViz fell back to TKB because sheet does not exist
    if (sheetName.trim().toUpperCase() !== "TKB") {
      const isTkbFallback = cols.some((c: any) =>
        String(c?.label || "").toUpperCase().includes("THỜI KHÓA BIỂU")
      );
      if (isTkbFallback) {
        return [];
      }
    }

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

  // Fallback 1: Dynamically scrape real sheet tabs from Google Sheet HTML (production/runtime)
  if (process.env.NODE_ENV !== "test") {
    try {
      const editUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
      const res = await fetch(editUrl, {
        signal: AbortSignal.timeout(3000),
        next: { revalidate: 60 },
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      });
      if (res.ok) {
        const html = await res.text();
        const regex = /docs-sheet-tab-caption">([^<]+)<\/div>/g;
        const scraped: string[] = [];
        let match;
        while ((match = regex.exec(html)) !== null) {
          if (match[1] && !scraped.includes(match[1])) {
            scraped.push(match[1]);
          }
        }
        if (scraped.length > 0) {
          // Scraped contains the true list of sheets currently existing in Google Sheets
          setCached(cacheKey, scraped);
          return scraped;
        }
      }
    } catch (scrapeErr) {
      console.warn("Failed to scrape sheet names from HTML:", scrapeErr);
    }
  }

  // Fallback 2: Known core default sheets
  const defaultSheets = Array.from(
    new Set([
      "TKB",
      "CNTT - K19",
      "DANH SÁCH LỚP",
      "DD CHÍNH TRỊ",
      "DD TIN HỌC",
      "DD TIẾNG ANH",
      "DD GDTC",
      "MẪU MÔN HỌC",
      "TỔNG HỢP",
      ...getCreatedSheets(),
    ])
  );
  setCached(cacheKey, defaultSheets);
  return defaultSheets;
}

/**
 * Read students strictly from "CNTT - K19"
 */
export async function getStudents(): Promise<Student[]> {
  const cacheKey = "students_all_roster";
  const cached = getCached<Student[]>(cacheKey);
  if (cached) return cached;

  const rawMatrix = await fetchSheetMatrix("CNTT - K19");
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
      if (
        (hoVa.toUpperCase().includes("HỌ") && ten.toUpperCase().includes("TÊN")) ||
        sttRaw.toUpperCase().includes("STT") ||
        hoVa.toUpperCase().includes("HỌ VÀ TÊN")
      ) {
        continue;
      }

      const fullName = normalizeVietnameseName(`${hoVa} ${ten}`);
      const normalizedName = normalizeVietnameseName(fullName);
      const normalizedNameNoAccent = normalizeVietnameseNameWithoutAccent(fullName);
      const studentId = normalizedNameNoAccent.replace(/\s+/g, "_");

      const dob = String(row[3] || "").trim();
      // row[4] is Giới tính
      const cccd = String(row[5] || "").trim();
      const placeOfBirth = String(row[6] || "").trim();
      // row[7] is ĐÃ TỐT NGHIỆP VĂN BẰNG VÀ NGÀNH HỌC
      // row[8] is NGÀY THÁNG NĂM TỐT NGHIỆP
      const phone = String(row[9] || "").trim();
      // row[10] is NGÀNH ĐĂNG KÝ HỌC
      const studySystem = String(row[11] || "").trim();
      const dateJoined = String(row[12] || "").trim();
      // row[13] is Miền Bắc, row[14] is Miền Nam
      const notes = String(row[15] || "").trim();

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
        cccd,
        studySystem,
        dateJoinedGroup: dateJoined,
        notes,
        active: true,
        sourceSheet: "CNTT - K19",
        sourceRow: r + 1,
      });
    }
  }

  // Fallback to default class roster if sheet is unreadable or offline
  if (students.length === 0) {
    const DEFAULT_ROSTER = [
      { stt: 1, hoVa: "Trương Văn", ten: "Trung", dob: "16/06/1993", gender: "Nam" },
      { stt: 2, hoVa: "Nguyễn Văn", ten: "Chung", dob: "08/07/1992", gender: "Nam" },
      { stt: 3, hoVa: "Nguyễn Huy", ten: "Phương", dob: "10/08/1997", gender: "Nam", dateJoined: "11/05/2026" },
      { stt: 4, hoVa: "Nguyễn Quang", ten: "Tuấn", dob: "23/02/1989", gender: "Nam" },
      { stt: 5, hoVa: "Trịnh Văn", ten: "Đức", dob: "05/03/2000", gender: "Nam" },
      { stt: 6, hoVa: "Trịnh Đức", ten: "Thịnh", dob: "21/09/1992", gender: "Nam" },
      { stt: 7, hoVa: "Hoàng Công", ten: "Minh", dob: "22/07/1996", gender: "Nam" },
      { stt: 8, hoVa: "Trần Hoàng", ten: "Anh", dob: "01/01/1994", gender: "Nam" },
      { stt: 9, hoVa: "Bùi Trung", ten: "Hiếu", dob: "13/12/1998", gender: "Nam" },
      { stt: 10, hoVa: "Phạm Anh", ten: "Tuấn", dob: "10/11/1988", gender: "Nam" },
      { stt: 11, hoVa: "Hoàng Đình", ten: "Thành", dob: "12/09/1979", gender: "Nam" },
      { stt: 12, hoVa: "Hoàng Thị", ten: "Phương", dob: "17/06/1991", gender: "Nữ" },
      { stt: 13, hoVa: "Nguyễn Bằng", ten: "Lâm", dob: "12/03/1989", gender: "Nam" },
      { stt: 14, hoVa: "Hoàng Ngọc", ten: "Hùng", dob: "12/11/1988", gender: "Nam" },
      { stt: 15, hoVa: "Phùng Bá", ten: "Hoan", dob: "08/03/1991", gender: "Nam" },
      { stt: 16, hoVa: "Nguyễn Doãn", ten: "Hướng", dob: "24/09/1988", gender: "Nam" },
      { stt: 17, hoVa: "Võ Trọng", ten: "Tưởng", dob: "11/04/1981", gender: "Nam" },
      { stt: 18, hoVa: "Nguyễn Phùng", ten: "Cường", dob: "30/08/1981", gender: "Nam" },
      { stt: 19, hoVa: "Lê Văn", ten: "Huân", dob: "03/09/1985", gender: "Nam" },
      { stt: 20, hoVa: "Bùi Hồng", ten: "Quân", dob: "06/03/1974", gender: "Nam" },
      { stt: 21, hoVa: "Nguyễn Thế", ten: "Văn", dob: "01/01/1982", gender: "Nam" },
      { stt: 22, hoVa: "Mai Xuân", ten: "Phát", dob: "20/12/1985", gender: "Nam" },
      { stt: 23, hoVa: "Phạm Văn", ten: "Trung", dob: "06/11/1988", gender: "Nam" },
      { stt: 24, hoVa: "Phạm Đình", ten: "Diện", dob: "31/01/1985", gender: "Nam" },
      { stt: 25, hoVa: "Trần Ngọc", ten: "Bảo", dob: "06/12/2001", gender: "Nam" },
      { stt: 26, hoVa: "Nguyễn Đăng", ten: "Bằng", dob: "06/01/1988", gender: "Nam" },
      { stt: 27, hoVa: "Nguyễn Văn", ten: "Việt", dob: "14/11/1984", gender: "Nam" },
      { stt: 28, hoVa: "Nguyễn Khắc", ten: "Bình", dob: "01/10/1989", gender: "Nam" },
      { stt: 29, hoVa: "Nguyễn Trần", ten: "Hoàn", dob: "29/10/1994", gender: "Nam" },
      { stt: 30, hoVa: "Nguyễn Lê", ten: "Lợi", dob: "18/12/1983", gender: "Nam" },
      { stt: 31, hoVa: "Phạm Ngọc", ten: "Hà", dob: "02/12/1985", gender: "Nam" },
      { stt: 32, hoVa: "Trần Ngọc", ten: "Tú", dob: "02/03/1985", gender: "Nam" },
      { stt: 33, hoVa: "Nguyễn Văn", ten: "Hiếu", dob: "01/11/1996", gender: "Nam" },
      { stt: 34, hoVa: "Nguyễn Văn", ten: "Đồng", dob: "07/10/1993", gender: "Nam" },
      { stt: 35, hoVa: "Phùng Quang", ten: "Tuế", dob: "04/01/1990", gender: "Nam" },
      { stt: 36, hoVa: "Nguyễn Sỹ", ten: "Tuấn", dob: "20/08/1995", gender: "Nam" },
      { stt: 37, hoVa: "Phạm Ngọc", ten: "Lân", dob: "15/03/1980", gender: "Nam" },
      { stt: 38, hoVa: "Dương Thanh", ten: "Sơn", dob: "26/03/1997", gender: "Nam" },
      { stt: 39, hoVa: "Đào Xuân", ten: "Quế", dob: "14/07/1986", gender: "Nam" },
      { stt: 40, hoVa: "Lê Văn", ten: "Hiếu", dob: "16/01/2003", gender: "Nam" },
      { stt: 41, hoVa: "Phan Công", ten: "Hoàng", dob: "03/02/1982", gender: "Nam" },
      { stt: 42, hoVa: "Phạm Khánh", ten: "Huyền", dob: "07/04/2007", gender: "Nữ" },
      { stt: 43, hoVa: "Trần Thế", ten: "Anh", dob: "08/05/2000", gender: "Nam" },
    ];

    for (const s of DEFAULT_ROSTER) {
      const fullName = normalizeVietnameseName(`${s.hoVa} ${s.ten}`);
      const normalizedNameNoAccent = normalizeVietnameseNameWithoutAccent(fullName);
      students.push({
        id: normalizedNameNoAccent.replace(/\s+/g, "_"),
        stt: s.stt,
        fullName,
        hoVa: s.hoVa,
        ten: s.ten,
        normalizedName: fullName,
        normalizedNameNoAccent,
        dateOfBirth: s.dob,
        dateJoinedGroup: s.dateJoined || "",
        active: true,
        sourceSheet: "CNTT - K19",
        sourceRow: s.stt + 3,
      });
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
    dateJoinedGroup: s.dateJoinedGroup,
    active: s.active,
  }));
}

export interface TkbSubjectInfo {
  name: string;
  teacher: string;
  phone: string;
  count: number;
  dates: string[];
}

/**
 * Extract all subjects and session counts from sheet TKB
 */
export async function getTkbSubjectStats(): Promise<Map<string, TkbSubjectInfo>> {
  const schedule = await getSchedule();
  const map = new Map<string, TkbSubjectInfo>();

  for (const item of schedule) {
    const rawName = item.subjectName?.trim();
    if (!rawName) continue;
    const lower = rawName.toLowerCase();
    // Exclude days off and generic review without teacher
    if (lower.includes("nghỉ") || lower.includes("nghi") || lower === "ôn tập" || lower === "on tap") {
      continue;
    }

    const normId = normalizeVietnameseNameWithoutAccent(rawName).toLowerCase().replace(/\s+/g, "_");

    if (!map.has(normId)) {
      map.set(normId, {
        name: rawName,
        teacher: item.teacher || "",
        phone: item.teacherPhone || "",
        count: 0,
        dates: [],
      });
    }

    const sub = map.get(normId)!;
    sub.count++;
    if (item.teacher && !sub.teacher) sub.teacher = item.teacher;
    if (item.teacherPhone && !sub.phone) sub.phone = item.teacherPhone;
    if (item.date && !sub.dates.includes(item.date)) {
      sub.dates.push(item.date);
    }
  }

  return map;
}

/**
 * Get all Subjects (combining known sheets + dynamic DD* sheets + auto-discovered TKB subjects)
 */
export async function getSubjects(): Promise<Subject[]> {
  const cacheKey = "subjects_all_list";
  const cached = getCached<Subject[]>(cacheKey);
  if (cached) return cached;

  const sheetNames = await getWorkbookSheetNames();
  const ddSheets = sheetNames.filter((s) => s.trim().toUpperCase().startsWith("DD "));

  const tkbMap = await getTkbSubjectStats();
  const classStudents = await getStudents();
  const totalClassStudents = classStudents.length;
  const subjects: Subject[] = [];
  const processedTkbIds = new Set<string>();

  // Helper to match subject IDs with aliases
  const matchTkbKey = (targetId: string, sheetTitle: string): string | null => {
    const targetNorm = normalizeVietnameseNameWithoutAccent(targetId).toLowerCase().replace(/\s+/g, "_");
    const sheetNorm = normalizeVietnameseNameWithoutAccent(sheetTitle).toLowerCase().replace(/\s+/g, "_");

    for (const key of Array.from(tkbMap.keys())) {
      const keyNorm = normalizeVietnameseNameWithoutAccent(key).toLowerCase().replace(/\s+/g, "_");
      if (
        keyNorm === targetNorm ||
        keyNorm === sheetNorm ||
        (keyNorm.includes("the_chat") && (targetNorm.includes("gdtc") || sheetNorm.includes("gdtc"))) ||
        (keyNorm.includes("chinh_tri") && (targetNorm.includes("chinh_tri") || sheetNorm.includes("chinh_tri"))) ||
        (keyNorm === "tin_hoc" && (targetNorm === "tin_hoc" || sheetNorm === "tin_hoc")) ||
        (keyNorm.includes("tieng_anh") && (targetNorm.includes("tieng_anh") || sheetNorm.includes("tieng_anh"))) ||
        (keyNorm.includes("phap_luat") && (targetNorm.includes("phap_luat") || sheetNorm.includes("phap_luat"))) ||
        (keyNorm.includes("ky_thuat_lap_trinh") && (targetNorm.includes("ky_thuat_lap_trinh") || sheetNorm.includes("ky_thuat_lap_trinh"))) ||
        (keyNorm.includes("cau_truc_du_lieu") && (targetNorm.includes("cau_truc_du_lieu") || sheetNorm.includes("cau_truc_du_lieu")))
      ) {
        return key;
      }
    }
    return null;
  };

  // 1. Process all existing DD* sheets from Google Sheets
  for (const sheetName of ddSheets) {
    const parsed = await getAttendanceSheetData(sheetName);
    const cleanSheetTitle = sheetName.replace(/^DD\s+/i, "").trim();
    const id = normalizeVietnameseNameWithoutAccent(cleanSheetTitle).toLowerCase().replace(/\s+/g, "_");

    // Match strictly with TKB by sheet title
    const tkbKey = matchTkbKey(id, cleanSheetTitle);
    const tkbInfo = tkbKey ? tkbMap.get(tkbKey) : null;
    if (tkbKey) processedTkbIds.add(tkbKey);

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

    // Check for accumulated sessions override (saved during sync) or sync with TKB
    const override = getSessionOverride(sheetName) ?? getSessionOverride(id);
    const maxSessions = tkbInfo?.count || parsed.sessions.length || parsed.totalSessions || 12;
    const finalTotalSessions = override !== null ? override : maxSessions;

    const getDayOfWeek = (dStr: string) => {
      const d = parseVNDate(dStr);
      if (!d) return "";
      const days = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
      return days[d.getDay()];
    };

    // Merge dates from TKB and DD* sheet so all scheduled sessions in TKB are available for attendance
    const dateMap = new Map<string, { index: number; date: string; dayOfWeek: string }>();

    // 1. First add all scheduled session dates from TKB in order
    if (tkbInfo && tkbInfo.dates.length > 0) {
      tkbInfo.dates.forEach((d, idx) => {
        dateMap.set(d, {
          index: idx + 1,
          date: d,
          dayOfWeek: getDayOfWeek(d),
        });
      });
    }

    // 2. Next, merge or add any sessions already present in the DD* sheet
    parsed.sessions.forEach((s) => {
      if (dateMap.has(s.date)) {
        const existing = dateMap.get(s.date)!;
        if (s.index) existing.index = s.index;
      } else {
        dateMap.set(s.date, {
          index: s.index || dateMap.size + 1,
          date: s.date,
          dayOfWeek: getDayOfWeek(s.date),
        });
      }
    });

    const sessionDates = Array.from(dateMap.values()).sort((a, b) => a.index - b.index);

    // Count sessions that actually have attendance marked
    const actuallyRecordedCount = parsed.sessions.filter((sess) =>
      parsed.records.some((rec) => {
        const s = rec.sessions[sess.date];
        return s && s.isRecorded && (s.round1 || s.round2 || s.round3);
      })
    ).length;

    // Subject display name: prioritize TKB official name or clean sheet title
    const displayName = tkbInfo?.name || cleanSheetTitle;

    subjects.push({
      id,
      code: id.toUpperCase().slice(0, 10),
      name: displayName,
      shortName: displayName,
      attendanceSheet: sheetName,
      teacher: tkbInfo?.teacher || parsed.teacherName || "Chưa cập nhật",
      teacherPhone: tkbInfo?.phone || "",
      totalSessions: finalTotalSessions,
      status: "ACTIVE",
      isPublic: true,
      recordedSessionsCount: actuallyRecordedCount,
      averageAttendanceRate: avgRate,
      hasSheet: true,
      tkbSessionsCount: tkbInfo?.count,
      enrolledStudentsCount: totalClassStudents,
      totalClassStudents: totalClassStudents,
      sessionDates,
    });
  }

  // 2. Automatically append subjects from TKB that don't have a DD* sheet yet!
  for (const [key, tkbInfo] of Array.from(tkbMap.entries())) {
    if (processedTkbIds.has(key)) continue;

    const id = key;
    const cleanName = tkbInfo.name;
    const sheetName = `DD ${cleanName.toUpperCase().trim()}`;
    const override = getSessionOverride(sheetName) ?? getSessionOverride(id);
    const finalTotalSessions = override !== null ? override : (tkbInfo.count || 10);

    const getDayOfWeek = (dStr: string) => {
      const d = parseVNDate(dStr);
      if (!d) return "";
      const days = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
      return days[d.getDay()];
    };

    const sessionDates = (tkbInfo.dates || []).map((d, i) => ({
      index: i + 1,
      date: d,
      dayOfWeek: getDayOfWeek(d),
    }));

    const hasSheetCreated = isSubjectSheetCreated(sheetName);
    const recordedRounds = getRecordedAttendanceRounds(sheetName);
    const uniqueDates = new Set(recordedRounds.map((r) => r.sessionDate));

    subjects.push({
      id,
      code: id.toUpperCase().slice(0, 10),
      name: cleanName,
      shortName: cleanName,
      attendanceSheet: sheetName,
      teacher: tkbInfo.teacher || "Chưa cập nhật",
      teacherPhone: tkbInfo.phone || "",
      totalSessions: finalTotalSessions,
      status: "ACTIVE",
      isPublic: true,
      recordedSessionsCount: uniqueDates.size,
      averageAttendanceRate: 0,
      isFromTkb: true,
      hasSheet: hasSheetCreated,
      tkbSessionsCount: tkbInfo.count,
      enrolledStudentsCount: totalClassStudents,
      totalClassStudents: totalClassStudents,
      sessionDates,
    });
  }

  // 3. Append any additional custom subjects from persistent sync-store if not present
  const customSubs = getCustomSubjects();
  for (const cs of customSubs) {
    if (!subjects.some((s) => s.id === cs.id || s.attendanceSheet === cs.attendanceSheet)) {
      subjects.push({
        ...cs,
        totalSessions: getSessionOverride(cs.attendanceSheet) ?? cs.totalSessions,
      });
    }
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

  const cleanTitle = sheetName.replace(/^DD\s+/i, "").trim();
  const titleNorm = normalizeVietnameseNameWithoutAccent(cleanTitle).toLowerCase().replace(/\s+/g, "_");

  // Retrieve TKB schedule to correlate session dates
  const schedule = await getSchedule();
  const subSessions = schedule.filter((s) => {
    const sNorm = normalizeVietnameseNameWithoutAccent(s.subjectName).toLowerCase().replace(/\s+/g, "_");
    return (
      sNorm === titleNorm ||
      (titleNorm.includes("tin_hoc") && sNorm.includes("tin_hoc")) ||
      (titleNorm.includes("tieng_anh") && sNorm.includes("tieng_anh")) ||
      ((titleNorm.includes("gdtc") || titleNorm.includes("the_chat")) && sNorm.includes("the_chat")) ||
      (titleNorm.includes("phap_luat") && sNorm.includes("phap_luat")) ||
      (titleNorm.includes("ky_thuat_lap_trinh") && sNorm.includes("ky_thuat_lap_trinh")) ||
      (titleNorm.includes("cau_truc_du_lieu") && sNorm.includes("cau_truc_du_lieu"))
    );
  });

  const tkbDates = subSessions.map((s) => s.date);

  const availableSheets = await getWorkbookSheetNames();
  const sheetExists = availableSheets.some(
    (s) => s.trim().toUpperCase() === sheetName.trim().toUpperCase()
  );

  let matrix = sheetExists ? await fetchSheetMatrix(sheetName) : [];
  if (matrix.length === 0) {
    const directMatrix = await fetchSheetMatrix(sheetName);
    const isTkbDefault =
      directMatrix.length > 0 &&
      String(directMatrix[0]?.[0] || "").toUpperCase().includes("THỜI KHÓA BIỂU");
    if (!isTkbDefault && directMatrix.length >= 3) {
      matrix = directMatrix;
    }
  }
  let parsed = parseAttendanceSheet(sheetName, matrix, tkbDates.length > 0 ? tkbDates : undefined);

  // If sheet doesn't exist on Google Sheets yet (e.g. newly discovered from TKB),
  // synthesize sessions from TKB schedule and records from active student roster
  if (parsed.sessions.length === 0 && parsed.records.length === 0) {
    const students = await getStudents();
    const override = getSessionOverride(sheetName);
    const totalSessions = override ?? (subSessions.length || 10);

    parsed = {
      sheetName,
      subjectName: cleanTitle,
      teacherName: subSessions[0]?.teacher || "",
      totalSessions,
      sessions: subSessions.map((s, idx) => ({
        index: idx + 1,
        date: s.date,
        colStart: 5 + idx * 4,
      })),
      records: students.map((st) => {
        const joinDate = parseVNDate(st.dateJoinedGroup);
        const allBefore =
          !!joinDate &&
          subSessions.length > 0 &&
          subSessions.every((s) => {
            const d = parseVNDate(s.date);
            return !d || joinDate.getTime() > d.getTime();
          });

        return {
          studentId: st.id,
          studentName: st.fullName,
          dateOfBirth: st.dateOfBirth,
          studySystem: st.studySystem,
          dateJoinedGroup: st.dateJoinedGroup,
          isApplicable: !allBefore,
          sessions: {},
          totalX: 0,
          totalP: 0,
          totalM: 0,
          attendanceRate: 100,
          recordedSessions: 0,
          warning: false,
        };
      }),
      rawRowsCount: 0,
    };
  }

  const classStudents = await getStudents();
  parsed.totalClassStudents = classStudents.length;

  // Reconcile records strictly against official class roster (43 students)
  const officialRecords: StudentAttendanceRecord[] = [];
  for (const cs of classStudents) {
    const existing = parsed.records.find(
      (r) =>
        r.studentId === cs.id ||
        normalizeVietnameseNameWithoutAccent(r.studentName).replace(/\s+/g, "_") === cs.id
    );
    if (existing) {
      officialRecords.push({
        ...existing,
        studentId: cs.id,
        studentName: cs.fullName,
        dateOfBirth: cs.dateOfBirth,
        studySystem: cs.studySystem,
        dateJoinedGroup: cs.dateJoinedGroup,
      });
    } else {
      officialRecords.push({
        studentId: cs.id,
        studentName: cs.fullName,
        dateOfBirth: cs.dateOfBirth,
        studySystem: cs.studySystem,
        dateJoinedGroup: cs.dateJoinedGroup,
        isApplicable: true,
        sessions: {},
        totalX: 0,
        totalP: 0,
        totalM: 0,
        attendanceRate: 100,
        recordedSessions: 0,
        warning: false,
      });
    }
  }
  parsed.records = officialRecords;
  parsed.enrolledStudentsCount = classStudents.length;

  // 5. Overlay any confirmed attendance rounds from persistent sync-store
  const recordedRounds = getRecordedAttendanceRounds(sheetName);
  if (recordedRounds.length > 0) {
    for (const entry of recordedRounds) {
      // Ensure session exists
      let session = parsed.sessions.find(
        (s) => s.date === entry.sessionDate || s.date.includes(entry.sessionDate) || entry.sessionDate.includes(s.date)
      );
      if (!session) {
        session = {
          index: parsed.sessions.length + 1,
          date: entry.sessionDate,
          colStart: 5 + parsed.sessions.length * 4,
        };
        parsed.sessions.push(session);
      }

      // Apply updates to student records
      for (const upd of entry.updates) {
        const rec = parsed.records.find(
          (r) =>
            r.studentId === upd.studentId ||
            normalizeVietnameseNameWithoutAccent(r.studentName).replace(/\s+/g, "_") === upd.studentId
        );
        if (rec) {
          if (!rec.sessions[session.date]) {
            rec.sessions[session.date] = {
              round1: "",
              round2: "",
              round3: "",
              rate: 0,
              isRecorded: true,
              status: "PRESENT",
            };
          }
          const sessObj = rec.sessions[session.date];
          if (entry.roundNumber === 1) sessObj.round1 = upd.value;
          else if (entry.roundNumber === 2) sessObj.round2 = upd.value;
          else if (entry.roundNumber === 3) sessObj.round3 = upd.value;
          sessObj.isRecorded = true;
        }
      }
    }

    // Recompute statistics for each student record
    for (const rec of parsed.records) {
      let countX = 0;
      let countP = 0;
      let countM = 0;
      let recordedSessions = 0;

      for (const s of parsed.sessions) {
        const sess = rec.sessions[s.date];
        if (sess && sess.status !== "NOT_APPLICABLE") {
          const rounds = [sess.round1, sess.round2, sess.round3];
          let sessX = 0;
          for (const v of rounds) {
            const u = (v || "").toUpperCase();
            if (u === "X") { countX++; sessX++; }
            else if (u === "P") countP++;
            else if (u === "M") countM++;
          }
          // Tỷ lệ có mặt 2/3 trở lên được tính ngày đó có tham gia học đầy đủ
          // Trường hợp 0/3 và 1/3 đều là vắng mặt
          recordedSessions++;
          sess.isRecorded = true;
          sess.rate = Math.round((sessX / 3) * 100 * 10) / 10;
          sess.status = sessX >= 2 ? "PRESENT" : "ABSENT";
        }
      }

      rec.totalX = countX;
      rec.totalP = countP;
      rec.totalM = countM;
      rec.recordedSessions = recordedSessions;
      rec.attendanceRate =
        recordedSessions > 0 ? Math.round((countX / (recordedSessions * 3)) * 100 * 10) / 10 : 100;
      rec.warning = rec.attendanceRate < 80;
    }
  }

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
    { id: "tiet-11", periodNumber: 11, name: "Tiết 11", startTime: "19:00", endTime: "19:45", sortOrder: 11, active: true },
    { id: "tiet-12", periodNumber: 12, name: "Tiết 12", startTime: "19:50", endTime: "20:35", sortOrder: 12, active: true },
    { id: "tiet-13", periodNumber: 13, name: "Tiết 13", startTime: "20:45", endTime: "21:30", sortOrder: 13, active: true },
    { id: "tiet-14", periodNumber: 14, name: "Tiết 14", startTime: "21:35", endTime: "22:15", sortOrder: 14, active: true },
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

  // Pass 1: Count total occurrences per subject in TKB
  const subjectTotalCounts = new Map<string, number>();
  for (let r = 0; r < rawMatrix.length; r++) {
    const row = rawMatrix[r];
    if (!row || row.length === 0) continue;
    const dateAndDay = String(row[0] || "").trim();
    const subjectNameRaw = String(row[1] || "").trim();
    if (!dateAndDay || !subjectNameRaw || dateAndDay.toUpperCase().includes("THỨ / NGÀY")) continue;
    const normKey = normalizeVietnameseNameWithoutAccent(subjectNameRaw).toLowerCase().replace(/\s+/g, "_");
    if (!normKey.includes("nghi") && !subjectNameRaw.toLowerCase().includes("nghỉ")) {
      subjectTotalCounts.set(normKey, (subjectTotalCounts.get(normKey) || 0) + 1);
    }
  }

  // Pass 2: Track cumulative sessions per subject from top to bottom
  const subjectSessionTracker = new Map<string, number>();

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
      if (parts.length === 3) {
        const d = parts[0].padStart(2, "0");
        const m = parts[1].padStart(2, "0");
        const y = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
        dateStr = `${d}/${m}/${y}`;
      }
    } else {
      dateStr = dateAndDay;
    }

    const normKey = normalizeVietnameseNameWithoutAccent(subjectNameRaw).toLowerCase().replace(/\s+/g, "_");
    const subjectId = normKey;
    const isHoliday = normKey.includes("nghi") || subjectNameRaw.toLowerCase().includes("nghỉ");

    // Default time is 19h00 to 21h30 as requested
    let startPeriod = 11;
    let endPeriod = 13;
    let startTime = "19:00";
    let endTime = "21:30";
    let hasExplicitPeriod = false;
    let sessionNumber: number | undefined = undefined;
    let totalSessionsForSubject: number | undefined = undefined;

    if (!isHoliday) {
      const currentCount = (subjectSessionTracker.get(normKey) || 0) + 1;
      subjectSessionTracker.set(normKey, currentCount);
      sessionNumber = currentCount;
      totalSessionsForSubject = subjectTotalCounts.get(normKey) || currentCount;

      // Cumulative periods from top to bottom (3 periods per session: Buổi 1 -> 1-3, Buổi 2 -> 4-6, etc.)
      startPeriod = (currentCount - 1) * 3 + 1;
      endPeriod = currentCount * 3;
      hasExplicitPeriod = true;

      // Override if notes or subject explicitly specifies periods (e.g. "Tiết 1-3")
      const periodMatch = (notes + " " + subjectNameRaw).match(/tiết\s*(\d+)\s*[-–—]\s*(\d+)/i);
      if (periodMatch) {
        startPeriod = parseInt(periodMatch[1], 10);
        endPeriod = parseInt(periodMatch[2], 10);
      }
    }

    items.push({
      id: `tkb-${r + 1}-${dateStr.replace(/[^0-9]/g, "")}`,
      subjectId,
      subjectName: normalizeVietnameseName(subjectNameRaw),
      date: dateStr,
      dayOfWeek,
      startPeriod,
      endPeriod,
      startTime,
      endTime,
      sessionNumber,
      totalSessionsForSubject,
      hasExplicitPeriod,
      shiftName: "Ca tối (19h00 - 21h30)",
      teacher: teacherName,
      teacherPhone,
      classUrl: zoomUrl,
      zoomAccount,
      sessionType: "Học online",
      status: isHoliday ? "CANCELLED" : "SCHEDULED",
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
