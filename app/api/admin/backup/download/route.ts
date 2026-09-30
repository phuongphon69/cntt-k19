// app/api/admin/backup/download/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/session";
import { exportAttendanceCsv, getBackupHistory, getBackupDir } from "@/lib/google-sheets/backup";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdminSession();
    const searchParams = req.nextUrl.searchParams;
    const format = searchParams.get("format") || "csv";
    const backupId = searchParams.get("id");

    const now = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

    if (format === "json") {
      const backupDir = getBackupDir();
      if (backupId) {
        const filePath = path.join(backupDir, `${backupId}.json`);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, "utf-8");
          return new NextResponse(content, {
            status: 200,
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              "Content-Disposition": `attachment; filename="backup_diem_danh_${backupId}.json"`,
            },
          });
        }
      }

      // If no specific backupId, return all backup history summary
      const history = getBackupHistory();
      return new NextResponse(JSON.stringify(history, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="backup_history_${now}.json"`,
        },
      });
    }

    // Default: CSV format with UTF-8 BOM
    const csvContent = await exportAttendanceCsv();
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="sao_luu_diem_danh_cntt_k19_${now}.csv"`,
      },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Quyền truy cập bị từ chối" }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
