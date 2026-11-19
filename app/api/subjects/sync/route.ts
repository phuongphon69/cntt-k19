// app/api/subjects/sync/route.ts
// Đồng bộ kết quả điểm danh của một môn từ Google Sheet (chỉ đọc, ai xem được môn đều dùng được)
import { NextRequest, NextResponse } from "next/server";
import { invalidateCache, updateSyncTimestamp, lastSyncTimestamp } from "@/lib/google-sheets/cache";
import { getAttendanceSheetData } from "@/lib/google-sheets/reader";

export const dynamic = "force-dynamic";

const MIN_INTERVAL_MS = 5000;
let lastRun = 0;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const sheetName = typeof body.sheetName === "string" ? body.sheetName.trim() : "";
    if (!sheetName) {
      return NextResponse.json({ success: false, error: "Thiếu tên môn" }, { status: 400 });
    }

    // Chống bấm liên tiếp làm quá tải Google Sheet
    const now = Date.now();
    if (now - lastRun < MIN_INTERVAL_MS) {
      return NextResponse.json({ success: true, throttled: true, lastSync: lastSyncTimestamp });
    }
    lastRun = now;

    invalidateCache();
    updateSyncTimestamp();
    const data = await getAttendanceSheetData(sheetName, true);

    return NextResponse.json({
      success: true,
      lastSync: lastSyncTimestamp,
      students: data.records.length,
      sessions: data.sessions.length,
    });
  } catch (error: any) {
    console.error("POST /api/subjects/sync error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Đồng bộ thất bại" },
      { status: 500 }
    );
  }
}
