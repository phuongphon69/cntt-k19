// app/api/stats/route.ts
import { NextResponse } from "next/server";
import { getComprehensiveAttendanceReport } from "@/lib/attendance/stats";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const report = await getComprehensiveAttendanceReport();
    return NextResponse.json({ success: true, report });
  } catch (error: any) {
    console.error("GET /api/stats error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
