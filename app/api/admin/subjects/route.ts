// app/api/admin/subjects/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/session";
import { getSubjects } from "@/lib/google-sheets/reader";
import { createNewSubjectSheet } from "@/lib/google-sheets/writer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminSession();
    const subjects = await getSubjects();
    return NextResponse.json({ success: true, subjects });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Quyền truy cập bị từ chối" }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdminSession();
    const body = await req.json();
    const { name, teacher, totalSessions, createSheet } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: "Vui lòng nhập tên môn học" }, { status: 400 });
    }

    let sheetName = "";
    if (createSheet !== false) {
      const res = await createNewSubjectSheet(
        name,
        teacher || "",
        parseInt(totalSessions || "12", 10),
        session.username
      );
      sheetName = res.sheetName;
    }

    return NextResponse.json({
      success: true,
      message: `Đã tạo môn học "${name}" thành công`,
      sheetName,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Quyền truy cập bị từ chối" }, { status: 403 });
    }
    console.error("POST /api/admin/subjects error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Không thể tạo môn học" },
      { status: 500 }
    );
  }
}
