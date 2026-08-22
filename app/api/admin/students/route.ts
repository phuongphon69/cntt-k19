// app/api/admin/students/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/session";
import { getStudents } from "@/lib/google-sheets/reader";
import { getGoogleSheetsClient, getSpreadsheetId } from "@/lib/google-sheets/client";
import { invalidateCache, updateSyncTimestamp } from "@/lib/google-sheets/cache";
import { logAuditEvent } from "@/lib/google-sheets/writer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminSession();
    const students = await getStudents();
    return NextResponse.json({ success: true, students });
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
    const body = await req.json();
    const { fullName, dateOfBirth, studySystem, phone, cccd, placeOfBirth, dateJoinedGroup, notes } = body;

    if (!fullName || !fullName.trim()) {
      return NextResponse.json({ success: false, error: "Vui lòng nhập họ và tên học viên" }, { status: 400 });
    }

    const trimmedName = fullName.trim();
    const parts = trimmedName.split(" ");
    const ten = parts.pop() || "";
    const hoVa = parts.join(" ");

    // Append to sheet if Google Client is configured
    const spreadsheetId = getSpreadsheetId();
    const client = getGoogleSheetsClient();

    const currentStudents = await getStudents();
    const nextStt = currentStudents.length + 1;

    if (client) {
      try {
        const rowData = [
          nextStt,
          hoVa,
          ten,
          dateOfBirth || "",
          placeOfBirth || "",
          "",
          "",
          phone || "",
          "CNTT",
          studySystem || "CQ",
          dateJoinedGroup || new Date().toLocaleDateString("vi-VN"),
          notes || "",
        ];

        await client.spreadsheets.values.append({
          spreadsheetId,
          range: "'DANH SÁCH LỚP'!A:L",
          valueInputOption: "USER_ENTERED",
          requestBody: {
            values: [rowData],
          },
        });
      } catch (e) {
        console.warn("Failed to append row to Google Sheets via API:", e);
      }
    }

    invalidateCache();
    updateSyncTimestamp();

    await logAuditEvent("CREATE_STUDENT", "STUDENT", trimmedName, {
      fullName: trimmedName,
      dateOfBirth,
      studySystem,
      adminUser: session.username,
    });

    return NextResponse.json({
      success: true,
      message: `Đã thêm học viên "${trimmedName}" thành công (STT: ${nextStt})`,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Quyền truy cập bị từ chối" }, { status: 403 });
    }
    console.error("POST /api/admin/students error:", error);
    return NextResponse.json({ success: false, error: error.message || "Không thể thêm học viên" }, { status: 500 });
  }
}
