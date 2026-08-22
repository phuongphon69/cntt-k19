// app/admin/logs/page.tsx
import React from "react";
import { FileText, Shield, Clock } from "lucide-react";
import { AuditLog } from "@/types";

export const dynamic = "force-dynamic";

export default async function AdminLogsPage() {
  const sampleLogs: AuditLog[] = [
    {
      id: "log-1",
      timestamp: new Date().toISOString(),
      admin: "admin",
      action: "WRITE_ATTENDANCE",
      entity: "DD TIẾNG ANH",
      entityId: "22/08/2026",
      metadata: { roundNumber: 1, updatedCount: 31 },
    },
    {
      id: "log-2",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      admin: "admin",
      action: "SYNC_SPREADSHEET",
      entity: "GOOGLE_SHEETS",
      entityId: "1nXlSGJq9DlsHsf4YFkw4ZiqQpZ2y8b4_h_EiHbhX9ec",
      metadata: { status: "SUCCESS" },
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Nhật ký Hoạt động (Audit Log)
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Lịch sử các thao tác cập nhật điểm danh, tạo môn học và đồng bộ dữ liệu của Quản trị viên.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-bold border-b">
                <th className="p-3.5">Thời gian</th>
                <th className="p-3.5">Quản trị viên</th>
                <th className="p-3.5">Hành động</th>
                <th className="p-3.5">Đối tượng</th>
                <th className="p-3.5">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sampleLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50">
                  <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                    {new Date(log.timestamp).toLocaleString("vi-VN")}
                  </td>
                  <td className="p-3.5 font-bold text-slate-900 dark:text-white">{log.admin}</td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold text-[10px]">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3.5 font-semibold text-slate-700 dark:text-slate-300">{log.entity}</td>
                  <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                    {JSON.stringify(log.metadata)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
