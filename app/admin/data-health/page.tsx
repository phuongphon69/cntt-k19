// app/admin/data-health/page.tsx
import React from "react";
import { Activity, CheckCircle2, AlertTriangle, Info, RefreshCw } from "lucide-react";
import { checkDataHealth } from "@/lib/data-health/checker";

export const dynamic = "force-dynamic";

export default async function DataHealthPage() {
  const report = await checkDataHealth();

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Kiểm tra Toàn vẹn Dữ liệu (Data Health)
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Hệ thống tự động quét và kiểm tra các lỗi công thức (#REF!, #VALUE!), học viên chưa liên kết, ngày trùng hoặc buổi học mồ côi. Hệ thống chỉ cảnh báo và KHÔNG tự ý ghi đè/sửa file Excel gốc.
        </p>
      </div>

      {/* Summary Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className={`p-3.5 rounded-2xl ${
              report.healthy
                ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400"
                : "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400"
            }`}
          >
            {report.healthy ? <CheckCircle2 className="w-7 h-7" /> : <AlertTriangle className="w-7 h-7" />}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {report.healthy
                ? "Tất cả dữ liệu Google Sheets đều hợp lệ"
                : `Phát hiện ${report.totalIssues} mục cần lưu ý`}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Lần quét: {new Date(report.timestamp).toLocaleString("vi-VN")}
            </p>
          </div>
        </div>
      </div>

      {/* Issues List */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Danh sách chi tiết các cảnh báo
        </h3>

        {report.issues.length === 0 ? (
          <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
            Không có vấn đề nào được phát hiện trong toàn bộ workbook!
          </div>
        ) : (
          <div className="space-y-3">
            {report.issues.map((item, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-start gap-3.5"
              >
                <div className="mt-0.5">
                  {item.type === "ERROR" ? (
                    <AlertTriangle className="w-5 h-5 text-rose-500" />
                  ) : item.type === "WARNING" ? (
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                  ) : (
                    <Info className="w-5 h-5 text-indigo-500" />
                  )}
                </div>

                <div className="space-y-1 flex-1 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.type === "ERROR"
                          ? "bg-rose-100 text-rose-800"
                          : item.type === "WARNING"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-indigo-100 text-indigo-800"
                      }`}
                    >
                      {item.code}
                    </span>
                    {item.sheetName && (
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        Sheet: [{item.sheetName}]
                      </span>
                    )}
                  </div>

                  <p className="font-medium text-slate-900 dark:text-slate-100">{item.message}</p>

                  {item.recommendation && (
                    <p className="text-slate-500 italic">Gợi ý: {item.recommendation}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
