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
    const name = String(body.name || body.subjectName || "").trim();
    const teacher = String(body.teacher || body.teacherName || "").trim();
    const totalSessions = parseInt(body.totalSessions || "12", 10);
    const overwrite = body.overwrite === true;
    const sessionDates = Array.isArray(body.sessionDates) ? body.sessionDates : undefined;

    if (!name) {
      return NextResponse.json({ success: false, error: "Vui lòng nhập tên môn học" }, { status: 400 });
    }

    let sheetName = "";
    if (body.createSheet !== false) {
      const res = await createNewSubjectSheet(
        name,
        teacher,
        totalSessions,
        session.username,
        { overwrite, sessionDates }
      );
      sheetName = res.sheetName;
    }

    return NextResponse.json({
      success: true,
      message: overwrite
        ? `Đã đồng bộ và định dạng chuẩn MẪU cho môn học "${name}"`
        : `Đã tạo môn học "${name}" thành công`,
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
