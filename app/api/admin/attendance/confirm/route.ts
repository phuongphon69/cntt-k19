// app/api/admin/attendance/confirm/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/session";
import { writeAttendanceRound, saveZoomAlias } from "@/lib/google-sheets/writer";
import { AttendanceValue } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdminSession();

    const body = await req.json();
    const { sheetName, sessionDate, roundNumber, updates, newAliases } = body as {
      sheetName: string;
      sessionDate: string;
      roundNumber: 1 | 2 | 3;
      updates: { studentId: string; value: AttendanceValue }[];
      newAliases?: { studentId: string; zoomAlias: string }[];
    };

    if (!sheetName || !sessionDate || !roundNumber || !updates || !Array.isArray(updates)) {
      return NextResponse.json(
        { success: false, error: "Dữ liệu xác nhận điểm danh không hợp lệ" },
        { status: 400 }
      );
    }

    // Write to Google Sheets
    const result = await writeAttendanceRound(
      sheetName,
      sessionDate,
      roundNumber,
      updates,
      session.username
    );

    // Save any new aliases learned during review
    if (newAliases && Array.isArray(newAliases)) {
      for (const aliasItem of newAliases) {
        if (aliasItem.studentId && aliasItem.zoomAlias) {
          await saveZoomAlias(aliasItem.studentId, aliasItem.zoomAlias, session.username);
        }
      }
    }

    try {
      const { revalidatePath } = await import("next/cache");
      revalidatePath("/subjects", "layout");
      revalidatePath("/students", "layout");
      revalidatePath("/admin/attendance", "layout");
      revalidatePath("/", "layout");
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: result.message,
      updatedCount: result.updatedCount,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Quyền truy cập bị từ chối" }, { status: 403 });
    }
    console.error("POST /api/admin/attendance/confirm error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Không thể ghi điểm danh vào Google Sheets" },
      { status: 500 }
    );
  }
}
