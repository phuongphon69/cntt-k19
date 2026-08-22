// app/api/admin/sync/route.ts
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/session";
import { invalidateCache, updateSyncTimestamp, lastSyncTimestamp } from "@/lib/google-sheets/cache";
import { getWorkbookSheetNames, getStudents, getSubjects } from "@/lib/google-sheets/reader";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await requireAdminSession();

    // Invalidate entire cache
    invalidateCache();
    updateSyncTimestamp();

    // Re-fetch fresh data
    const sheetNames = await getWorkbookSheetNames();
    const students = await getStudents();
    const subjects = await getSubjects();

    return NextResponse.json({
      success: true,
      message: "Đã đồng bộ thành công dữ liệu từ Google Sheets",
      lastSync: lastSyncTimestamp,
      stats: {
        totalSheets: sheetNames.length,
        totalStudents: students.length,
        totalSubjects: subjects.length,
      },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Quyền truy cập bị từ chối" }, { status: 403 });
    }
    console.error("POST /api/admin/sync error:", error);
    return NextResponse.json({ success: false, error: error.message || "Đồng bộ thất bại" }, { status: 500 });
  }
}
