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
});
