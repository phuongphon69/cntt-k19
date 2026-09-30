// app/api/admin/attendance/edit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/session";
import { updateStudentAttendanceRounds } from "@/lib/google-sheets/writer";
import { AttendanceValue } from "@/types";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdminSession();
    const body = await req.json();

    const { sheetName, sessionDate, studentId, round1, round2, round3 } = body as {
      sheetName: string;
      sessionDate: string;
      studentId: string;
      round1?: AttendanceValue;
      round2?: AttendanceValue;
      round3?: AttendanceValue;
    };

    if (!sheetName || !sessionDate || !studentId) {
      return NextResponse.json(
        { success: false, error: "Thiếu thông tin môn học, ngày học hoặc mã học viên" },
        { status: 400 }
      );
    }

    const result = await updateStudentAttendanceRounds(
      sheetName,
      sessionDate,
      studentId,
      { round1, round2, round3 },
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
    console.error("POST /api/admin/attendance/edit error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi cập nhật điểm danh học viên" },
      { status: 500 }
    );
  }
}
