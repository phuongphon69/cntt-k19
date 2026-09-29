// app/admin/backup/page.tsx
import React from "react";
import { Database } from "lucide-react";
import { getStudents, getSubjects } from "@/lib/google-sheets/reader";
import { getSpreadsheetId, getGoogleSheetsClient } from "@/lib/google-sheets/client";
import { getBackupHistory, getGoogleAppsScriptSnippet } from "@/lib/google-sheets/backup";
import { AdminBackupClient } from "@/components/admin/admin-backup-client";

export const dynamic = "force-dynamic";

export default async function AdminBackupPage() {
  const spreadsheetId = getSpreadsheetId();
  const client = getGoogleSheetsClient();
  const students = await getStudents();
  const subjects = await getSubjects();
  const history = getBackupHistory();
  const snippet = getGoogleAppsScriptSnippet();

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <Database className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Trung Tâm Sao Lưu Google Sheets
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Sao lưu toàn bộ kết quả điểm danh, tỷ lệ chuyên cần và danh sách lớp ra Google Sheet và các tệp định dạng chuẩn.
        </p>
      </div>

      <AdminBackupClient
        spreadsheetId={spreadsheetId}
        spreadsheetUrl={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}
        hasServiceAccount={!!client}
        appsScriptConfigured={!!process.env.GOOGLE_APPS_SCRIPT_URL}
        history={history}
        snippet={snippet}
        totalStudents={students.length}
        totalSubjects={subjects.length}
      />
    </div>
  );
}
