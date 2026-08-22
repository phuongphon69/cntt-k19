// components/admin/admin-sync-client.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  RefreshCw,
  FileSpreadsheet,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Shield,
  Clock,
  Sparkles,
  Database,
} from "lucide-react";

interface AdminSyncClientProps {
  spreadsheetId: string;
  sheetNames: string[];
  totalStudents: number;
  totalSubjects: number;
  totalSchedule: number;
  hasServiceAccount: boolean;
}

export function AdminSyncClient({
  spreadsheetId,
  sheetNames,
  totalStudents,
  totalSubjects,
  totalSchedule,
  hasServiceAccount,
}: AdminSyncClientProps) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

  const handlePullSync = async () => {
    setSyncing(true);
    setSyncSuccess(false);
    try {
      const res = await fetch("/api/admin/sync", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setSyncSuccess(true);
        setSyncMessage("Đã đồng bộ toàn bộ dữ liệu mới nhất từ Google Sheets về hệ thống!");
        setTimeout(() => setSyncSuccess(false), 4000);
        router.refresh();
      } else {
        alert("Lỗi đồng bộ: " + data.error);
      }
    } catch (e) {
      alert("Lỗi kết nối khi đồng bộ với Google Sheets");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      {syncSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{syncMessage}</span>
        </div>
      )}

      {/* Main Two-Way Sync Overview Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 shrink-0">
              <FileSpreadsheet className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  Đồng bộ Google Sheets 2 Chiều
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Đang hoạt động
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Mã bảng tính: <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px] font-mono">{spreadsheetId}</code>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Mở Google Sheet</span>
            </a>

            <button
              type="button"
              onClick={handlePullSync}
              disabled={syncing}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-500/20 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
              <span>{syncing ? "ĐANG ĐỒNG BỘ..." : "ĐỒNG BỘ NGAY TỨC THÌ"}</span>
            </button>
          </div>
        </div>

        {/* 2 Direction Channels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Channel 1: Google Sheets -> Web */}
          <div className="p-5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-3">
            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-extrabold text-sm">
              <ArrowDownLeft className="w-5 h-5 text-indigo-600" />
              <span>Chiều 1: Google Sheets ➔ Website</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Hệ thống tự động đọc và phân tích toàn bộ các sheet: danh sách học viên, thời khóa biểu và các bảng điểm danh môn học.
            </p>
            <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 pt-2 border-t border-indigo-100 dark:border-indigo-900/50">
              <div className="flex items-center justify-between">
                <span>Số sheet đã đọc:</span>
                <strong>{sheetNames.length} sheet</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Học sinh Active:</span>
                <strong>{totalStudents} học sinh</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Môn học điểm danh:</span>
                <strong>{totalSubjects} môn</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Buổi trong TKB:</span>
                <strong>{totalSchedule} buổi</strong>
              </div>
            </div>
          </div>

          {/* Channel 2: Web -> Google Sheets */}
          <div className="p-5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 space-y-3">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-extrabold text-sm">
              <ArrowUpRight className="w-5 h-5 text-emerald-600" />
              <span>Chiều 2: Website ➔ Google Sheets</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Tự động ghi kết quả điểm danh Zoom OCR, điểm danh thủ công, tạo sheet môn học mới và thêm học sinh trực tiếp vào Google Sheets.
            </p>
            <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 pt-2 border-t border-emerald-100 dark:border-emerald-900/50">
              <div className="flex items-center justify-between">
                <span>Trạng thái Ghi:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {hasServiceAccount ? "Sẵn sàng ghi trực tiếp" : "Chế độ Public Gviz"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Quy tắc ghi cell:</span>
                <strong>Chỉ ghi cell đích (F4, G4...)</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Bảo toàn công thức:</span>
                <strong>100% An toàn, không ghi đè</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sheets Breakdown Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden space-y-3 p-5">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
          <Database className="w-4 h-4 text-indigo-600" />
          <span>Danh sách các Sheet đang được đồng bộ trong Workbook</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-2">
          {sheetNames.map((sheet, i) => (
            <div
              key={sheet}
              className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700 flex items-center justify-between text-xs font-semibold"
            >
              <span className="truncate text-slate-800 dark:text-slate-200">[{sheet}]</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
