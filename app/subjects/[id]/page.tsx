// app/subjects/[id]/page.tsx
import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, BookOpen, User, Calendar, Percent } from "lucide-react";
import { getSubjects, getAttendanceSheetData } from "@/lib/google-sheets/reader";
import { MatrixTable } from "@/components/attendance/matrix-table";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface SubjectDetailPageProps {
  params: { id: string };
}

export default async function SubjectDetailPage({ params }: SubjectDetailPageProps) {
  const { id } = params;
  const subjects = await getSubjects();
  const subject = subjects.find(
    (s) => s.id.toLowerCase() === id.toLowerCase() || s.code.toLowerCase() === id.toLowerCase()
  );

  if (!subject) {
    notFound();
  }

  const attendanceData = await getAttendanceSheetData(subject.attendanceSheet, true);

  return (
    <div className="container mx-auto px-4 sm:px-6 pt-6 space-y-6 max-w-7xl">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center gap-2">
        <Link
          href="/subjects"
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Danh sách môn học</span>
        </Link>
      </div>

      {/* Subject Header Banner */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              {subject.attendanceSheet}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {subject.name}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
              <User className="w-4 h-4 text-indigo-500" />
              Giảng viên: {subject.teacher}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 font-semibold text-indigo-600 dark:text-indigo-400">
              <BookOpen className="w-4 h-4" />
              Sĩ số: {attendanceData.records.length}/{attendanceData.totalClassStudents || subject.totalClassStudents || 43} học sinh
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              Quy mô: {subject.totalSessions} buổi ({attendanceData.sessions.length} buổi đã lên lịch)
            </span>
          </div>
        </div>

        {/* Chuyên cần badge */}
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60 flex items-center gap-4 min-w-[200px]">
          <div className="p-3 rounded-xl bg-emerald-500 text-white shadow-md shadow-emerald-500/20">
            <Percent className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              Chuyên cần trung bình
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {subject.averageAttendanceRate || 0}%
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Matrix Table */}
      <MatrixTable subject={subject} attendanceData={attendanceData} />
    </div>
  );
}
