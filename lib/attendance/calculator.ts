// lib/attendance/calculator.ts
import { AttendanceValue, AttendanceConfig } from "@/types";
import { parseVNDate } from "@/lib/utils";

export const DEFAULT_ATTENDANCE_CONFIG: AttendanceConfig = {
  presentValues: ["X", "x"],
  excusedValues: ["P", "p"],
  lateValues: ["M", "m"],
  absentValues: ["V", "v", "K", "k"],
  presentScore: 1,
  excusedScore: 0,
  lateScore: 0,
  absentScore: 0,
  matchHighThreshold: 90,
  matchReviewThreshold: 75,
  warningThreshold: 80,
  timezone: "Asia/Ho_Chi_Minh",
};

export interface SessionCalcResult {
  isRecorded: boolean;
  round1: AttendanceValue;
  round2: AttendanceValue;
  round3: AttendanceValue;
  countX: number;
  countP: number;
  countM: number;
  rate: number; // 0..100
  displayText: string; // "X" khi có mặt, "--" khi vắng / chưa ghi nhận
  statusText: string; // "Có mặt", "Có phép", "Đi muộn", "Vắng mặt", "Chưa ghi nhận"
  isFullAttendance: boolean; // rate >= 66 / countX >= 2
  isAbsent: boolean; // rate > 0 && rate < 66 / countX === 1
}

/**
 * Clean attendance value (trim, uppercase)
 */
export function cleanAttendanceValue(val: any): string {
  if (val === null || val === undefined) return "";
  return String(val).trim().toUpperCase();
}

/**
 * Check if a cell is marked present (X)
 */
export function isPresent(val: AttendanceValue, config = DEFAULT_ATTENDANCE_CONFIG): boolean {
  const c = cleanAttendanceValue(val);
  return config.presentValues.map((v) => v.toUpperCase()).includes(c);
}

export function isExcused(val: AttendanceValue, config = DEFAULT_ATTENDANCE_CONFIG): boolean {
  const c = cleanAttendanceValue(val);
  return config.excusedValues.map((v) => v.toUpperCase()).includes(c);
}

export function isLate(val: AttendanceValue, config = DEFAULT_ATTENDANCE_CONFIG): boolean {
  const c = cleanAttendanceValue(val);
  return config.lateValues.map((v) => v.toUpperCase()).includes(c);
}

/**
 * Calculate session statistics for 3 rounds of a single session
 * Rules:
 * - 0/3: chưa ghi nhận, hiển thị là "--"
 * - 1/3: tính vắng mặt lần điểm danh đó (dưới ngưỡng 2/3)
 * - >= 2/3 (2/3 hoặc 3/3): được tính ngày đó có tham gia học đầy đủ
 */
export function calculateSessionAttendance(
  r1: AttendanceValue,
  r2: AttendanceValue,
  r3: AttendanceValue,
  config = DEFAULT_ATTENDANCE_CONFIG
): SessionCalcResult {
  const c1 = cleanAttendanceValue(r1);
  const c2 = cleanAttendanceValue(r2);
  const c3 = cleanAttendanceValue(r3);

  // Mỗi buổi chỉ tính 1 lần điểm danh (kết quả cuối cùng của buổi)
  const rounds = [c1];
  const hasAnyValue = rounds.some((r) => r !== "");

  if (!hasAnyValue) {
    return {
      isRecorded: false,
      round1: "",
      round2: "",
      round3: "",
      countX: 0,
      countP: 0,
      countM: 0,
      rate: 0,
      displayText: "--",
      statusText: "Chưa ghi nhận",
      isFullAttendance: false,
      isAbsent: false,
    };
  }

  let countX = 0;
  let countP = 0;
  let countM = 0;

  for (const r of rounds) {
    if (isPresent(r, config)) countX++;
    else if (isExcused(r, config)) countP++;
    else if (isLate(r, config)) countM++;
  }

  // Trường hợp 0/3 cũng là vắng mặt (hiển thị là --)
  if (countX === 0) {
    return {
      isRecorded: true,
      round1: c1,
      round2: c2,
      round3: c3,
      countX: 0,
      countP,
      countM,
      rate: 0,
      displayText: "--",
      statusText: countP > 0 ? "Có phép" : countM > 0 ? "Đi muộn" : "Vắng mặt",
      isFullAttendance: false,
      isAbsent: true,
    };
  }

  // Mỗi buổi tính 1 lần: X = 100%, còn lại 0%
  const rate = countX >= 1 ? 100 : 0;
  const isFullAttendance = countX >= 1;
  const isAbsent = countX < 1;

  let statusText = "Vắng mặt";
  if (isFullAttendance) {
    statusText = "Có mặt";
  } else if (countP > 0) {
    statusText = "Có phép";
  } else if (countM > 0) {
    statusText = "Đi muộn";
  }

  return {
    isRecorded: true,
    round1: c1,
    round2: c2,
    round3: c3,
    countX,
    countP,
    countM,
    rate,
    displayText: countX >= 1 ? "X" : "--",
    statusText,
    isFullAttendance,
    isAbsent,
  };
}

