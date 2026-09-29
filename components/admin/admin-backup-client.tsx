// components/admin/admin-backup-client.tsx
"use client";

import React, { useState } from "react";
import {
  Database,
  CloudUpload,
  Download,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Clock,
  Users,
  BookOpen,
  Code2,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Smartphone,
  Laptop,
} from "lucide-react";
import { BackupRecord } from "@/lib/google-sheets/backup";

interface AdminBackupClientProps {
  spreadsheetId: string;
  spreadsheetUrl: string;
  hasServiceAccount: boolean;
  appsScriptConfigured: boolean;
  history: BackupRecord[];
  snippet: string;
  totalStudents: number;
  totalSubjects: number;
}

export function AdminBackupClient({
  spreadsheetId,
  spreadsheetUrl,
  hasServiceAccount,
  appsScriptConfigured,
  history: initialHistory,
  snippet,
  totalStudents,
  totalSubjects,
}: AdminBackupClientProps) {
  const [history, setHistory] = useState<BackupRecord[]>(initialHistory);
  const [backingUp, setBackingUp] = useState(false);
  const [copied, setCopied] = useState(false);
  const [resultMessage, setResultMessage] = useState<{
    type: "success" | "error";
    text: string;
    details?: string;
  } | null>(null);

  const handleBackupNow = async () => {
    setBackingUp(true);
    setResultMessage(null);
    try {
      const res = await fetch("/api/admin/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        setResultMessage({
          type: "success",
          text: data.writtenToGoogleSheets
            ? `Sao lưu thành công vào sheet [${data.destinationSheet}] trên Google Sheets!`
            : `Đã lưu trữ an toàn bản sao lưu điểm danh (${data.studentsCount} học viên, ${data.subjectsCount} môn)!`,
          details: data.writtenToGoogleSheets
            ? "Dữ liệu đã được ghi trực tiếp lên Google Spreadsheet của lớp."
            : "Bản sao lưu đã được bảo vệ trên hệ thống. Bạn có thể tải file CSV để mở trực tiếp trong Google Sheets.",
        });

        // Refresh history
        const histRes = await fetch("/api/admin/backup");
        const histData = await histRes.json();
        if (histData.history) {
          setHistory(histData.history);
        }
      } else {
        setResultMessage({
          type: "error",
          text: "Lỗi sao lưu: " + (data.error || "Không xác định"),
        });
      }
    } catch (e: any) {
      setResultMessage({
        type: "error",
        text: "Lỗi kết nối khi sao lưu dữ liệu điểm danh",
      });
    } finally {
      setBackingUp(false);
    }
  };

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const lastBackup = history[0];

  return (
    <div className="space-y-6">
      {/* Result Alert */}
      {resultMessage && (
        <div
          className={`p-4 sm:p-5 rounded-2xl border text-sm space-y-1.5 transition-all ${
            resultMessage.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
              : "bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200"
          }`}
        >
          <div className="flex items-center gap-2.5 font-bold">
            {resultMessage.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{resultMessage.text}</span>
          </div>
          {resultMessage.details && (
            <p className="text-xs opacity-90 pl-7">{resultMessage.details}</p>
          )}
        </div>
      )}

      {/* Main Backup Control Center */}
      <div className="p-5 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0 shadow-sm">
              <Database className="w-7 h-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                  Sao Lưu Điểm Danh Ra Google Sheet
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                  Sẵn sàng
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Tự động tổng hợp dữ liệu chuyên cần toàn khóa và đẩy lên Google Sheets hoặc tải về máy tính & điện thoại.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={spreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Mở Google Sheet</span>
            </a>

            <button
              type="button"
              onClick={handleBackupNow}
              disabled={backingUp}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
            >
              <CloudUpload className={`w-4 h-4 ${backingUp ? "animate-bounce" : ""}`} />
              <span>{backingUp ? "ĐANG SAO LƯU..." : "SAO LƯU LÊN GOOGLE SHEET"}</span>
            </button>
          </div>
        </div>

        {/* Quick Stat Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Google Sheet Status */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 space-y-1">
            <div className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
              <span>Đích đến Google Sheet</span>
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
              [SAO_LUU_DIEM_DANH]
            </div>
            <div className="text-[11px] text-slate-500">
              {hasServiceAccount
                ? "Ghi trực tiếp qua API"
                : appsScriptConfigured
                ? "Ghi qua Apps Script Webhook"
                : "Chế độ Public Gviz (sao lưu tải về)"}
            </div>
          </div>

          {/* Card 2: Last Backup Time */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 space-y-1">
            <div className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
              <span>Sao lưu gần nhất</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-sm font-extrabold text-slate-900 dark:text-white">
              {lastBackup ? lastBackup.formattedTime : "Chưa có bản ghi"}
            </div>
            <div className="text-[11px] text-slate-500">
              {lastBackup ? `Bởi: ${lastBackup.adminUser}` : "Bấm nút sao lưu bên trên"}
            </div>
          </div>

          {/* Card 3: Class Roster */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 space-y-1">
            <div className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
              <span>Quy mô dữ liệu</span>
              <Users className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-sm font-extrabold text-slate-900 dark:text-white">
              {totalStudents} học sinh • {totalSubjects} môn
            </div>
            <div className="text-[11px] text-slate-500">
              Bao gồm ngày vào lớp & thiếu buổi vào sau
            </div>
          </div>

          {/* Card 4: Multi-Device Ready */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 space-y-1">
            <div className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
              <span>Hỗ trợ thiết bị</span>
              <div className="flex items-center gap-1 text-indigo-500">
                <Laptop className="w-3.5 h-3.5" />
                <Smartphone className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-sm font-extrabold text-slate-900 dark:text-white">
              PC & Smartphone
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              Tối ưu 100% giao diện di động
            </div>
          </div>
        </div>

        {/* Download Action Strip */}
        <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-indigo-900 dark:text-indigo-200 space-y-0.5">
            <div className="font-extrabold flex items-center gap-1.5">
              <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Tải bản sao lưu về máy để mở trực tiếp trong Excel / Google Trang Tính:</span>
            </div>
            <div className="text-indigo-700/80 dark:text-indigo-300/80 text-[11px]">
              Tệp CSV chuẩn mã hóa UTF-8 BOM, đảm bảo hiển thị tiếng Việt hoàn hảo không bao giờ bị lỗi font.
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href="/api/admin/backup/download?format=csv"
              download
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải file Excel / CSV</span>
            </a>

            <a
              href="/api/admin/backup/download?format=json"
              download
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            >
              <span>JSON sao lưu</span>
            </a>
          </div>
        </div>
      </div>

      {/* Google Apps Script 1-Click Guide */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 shrink-0">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Kết Nối Ghi Tự Động Lên Google Sheets (Apps Script 1-Click)
              </h3>
              <p className="text-xs text-slate-500">
                Nếu bạn không sử dụng Google Cloud Service Account, bạn có thể kích hoạt Webhook chỉ trong 1 phút!
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopySnippet}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              copied
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Đã sao chép mã!" : "Sao chép mã Apps Script"}</span>
          </button>
        </div>

        {/* 3 Step Tutorial */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 space-y-1">
            <div className="font-bold text-indigo-600 dark:text-indigo-400">
              Bước 1: Mở Apps Script
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-[11px]">
              Vào file Google Sheets của lớp, chọn menu <strong>Tiện ích mở rộng (Extensions)</strong> &gt; <strong>Apps Script</strong>.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 space-y-1">
            <div className="font-bold text-indigo-600 dark:text-indigo-400">
              Bước 2: Dán mã &amp; Triển khai
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-[11px]">
              Dán đoạn mã trên vào, bấm <strong>Lưu (Ctrl+S)</strong> rồi bấm <strong>Triển khai (Deploy)</strong> &gt; <strong>Ứng dụng web mới</strong>.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 space-y-1">
            <div className="font-bold text-indigo-600 dark:text-indigo-400">
              Bước 3: Tận hưởng
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-[11px]">
              Mỗi khi bạn bấm <strong>Sao lưu lên Google Sheet</strong>, hệ thống sẽ tự động cập nhật ngay lập tức vào sheet của lớp!
            </p>
          </div>
        </div>

        {/* Snippet Code Viewer Preview */}
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 text-slate-200 text-xs font-mono max-h-48 overflow-y-auto p-4">
          <pre>{snippet}</pre>
        </div>
      </div>

      {/* Backup History Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            <span>Lịch Sử Các Lần Sao Lưu ({history.length} lần)</span>
          </h3>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            Chưa có lần sao lưu nào. Hãy bấm nút <strong>"Sao lưu lên Google Sheet"</strong> bên trên để tạo bản sao lưu đầu tiên!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold">
                  <th className="p-3">Thời gian</th>
                  <th className="p-3">Người thực hiện</th>
                  <th className="p-3">Học sinh</th>
                  <th className="p-3">Môn học</th>
                  <th className="p-3">Sheet đích</th>
                  <th className="p-3">Trạng thái</th>
                  <th className="p-3 text-right">Tải về</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {history.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="p-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                      {item.formattedTime}
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">
                      {item.adminUser}
                    </td>
                    <td className="p-3 font-medium text-slate-700 dark:text-slate-200">
                      {item.studentsCount} học viên
                    </td>
                    <td className="p-3 font-medium text-slate-700 dark:text-slate-200">
                      {item.subjectsCount} môn
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        [{item.destinationSheet}]
                      </span>
                    </td>
                    <td className="p-3">
                      {item.writtenToGoogleSheets ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Đã ghi Sheet
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                          Đã lưu cục bộ
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <a
                        href={`/api/admin/backup/download?format=json&id=${item.id}`}
                        download
                        className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold text-[11px]"
                      >
                        Tải JSON
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
