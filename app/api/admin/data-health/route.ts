// app/api/admin/data-health/route.ts
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/session";
import { checkDataHealth } from "@/lib/data-health/checker";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminSession();
    const report = await checkDataHealth();
    return NextResponse.json({ success: true, report });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Quyền truy cập bị từ chối" }, { status: 403 });
    }
    console.error("GET /api/admin/data-health error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
