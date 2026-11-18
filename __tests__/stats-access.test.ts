import { describe, it, expect } from "vitest";
import { generateStatsAccessCode, verifyStatsAccessCode } from "../lib/auth/stats-access";

describe("Stats access codes", () => {
  it("generates a code that verifies and has the right expiry", () => {
    const { code, expiresAt } = generateStatsAccessCode(7);
    expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{5}$/);
    const res = verifyStatsAccessCode(code);
    expect(res.valid).toBe(true);
    expect(res.expiresAt).toBe(expiresAt);
    expect(expiresAt).toBeGreaterThan(Date.now() + 6 * 86400000);
  });

  it("accepts lowercase and spaces but rejects tampered or random codes", () => {
    const { code } = generateStatsAccessCode(30);
    expect(verifyStatsAccessCode(code.toLowerCase().replace(/-/g, " ")).valid).toBe(true);
    const tampered = code.slice(0, -1) + (code.endsWith("A") ? "B" : "A");
    expect(verifyStatsAccessCode(tampered).valid).toBe(false);
    expect(verifyStatsAccessCode("ABCD-EFGH-JKLMN").valid).toBe(false);
    expect(verifyStatsAccessCode("").valid).toBe(false);
  });

  it("accepts fixed codes from STATS_ACCESS_CODES", () => {
    process.env.STATS_ACCESS_CODES = "lop-truong-2026, ABC123";
    expect(verifyStatsAccessCode("LOPTRUONG2026").valid).toBe(true);
    expect(verifyStatsAccessCode("abc-123").valid).toBe(true);
    delete process.env.STATS_ACCESS_CODES;
  });
});
