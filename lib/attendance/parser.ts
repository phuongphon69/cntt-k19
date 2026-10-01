// lib/attendance/parser.ts
import { AttendanceSession, StudentAttendanceRecord, AttendanceValue } from "@/types";
import { normalizeVietnameseName, normalizeVietnameseNameWithoutAccent } from "@/lib/vietnamese/normalize";
import { calculateSubjectAttendance } from "./calculator";
import { parseVNDate } from "@/lib/utils";

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
  totalClassStudents?: number;
  enrolledStudentsCount?: number;
}

/**
 * Robust parser for attendance sheets following the 4-column-per-session layout
 * Accepts optional tkbDates to strictly sync session dates with sheet "TKB"
 */
export function parseAttendanceSheet(
  sheetName: string,
  rawMatrix: any[][],
  tkbDates?: string[]
): ParsedAttendanceSheet {
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

  const cleanFromSheet = sheetName.replace(/^DD\s+/i, "").trim();

  // 1. Locate the header row containing "HỌ VÀ TÊN" / "HỌ TÊN" or "STT"
  let headerRowIdx = -1;
  for (let r = 0; r < Math.min(5, rawMatrix.length); r++) {
    const row = rawMatrix[r] || [];
    const joined = row.map((c: any) => String(c || "").toUpperCase()).join(" ");
    if (
      joined.includes("HỌ VÀ TÊN") ||
      joined.includes("HỌ TÊN") ||
      (joined.includes("STT") && (joined.includes("NGÀY") || joined.includes("HỆ")))
    ) {
      headerRowIdx = r;
      break;
    }
  }

  let studentStartRow = headerRowIdx !== -1 ? headerRowIdx + 2 : -1;

  if (headerRowIdx === -1) {
    // If no explicit header row was found, check where student rows start!
    for (let r = 0; r < Math.min(5, rawMatrix.length); r++) {
      const row = rawMatrix[r] || [];
      const stt = parseInt(String(row[0] || ""), 10);
      const name = String(row[1] || "").trim();
      if ((stt === 1 || stt === 2) && name.length >= 3 && !name.toUpperCase().includes("MÔN")) {
        studentStartRow = r;
        headerRowIdx = Math.max(0, r - 1);
        break;
      }
    }
    if (studentStartRow === -1) {
      studentStartRow = Math.min(2, rawMatrix.length - 1);
      headerRowIdx = Math.max(0, studentStartRow - 2);
    }
  }

  // 2. Discover Subject Name, Teacher Name, Total Sessions from metadata rows
  let subjectName = "";
  let teacherName = "";
  let totalSessions = 0;

  for (let r = 0; r <= headerRowIdx; r++) {
    const row = rawMatrix[r] || [];
    for (let c = 0; c < Math.min(row.length, 15); c++) {
      const val = String(row[c] || "").trim();
      const prev = String(row[c - 1] || "").trim().toLowerCase();

      // Subject name
      if (
        !subjectName &&
        val &&
        !val.toUpperCase().includes("BẢNG ĐIỂM DANH") &&
        !["Môn học", "Tên môn học", "Giảng viên", "Số buổi", "STT", "HỌ VÀ TÊN", "NGÀY SINH"].includes(val)
      ) {
        if (
          val.toLowerCase() === "chính trị" ||
          val.toLowerCase() === "tin học" ||
          val.toLowerCase() === "tiếng anh" ||
          val.toLowerCase().includes("thể chất") ||
          val.toLowerCase().includes(cleanFromSheet.toLowerCase())
        ) {
          subjectName = val;
        }
      }

      // Teacher
      if (!teacherName && prev.includes("giảng viên") && val) {
        teacherName = val;
      }

      // Total sessions
      if (!totalSessions && prev.includes("số buổi") && val && !isNaN(parseInt(val, 10))) {
        totalSessions = parseInt(val, 10);
      }
    }
  }

  if (!subjectName) {
    subjectName = cleanFromSheet.charAt(0).toUpperCase() + cleanFromSheet.slice(1).toLowerCase();
  }

  // 3. Discover Session columns starting from col F (index 5)
  // The row with "HỌ VÀ TÊN" (headerRowIdx) has the session dates
  const dateRow = rawMatrix[headerRowIdx] || [];
  const labelRow = rawMatrix[headerRowIdx + 1] || [];
  const sessionList: { index: number; date: string; colStart: number }[] = [];

  let colIdx = 5; // Column F
  let sessionIndex = 1;
  let summaryColStart = 999;

  while (colIdx < dateRow.length) {
    const dateCell = String(dateRow[colIdx] || "").trim();
    const labelCell = String(labelRow[colIdx] || "").trim().toUpperCase();

    // Check if we hit summary columns
    if (
      dateCell.toUpperCase().includes("TỔNG") ||
      dateCell.toUpperCase().includes("SĨ SỐ") ||
      dateCell.toUpperCase().includes("GHI CHÚ") ||
      dateCell.toUpperCase().includes("CHUYÊN CẦN") ||
      labelCell.includes("TỔNG") ||
      labelCell.includes("SĨ SỐ") ||
      labelCell.includes("CHUYÊN CẦN")
    ) {
      summaryColStart = colIdx;
      break;
    }

    const hasTkbDate = !!(tkbDates && tkbDates[sessionIndex - 1]);
    const hasCellDate = !!parseVNDate(dateCell);
    const hasSessionLabel = labelCell.startsWith("LẦN") || labelCell.includes("LẦN");

    // Check if students have attendance marks in this column
    let hasStudentData = false;
    for (let r = headerRowIdx + 2; r < Math.min(headerRowIdx + 15, rawMatrix.length); r++) {
      const v = String(rawMatrix[r]?.[colIdx] || "").trim();
      if (v) {
        hasStudentData = true;
        break;
      }
    }

    // If the column does not have a TKB date, does not have a real date in the sheet,
    // and has NO student attendance marks, it is an empty dummy column from the template. STOP!
    if (!hasTkbDate && !hasCellDate && !hasStudentData) {
      break;
    }

    // If total sessions was declared and we reached it and have no further dates
    if (totalSessions > 0 && sessionIndex > totalSessions && !hasTkbDate && !hasCellDate) {
      break;
    }

    // Determine session date normalized as DD/MM/YYYY:
    // 1. If dateCell has a valid date, prioritize it!
    // 2. Else if TKB has this session's date, use TKB date!
    // 3. Else fallback to "Buổi X"
    let finalDate = "";
    if (hasCellDate) {
      const parsedD = parseVNDate(dateCell);
      if (parsedD) {
        const dd = String(parsedD.getDate()).padStart(2, "0");
        const mm = String(parsedD.getMonth() + 1).padStart(2, "0");
        finalDate = `${dd}/${mm}/${parsedD.getFullYear()}`;
      } else {
        finalDate = dateCell;
      }
    } else if (hasTkbDate) {
      const parsedD = parseVNDate(tkbDates![sessionIndex - 1]);
      if (parsedD) {
        const dd = String(parsedD.getDate()).padStart(2, "0");
        const mm = String(parsedD.getMonth() + 1).padStart(2, "0");
        finalDate = `${dd}/${mm}/${parsedD.getFullYear()}`;
      } else {
        finalDate = tkbDates![sessionIndex - 1];
      }
    } else {
      finalDate = `Buổi ${sessionIndex}`;
    }

    sessionList.push({
      index: sessionIndex,
      date: finalDate,
      colStart: colIdx,
    });

    sessionIndex++;
    colIdx += 4; // Move to next 4-column group (LẦN 1, LẦN 2, LẦN 3, %)
  }

  // Ensure all scheduled dates from TKB are present in sessionList
  if (tkbDates && tkbDates.length > 0) {
    for (let i = 0; i < tkbDates.length; i++) {
      const rawTarget = tkbDates[i];
      const parsedD = parseVNDate(rawTarget);
      const targetDate = parsedD
        ? `${String(parsedD.getDate()).padStart(2, "0")}/${String(parsedD.getMonth() + 1).padStart(2, "0")}/${parsedD.getFullYear()}`
        : rawTarget;

      const existing = sessionList.find((s) => {
        const sParsed = parseVNDate(s.date);
        const sNorm = sParsed
          ? `${String(sParsed.getDate()).padStart(2, "0")}/${String(sParsed.getMonth() + 1).padStart(2, "0")}/${sParsed.getFullYear()}`
          : s.date;
        return sNorm === targetDate;
      });

      if (!existing) {
        const defaultColStart = 5 + i * 4;
        sessionList.push({
          index: i + 1,
          date: targetDate,
          colStart: defaultColStart < summaryColStart ? defaultColStart : -1,
        });
      }
    }
    sessionList.sort((a, b) => a.index - b.index);
  }

  if (totalSessions === 0 || totalSessions < sessionList.length) {
    totalSessions = sessionList.length;
  }

  // 4. Read Student Rows (starting from studentStartRow)
  const records: StudentAttendanceRecord[] = [];

  for (let r = studentStartRow; r < rawMatrix.length; r++) {
    const row = rawMatrix[r];
    if (!row || row.length === 0) continue;

    const rawName = String(row[1] || "").trim();
    if (
      !rawName ||
      rawName.toUpperCase().includes("TỔNG") ||
      rawName.toUpperCase().includes("SĨ SỐ") ||
      rawName.toUpperCase().includes("LẦN")
    ) {
      continue;
    }

    const studentName = normalizeVietnameseName(rawName);
    const dob = String(row[2] || "").trim();
    const studySystem = String(row[3] || "").trim();
    const dateJoined = String(row[4] || "").trim();
    const studentId = normalizeVietnameseNameWithoutAccent(rawName).replace(/\s+/g, "_");

    const joinDate = parseVNDate(dateJoined);

    const sessionsObj: StudentAttendanceRecord["sessions"] = {};
    const sessionListForCalc: {
      date: string;
      round1: AttendanceValue;
      round2: AttendanceValue;
      round3: AttendanceValue;
    }[] = [];

    for (const sess of sessionList) {
      const c = sess.colStart;
      let r1 = "";
      let r2 = "";
      let r3 = "";

      // Only read cell values if within valid data columns (not summary columns!)
      if (c >= 5 && c < summaryColStart) {
        r1 = String(row[c] || "").trim();
        r2 = String(row[c + 1] || "").trim();
        r3 = String(row[c + 2] || "").trim();
      }

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

      const sessDate = parseVNDate(sess.date);
      const isBeforeEnrollment = !!joinDate && !!sessDate && joinDate.getTime() > sessDate.getTime();

      // If session occurred before student joined and student did not attend early:
      // Mark as NOT_APPLICABLE and exempt from being counted as absent
      if (isBeforeEnrollment && countX === 0 && countP === 0 && countM === 0) {
        sessionsObj[sess.date] = {
          round1: "",
          round2: "",
          round3: "",
          rate: 0,
          isRecorded: false,
          status: "NOT_APPLICABLE",
        };
      } else {
        // Tỷ lệ có mặt 2/3 trở lên được tính ngày đó có tham gia học đầy đủ
        // Trường hợp 0/3 và 1/3 đều là vắng mặt
        const rate = Math.round((countX / 3) * 100 * 10) / 10;
        let status: "PRESENT" | "EXCUSED" | "LATE" | "ABSENT" | "UNRECORDED" = "ABSENT";
        
        if (countX >= 2) {
          status = "PRESENT"; // Có tham gia học đầy đủ (2/3 hoặc 3/3)
        } else {
          status = "ABSENT"; // Cả 0/3 và 1/3 đều là Vắng mặt
        }

        sessionsObj[sess.date] = {
          round1: r1,
          round2: r2,
          round3: r3,
          rate,
          isRecorded,
          status: isRecorded ? status : "UNRECORDED",
        };
        const sParsed = parseVNDate(sess.date);
        if (sParsed) {
          const dd = String(sParsed.getDate()).padStart(2, "0");
          const mm = String(sParsed.getMonth() + 1).padStart(2, "0");
          const paddedKey = `${dd}/${mm}/${sParsed.getFullYear()}`;
          if (paddedKey !== sess.date) {
            sessionsObj[paddedKey] = sessionsObj[sess.date];
          }
        }
      }

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

    let missedLateJoinCount = 0;
    for (const s of Object.values(sessionsObj)) {
      if (s.status === "NOT_APPLICABLE") {
        missedLateJoinCount++;
      }
    }

    records.push({
      studentId,
      studentName,
      dateOfBirth: dob,
      studySystem,
      dateJoinedGroup: dateJoined,
      isApplicable: calc.isApplicable,
      missedLateJoinCount,
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
    enrolledStudentsCount: records.length,
  };
}
