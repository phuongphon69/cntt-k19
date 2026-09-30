// app/api/admin/attendance/ocr/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/session";
import { getPublicStudents, getAttendanceSheetData, getZoomAliases, getSystemSettings } from "@/lib/google-sheets/reader";
import { getOcrProvider, hasConfiguredOcrApi } from "@/lib/ocr/provider";
import { processMultipleOcrOutputs } from "@/lib/ocr/matcher";
import { AttendanceValue } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminSession();
    const hasServerKey = hasConfiguredOcrApi();
    return NextResponse.json({
      success: true,
      hasServerKey,
      serverProvider: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
        ? "Gemini AI Vision"
        : process.env.GOOGLE_CLOUD_VISION_API_KEY
        ? "Google Cloud Vision"
        : null,
    });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Quyền truy cập bị từ chối" }, { status: 403 });
    }
    return NextResponse.json({ success: false, hasServerKey: false });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminSession();

    const formData = await req.formData();
    const sheetName = formData.get("sheetName") as string;
    const sessionDate = formData.get("sessionDate") as string;
    const roundNumber = parseInt((formData.get("roundNumber") as string) || "1", 10);
    const rawOcrText = formData.get("rawOcrText") as string;
    const clientApiKey = formData.get("geminiApiKey") as string;

    const files = formData.getAll("images") as File[];

    if (!sheetName || !sessionDate) {
      return NextResponse.json(
        { success: false, error: "Vui lòng chọn môn học và ngày học" },
        { status: 400 }
      );
    }

    const ocrProvider = getOcrProvider(clientApiKey);
    const ocrTexts: string[] = [];
    let lastOcrError = "";

    // If user provided raw text directly or from client-side OCR
    if (rawOcrText && rawOcrText.trim()) {
      ocrTexts.push(rawOcrText.trim());
    }

    // Process uploaded images (if any)
    for (const file of files) {
      if (file && file.size > 0) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const ocrRes = await ocrProvider.recognize(buffer, file.type || "image/jpeg");
          if (ocrRes.fullText) {
            ocrTexts.push(ocrRes.fullText);
          }
        } catch (imgErr: any) {
          lastOcrError = imgErr?.message || "Lỗi xử lý ảnh";
          // If NO_OCR_API error (no image processing configured), propagate clearly
          if (imgErr.message?.startsWith("NO_OCR_API")) {
            return NextResponse.json(
              {
                success: false,
                error: imgErr.message.replace("NO_OCR_API: ", ""),
                noApiConfigured: true,
              },
              { status: 422 }
            );
          }
          console.error(`OCR failed for file ${file.name}:`, imgErr?.message || imgErr);
        }
      }
    }

    if (ocrTexts.length === 0 && files.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            lastOcrError ||
            "Không thể nhận diện văn bản từ ảnh. Bạn có thể cài đặt Gemini API Key hoặc chuyển sang chế độ quét trực tiếp bằng trình duyệt.",
          noApiConfigured: !clientApiKey && !hasConfiguredOcrApi(),
        },
        { status: 400 }
      );
    }

    if (ocrTexts.length === 0) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy nội dung văn bản nào để đối chiếu danh sách" },
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
