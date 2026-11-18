// lib/auth/stats-access.ts
// Quyền xem phần Thống kê: Quản trị viên xem trực tiếp; người khác nhập mã (mặc định CNTTK19).
import { timingSafeEqual } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getSession } from "./session";

const SECRET_KEY = new TextEncoder().encode(
  process.env.AUTH_SECRET || "cntt-k19-super-secret-key-change-in-production-2026"
);

export const STATS_COOKIE_NAME = "cntt_k19_stats_access";
export const DEFAULT_STATS_ACCESS_CODE = "CNTTK19";
const ACCESS_DAYS = 30;

function normalizeCode(code: string): string {
  return String(code || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

/** Danh sách mã hợp lệ: STATS_ACCESS_CODE (nhiều mã cách nhau bằng dấu phẩy) hoặc mặc định CNTTK19 */
function validCodes(): string[] {
  const fromEnv = (process.env.STATS_ACCESS_CODE || process.env.STATS_ACCESS_CODES || "")
    .split(",")
    .map(normalizeCode)
    .filter(Boolean);
  return fromEnv.length > 0 ? fromEnv : [normalizeCode(DEFAULT_STATS_ACCESS_CODE)];
}

export function verifyStatsAccessCode(input: string): boolean {
  const norm = normalizeCode(input);
  if (!norm) return false;
  const a = Buffer.from(norm);
  return validCodes().some((code) => {
    const b = Buffer.from(code);
    return a.length === b.length && timingSafeEqual(a, b);
  });
}

export async function createStatsAccessToken(): Promise<string> {
  return new SignJWT({ scope: "stats" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_DAYS}d`)
    .sign(SECRET_KEY);
}

export async function setStatsAccessCookie(token: string) {
  cookies().set(STATS_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_DAYS * 24 * 60 * 60,
  });
}

export async function isRealAdmin(): Promise<boolean> {
  const session = await getSession();
  return !!session && session.role === "ADMIN";
}

/** Có quyền xem thống kê: là quản trị viên hoặc đã nhập đúng mã */
export async function hasStatsAccess(): Promise<boolean> {
  if (await isRealAdmin()) return true;
  const token = cookies().get(STATS_COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY, { algorithms: ["HS256"] });
    return payload.scope === "stats";
  } catch {
    return false;
  }
}
