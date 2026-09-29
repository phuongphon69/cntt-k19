// app/api/admin/subjects/sync-tkb/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/session";
import { getSubjects, getTkbSubjectStats, getWorkbookSheetNames } from "@/lib/google-sheets/reader";
import { syncSubjectsFromTkb } from "@/lib/google-sheets/writer";
import { normalizeVietnameseNameWithoutAccent } from "@/lib/vietnamese/normalize";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminSession();

    const sheetNames = await getWorkbookSheetNames();
    const existingDdSheets = new Set(
      sheetNames.filter((s) => s.trim().toUpperCase().startsWith("DD ")).map((s) => s.trim().toUpperCase())
    );

    const tkbMap = await getTkbSubjectStats();
    const currentSubjects = await getSubjects();

    const previewNew: any[] = [];
    const previewExisting: any[] = [];

    for (const [tkbKey, tkbInfo] of Array.from(tkbMap.entries())) {
      const candidateSheet = `DD ${tkbInfo.name.toUpperCase().trim()}`;

      const existing = currentSubjects.find((s) => {
        const sNorm = normalizeVietnameseNameWithoutAccent(s.name).toLowerCase().replace(/\s+/g, "_");
        const idNorm = normalizeVietnameseNameWithoutAccent(s.id).toLowerCase().replace(/\s+/g, "_");
        const sheetNorm = normalizeVietnameseNameWithoutAccent(s.attendanceSheet).toLowerCase().replace(/\s+/g, "_");

        return (
          sNorm === tkbKey ||
          idNorm === tkbKey ||
          sheetNorm.includes(tkbKey) ||
          (tkbKey.includes("the_chat") && (idNorm.includes("gdtc") || sheetNorm.includes("gdtc"))) ||
          (tkbKey.includes("chinh_tri") && (idNorm.includes("chinh_tri") || sheetNorm.includes("chinh_tri"))) ||
          (tkbKey.includes("tin_hoc") && (idNorm.includes("tin_hoc") || sheetNorm.includes("tin_hoc"))) ||
          (tkbKey.includes("tieng_anh") && (idNorm.includes("tieng_anh") || sheetNorm.includes("tieng_anh")))
        );
      });

      const isOldSubjectWithSheet = existing && existingDdSheets.has(existing.attendanceSheet.toUpperCase());

      if (isOldSubjectWithSheet) {
        const oldSessions = existing.totalSessions || 10;
        const willAccumulate = tkbInfo.count > oldSessions;
        previewExisting.push({
          id: existing.id,
          name: existing.name,
          sheetName: existing.attendanceSheet,
          teacher: existing.teacher,
          oldSessions,
          tkbSessions: tkbInfo.count,
          accumulatedSessions: Math.max(oldSessions, tkbInfo.count),
          addedSessions: Math.max(0, tkbInfo.count - oldSessions),
          willAccumulate,
        });
      } else {
        previewNew.push({
          id: tkbKey,
          name: tkbInfo.name,
          sheetName: candidateSheet,
          teacher: tkbInfo.teacher || "Chưa cập nhật",
          tkbSessions: tkbInfo.count,
        });
      }
    }

    return NextResponse.json({
      success: true,
      previewNew,
      previewExisting,
      totalTkbSubjects: tkbMap.size,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Quyền truy cập bị từ chối" }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdminSession();
    let body = {};
    try {
      body = await req.json();
    } catch (e) {
      body = {};
    }

    const mode = (body as any)?.mode || "accumulate";
    const result = await syncSubjectsFromTkb({
      mode,
      adminUser: session.username,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Quyền truy cập bị từ chối" }, { status: 403 });
    }
    console.error("POST /api/admin/subjects/sync-tkb error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi đồng bộ môn học từ TKB" },
      { status: 500 }
    );
  }
}
