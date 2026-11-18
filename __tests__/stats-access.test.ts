import { describe, it, expect, afterEach } from "vitest";
import { verifyStatsAccessCode } from "../lib/auth/stats-access";

describe("Stats access code", () => {
  afterEach(() => {
    delete process.env.STATS_ACCESS_CODE;
    delete process.env.STATS_ACCESS_CODES;
  });

  it("accepts the default code CNTTK19 (case/space insensitive)", () => {
    expect(verifyStatsAccessCode("CNTTK19")).toBe(true);
    expect(verifyStatsAccessCode("cnttk19")).toBe(true);
    expect(verifyStatsAccessCode(" cntt k19 ")).toBe(true);
  });

  it("rejects wrong or empty codes", () => {
    expect(verifyStatsAccessCode("CNTTK20")).toBe(false);
    expect(verifyStatsAccessCode("")).toBe(false);
    expect(verifyStatsAccessCode("K19")).toBe(false);
  });

  it("uses STATS_ACCESS_CODE from env instead of the default when set", () => {
    process.env.STATS_ACCESS_CODE = "LOPTRUONG";
    expect(verifyStatsAccessCode("loptruong")).toBe(true);
    expect(verifyStatsAccessCode("CNTTK19")).toBe(false);
  });
});
