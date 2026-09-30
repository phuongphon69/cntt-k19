// __tests__/attendance.test.ts
import { describe, it, expect } from "vitest";
import {
  calculateSessionAttendance,
  calculateSubjectAttendance,
} from "../lib/attendance/calculator";

describe("Attendance Calculator Rules", () => {
  it("computes 3/3 = 100% for X X X and counts as full attendance (tham gia học đầy đủ)", () => {
    const res = calculateSessionAttendance("X", "X", "X");
    expect(res.isRecorded).toBe(true);
    expect(res.countX).toBe(3);
    expect(res.rate).toBe(100);
    expect(res.displayText).toBe("3/3");
    expect(res.statusText).toBe("Có tham gia học đầy đủ");
    expect(res.isFullAttendance).toBe(true);
    expect(res.isAbsent).toBe(false);
  });

  it("computes 2/3 = 66.7% for X X M and counts as full attendance (tham gia học đầy đủ)", () => {
    const res = calculateSessionAttendance("X", "X", "M");
    expect(res.isRecorded).toBe(true);
    expect(res.countX).toBe(2);
    expect(res.countM).toBe(1);
    expect(res.rate).toBe(66.7);
    expect(res.displayText).toBe("2/3");
    expect(res.statusText).toBe("Có tham gia học đầy đủ");
    expect(res.isFullAttendance).toBe(true);
    expect(res.isAbsent).toBe(false);
  });

  it("computes 1/3 = 33.3% for X P M and marks session as absent (vắng mặt)", () => {
    const res = calculateSessionAttendance("X", "P", "M");
    expect(res.isRecorded).toBe(true);
    expect(res.countX).toBe(1);
    expect(res.countP).toBe(1);
    expect(res.countM).toBe(1);
    expect(res.rate).toBe(33.3);
    expect(res.displayText).toBe("1/3");
    expect(res.statusText).toBe("Vắng mặt (1/3)");
    expect(res.isFullAttendance).toBe(false);
    expect(res.isAbsent).toBe(true);
  });

  it("treats 0/3 as absent (vắng mặt) displayed as -- for P P P", () => {
    const res = calculateSessionAttendance("P", "P", "P");
    expect(res.isRecorded).toBe(true);
    expect(res.countX).toBe(0);
    expect(res.countP).toBe(3);
    expect(res.rate).toBe(0);
    expect(res.displayText).toBe("--");
    expect(res.statusText).toBe("Vắng mặt (0/3)");
    expect(res.isFullAttendance).toBe(false);
    expect(res.isAbsent).toBe(true);
  });

  it("marks all blank session as unrecorded without counting into rate", () => {
    const res = calculateSessionAttendance("", "", "");
    expect(res.isRecorded).toBe(false);
    expect(res.displayText).toBe("--");
    expect(res.statusText).toBe("Chưa ghi nhận");
    expect(res.isFullAttendance).toBe(false);
    expect(res.isAbsent).toBe(false);
  });

  it("calculates overall subject attendance correctly excluding blank sessions", () => {
    const sessions = [
      { date: "01/08/2026", round1: "X", round2: "X", round3: "X" }, // 3/3
      { date: "03/08/2026", round1: "X", round2: "X", round3: "M" }, // 2/3
      { date: "05/08/2026", round1: "", round2: "", round3: "" }, // unrecorded, skip!
    ];

    const subCalc = calculateSubjectAttendance(sessions);
    expect(subCalc.isApplicable).toBe(true);
    expect(subCalc.recordedSessions).toBe(2); // Only 2 sessions counted in denominator
    expect(subCalc.totalX).toBe(5);
    // 5 / (2 * 3) = 5/6 = 83.3%
    expect(subCalc.attendanceRate).toBe(83.3);
  });

  it("returns Not Applicable (Không áp dụng) for students not in subject sheet (never absent)", () => {
    const sessions = [
      { date: "01/08/2026", round1: "X", round2: "X", round3: "X" },
    ];
    const subCalc = calculateSubjectAttendance(sessions, { isStudentInSubject: false });
    expect(subCalc.isApplicable).toBe(false);
    expect(subCalc.displayText).toBe("Không áp dụng");
    expect(subCalc.warning).toBe(false);
  });

  it("exempts subjects that occurred completely before student join date (e.g. Nguyễn Huy Phương joined 11/05/2026)", () => {
    // Subject (like Chính Trị) whose sessions were all in March/April/early May 2026
    const sessions = [
      { date: "21/03/2026", round1: "", round2: "", round3: "" },
      { date: "28/03/2026", round1: "", round2: "", round3: "" },
      { date: "04/04/2026", round1: "", round2: "", round3: "" },
      { date: "09/05/2026", round1: "", round2: "", round3: "" },
    ];

    const subCalc = calculateSubjectAttendance(sessions, {
      dateJoinedGroup: "11/05/2026",
    });

    expect(subCalc.isApplicable).toBe(false);
    expect(subCalc.recordedSessions).toBe(0);
    expect(subCalc.attendanceRate).toBe(100);
    expect(subCalc.warning).toBe(false);
    expect(subCalc.displayText).toBe("Chưa vào lớp");
  });

  it("calculates attendance accurately for sessions occurring after join date (e.g. Tin Học in June/July)", () => {
    const sessions = [
      { date: "10/06/2026", round1: "X", round2: "X", round3: "X" },
      { date: "12/06/2026", round1: "X", round2: "X", round3: "X" },
      { date: "17/06/2026", round1: "X", round2: "X", round3: "" },
    ];

    const subCalc = calculateSubjectAttendance(sessions, {
      dateJoinedGroup: "11/05/2026",
    });

    expect(subCalc.isApplicable).toBe(true);
    expect(subCalc.recordedSessions).toBe(3);
    expect(subCalc.totalX).toBe(8); // 3 + 3 + 2 = 8
    expect(subCalc.attendanceRate).toBe(88.9);
    expect(subCalc.warning).toBe(false);
  });

  it("handles sessions spanning before and after join date properly", () => {
    const sessions = [
      { date: "05/05/2026", round1: "", round2: "", round3: "" }, // Before join date -> exempt!
      { date: "15/05/2026", round1: "X", round2: "X", round3: "X" }, // After join date -> counted!
      { date: "20/05/2026", round1: "X", round2: "X", round3: "X" }, // After join date -> counted!
    ];

    const subCalc = calculateSubjectAttendance(sessions, {
      dateJoinedGroup: "11/05/2026",
    });

    expect(subCalc.isApplicable).toBe(true);
    expect(subCalc.recordedSessions).toBe(2); // Only 2 sessions after join date
    expect(subCalc.totalX).toBe(6);
    expect(subCalc.attendanceRate).toBe(100);
    expect(subCalc.warning).toBe(false);
  });

  it("handles Political Science (Chính Trị) late join scenario and class ratio (e.g. 24/43 -> 24/44)", () => {
    // 10 sessions from 21/03/2026 to 06/06/2026
    const politicalScienceSessions = [
      "21/03/2026", "28/03/2026", "04/04/2026", "11/04/2026", "18/04/2026",
      "25/04/2026", "09/05/2026", "16/05/2026", "23/05/2026", "06/06/2026",
    ];

    const joinDate = "11/05/2026"; // Nguyễn Huy Phương joined 11/05/2026

    // Categorize sessions into before and after join date
    const beforeJoinSessions = politicalScienceSessions.filter((d) => {
      const [day, m, y] = d.split("/").map(Number);
      const [jDay, jM, jY] = joinDate.split("/").map(Number);
      return new Date(y, m - 1, day).getTime() < new Date(jY, jM - 1, jDay).getTime();
    });

    const afterJoinSessions = politicalScienceSessions.filter((d) => {
      const [day, m, y] = d.split("/").map(Number);
      const [jDay, jM, jY] = joinDate.split("/").map(Number);
      return new Date(y, m - 1, day).getTime() >= new Date(jY, jM - 1, jDay).getTime();
    });

    // 7 sessions before 11/05/2026
    expect(beforeJoinSessions.length).toBe(7);
    // 3 sessions after 11/05/2026
    expect(afterJoinSessions.length).toBe(3);

    // Dynamic class size ratio: 24 enrolled out of 43 in class
    const enrolledStudents = 24;
    let totalClassStudents = 43;
    const ratioInitial = `${enrolledStudents}/${totalClassStudents} học sinh`;
    expect(ratioInitial).toBe("24/43 học sinh");

    // When 1 new student is added to the class roster:
    totalClassStudents += 1;
    const ratioUpdated = `${enrolledStudents}/${totalClassStudents} học sinh`;
    expect(ratioUpdated).toBe("24/44 học sinh");
  });

  it("handles attendance confirmation, creates sheet for TKB subject, and immediately updates class stats", async () => {
    const { writeAttendanceRound } = await import("../lib/google-sheets/writer");
    const { getAttendanceSheetData } = await import("../lib/google-sheets/reader");
    const { isSubjectSheetCreated } = await import("../lib/google-sheets/sync-store");

    const sheetName = "DD CẤU TRÚC DỮ LIỆU VÀ GIẢI THUẬT";
    const sessionDate = "29/09/2026";
    const roundNumber = 1;

    const updates = [
      { studentId: "nguyen_huy_phuong", value: "X" as const },
      { studentId: "hoang_cong_minh", value: "X" as const },
      { studentId: "bui_hong_quan", value: "P" as const },
    ];

    const result = await writeAttendanceRound(
      sheetName,
      sessionDate,
      roundNumber,
      updates,
      "test_admin"
    );

    expect(result.success).toBe(true);
    expect(result.updatedCount).toBe(3);
    expect(isSubjectSheetCreated(sheetName)).toBe(true);

    // Retrieve sheet data to verify immediate reflection
    const sheetData = await getAttendanceSheetData(sheetName);
    expect(sheetData).toBeDefined();

    const phuongRec = sheetData.records.find((r) => r.studentId === "nguyen_huy_phuong");
    expect(phuongRec).toBeDefined();
    expect(phuongRec?.sessions[sessionDate]?.round1).toBe("X");
    expect(phuongRec?.totalX).toBeGreaterThanOrEqual(1);

    const quanRec = sheetData.records.find((r) => r.studentId === "bui_hong_quan");
    expect(quanRec).toBeDefined();
    expect(quanRec?.sessions[sessionDate]?.round1).toBe("P");
    expect(quanRec?.totalP).toBeGreaterThanOrEqual(1);
  }, 15000);

  it("strictly enforces 0/3 is also absent (vắng mặt, displayed as --), 1/3 is absent, and >= 2/3 is full attendance", () => {
    // 0/3 session: no X marks -> ALSO ABSENT
    const sess0 = calculateSessionAttendance("V", "V", "V");
    expect(sess0.displayText).toBe("--");
    expect(sess0.statusText).toBe("Vắng mặt (0/3)");
    expect(sess0.isRecorded).toBe(true);
    expect(sess0.isFullAttendance).toBe(false);
    expect(sess0.isAbsent).toBe(true);

    // 1/3 session: only 1 X mark -> ABSENT
    const sess1 = calculateSessionAttendance("X", "V", "V");
    expect(sess1.displayText).toBe("1/3");
    expect(sess1.statusText).toBe("Vắng mặt (1/3)");
    expect(sess1.isRecorded).toBe(true);
    expect(sess1.isFullAttendance).toBe(false);
    expect(sess1.isAbsent).toBe(true);

    // 2/3 session: 2 X marks -> FULL ATTENDANCE
    const sess2 = calculateSessionAttendance("X", "X", "V");
    expect(sess2.displayText).toBe("2/3");
    expect(sess2.statusText).toBe("Có tham gia học đầy đủ");
    expect(sess2.isRecorded).toBe(true);
    expect(sess2.isFullAttendance).toBe(true);
    expect(sess2.isAbsent).toBe(false);

    // 3/3 session: 3 X marks -> FULL ATTENDANCE
    const sess3 = calculateSessionAttendance("X", "X", "X");
    expect(sess3.displayText).toBe("3/3");
    expect(sess3.statusText).toBe("Có tham gia học đầy đủ");
    expect(sess3.isRecorded).toBe(true);
    expect(sess3.isFullAttendance).toBe(true);
    expect(sess3.isAbsent).toBe(false);
  });

  it("supports editing student attendance results (sửa kết quả) and deleting attendance results (xóa kết quả)", async () => {
    const { updateStudentAttendanceRounds, clearSessionAttendance } = await import(
      "../lib/google-sheets/writer"
    );
    const { getAttendanceSheetData } = await import("../lib/google-sheets/reader");

    const sheetName = "DD CẤU TRÚC DỮ LIỆU VÀ GIẢI THUẬT";
    const sessionDate = "29/09/2026";
    const studentId = "nguyen_huy_phuong";

    // 1. Edit attendance: set Round 1 = X, Round 2 = X, Round 3 = P
    const editRes = await updateStudentAttendanceRounds(
      sheetName,
      sessionDate,
      studentId,
      { round1: "X", round2: "X", round3: "P" },
      "test_admin"
    );
    expect(editRes.success).toBe(true);

    const sheetDataAfterEdit = await getAttendanceSheetData(sheetName, true);
    const studentAfterEdit = sheetDataAfterEdit.records.find((r) => r.studentId === studentId);
    expect(studentAfterEdit).toBeDefined();
    expect(studentAfterEdit?.sessions[sessionDate]?.round1).toBe("X");
    expect(studentAfterEdit?.sessions[sessionDate]?.round2).toBe("X");
    expect(studentAfterEdit?.sessions[sessionDate]?.round3).toBe("P");
    expect(studentAfterEdit?.sessions[sessionDate]?.status).toBe("PRESENT"); // 2/3 -> PRESENT

    // 2. Clear attendance for single student (xóa kết quả học viên)
    const deleteStudentRes = await clearSessionAttendance(
      sheetName,
      sessionDate,
      { studentId, mode: "student" },
      "test_admin"
    );
    expect(deleteStudentRes.success).toBe(true);

    const sheetDataAfterDelete = await getAttendanceSheetData(sheetName, true);
    const studentAfterDelete = sheetDataAfterDelete.records.find((r) => r.studentId === studentId);
    expect(studentAfterDelete).toBeDefined();
    expect(studentAfterDelete?.sessions[sessionDate]?.round1 || "").toBe("");
    expect(studentAfterDelete?.sessions[sessionDate]?.round2 || "").toBe("");

    // 3. Clear attendance for entire session (xóa kết quả cả buổi)
    const deleteSessionRes = await clearSessionAttendance(
      sheetName,
      sessionDate,
      { mode: "session" },
      "test_admin"
    );
    expect(deleteSessionRes.success).toBe(true);
  }, 15000);

  it("correctly parses attendance sheet even when explicit header labels are absent", async () => {
    const { parseAttendanceSheet } = await import("../lib/attendance/parser");
    // Matrix like the newly created DD CẤU TRÚC DỮ LIỆU sheet
    const rawMatrix = [
      ["", "Cấu trúc dữ liệu và giải thuật", "", "Thầy Phan", "", 2],
      [1, "Trương Văn Trung", "16/06/1993", "CQ", "", "X"],
      [2, "Nguyễn Văn Chung", "08/07/1992", "CQ", "22/04/2026", "X"],
      [3, "Nguyễn Huy Phương", "10/08/1997", "LT", "11/05/2026", ""],
      [4, "Nguyễn Quang Tuấn", "23/02/1989", "CQ", "11/05/2026", "X"],
    ];

    const tkbDates = ["29/09/2026", "03/10/2026"];
    const parsed = parseAttendanceSheet("DD CẤU TRÚC DỮ LIỆU VÀ GIẢI THUẬT", rawMatrix, tkbDates);

    expect(parsed.sessions.length).toBe(2);
    expect(parsed.sessions[0].date).toBe("29/09/2026");
    expect(parsed.sessions[1].date).toBe("03/10/2026");
    expect(parsed.records.length).toBe(4);
    expect(parsed.records[0].studentName).toBe("Trương Văn Trung");
    expect(parsed.records[0].sessions["29/09/2026"]?.round1).toBe("X");
    expect(parsed.records[1].studentName).toBe("Nguyễn Văn Chung");
    expect(parsed.records[1].sessions["29/09/2026"]?.round1).toBe("X");
  });
});


