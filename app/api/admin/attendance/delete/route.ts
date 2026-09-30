// app/api/admin/attendance/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/session";
import { clearSessionAttendance } from "@/lib/google-sheets/writer";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdminSession();
    const body = await req.json();

    const { sheetName, sessionDate, studentId, mode } = body as {
      sheetName: string;
      sessionDate: string;
      studentId?: string;
      mode?: "student" | "session";
    };

    if (!sheetName || !sessionDate) {
      return NextResponse.json(
        { success: false, error: "Thiếu thông tin môn học hoặc ngày học" },
        { status: 400 }
      );
    }

    const result = await clearSessionAttendance(
      sheetName,
      sessionDate,
      { studentId, mode },
      session.username
    );

    try {
      revalidatePath("/subjects", "layout");
      revalidatePath("/students", "layout");
      revalidatePath("/admin/attendance", "layout");
      revalidatePath("/", "layout");
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Quyền truy cập bị từ chối" }, { status: 403 });
    }
    console.error("POST /api/admin/attendance/delete error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi xóa kết quả điểm danh" },
      { status: 500 }
    );
  }
}
