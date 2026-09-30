// app/api/admin/attendance/ocr/test-key/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/session";
import { testGeminiApiKey } from "@/lib/ocr/provider";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await requireAdminSession();
    const body = await req.json().catch(() => ({}));
    const apiKey = body?.apiKey;
    const result = await testGeminiApiKey(apiKey);
    return NextResponse.json(result);
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ ok: false, message: "Quyền truy cập bị từ chối" }, { status: 403 });
    }
    return NextResponse.json(
      { ok: false, message: err?.message || "Lỗi kiểm tra API Key" },
      { status: 500 }
    );
  }
}
