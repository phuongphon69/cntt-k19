// lib/auth/stats-access.ts
// Quyền xem phần Thống kê: Quản trị viên xem trực tiếp; người khác phải nhập mã do Lớp trưởng cấp.
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getSession } from "./session";

const SECRET = process.env.AUTH_SECRET || "cntt-k19-super-secret-key-change-in-production-2026";
const SECRET_KEY = new TextEncoder().encode(SECRET);

export const STATS_COOKIE_NAME = "cntt_k19_stats_access";

// Bảng ký tự dễ đọc (bỏ 0/O, 1/I)
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const DAY_MS = 24 * 60 * 60 * 1000;

function encodeBase32(num: number, length: number): string {
  let out = "";
  let n = num;
  for (let i = 0; i < length; i++) {
    out = ALPHABET[n % 32] + out;
    n = Math.floor(n / 32);
  }
  return out;
}

function decodeBase32(text: string): number {
  let n = 0;
  for (const ch of text) {
    const idx = ALPHABET.indexOf(ch);
    if (idx === -1) return NaN;
    n = n * 32 + idx;
  }
  return n;
}

function macOf(payload: string): string {
  const digest = createHmac("sha256", SECRET).update(`stats:${payload}`).digest();
  let out = "";
  for (let i = 0; i < 6; i++) out += ALPHABET[digest[i] % 32];
  return out;
}

function normalizeCode(code: string): string {
  return String(code || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

/**
 * Tạo mã xem thống kê (không cần lưu trữ): 4 ký tự ngẫu nhiên + 3 ký tự hạn dùng + 6 ký tự chữ ký.
 * Ví dụ: K7QM-4TZ9-XA2HR
 */
export function generateStatsAccessCode(validDays: number): { code: string; expiresAt: number } {
  const days = Math.min(Math.max(Math.floor(validDays) || 30, 1), 365);
  const expDay = Math.floor((Date.now() + days * DAY_MS) / DAY_MS); // số ngày kể từ 1970
  const rand = Array.from(randomBytes(4))
    .map((b) => ALPHABET[b % 32])
    .join("");
  const payload = rand + encodeBase32(expDay, 3);
  const raw = payload + macOf(payload);
  const code = `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8)}`;
  return { code, expiresAt: (expDay + 1) * DAY_MS };
}

/** Kiểm tra mã; trả về thời điểm hết hạn (ms) nếu hợp lệ */
export function verifyStatsAccessCode(input: string): { valid: boolean; expiresAt?: number } {
  const norm = normalizeCode(input);
  if (!norm) return { valid: false };

  // Mã cố định cấu hình bằng biến môi trường STATS_ACCESS_CODES (cách nhau bằng dấu phẩy)
  const fixed = (process.env.STATS_ACCESS_CODES || "")
    .split(",")
    .map(normalizeCode)
    .filter(Boolean);
  if (fixed.includes(norm)) {
    return { valid: true, expiresAt: Date.now() + 30 * DAY_MS };
  }

  if (norm.length !== 13) return { valid: false };
  const payload = norm.slice(0, 7);
  const mac = norm.slice(7);
  const expected = macOf(payload);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { valid: false };

  const expDay = decodeBase32(payload.slice(4, 7));
  if (Number.isNaN(expDay)) return { valid: false };
  const expiresAt = (expDay + 1) * DAY_MS;
  if (expiresAt <= Date.now()) return { valid: false };
  return { valid: true, expiresAt };
}

export async function createStatsAccessToken(expiresAt: number): Promise<string> {
  const cap = Date.now() + 30 * DAY_MS;
  const exp = Math.floor(Math.min(expiresAt, cap) / 1000);
  return new SignJWT({ scope: "stats" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(SECRET_KEY);
}

export async function setStatsAccessCookie(token: string, expiresAt: number) {
  const cap = Date.now() + 30 * DAY_MS;
  cookies().set(STATS_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.max(60, Math.floor((Math.min(expiresAt, cap) - Date.now()) / 1000)),
  });
}

export async function isRealAdmin(): Promise<boolean> {
  const session = await getSession();
  return !!session && session.role === "ADMIN";
}

/** Có quyền xem thống kê: là quản trị viên hoặc đã nhập mã hợp lệ */
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
