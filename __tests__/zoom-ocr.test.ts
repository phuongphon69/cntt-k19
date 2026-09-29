// __tests__/zoom-ocr.test.ts
import { describe, it, expect } from "vitest";
import { parseZoomDisplayName, parseZoomOcrText } from "../lib/ocr/zoom-parser";
import { matchZoomParticipants } from "../lib/ocr/matcher";
import { PublicStudent } from "../types";

describe("Zoom OCR Parser & Matcher", () => {
  it("cleans noisy Zoom participant strings and extracts DOB signals", () => {
    const item1 = parseZoomDisplayName("Phạm Ngọc Hà 02.12.1985 K19 CNTT");
    expect(item1.cleanedName).toBe("Phạm Ngọc Hà");
    expect(item1.extractedDob).toBe("02/12/1985");

    const item2 = parseZoomDisplayName("Phạm Văn Trung 06.11.1988 K19");
    expect(item2.cleanedName).toBe("Phạm Văn Trung");
    expect(item2.extractedDob).toBe("06/11/1988");

    const item3 = parseZoomDisplayName("Trần hoàng anh k19 CNTT");
    expect(item3.cleanedName).toBe("Trần Hoàng Anh");

    const item4 = parseZoomDisplayName("Trần Ngọc Bảo 06/12/2001_CNTT");
    expect(item4.cleanedName).toBe("Trần Ngọc Bảo");
    expect(item4.extractedDob).toBe("06/12/2001");

    const item5 = parseZoomDisplayName("Nguyễn Trần Hoàn 29/10/1994- Cntt");
    expect(item5.cleanedName).toBe("Nguyễn Trần Hoàn");
    expect(item5.extractedDob).toBe("29/10/1994");
  });

  it("filters Zoom UI controls like 'Participants' or 'Mute all'", () => {
    const text = `
      Participants (32)
      Phạm Ngọc Hà 02.12.1985 K19 CNTT
      Mute All
      Invite
      Trần hoàng anh k19 CNTT
    `;
    const parsed = parseZoomOcrText(text);
    expect(parsed.length).toBe(2);
    expect(parsed[0].cleanedName).toBe("Phạm Ngọc Hà");
    expect(parsed[1].cleanedName).toBe("Trần Hoàng Anh");
  });

  it("matches parsed candidates against roster and identifies conflicts with existing values", () => {
    const students: PublicStudent[] = [
      { id: "pham_ngoc_ha", fullName: "Phạm Ngọc Hà", dateOfBirth: "02/12/1985" },
      { id: "tran_hoang_anh", fullName: "Trần Hoàng Anh", dateOfBirth: "01/01/1994" },
      { id: "nguyen_van_chung", fullName: "Nguyễn Văn Chung", dateOfBirth: "08/07/1992" },
    ];

    const parsedNames = [
      parseZoomDisplayName("Phạm Ngọc Hà 02.12.1985 K19 CNTT"),
      parseZoomDisplayName("Trần hoàng anh k19 CNTT"),
    ];

    // Current cell value has "P" for Phạm Ngọc Hà
    const summary = matchZoomParticipants(parsedNames, students, {
      currentAttendanceValues: {
        pham_ngoc_ha: "P",
      },
    });

    expect(summary.totalExtracted).toBe(2);
    expect(summary.matchedCount).toBe(2);
    expect(summary.unmatchedStudents.length).toBe(1); // nguyen_van_chung not in zoom

    const haCand = summary.candidates.find((c) => c.matchedStudent?.id === "pham_ngoc_ha");
    expect(haCand).toBeDefined();
    expect(haCand?.hasConflict).toBe(true);
    expect(haCand?.currentValue).toBe("P");
  });

  it("accurately cleans real Zoom participant lines with avatar initials, status tags, and partial DOB", () => {
    const rawLines = [
      "Ne Nguyễn Huy Phương 10.08... (tôi) 2 (4*",
      "no Nguyễn Doãn Hướng 24/09/1988 k1... Ỏ",
      "BH. Bùi Hong Quân CNTT-K19 CH Ø5 (x*",
      "Ï Bùi Trung Hiếu. 13.12.1998. K19... 2 (Zf*",
      "li Hoàng Công Minh 22/07/1996 K... 2. (Z4*",
      "HN Hoàng Ngọc Hùng 12/11/1988. K... 5 (Zf*",
      "hr HOANG THI PHUONG 17/06/19... 2. (Zf*",
      "li Hoàng Đình Thanh 12/09/1979 K... 2. (x*",
      "2 Lê Văn Hiếu - 16/01/2003 - K19... 5 [A*",
      "ra Lê Văn Huan /03.9.1985 [K19,.. 5 (Z4*",
    ];

    const roster: PublicStudent[] = [
      { id: "nguyen_huy_phuong", fullName: "Nguyễn Huy Phương", dateOfBirth: "10/08/1997" },
      { id: "nguyen_doan_huong", fullName: "Nguyễn Doãn Hướng", dateOfBirth: "24/09/1988" },
      { id: "bui_hong_quan", fullName: "Bùi Hồng Quân", dateOfBirth: "06/03/1974" },
      { id: "bui_trung_hieu", fullName: "Bùi Trung Hiếu", dateOfBirth: "13/12/1998" },
      { id: "hoang_cong_minh", fullName: "Hoàng Công Minh", dateOfBirth: "22/07/1996" },
      { id: "hoang_ngoc_hung", fullName: "Hoàng Ngọc Hùng", dateOfBirth: "12/11/1988" },
      { id: "hoang_thi_phuong", fullName: "Hoàng Thị Phương", dateOfBirth: "17/06/1991" },
      { id: "hoang_dinh_thanh", fullName: "Hoàng Đình Thanh", dateOfBirth: "12/09/1979" },
      { id: "le_van_hieu", fullName: "Lê Văn Hiếu", dateOfBirth: "16/01/2003" },
      { id: "le_van_huan", fullName: "Lê Văn Huân", dateOfBirth: "03/09/1985" },
    ];

    const parsed = rawLines.map((l) => parseZoomDisplayName(l));
    const summary = matchZoomParticipants(parsed, roster);

    expect(summary.totalExtracted).toBe(10);
    // All 10 real Zoom attendees must be matched with high confidence (>= 85%)
    expect(summary.matchedCount).toBe(10);
    expect(summary.unmatchedCount).toBe(0);

    // Verify individual student matches
    const phuong = summary.candidates.find((c) => c.matchedStudent?.id === "nguyen_huy_phuong");
    expect(phuong?.status).toBe("MATCHED");
    expect(phuong?.confidenceScore).toBeGreaterThanOrEqual(95);

    const quan = summary.candidates.find((c) => c.matchedStudent?.id === "bui_hong_quan");
    expect(quan?.status).toBe("MATCHED");
    expect(quan?.confidenceScore).toBeGreaterThanOrEqual(95);

    const huan = summary.candidates.find((c) => c.matchedStudent?.id === "le_van_huan");
    expect(huan?.status).toBe("MATCHED");
    expect(huan?.confidenceScore).toBeGreaterThanOrEqual(95);
  });
});
