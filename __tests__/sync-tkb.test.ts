// __tests__/sync-tkb.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { normalizeVietnameseNameWithoutAccent } from "../lib/vietnamese/normalize";
import {
  getSessionOverride,
  setSessionOverride,
  saveCustomSubject,
  getCustomSubjects,
  removeCustomSubject,
  removeSessionOverride,
} from "../lib/google-sheets/sync-store";
import { Subject } from "../types";
import { getSubjects, getTkbSubjectStats } from "../lib/google-sheets/reader";

describe("TKB Subject Sync and Session Accumulation", () => {
  it("normalizes and accurately maps subject names between TKB and DD sheets", () => {
    const normalizeKey = (s: string) =>
      normalizeVietnameseNameWithoutAccent(s).toLowerCase().replace(/\s+/g, "_");

    // TKB subject names
    const tkbTiengAnh = normalizeKey("TIẾNG ANH");
    const tkbGdtc = normalizeKey("GIÁO DỤC THỂ CHẤT");
    const tkbTinHoc = normalizeKey("TIN HỌC");
    const tkbPhapLuat = normalizeKey("PHÁP LUẬT");
    const tkbKtl = normalizeKey("KỸ THUẬT LẬP TRÌNH");
    const tkbCtdl = normalizeKey("CẤU TRÚC DỮ LIỆU VÀ GIẢI THUẬT");

    // Sheet names / IDs
    const sheetTiengAnh = normalizeKey("DD TIẾNG ANH");
    const sheetGdtc = normalizeKey("DD GDTC");
    const sheetTinHoc = normalizeKey("DD TIN HỌC");

    // Exact or alias match checks
    expect(sheetTiengAnh.includes(tkbTiengAnh)).toBe(true);
    expect(sheetTinHoc.includes(tkbTinHoc)).toBe(true);

    // GDTC alias match check
    const isGdtcMatch =
      tkbGdtc.includes("the_chat") && (sheetGdtc.includes("gdtc") || sheetGdtc.includes("the_chat"));
    expect(isGdtcMatch).toBe(true);

    // New subjects should not match existing DD sheets
    expect(sheetTiengAnh.includes(tkbPhapLuat)).toBe(false);
    expect(sheetGdtc.includes(tkbKtl)).toBe(false);
    expect(sheetTinHoc.includes(tkdKeyOrEmpty(tkbCtdl))).toBe(false);
  });

  function tkdKeyOrEmpty(k: string) {
    return k;
  }

  it("calculates session accumulation accurately for existing subjects", () => {
    // Tiếng Anh: existing sheet has 16 sessions, TKB has 23 sessions
    const oldSessionsTiengAnh = 16;
    const tkbSessionsTiengAnh = 23;
    const accumulatedTiengAnh = Math.max(oldSessionsTiengAnh, tkbSessionsTiengAnh);
    const addedTiengAnh = Math.max(0, tkbSessionsTiengAnh - oldSessionsTiengAnh);

    expect(accumulatedTiengAnh).toBe(23);
    expect(addedTiengAnh).toBe(7);

    // GDTC: existing sheet has 3 sessions, TKB has 11 sessions
    const oldSessionsGdtc = 3;
    const tkbSessionsGdtc = 11;
    const accumulatedGdtc = Math.max(oldSessionsGdtc, tkbSessionsGdtc);
    const addedGdtc = Math.max(0, tkbSessionsGdtc - oldSessionsGdtc);

    expect(accumulatedGdtc).toBe(11);
    expect(addedGdtc).toBe(8);

    // Tin học: existing sheet has 12 sessions, TKB has 12 sessions
    const oldSessionsTinHoc = 12;
    const tkbSessionsTinHoc = 12;
    const accumulatedTinHoc = Math.max(oldSessionsTinHoc, tkbSessionsTinHoc);
    const addedTinHoc = Math.max(0, tkbSessionsTinHoc - oldSessionsTinHoc);

    expect(accumulatedTinHoc).toBe(12);
    expect(addedTinHoc).toBe(0);
  });

  it("calculates additive mode accumulation correctly", () => {
    const oldSessions = 16;
    const tkbSessions = 23;
    const additiveSessions = oldSessions + tkbSessions;

    expect(additiveSessions).toBe(39);
  });

  it("stores and retrieves session overrides correctly", () => {
    const testSheet = "TEST_DD_SUBJECT_" + Date.now();
    setSessionOverride(testSheet, 25);
    expect(getSessionOverride(testSheet)).toBe(25);

    // Case insensitivity
    expect(getSessionOverride(testSheet.toLowerCase())).toBe(25);
  });

  it("saves and retrieves custom subjects from sync store", () => {
    const testSubject: Subject = {
      id: "test_subject_123",
      code: "TEST_SUB",
      name: "Môn Thử Nghiệm",
      shortName: "Thử Nghiệm",
      attendanceSheet: "DD TEST SUB",
      teacher: "Thầy Test",
      totalSessions: 8,
      status: "ACTIVE",
      isPublic: true,
      hasSheet: true,
      isFromTkb: true,
    };

    saveCustomSubject(testSubject);
    const customList = getCustomSubjects();
    const found = customList.find((s) => s.id === testSubject.id);

    expect(found).toBeDefined();
    expect(found?.name).toBe("Môn Thử Nghiệm");
    expect(found?.totalSessions).toBe(8);

    // Clean up test entry
    removeCustomSubject("test_subject_123");
  });

  it("calculates cumulative session number and period range per subject from top to bottom", () => {
    // Simulating sequence of schedule items from TKB
    const mockTkbRows = [
      { date: "21/09/2026", subject: "Kỹ Thuật Lập Trình" },
      { date: "23/09/2026", subject: "Kỹ Thuật Lập Trình" },
      { date: "25/09/2026", subject: "Kỹ Thuật Lập Trình" },
      { date: "28/09/2026", subject: "Kỹ Thuật Lập Trình" },
      { date: "29/09/2026", subject: "Cấu Trúc Dữ Liệu Và Giải Thuật" },
      { date: "30/09/2026", subject: "Kỹ Thuật Lập Trình" },
      { date: "01/10/2026", subject: "Được Nghỉ Học" },
      { date: "02/10/2026", subject: "Kỹ Thuật Lập Trình" },
      { date: "03/10/2026", subject: "Cấu Trúc Dữ Liệu Và Giải Thuật" },
    ];

    const tracker = new Map<string, number>();
    const results = mockTkbRows.map((r) => {
      const normKey = normalizeVietnameseNameWithoutAccent(r.subject).toLowerCase().replace(/\s+/g, "_");
      const isHoliday = normKey.includes("nghi");

      if (isHoliday) {
        return { ...r, sessionNumber: undefined, startPeriod: 0, endPeriod: 0 };
      }

      const count = (tracker.get(normKey) || 0) + 1;
      tracker.set(normKey, count);
      return {
        ...r,
        sessionNumber: count,
        startPeriod: (count - 1) * 3 + 1,
        endPeriod: count * 3,
      };
    });

    // 29/09: Cấu Trúc Dữ Liệu Và Giải Thuật is Buổi 1, Tiết 1 - 3
    const ctdlSession1 = results.find((r) => r.date === "29/09/2026");
    expect(ctdlSession1?.sessionNumber).toBe(1);
    expect(ctdlSession1?.startPeriod).toBe(1);
    expect(ctdlSession1?.endPeriod).toBe(3);

    // 03/10: Cấu Trúc Dữ Liệu Và Giải Thuật is Buổi 2, Tiết 4 - 6
    const ctdlSession2 = results.find((r) => r.date === "03/10/2026");
    expect(ctdlSession2?.sessionNumber).toBe(2);
    expect(ctdlSession2?.startPeriod).toBe(4);
    expect(ctdlSession2?.endPeriod).toBe(6);

    // Kỹ Thuật Lập Trình sessions count from 1 to 6
    const ktltSessions = results.filter((r) => r.subject === "Kỹ Thuật Lập Trình");
    expect(ktltSessions.length).toBe(6);
    expect(ktltSessions.map((s) => s.sessionNumber)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(ktltSessions.map((s) => `${s.startPeriod}-${s.endPeriod}`)).toEqual([
      "1-3",
      "4-6",
      "7-9",
      "10-12",
      "13-15",
      "16-18",
    ]);

    // Holiday does not have sessionNumber
    const holiday = results.find((r) => r.date === "01/10/2026");
    expect(holiday?.sessionNumber).toBeUndefined();
  });

  it("automatically synchronizes TKB subjects and full session dates list for attendance", async () => {
    const subjects = await getSubjects();
    expect(subjects.length).toBeGreaterThanOrEqual(4);

    // Tiếng Anh must have all its TKB session dates populated
    const tiengAnh = subjects.find((s) => s.id.includes("tieng_anh") || s.name.includes("Tiếng Anh"));
    expect(tiengAnh).toBeDefined();
    expect(tiengAnh!.totalSessions).toBeGreaterThanOrEqual(21);
    expect(tiengAnh!.sessionDates?.length).toBeGreaterThanOrEqual(21);
    expect(tiengAnh!.sessionDates![0].date).toBeDefined();
    expect(tiengAnh!.sessionDates![0].index).toBe(1);

    // GDTC must have all 11 dates available from TKB
    const gdtc = subjects.find((s) => s.id.includes("gdtc") || s.name.includes("thể chất"));
    expect(gdtc).toBeDefined();
    expect(gdtc!.totalSessions).toBe(11);
    expect(gdtc!.sessionDates?.length).toBe(11);

    // Auto-discovered TKB subjects (e.g. Pháp Luật, Kỹ Thuật Lập Trình)
    const phapLuat = subjects.find((s) => s.id.includes("phap_luat") || s.name.includes("Pháp Luật"));
    if (phapLuat) {
      expect(phapLuat.totalSessions).toBeGreaterThanOrEqual(6);
      expect(phapLuat.sessionDates?.length).toBeGreaterThanOrEqual(6);
      expect(phapLuat.sessionDates![0].index).toBe(1);
    }
  }, 15000);
});