/**
 * Calculate overall subject attendance rate for a student
 */
export function calculateSubjectAttendance(
  sessions: { date: string; round1: AttendanceValue; round2: AttendanceValue; round3: AttendanceValue }[],
  options?: {
    dateJoinedGroup?: string;
    isStudentInSubject?: boolean;
    config?: AttendanceConfig;
  }
) {
  const config = options?.config || DEFAULT_ATTENDANCE_CONFIG;
  const isStudentInSubject = options?.isStudentInSubject !== false;

  if (!isStudentInSubject) {
    return {
      isApplicable: false,
      totalX: 0,
      totalP: 0,
      totalM: 0,
      recordedSessions: 0,
      attendanceRate: 0,
      displayText: "Không áp dụng",
      warning: false,
    };
  }

  const joinDate = options?.dateJoinedGroup ? parseVNDate(options.dateJoinedGroup) : null;

  let totalX = 0;
  let totalP = 0;
  let totalM = 0;
  let recordedSessions = 0;

  for (const sess of sessions) {
    // If student joined AFTER the session date, skip this session unless student actually attended
    if (joinDate && sess.date) {
      const sessDate = parseVNDate(sess.date);
      if (sessDate && joinDate.getTime() > sessDate.getTime()) {
        const checkEarly = calculateSessionAttendance(sess.round1, sess.round2, sess.round3, config);
        // If student did not participate (no X/P/M), exempt this session completely
        if (checkEarly.countX === 0 && checkEarly.countP === 0 && checkEarly.countM === 0) {
          continue;
        }
      }
    }

    const calc = calculateSessionAttendance(sess.round1, sess.round2, sess.round3, config);
    if (calc.isRecorded) {
      recordedSessions++;
      totalX += calc.countX;
      totalP += calc.countP;
      totalM += calc.countM;
    }
  }

  // Check if subject as a whole was taught before student joined
  const allSessionsBeforeJoin =
    !!joinDate &&
    sessions.length > 0 &&
    sessions.every((s) => {
      const d = parseVNDate(s.date);
      return !d || joinDate.getTime() > d.getTime();
    });

  if (recordedSessions === 0) {
    return {
      isApplicable: !allSessionsBeforeJoin,
      totalX: 0,
      totalP: 0,
      totalM: 0,
      recordedSessions: 0,
      attendanceRate: 100, // Not 0%, never penalized for unenrolled subjects!
      displayText: allSessionsBeforeJoin ? "Chưa vào lớp" : "Chưa ghi nhận",
      warning: false,
    };
  }

  // Formula: subjectRate = totalX / recordedSessionCount * 100 (mỗi buổi 1 lần)
  const maxPossibleX = recordedSessions;
  const attendanceRate = Math.round((totalX / maxPossibleX) * 100 * 10) / 10;
  const warning = attendanceRate < config.warningThreshold;

  return {
    isApplicable: true,
    totalX,
    totalP,
    totalM,
    recordedSessions,
    attendanceRate,
    displayText: `${attendanceRate}%`,
    warning,
  };
}
