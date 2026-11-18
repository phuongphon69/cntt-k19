// app/api/admin/stats-access/route.ts
import { NextRequest, NextResponse } from "next/server";
import { generateStatsAccessCode, isRealAdmin } from "@/lib/auth/stats-access";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!(await isRealAdmin())) {
    return NextResponse.json({ success: false, error: "Quyền truy cập bị từ chối" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const days = Number(body?.days) || 30;
  const { code, expiresAt } = generateStatsAccessCode(days);
  return NextResponse.json({ success: true, code, expiresAt });
}
