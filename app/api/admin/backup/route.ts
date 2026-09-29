// app/api/admin/backup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/session";
import {
  performGoogleSheetBackup,
  getBackupHistory,
  getGoogleAppsScriptSnippet,
} from "@/lib/google-sheets/backup";
import { getSpreadsheetId, getGoogleSheetsClient } from "@/lib/google-sheets/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminSession();
    const spreadsheetId = getSpreadsheetId();
    const client = getGoogleSheetsClient();
    const history = getBackupHistory();
    const snippet = getGoogleAppsScriptSnippet();

    return NextResponse.json({
      success: true,
      spreadsheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
      hasServiceAccount: !!client,
      appsScriptConfigured: !!process.env.GOOGLE_APPS_SCRIPT_URL,
      history,
      snippet,
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
    const body = await req.json().catch(() => ({}));
    const adminUser = session.username || body.adminUser || "admin";

    const result = await performGoogleSheetBackup(adminUser);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Quyền truy cập bị từ chối" }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
