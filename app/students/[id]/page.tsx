// app/students/[id]/page.tsx
import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, User, Calendar, Award, CheckCircle, Clock, FileText, BookOpen } from "lucide-react";
import { getStudents, getSubjects, getAttendanceSheetData } from "@/lib/google-sheets/reader";
import { StudentProfileClient } from "@/components/attendance/student-profile-client";

export const dynamic = "force-dynamic";

interface StudentDetailPageProps {
  params: { id: string };
}

export default async function StudentDetailPage({ params }: StudentDetailPageProps) {
  const { id } = params;
  const students = await getStudents();
  const student = students.find((s) => s.id === id || s.normalizedNameNoAccent === id);

  if (!student) {
    notFound();
  }

  // Load attendance across all subjects
  const subjects = await getSubjects();
  const subjectAttendanceList = [];

  let grandTotalX = 0;
  let grandTotalP = 0;
  let grandTotalM = 0;
  let grandRecordedSessions = 0;

  for (const sub of subjects) {
    const parsed = await getAttendanceSheetData(sub.attendanceSheet);
    const rec = parsed.records.find(
      (r) => r.studentId === student.id || r.studentName === student.fullName
    );

    if (rec) {
      grandTotalX += rec.totalX;
      grandTotalP += rec.totalP;
      grandTotalM += rec.totalM;
      grandRecordedSessions += rec.recordedSessions;
    }

    subjectAttendanceList.push({
      subject: sub,
      sheetSessions: parsed.sessions,
      record: rec,
    });
  }

  const overallRate =
    grandRecordedSessions > 0
      ? Math.round((grandTotalX / (grandRecordedSessions * 3)) * 100 * 10) / 10
      : 0;

  return (
    <div className="container mx-auto px-4 sm:px-6 pt-6 space-y-6 max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Trang chủ</span>
        </Link>
      </div>

      {/* Student Profile Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center font-extrabold text-xl shadow-lg shadow-indigo-500/20">
            {student.ten ? student.ten.charAt(0).toUpperCase() : "S"}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {student.fullName}
              </h1>
              {student.studySystem && (
                <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  Hệ {student.studySystem}
                </span>
              )}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              {student.dateOfBirth && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Ngày sinh: {student.dateOfBirth}
                </span>
              )}
              {student.dateJoinedGroup && (
                <span>• Ngày vào nhóm: {student.dateJoinedGroup}</span>
              )}
            </div>
          </div>
        </div>

        {/* Overall Attendance Stat Card */}
        <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-center gap-4 min-w-[200px]">
          <div className="p-3 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
              Chuyên cần chung
            </div>
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
              {overallRate}%
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards for Student */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 text-center">
          <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Tổng Có mặt (X)</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{grandTotalX} lượt</div>
        </div>
        <div className="p-4 rounded-2xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/40 text-center">
          <div className="text-xs font-semibold text-sky-700 dark:text-sky-400">Tổng Có phép (P)</div>
          <div className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-1">{grandTotalP} lượt</div>
        </div>
        <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 text-center">
          <div className="text-xs font-semibold text-amber-700 dark:text-amber-400">Tổng Muộn (M)</div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{grandTotalM} lượt</div>
        </div>
      </div>

      {/* Subject by Subject Breakdown */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <span>Điểm danh theo từng môn học</span>
        </h2>

        <StudentProfileClient student={student} subjectList={subjectAttendanceList} />
      </div>
    </div>
  );
}
