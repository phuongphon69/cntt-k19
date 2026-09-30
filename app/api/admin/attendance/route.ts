// app/api/admin/attendance/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/session";
import { writeAttendanceRound, saveZoomAlias } from "@/lib/google-sheets/writer";
import { AttendanceValue } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdminSession();
    const body = await req.json();

    const {
      sheetName,
      sessionDate,
      roundNumber,
      updates: rawUpdates,
      records,
      newAliases,
    } = body as {
      sheetName: string;
      sessionDate: string;
      roundNumber?: 1 | 2 | 3;
      updates?: { studentId: string; value: AttendanceValue }[];
      records?: { studentId: string; round1?: AttendanceValue; round2?: AttendanceValue; round3?: AttendanceValue }[];
      newAliases?: { studentId: string; zoomAlias: string }[];
    };

    if (!sheetName || !sessionDate) {
      return NextResponse.json(
        { success: false, error: "Thiếu thông tin môn học (sheetName) hoặc ngày học (sessionDate)" },
        { status: 400 }
      );
    }

    // Determine round number
    let derivedRound: 1 | 2 | 3 = roundNumber || 1;
    if (!roundNumber && Array.isArray(records) && records.length > 0) {
      if (records[0].round3) derivedRound = 3;
      else if (records[0].round2) derivedRound = 2;
      else derivedRound = 1;
    }

    // Determine updates list
    let updates: { studentId: string; value: AttendanceValue }[] = [];
    if (Array.isArray(rawUpdates) && rawUpdates.length > 0) {
      updates = rawUpdates;
    } else if (Array.isArray(records) && records.length > 0) {
      updates = records.map((r) => ({
        studentId: r.studentId,
        value: (r.round1 || r.round2 || r.round3 || "X") as AttendanceValue,
      }));
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: "Không có danh sách học viên để ghi điểm danh" },
        { status: 400 }
      );
    }

    // Write to Google Sheets
    const result = await writeAttendanceRound(
      sheetName,
      sessionDate,
      derivedRound,
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

    return NextResponse.json({
      success: true,
      message: result.message,
      updatedCount: result.updatedCount,
      sheetCreated: result.sheetCreated,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Quyền truy cập bị từ chối" }, { status: 403 });
    }
    console.error("POST /api/admin/attendance error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Không thể ghi điểm danh vào Google Sheets" },
      { status: 500 }
    );
  }
}
