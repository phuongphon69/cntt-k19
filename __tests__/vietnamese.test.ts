// __tests__/vietnamese.test.ts
import { describe, it, expect } from "vitest";
import {
  normalizeVietnameseName,
  normalizeVietnameseNameWithoutAccent,
  removeVietnameseAccents,
} from "../lib/vietnamese/normalize";
import { calculateNameMatchScore } from "../lib/vietnamese/fuzzy";

describe("Vietnamese Name Normalization & Fuzzy Match", () => {
  it("normalizes uppercase, spacing and accents correctly", () => {
    expect(normalizeVietnameseName("Nguyễn   Văn Chung")).toBe("Nguyễn Văn Chung");
    expect(normalizeVietnameseName("NGUYỄN VĂN CHUNG")).toBe("Nguyễn Văn Chung");
    expect(normalizeVietnameseName("  nguyễn   văn   chung  ")).toBe("Nguyễn Văn Chung");
  });

  it("removes accents and creates identical normalized tokens", () => {
    const t1 = normalizeVietnameseNameWithoutAccent("Nguyễn   Văn Chung");
    const t2 = normalizeVietnameseNameWithoutAccent("NGUYỄN VĂN CHUNG");
    const t3 = normalizeVietnameseNameWithoutAccent("nguyen van chung");

    expect(t1).toBe("nguyen van chung");
    expect(t2).toBe("nguyen van chung");
    expect(t3).toBe("nguyen van chung");
    expect(t1).toBe(t2);
  });

  it("matches names with DOB bonus score", () => {
    const scoreExact = calculateNameMatchScore("Nguyễn Văn Chung", "Nguyễn Văn Chung");
    expect(scoreExact).toBe(100);

    const scoreNoAccent = calculateNameMatchScore("Trần Hoàng Anh", "TRAN HOANG ANH");
    expect(scoreNoAccent).toBe(100);

    const scoreWithDob = calculateNameMatchScore(
      "Phạm Ngọc Hà",
      "Pham Ngoc Ha",
      "02/12/1985",
      "02.12.1985"
    );
    expect(scoreWithDob).toBeGreaterThanOrEqual(95);
  });
});
