// __tests__/attendance.test.ts
import { describe, it, expect } from "vitest";
import {
  calculateSessionAttendance,
  calculateSubjectAttendance,
} from "../lib/attendance/calculator";

describe("Attendance Calculator Rules", () => {
  it("computes 3/3 = 100% for X X X", () => {
    const res = calculateSessionAttendance("X", "X", "X");
    expect(res.isRecorded).toBe(true);
    expect(res.countX).toBe(3);
    expect(res.rate).toBe(100);
    expect(res.displayText).toBe("3/3");
  });

  it("computes 2/3 = 66.7% for X X M", () => {
    const res = calculateSessionAttendance("X", "X", "M");
    expect(res.isRecorded).toBe(true);
    expect(res.countX).toBe(2);
    expect(res.countM).toBe(1);
    expect(res.rate).toBe(66.7);
    expect(res.displayText).toBe("2/3");
  });

  it("computes 1/3 = 33.3% for X P M", () => {
    const res = calculateSessionAttendance("X", "P", "M");
    expect(res.isRecorded).toBe(true);
    expect(res.countX).toBe(1);
    expect(res.countP).toBe(1);
    expect(res.countM).toBe(1);
    expect(res.rate).toBe(33.3);
    expect(res.displayText).toBe("1/3");
  });

  it("computes 0/3 = 0% for P P P", () => {
    const res = calculateSessionAttendance("P", "P", "P");
    expect(res.isRecorded).toBe(true);
    expect(res.countX).toBe(0);
    expect(res.countP).toBe(3);
    expect(res.rate).toBe(0);
    expect(res.displayText).toBe("0/3");
  });

  it("marks all blank session as unrecorded without counting into rate", () => {
    const res = calculateSessionAttendance("", "", "");
    expect(res.isRecorded).toBe(false);
    expect(res.displayText).toBe("--");
    expect(res.statusText).toBe("Chưa ghi nhận");
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
});
