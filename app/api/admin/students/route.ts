// app/api/admin/students/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/session";
import { getStudents } from "@/lib/google-sheets/reader";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminSession();
    const students = await getStudents();
    return NextResponse.json({ success: true, students });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Quyền truy cập bị từ chối" }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
