// lib/attendance/stats.ts
import { Student, Subject, AttendanceValue } from "@/types";
import { getStudents, getSubjects, getAttendanceSheetData } from "@/lib/google-sheets/reader";

export interface StudentSubjectStat {
  subjectId: string;
  subjectName: string;
  sheetName: string;
  isApplicable: boolean;
  totalSessionsInSheet: number;
  recordedSessions: number;
  attendedSessions: number;
  sessionFraction: string; // e.g. "10/11"
  countX: number;
  countP: number;
  countM: number;
  countAbsent: number;
  attendanceRate: number;
  displayText: string;
  warning: boolean;
}

export interface StudentComprehensiveStat {
  student: Student;
  subjects: StudentSubjectStat[];
  overallAttendanceRate: number;
  totalAttendedSessionsAll: number;
  totalSessionsAll: number;
  overallSessionFraction: string; // e.g. "32/36"
  totalXAllSubjects: number;
  totalSlotsAllSubjects: number;
  applicableSubjectsCount: number;
  warningSubjectsCount: number;
  overallWarning: boolean;
}

export interface SubjectClassStat {
  subjectId: string;
  subjectName: string;
  teacher: string;
  sheetName: string;
  totalSessions: number;
  recordedSessions: number;
  totalStudents: number;
  applicableStudents: number;
  averageRate: number;
  perfectStudentsCount: number; // 100%
  warningStudentsCount: number; // < 80%
}

export interface ComprehensiveAttendanceReport {
  timestamp: string;
  classTotalStudents: number;
  averageClassAttendanceRate: number;
  warningStudentsCount: number;
  goodStudentsCount: number;
  subjectStats: SubjectClassStat[];
  studentStats: StudentComprehensiveStat[];
}

/**
 * Calculate full attendance statistics across all students and all subjects
 */
