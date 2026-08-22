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
  displayText: string; // e.g. "3/3", "2/3", "1/3", "0/3", "--"
  statusText: string; // "100%", "66.7%", "Chưa ghi nhận", "Không áp dụng"
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

  const rounds = [c1, c2, c3];
  const isRecorded = rounds.some((r) => r !== "");

  if (!isRecorded) {
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

  // Rate = numberOfX / 3 * 100
  const rate = Math.round((countX / 3) * 100 * 10) / 10;

  return {
    isRecorded: true,
    round1: c1,
    round2: c2,
    round3: c3,
    countX,
    countP,
    countM,
    rate,
    displayText: `${countX}/3`,
    statusText: `${rate}%`,
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
    // If student joined AFTER the session date, skip this session (not applicable)
    if (joinDate && sess.date) {
      const sessDate = parseVNDate(sess.date);
      if (sessDate && joinDate.getTime() > sessDate.getTime()) {
        continue;
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

  if (recordedSessions === 0) {
    return {
      isApplicable: true,
      totalX: 0,
      totalP: 0,
      totalM: 0,
      recordedSessions: 0,
      attendanceRate: 0,
      displayText: "Chưa ghi nhận",
      warning: false,
    };
  }

  // Formula: subjectRate = totalX / (recordedSessionCount * 3) * 100
  const maxPossibleX = recordedSessions * 3;
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
