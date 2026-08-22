// app/api/admin/attendance/ocr/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/session";
import { getPublicStudents, getAttendanceSheetData, getZoomAliases, getSystemSettings } from "@/lib/google-sheets/reader";
import { getOcrProvider } from "@/lib/ocr/provider";
import { processMultipleOcrOutputs } from "@/lib/ocr/matcher";
import { AttendanceValue } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await requireAdminSession();

    const formData = await req.formData();
    const sheetName = formData.get("sheetName") as string;
    const sessionDate = formData.get("sessionDate") as string;
    const roundNumber = parseInt((formData.get("roundNumber") as string) || "1", 10);
    const rawOcrText = formData.get("rawOcrText") as string;

    const files = formData.getAll("images") as File[];

    if (!sheetName || !sessionDate) {
      return NextResponse.json(
        { success: false, error: "Vui lòng chọn môn học và ngày học" },
        { status: 400 }
      );
    }

    const ocrProvider = getOcrProvider();
    const ocrTexts: string[] = [];

    // If user provided raw text directly
    if (rawOcrText && rawOcrText.trim()) {
      ocrTexts.push(rawOcrText.trim());
    }

    // Process uploaded images
    for (const file of files) {
      if (file && file.size > 0) {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const ocrRes = await ocrProvider.recognize(buffer, file.type);
        if (ocrRes.fullText) {
          ocrTexts.push(ocrRes.fullText);
        }
      }
    }

    if (ocrTexts.length === 0) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy nội dung văn bản trong ảnh tải lên" },
        { status: 400 }
      );
    }

    // Get active class roster
    const students = await getPublicStudents();
    const aliases = await getZoomAliases();
    const settings = await getSystemSettings();

    // Get current attendance values for conflict checking
    const currentValues: Record<string, AttendanceValue> = {};
    try {
      const parsedSheet = await getAttendanceSheetData(sheetName);
      for (const rec of parsedSheet.records) {
        const sess = rec.sessions[sessionDate];
        if (sess) {
          const val = roundNumber === 1 ? sess.round1 : roundNumber === 2 ? sess.round2 : sess.round3;
          currentValues[rec.studentId] = val;
        }
      }
    } catch (e) {
      console.warn("Could not read current sheet values for conflict checking:", e);
    }

    const summary = processMultipleOcrOutputs(ocrTexts, students, {
      highThreshold: settings.matchHighThreshold || 90,
      reviewThreshold: settings.matchReviewThreshold || 75,
      aliases,
      currentAttendanceValues: currentValues,
    });

    return NextResponse.json({
      success: true,
      summary,
      meta: {
        sheetName,
        sessionDate,
        roundNumber,
        imageCount: files.length,
      },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Quyền truy cập bị từ chối" }, { status: 403 });
    }
    console.error("POST /api/admin/attendance/ocr error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Xử lý OCR thất bại" },
      { status: 500 }
    );
  }
}
