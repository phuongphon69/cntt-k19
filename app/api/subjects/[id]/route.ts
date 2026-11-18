// app/api/subjects/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSubjects, getAttendanceSheetData } from "@/lib/google-sheets/reader";
import { hasStatsAccess } from "@/lib/auth/stats-access";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await hasStatsAccess())) {
    return NextResponse.json(
      { success: false, error: "Cần mã xem do Lớp trưởng cấp" },
      { status: 401 }
    );
  }
  try {
    const { id } = params;
    const subjects = await getSubjects();
    const subject = subjects.find(
      (s) => s.id.toLowerCase() === id.toLowerCase() || s.code.toLowerCase() === id.toLowerCase()
    );

    if (!subject) {
      return NextResponse.json({ success: false, error: "Subject not found" }, { status: 404 });
    }

    const attendanceData = await getAttendanceSheetData(subject.attendanceSheet);

    return NextResponse.json({
      success: true,
      subject,
      attendanceData,
    });
  } catch (error: any) {
    console.error("GET /api/subjects/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch subject details" },
      { status: 500 }
    );
  }
}
