// app/subjects/page.tsx
import React from "react";
import Link from "next/link";
import { BookOpen, User, Calendar, Percent, ChevronRight } from "lucide-react";
import { getSubjects } from "@/lib/google-sheets/reader";

export const dynamic = "force-dynamic";

export default async function SubjectsPage() {
  const subjects = await getSubjects();

  return (
    <div className="container mx-auto px-4 sm:px-6 pt-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Danh sách môn học
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Theo dõi tiến độ buổi học và tỷ lệ chuyên cần theo từng môn của lớp CNTT - K19 CĐ
        </p>
      </div>

      {/* Grid of Subject Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subjects.map((sub) => {
          const progress =
            sub.totalSessions > 0
              ? Math.min(100, Math.round(((sub.recordedSessionsCount || 0) / sub.totalSessions) * 100))
              : 0;

          return (
            <Link
              key={sub.id}
              href={`/subjects/${sub.id}`}
              className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-700 transition-all flex flex-col justify-between group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                    {sub.attendanceSheet}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                    <Percent className="w-3 h-3" />
                    {sub.averageAttendanceRate || 0}% CC
                  </span>
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {sub.name}
                  </h2>
                  <div className="mt-2 space-y-1 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>Giảng viên: <strong className="text-slate-700 dark:text-slate-300">{sub.teacher}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                      <span>Sĩ số: <strong className="text-slate-700 dark:text-slate-300">{sub.enrolledStudentsCount || 24}/{sub.totalClassStudents || 43} học sinh</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Số buổi: {sub.totalSessions} buổi</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>Đã học: {sub.recordedSessionsCount || 0}/{sub.totalSessions} buổi</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="pt-2 flex items-center justify-end text-xs font-semibold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform">
                  <span>Xem bảng điểm danh</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
