// app/admin/page.tsx
import React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Camera,
  CheckSquare,
  Users,
  BookOpen,
  Calendar,
  Activity,
  FileSpreadsheet,
  ArrowRight,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { getWorkbookSheetNames, getStudents, getSubjects, getSchedule } from "@/lib/google-sheets/reader";
import { lastSyncTimestamp } from "@/lib/google-sheets/cache";
import { checkDataHealth } from "@/lib/data-health/checker";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const sheetNames = await getWorkbookSheetNames();
  const students = await getStudents();
  const subjects = await getSubjects();
  const schedule = await getSchedule();
  const health = await checkDataHealth();

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Khu vực Quản trị Hệ thống</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Bảng điều khiển Quản trị
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Quản lý điểm danh, ảnh Zoom OCR, thời khóa biểu và cấu hình dữ liệu lớp CNTT K19 CĐ
          </p>
        </div>

        {/* Quick Action: Điểm danh ngay */}
        <Link
          href="/admin/attendance/zoom"
          className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 shadow-lg shadow-indigo-500/25 active:scale-95 transition-all self-start sm:self-auto"
        >
          <Camera className="w-4 h-4" />
          <span>ĐIỂM DANH ZOOM NGAY</span>
        </Link>
      </div>

      {/* Google Sheets Connection Status Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base text-slate-900 dark:text-white">
                  Google Sheets Database
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Đã kết nối
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Spreadsheet ID: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[11px]">1nXlSGJq9DlsHsf4YFkw4ZiqQpZ2y8b4_h_EiHbhX9ec</code>
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-500">
            Lần đồng bộ gần nhất: <strong className="text-slate-700 dark:text-slate-300">{new Date(lastSyncTimestamp).toLocaleTimeString("vi-VN")}</strong>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 text-center">
            <div className="text-xs text-slate-500">Số sheet trong file</div>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{sheetNames.length}</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 text-center">
            <div className="text-xs text-slate-500">Số học viên (Active)</div>
            <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{students.length}</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 text-center">
            <div className="text-xs text-slate-500">Số môn học điểm danh</div>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{subjects.length}</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 text-center">
            <div className="text-xs text-slate-500">Buổi trong TKB</div>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{schedule.length}</div>
          </div>
        </div>
      </div>

      {/* Data Health & Quick Management Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Data Health Status */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Toàn vẹn Dữ liệu (Data Health)
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  health.healthy
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                }`}
              >
                {health.healthy ? "Hệ thống Tốt" : `${health.totalIssues} Lưu ý`}
              </span>
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Kiểm tra toàn vẹn Sheet & Học viên</span>
            </h3>

            <p className="text-xs text-slate-500 leading-relaxed">
              Tự động quét phát hiện các học viên chưa map, công thức Excel bị lỗi (#REF!), hoặc ngày học trùng lặp mà không làm thay đổi file gốc.
            </p>
          </div>

          <Link
            href="/admin/data-health"
            className="inline-flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
          >
            <span>Xem chi tiết báo cáo kiểm tra</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Quick Management Actions */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Truy cập nhanh
          </span>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <Link
              href="/admin/subjects"
              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 hover:border-indigo-300 transition-all text-left group"
            >
              <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mb-2 group-hover:scale-110 transition-transform" />
              <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">Thêm môn mới</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Tạo sheet & nạp SV</div>
            </Link>

            <Link
              href="/admin/schedule"
              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 hover:border-indigo-300 transition-all text-left group"
            >
              <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
              <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">Thời khóa biểu</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Tạo lịch lặp, nghỉ/bù</div>
            </Link>

            <Link
              href="/admin/attendance/manual"
              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 hover:border-indigo-300 transition-all text-left group"
            >
              <CheckSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
              <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">Điểm danh tay</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Nhập X / P / M</div>
            </Link>

            <Link
              href="/admin/students"
              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 hover:border-indigo-300 transition-all text-left group"
            >
              <Users className="w-5 h-5 text-sky-600 dark:text-sky-400 mb-2 group-hover:scale-110 transition-transform" />
              <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">Học viên</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Sửa thông tin, active</div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
