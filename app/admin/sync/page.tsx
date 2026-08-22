// app/admin/sync/page.tsx
import React from "react";
import { RefreshCw } from "lucide-react";
import { getWorkbookSheetNames, getStudents, getSubjects, getSchedule } from "@/lib/google-sheets/reader";
import { getSpreadsheetId, getGoogleSheetsClient } from "@/lib/google-sheets/client";
import { AdminSyncClient } from "@/components/admin/admin-sync-client";

export const dynamic = "force-dynamic";

export default async function AdminSyncPage() {
  const spreadsheetId = getSpreadsheetId();
  const sheetNames = await getWorkbookSheetNames();
  const students = await getStudents();
  const subjects = await getSubjects();
  const schedule = await getSchedule();
  const client = getGoogleSheetsClient();

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Trung Tâm Đồng Bộ Google Sheets 2 Chiều
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Theo dõi trạng thái đọc/ghi dữ liệu thời gian thực giữa Website và Google Spreadsheet.
        </p>
      </div>

      <AdminSyncClient
        spreadsheetId={spreadsheetId}
        sheetNames={sheetNames}
        totalStudents={students.length}
        totalSubjects={subjects.length}
        totalSchedule={schedule.length}
        hasServiceAccount={!!client}
      />
    </div>
  );
}
