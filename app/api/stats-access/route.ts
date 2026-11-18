// app/api/stats-access/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  createStatsAccessToken,
  setStatsAccessCookie,
  verifyStatsAccessCode,
} from "@/lib/auth/stats-access";

export const dynamic = "force-dynamic";

// Giới hạn số lần nhập sai theo IP (bộ nhớ tiến trình)
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 10 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const now = Date.now();
    const entry = attempts.get(ip);
    if (entry && entry.resetAt > now && entry.count >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { success: false, error: "Nhập sai quá nhiều lần. Vui lòng thử lại sau ít phút." },
        { status: 429 }
      );
    }

    const { code } = (await req.json()) as { code?: string };
    if (!code || !code.trim()) {
      return NextResponse.json({ success: false, error: "Vui lòng nhập mã" }, { status: 400 });
    }

    if (!verifyStatsAccessCode(code)) {
      const cur = entry && entry.resetAt > now ? entry : { count: 0, resetAt: now + WINDOW_MS };
      cur.count++;
      attempts.set(ip, cur);
      return NextResponse.json(
        { success: false, error: "Mã không đúng. Vui lòng liên hệ Lớp trưởng để được xem mục này." },
        { status: 401 }
      );
    }

    attempts.delete(ip);
    await setStatsAccessCookie(await createStatsAccessToken());
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST /api/stats-access error:", error);
    return NextResponse.json({ success: false, error: "Đã xảy ra lỗi" }, { status: 500 });
  }
}
