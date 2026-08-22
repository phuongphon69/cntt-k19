// lib/attendance/parser.ts
import { AttendanceSession, StudentAttendanceRecord, AttendanceValue } from "@/types";
import { normalizeVietnameseName, normalizeVietnameseNameWithoutAccent } from "@/lib/vietnamese/normalize";
import { calculateSubjectAttendance } from "./calculator";

export interface ParsedAttendanceSheet {
  sheetName: string;
  subjectName: string;
  teacherName: string;
  totalSessions: number;
  sessions: {
    index: number;
    date: string;
    colStart: number; // 0-based column index in sheet
  }[];
  records: StudentAttendanceRecord[];
  rawRowsCount: number;
}

/**
 * Robust parser for attendance sheets following the 4-column-per-session layout
 */
export function parseAttendanceSheet(sheetName: string, rawMatrix: any[][]): ParsedAttendanceSheet {
  if (!rawMatrix || rawMatrix.length < 3) {
    return {
      sheetName,
      subjectName: sheetName.replace(/^DD\s+/i, ""),
      teacherName: "",
      totalSessions: 0,
      sessions: [],
      records: [],
      rawRowsCount: rawMatrix?.length || 0,
    };
  }

  // 1. Read Metadata from Row 1 & 2
  const row1 = rawMatrix[0] || [];
  const row2 = rawMatrix[1] || [];
  const row3 = rawMatrix[2] || [];

  // If sheetName has prefix "DD <TÊN>", that is the most reliable clean title
  const cleanFromSheet = sheetName.replace(/^DD\s+/i, "").trim();

  // Find exact subject name from metadata row
  let subjectName = "";
  // Check Row 1 / Row 2 cells
  for (let r = 0; r < Math.min(2, rawMatrix.length); r++) {
    const row = rawMatrix[r] || [];
    for (let c = 0; c < 10; c++) {
      const val = String(row[c] || "").trim();
      if (
        val &&
        !val.toUpperCase().includes("BẢNG ĐIỂM DANH") &&
        !["Môn học", "Tên môn học", "Giảng viên", "Số buổi", "STT", "HỌ VÀ TÊN"].includes(val)
      ) {
        if (
          val.toLowerCase() === "chính trị" ||
          val.toLowerCase() === "tin học" ||
          val.toLowerCase() === "tiếng anh" ||
          val.toLowerCase().includes("thể chất") ||
          val.toLowerCase().includes(cleanFromSheet.toLowerCase())
        ) {
          subjectName = val;
          break;
        }
      }
    }
    if (subjectName) break;
  }

  if (!subjectName) {
    // Capitalize cleanFromSheet
    subjectName = cleanFromSheet.charAt(0).toUpperCase() + cleanFromSheet.slice(1).toLowerCase();
  }

  // Teacher name
  let teacherName = "";
  for (let r = 0; r < Math.min(2, rawMatrix.length); r++) {
    const row = rawMatrix[r] || [];
    for (let c = 0; c < 10; c++) {
      const prev = String(row[c - 1] || "").trim().toLowerCase();
      const curr = String(row[c] || "").trim();
      if (prev.includes("giảng viên") && curr) {
        teacherName = curr;
        break;
      }
    }
    if (teacherName) break;
  }

  // Total sessions from header
  let totalSessions = 0;
  for (let r = 0; r < Math.min(2, rawMatrix.length); r++) {
    const row = rawMatrix[r] || [];
    for (let c = 0; c < 10; c++) {
      const prev = String(row[c - 1] || "").trim().toLowerCase();
      const curr = String(row[c] || "").trim();
      if (prev.includes("số buổi") && curr && !isNaN(parseInt(curr, 10))) {
        totalSessions = parseInt(curr, 10);
        break;
      }
    }
    if (totalSessions) break;
  }

  // 2. Discover Session columns starting from col F (index 5)
  // Each session group has 4 columns: LẦN 1, LẦN 2, LẦN 3, %
  const sessionList: { index: number; date: string; colStart: number }[] = [];

  let colIdx = 5; // Column F
  let sessionIndex = 1;

  while (colIdx < row2.length) {
    const dateCell = String(row2[colIdx] || "").trim();
    const colNameInRow3 = String(row3[colIdx] || "").trim().toUpperCase();
    const colNameInRow2 = String(row2[colIdx] || "").trim().toUpperCase();

    // Check if we hit summary columns like "TỔNG X", "TỔNG P", "TỔNG CỘNG"
    if (
      colNameInRow2.includes("TỔNG") ||
      colNameInRow3.includes("TỔNG") ||
      colNameInRow2.includes("SĨ SỐ") ||
      colNameInRow3.includes("SĨ SỐ")
    ) {
      break;
    }

    // Check if dateCell has a date format or "BUỔI X"
    let dateStr = dateCell;
    if (!dateStr) {
      // Check row 3 or nearby
      if (colNameInRow3.startsWith("LẦN") || colNameInRow3 === "%") {
        dateStr = `Buổi ${sessionIndex}`;
      }
    }

    // If col has at least some indicator of being a session start
    if (dateStr || colNameInRow3.includes("LẦN 1") || colNameInRow3.includes("LẦN 2") || colIdx + 3 < row2.length) {
      sessionList.push({
        index: sessionIndex,
        date: dateStr || `Buổi ${sessionIndex}`,
        colStart: colIdx,
      });
      sessionIndex++;
      colIdx += 4; // Move to next 4-column group
    } else {
      colIdx++;
    }
  }

  if (totalSessions === 0) {
    totalSessions = sessionList.length;
  }

  // 3. Read Student Rows (starting from row 4, index 3)
  const records: StudentAttendanceRecord[] = [];

  for (let r = 3; r < rawMatrix.length; r++) {
    const row = rawMatrix[r];
    if (!row || row.length === 0) continue;

    const stt = String(row[0] || "").trim();
    const rawName = String(row[1] || "").trim();

    // If row is empty or not a student row
    if (!rawName || rawName.toUpperCase().includes("TỔNG") || rawName.toUpperCase().includes("SĨ SỐ")) {
      continue;
    }

    const studentName = normalizeVietnameseName(rawName);
    const dob = String(row[2] || "").trim();
    const studySystem = String(row[3] || "").trim();
    const dateJoined = String(row[4] || "").trim();
    const studentId = normalizeVietnameseNameWithoutAccent(rawName).replace(/\s+/g, "_");

    const sessionsObj: StudentAttendanceRecord["sessions"] = {};
    const sessionListForCalc: { date: string; round1: AttendanceValue; round2: AttendanceValue; round3: AttendanceValue }[] = [];

    for (const sess of sessionList) {
      const c = sess.colStart;
      const r1 = String(row[c] || "").trim();
      const r2 = String(row[c + 1] || "").trim();
      const r3 = String(row[c + 2] || "").trim();

      const rounds = [r1, r2, r3];
      const isRecorded = rounds.some((x) => x !== "");
      let countX = 0;
      let countP = 0;
      let countM = 0;

      for (const val of rounds) {
        const u = val.toUpperCase();
        if (u === "X") countX++;
        else if (u === "P") countP++;
        else if (u === "M") countM++;
      }

      const rate = isRecorded ? Math.round((countX / 3) * 100 * 10) / 10 : 0;
      let status: "PRESENT" | "EXCUSED" | "LATE" | "ABSENT" | "UNRECORDED" = "UNRECORDED";
      if (isRecorded) {
        if (countX > 0) status = "PRESENT";
        else if (countP > 0) status = "EXCUSED";
        else if (countM > 0) status = "LATE";
        else status = "ABSENT";
      }

      sessionsObj[sess.date] = {
        round1: r1,
        round2: r2,
        round3: r3,
        rate,
        isRecorded,
        status,
      };

      sessionListForCalc.push({
        date: sess.date,
        round1: r1,
        round2: r2,
        round3: r3,
      });
    }

    const calc = calculateSubjectAttendance(sessionListForCalc, {
      dateJoinedGroup: dateJoined,
      isStudentInSubject: true,
    });

    records.push({
      studentId,
      studentName,
      dateOfBirth: dob,
      studySystem,
      dateJoinedGroup: dateJoined,
      isApplicable: true,
      sessions: sessionsObj,
      totalX: calc.totalX,
      totalP: calc.totalP,
      totalM: calc.totalM,
      recordedSessions: calc.recordedSessions,
      attendanceRate: calc.attendanceRate,
      warning: calc.warning,
    });
  }

  return {
    sheetName,
    subjectName,
    teacherName,
    totalSessions,
    sessions: sessionList,
    records,
    rawRowsCount: rawMatrix.length,
  };
}