export async function getComprehensiveAttendanceReport(): Promise<ComprehensiveAttendanceReport> {
  const students = await getStudents();
  const subjects = await getSubjects();

  // Load all attendance sheets
  const sheetDataMap = new Map<string, any>();
  for (const sub of subjects) {
    try {
      const parsed = await getAttendanceSheetData(sub.attendanceSheet);
      sheetDataMap.set(sub.attendanceSheet, parsed);
    } catch (e) {
      console.warn(`Could not load sheet data for ${sub.attendanceSheet}:`, e);
    }
  }

  // 1. Calculate stats for each student across each subject
  const studentStats: StudentComprehensiveStat[] = [];

  for (const stu of students) {
    const subStats: StudentSubjectStat[] = [];
    let totalXAll = 0;
    let totalSlotsAll = 0;
    let totalAttendedAll = 0;
    let totalSessionsAll = 0;
    let applicableCount = 0;
    let warningCount = 0;

    for (const sub of subjects) {
      const parsed = sheetDataMap.get(sub.attendanceSheet);
      if (!parsed) {
        subStats.push({
          subjectId: sub.id,
          subjectName: sub.name,
          sheetName: sub.attendanceSheet,
          isApplicable: false,
          totalSessionsInSheet: sub.totalSessions,
          recordedSessions: 0,
          attendedSessions: 0,
          sessionFraction: "--",
          countX: 0,
          countP: 0,
          countM: 0,
          countAbsent: 0,
          attendanceRate: 0,
          displayText: "Không áp dụng",
          warning: false,
        });
        continue;
      }

      // Find student record in parsed sheet
      const record = parsed.records.find(
        (r: any) =>
          r.studentId === stu.id ||
          r.normalizedNameNoAccent === stu.normalizedNameNoAccent ||
          r.studentName.toLowerCase() === stu.fullName.toLowerCase()
      );

      if (!record || !record.isApplicable) {
        subStats.push({
          subjectId: sub.id,
          subjectName: sub.name,
          sheetName: sub.attendanceSheet,
          isApplicable: false,
          totalSessionsInSheet: sub.totalSessions,
          recordedSessions: 0,
          attendedSessions: 0,
          sessionFraction: "--",
          countX: 0,
          countP: 0,
          countM: 0,
          countAbsent: 0,
          attendanceRate: 0,
          displayText: "Không áp dụng",
          warning: false,
        });
        continue;
      }

      // Extract all sessions for this student in this subject
      let countX = 0;
      let countP = 0;
      let countM = 0;
      let recordedSessions = 0;
      let attendedSessions = 0;

      for (const sess of parsed.sessions) {
        const studentSess = record.sessions[sess.date];
        if (studentSess && studentSess.status !== "NOT_APPLICABLE") {
          recordedSessions++;
          let sessX = 0;
          const rounds = [studentSess.round1, studentSess.round2, studentSess.round3];
          for (const r of rounds) {
            const u = String(r || "").trim().toUpperCase();
            if (u === "X") {
              countX++;
              sessX++;
            } else if (u === "P") countP++;
            else if (u === "M") countM++;
          }
          // Tỷ lệ có mặt 2/3 trở lên được tính ngày đó có tham gia học đầy đủ
          // Trường hợp 0/3 và 1/3 đều là vắng mặt (chỉ tăng attendedSessions khi sessX >= 2)
          if (sessX >= 2) {
            attendedSessions++;
          }
        }
      }

      const totalSlots = recordedSessions * 3;
      let rate = 0;
      let warning = false;

      if (totalSlots > 0) {
        rate = Math.round((countX / totalSlots) * 100 * 10) / 10;
        warning = rate < 80;
      }

      const countAbsent = totalSlots - countX - countP - countM;
      const sessionFraction = recordedSessions > 0 ? `${attendedSessions}/${recordedSessions}` : "--";

      if (recordedSessions > 0) {
        applicableCount++;
        totalXAll += countX;
        totalSlotsAll += totalSlots;
        totalAttendedAll += attendedSessions;
        totalSessionsAll += recordedSessions;
        if (warning) warningCount++;
      }

      subStats.push({
        subjectId: sub.id,
        subjectName: sub.name,
        sheetName: sub.attendanceSheet,
        isApplicable: true,
        totalSessionsInSheet: sub.totalSessions,
        recordedSessions,
        attendedSessions,
        sessionFraction,
        countX,
        countP,
        countM,
        countAbsent: Math.max(0, countAbsent),
        attendanceRate: rate,
        displayText: sessionFraction,
        warning,
      });
    }

    const overallRate =
      totalSlotsAll > 0 ? Math.round((totalXAll / totalSlotsAll) * 100 * 10) / 10 : 0;
    const overallWarning = totalSlotsAll > 0 && overallRate < 80;
    const overallSessionFraction =
      totalSessionsAll > 0 ? `${totalAttendedAll}/${totalSessionsAll}` : "--";

    studentStats.push({
      student: stu,
      subjects: subStats,
      overallAttendanceRate: overallRate,
      totalAttendedSessionsAll: totalAttendedAll,
      totalSessionsAll,
      overallSessionFraction,
      totalXAllSubjects: totalXAll,
      totalSlotsAllSubjects: totalSlotsAll,
      applicableSubjectsCount: applicableCount,
      warningSubjectsCount: warningCount,
      overallWarning,
    });
  }

  // Sort students by STT or overall attendance rate
  studentStats.sort((a, b) => (a.student.stt || 0) - (b.student.stt || 0));

  // 2. Calculate Subject-level Stats for the class
  const subjectStats: SubjectClassStat[] = [];
  let sumAllRates = 0;
  let countApplicableOverall = 0;

  for (const sub of subjects) {
    const subStudentStats = studentStats.map((s) =>
      s.subjects.find((item) => item.subjectId === sub.id)
    ).filter(Boolean) as StudentSubjectStat[];

    const applicableStudents = subStudentStats.filter((s) => s.isApplicable && s.recordedSessions > 0);
    const totalRateSum = applicableStudents.reduce((acc, curr) => acc + (Number(curr.attendanceRate) || 0), 0);
    const avgRate = applicableStudents.length > 0
      ? Math.round((totalRateSum / applicableStudents.length) * 10) / 10
      : 0;

    const perfectCount = applicableStudents.filter((s) => Number(s.attendanceRate) >= 100).length;
    const warnCount = applicableStudents.filter((s) => Number(s.attendanceRate) < 80).length;

    subjectStats.push({
      subjectId: sub.id,
      subjectName: sub.name,
      teacher: sub.teacher || "Chưa cập nhật",
      sheetName: sub.attendanceSheet,
      totalSessions: sub.totalSessions,
      recordedSessions: sub.recordedSessionsCount || (sheetDataMap.get(sub.attendanceSheet)?.sessions.length || 0),
      totalStudents: students.length,
      applicableStudents: applicableStudents.length,
      averageRate: isNaN(avgRate) ? 0 : avgRate,
      perfectStudentsCount: perfectCount,
      warningStudentsCount: warnCount,
    });

    if (!isNaN(avgRate) && avgRate > 0) {
      sumAllRates += avgRate;
      countApplicableOverall++;
    }
  }

  const averageClassAttendanceRate =
    countApplicableOverall > 0 ? Math.round((sumAllRates / countApplicableOverall) * 10) / 10 : 0;

  const warningStudentsCount = studentStats.filter((s) => s.overallWarning).length;
  const goodStudentsCount = studentStats.filter(
    (s) => s.totalSlotsAllSubjects > 0 && !s.overallWarning
  ).length;

  return {
    timestamp: new Date().toISOString(),
    classTotalStudents: students.length,
    averageClassAttendanceRate,
    warningStudentsCount,
    goodStudentsCount,
    subjectStats,
    studentStats,
  };
}
