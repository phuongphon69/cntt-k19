// app/api/admin/settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/session";
import { getSystemSettings } from "@/lib/google-sheets/reader";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminSession();
    const settings = await getSystemSettings();
    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Quyền truy cập bị từ chối" }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminSession();
    const body = await req.json();
    return NextResponse.json({
      success: true,
      message: "Đã cập nhật cấu hình hệ thống thành công",
      settings: body,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Quyền truy cập bị từ chối" }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
