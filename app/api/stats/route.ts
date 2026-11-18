// app/api/stats/route.ts
import { NextResponse } from "next/server";
import { getComprehensiveAttendanceReport } from "@/lib/attendance/stats";
import { hasStatsAccess } from "@/lib/auth/stats-access";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasStatsAccess())) {
    return NextResponse.json(
      { success: false, error: "Cần mã xem thống kê do Lớp trưởng cấp" },
      { status: 401 }
    );
  }
  try {
    const report = await getComprehensiveAttendanceReport();
    return NextResponse.json({ success: true, report });
  } catch (error: any) {
    console.error("GET /api/stats error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
