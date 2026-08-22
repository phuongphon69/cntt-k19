// app/api/admin/attendance/manual/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/session";
import { writeAttendanceRound } from "@/lib/google-sheets/writer";
import { AttendanceValue } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdminSession();

    const body = await req.json();
    const { sheetName, sessionDate, roundNumber, updates } = body as {
      sheetName: string;
      sessionDate: string;
      roundNumber: 1 | 2 | 3;
      updates: { studentId: string; value: AttendanceValue }[];
    };

    if (!sheetName || !sessionDate || !roundNumber || !updates || !Array.isArray(updates)) {
      return NextResponse.json(
        { success: false, error: "Thiếu dữ liệu cập nhật điểm danh thủ công" },
        { status: 400 }
      );
    }

    const result = await writeAttendanceRound(
      sheetName,
      sessionDate,
      roundNumber,
      updates,
      session.username
    );

    return NextResponse.json({
      success: true,
      message: result.message,
      updatedCount: result.updatedCount,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Quyền truy cập bị từ chối" }, { status: 403 });
    }
    console.error("POST /api/admin/attendance/manual error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi khi ghi điểm danh thủ công" },
      { status: 500 }
    );
  }
}
