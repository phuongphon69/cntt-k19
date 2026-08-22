// app/admin/subjects/page.tsx
import React from "react";
import Link from "next/link";
import { BookOpen, Plus, ExternalLink, Calendar, User, ChevronRight } from "lucide-react";
import { getSubjects } from "@/lib/google-sheets/reader";

export const dynamic = "force-dynamic";

export default async function AdminSubjectsPage() {
  const subjects = await getSubjects();

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Quản lý Môn học
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Quản lý các môn đang mở, tạo môn mới và tự động tạo sheet điểm danh từ template chuẩn.
          </p>
        </div>

        <Link
          href="/admin/subjects/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-500/20 active:scale-95 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>THÊM MÔN HỌC MỚI</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.map((sub) => (
          <div
            key={sub.id}
            className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                  {sub.attendanceSheet}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {sub.status}
                </span>
              </div>

              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">{sub.name}</h3>
                <div className="text-xs text-slate-500 mt-1 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>GV: {sub.teacher}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Quy mô: {sub.totalSessions} buổi ({sub.recordedSessionsCount || 0} buổi đã điểm danh)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <Link
                href={`/subjects/${sub.id}`}
                target="_blank"
                className="text-xs font-semibold text-slate-500 hover:text-indigo-600 flex items-center gap-1"
              >
                <span>Xem ma trận</span>
                <ExternalLink className="w-3 h-3" />
              </Link>

              <Link
                href={`/admin/attendance/zoom`}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 transition-colors"
              >
                Điểm danh
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
