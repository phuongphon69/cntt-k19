// components/stats/stats-dashboard-client.tsx
"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  BarChart3,
  Users,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Search,
  Filter,
  ArrowUpDown,
  TrendingUp,
  User,
  ChevronRight,
  Sparkles,
  Award,
  AlertCircle,
  Hash,
  Percent,
} from "lucide-react";
import { ComprehensiveAttendanceReport, StudentComprehensiveStat, SubjectClassStat } from "@/lib/attendance/stats";
import { normalizeVietnameseNameWithoutAccent } from "@/lib/vietnamese/normalize";

interface StatsDashboardClientProps {
  report: ComprehensiveAttendanceReport;
}

export function StatsDashboardClient({ report }: StatsDashboardClientProps) {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "GOOD" | "WARNING">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"STT" | "RATE_DESC" | "RATE_ASC">("STT");
  const [displayMode, setDisplayMode] = useState<"fraction" | "percent">("fraction");

  const cleanQ = normalizeVietnameseNameWithoutAccent(searchQuery);

  // Filter and Sort Students
  const filteredStudents = useMemo(() => {
    return report.studentStats.filter((s) => {
      // 1. Search Query
      if (cleanQ) {
        const nameNoAccent = normalizeVietnameseNameWithoutAccent(s.student.fullName);
        const dob = s.student.dateOfBirth || "";
        const stt = String(s.student.stt || "");
        if (!nameNoAccent.includes(cleanQ) && !dob.includes(cleanQ) && !stt.includes(cleanQ)) {
          return false;
        }
      }

      // 2. Status Filter
      if (statusFilter === "WARNING") {
        if (selectedSubjectId === "ALL") {
          if (!s.overallWarning) return false;
        } else {
          const subStat = s.subjects.find((sub) => sub.subjectId === selectedSubjectId);
          if (!subStat || !subStat.warning) return false;
        }
      } else if (statusFilter === "GOOD") {
        if (selectedSubjectId === "ALL") {
          if (s.overallWarning || s.totalSlotsAllSubjects === 0) return false;
        } else {
          const subStat = s.subjects.find((sub) => sub.subjectId === selectedSubjectId);
          if (!subStat || subStat.warning || !subStat.isApplicable || subStat.recordedSessions === 0) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === "RATE_DESC") {
        const rateA = selectedSubjectId === "ALL"
          ? a.overallAttendanceRate
          : a.subjects.find((sub) => sub.subjectId === selectedSubjectId)?.attendanceRate || 0;
        const rateB = selectedSubjectId === "ALL"
          ? b.overallAttendanceRate
          : b.subjects.find((sub) => sub.subjectId === selectedSubjectId)?.attendanceRate || 0;
        return rateB - rateA;
      } else if (sortBy === "RATE_ASC") {
        const rateA = selectedSubjectId === "ALL"
          ? a.overallAttendanceRate
          : a.subjects.find((sub) => sub.subjectId === selectedSubjectId)?.attendanceRate || 0;
        const rateB = selectedSubjectId === "ALL"
          ? b.overallAttendanceRate
          : b.subjects.find((sub) => sub.subjectId === selectedSubjectId)?.attendanceRate || 0;
        return rateA - rateB;
      }
      return (a.student.stt || 0) - (b.student.stt || 0);
    });
  }, [report.studentStats, cleanQ, statusFilter, selectedSubjectId, sortBy]);

  // Selected subject object for focused view
  const currentSubject = report.subjectStats.find((s) => s.subjectId === selectedSubjectId);

  return (
    <div className="space-y-8">
      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Students */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {report.classTotalStudents}
            </div>
            <div className="text-xs text-slate-500 font-medium">Tổng số học sinh</div>
          </div>
        </div>

        {/* Overall Attendance Rate */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {report.averageClassAttendanceRate}%
            </div>
            <div className="text-xs text-slate-500 font-medium">Chuyên cần trung bình</div>
          </div>
        </div>

        {/* Good Students (>= 80%) */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {report.goodStudentsCount}
            </div>
            <div className="text-xs text-slate-500 font-medium">Chuyên cần tốt (≥ 80%)</div>
          </div>
        </div>

        {/* Warning Students (< 80%) */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {report.warningStudentsCount}
            </div>
            <div className="text-xs text-slate-500 font-medium">Cảnh báo chuyên cần (&lt; 80%)</div>
          </div>
        </div>
      </div>

      {/* Subject-by-Subject Overview Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Thống kê Chuyên cần theo Từng Môn học</span>
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            {report.subjectStats.length} môn học
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {report.subjectStats.map((sub) => (
            <div
              key={sub.subjectId}
              onClick={() => setSelectedSubjectId(selectedSubjectId === sub.subjectId ? "ALL" : sub.subjectId)}
              className={`p-5 rounded-3xl border transition-all cursor-pointer space-y-4 ${
                selectedSubjectId === sub.subjectId
                  ? "bg-indigo-50/70 dark:bg-indigo-950/50 border-indigo-500 dark:border-indigo-500 ring-2 ring-indigo-500/20 shadow-md"
                  : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 shadow-sm"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    {sub.subjectName}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">GV: {sub.teacher}</p>
                </div>
                <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300">
                  {sub.averageRate}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      sub.averageRate >= 80 ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                    style={{ width: `${Math.min(100, sub.averageRate)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span>Đã học: {sub.recordedSessions}/{sub.totalSessions} buổi</span>
                  <span>{sub.perfectStudentsCount} bạn 100%</span>
                </div>
              </div>

              {sub.warningStudentsCount > 0 && (
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{sub.warningStudentsCount} học sinh có nguy cơ cảnh báo</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Student Attendance Table */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Bảng Thống kê Chi tiết Từng Học sinh (Số buổi / Tổng)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {selectedSubjectId === "ALL"
                ? "Hiển thị số buổi có mặt trên tổng số buổi đã học (ví dụ: 10/11)"
                : `Đang lọc riêng môn: ${currentSubject?.subjectName}`}
            </p>
          </div>

          {/* Toggle Display Mode: Fraction (10/11) vs Percent (%) */}
          <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setDisplayMode("fraction")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                displayMode === "fraction"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Hash className="w-3.5 h-3.5" />
              <span>Số buổi (ví dụ: 10/11)</span>
            </button>

            <button
              type="button"
              onClick={() => setDisplayMode("percent")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                displayMode === "percent"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Percent className="w-3.5 h-3.5" />
              <span>Phần trăm %</span>
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên học sinh, STT, ngày sinh..."
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border outline-none text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Subject Selector */}
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs">
              <BookOpen className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="bg-transparent border-none outline-none font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <option value="ALL">Tất cả môn ({report.subjectStats.length})</option>
                {report.subjectStats.map((s) => (
                  <option key={s.subjectId} value={s.subjectId}>
                    {s.subjectName}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  statusFilter === "ALL"
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("GOOD")}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  statusFilter === "GOOD"
                    ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                ≥ 80% (Tốt)
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("WARNING")}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  statusFilter === "WARNING"
                    ? "bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                &lt; 80% (Cảnh báo)
              </button>
            </div>

            {/* Sort Options */}
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent border-none outline-none font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <option value="STT">Sắp xếp: Theo STT</option>
                <option value="RATE_DESC">Sắp xếp: Chuyên cần cao nhất</option>
                <option value="RATE_ASC">Sắp xếp: Chuyên cần thấp nhất</option>
              </select>
            </div>
          </div>
        </div>

        {/* Detailed Table */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                  <th className="p-3.5 text-center w-12">STT</th>
                  <th className="p-3.5">Học sinh</th>
                  <th className="p-3.5">Hệ học</th>
                  {selectedSubjectId === "ALL" ? (
                    <>
                      {report.subjectStats.map((sub) => (
                        <th key={sub.subjectId} className="p-3.5 text-center">
                          {sub.subjectName}
                        </th>
                      ))}
                      <th className="p-3.5 text-center font-black text-indigo-600 dark:text-indigo-400">
                        Tổng hợp
                      </th>
                    </>
                  ) : (
                    <>
                      <th className="p-3.5 text-center">Số buổi có mặt</th>
                      <th className="p-3.5 text-center">Có mặt (X)</th>
                      <th className="p-3.5 text-center">Có phép (P)</th>
                      <th className="p-3.5 text-center">Muộn (M)</th>
                      <th className="p-3.5 text-center">Vắng (V)</th>
                      <th className="p-3.5 text-center font-black">Tỷ lệ chuyên cần</th>
                      <th className="p-3.5 text-center">Đánh giá</th>
                    </>
                  )}
                  <th className="p-3.5 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((s, idx) => {
                    const subStat = s.subjects.find((sub) => sub.subjectId === selectedSubjectId);

                    return (
                      <tr key={s.student.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                        <td className="p-3.5 text-center font-bold text-slate-400">
                          {s.student.stt || idx + 1}
                        </td>

                        <td className="p-3.5">
                          <Link
                            href={`/students/${s.student.id}`}
                            className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1.5"
                          >
                            <span>{s.student.fullName}</span>
                            {s.overallWarning && (
                              <span title="Chuyên cần dưới 80%">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              </span>
                            )}
                          </Link>
                          <div className="text-[10px] text-slate-400 mt-0.5 space-y-0.5">
                            <div>NS: {s.student.dateOfBirth || "--"}</div>
                            {s.student.dateJoinedGroup && (
                              <div className="text-indigo-600 dark:text-indigo-400 font-medium">
                                Vào lớp: {s.student.dateJoinedGroup}
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-semibold text-[10px]">
                            {s.student.studySystem || "CQ"}
                          </span>
                        </td>

                        {selectedSubjectId === "ALL" ? (
                          <>
                            {s.subjects.map((subItem) => (
                              <td key={subItem.subjectId} className="p-3.5 text-center">
                                {!subItem.isApplicable ? (
                                  <span className="text-slate-400 text-[11px] italic">K/A</span>
                                ) : subItem.recordedSessions === 0 ? (
                                  <span className="text-slate-400 text-[11px]">--</span>
                                ) : (
                                  <div className="inline-flex flex-col items-center">
                                    <span
                                      className={`inline-block px-2 py-0.5 rounded-md font-extrabold text-[11px] ${
                                        subItem.warning
                                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300"
                                          : subItem.attendanceRate >= 90
                                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300"
                                          : "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300"
                                      }`}
                                    >
                                      {displayMode === "fraction"
                                        ? `${subItem.sessionFraction}`
                                        : `${subItem.attendanceRate}%`}
                                    </span>
                                    {displayMode === "fraction" && (
                                      <span className="text-[10px] text-slate-400 mt-0.5 font-mono">
                                        {subItem.attendanceRate}%
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>
                            ))}

                            <td className="p-3.5 text-center font-black">
                              <div className="inline-flex flex-col items-center">
                                <span
                                  className={`inline-block px-2.5 py-1 rounded-xl text-xs font-black ${
                                    s.overallWarning
                                      ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                      : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  }`}
                                >
                                  {displayMode === "fraction"
                                    ? `${s.overallSessionFraction}`
                                    : s.totalSlotsAllSubjects > 0
                                    ? `${s.overallAttendanceRate}%`
                                    : "--"}
                                </span>
                                {displayMode === "fraction" && s.totalSlotsAllSubjects > 0 && (
                                  <span className="text-[10px] text-slate-400 mt-0.5 font-mono">
                                    {s.overallAttendanceRate}%
                                  </span>
                                )}
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="p-3.5 text-center font-bold text-slate-800 dark:text-slate-200">
                              {subStat?.sessionFraction || "--"}
                            </td>
                            <td className="p-3.5 text-center font-bold text-emerald-600">
                              {subStat?.countX || 0}
                            </td>
                            <td className="p-3.5 text-center font-bold text-amber-600">
                              {subStat?.countP || 0}
                            </td>
                            <td className="p-3.5 text-center font-bold text-blue-600">
                              {subStat?.countM || 0}
                            </td>
                            <td className="p-3.5 text-center font-bold text-rose-600">
                              {subStat?.countAbsent || 0}
                            </td>
                            <td className="p-3.5 text-center">
                              {!subStat?.isApplicable ? (
                                <span className="text-slate-400 italic">Không áp dụng</span>
                              ) : subStat?.recordedSessions === 0 ? (
                                <span className="text-slate-400">Chưa ghi nhận</span>
                              ) : (
                                <span
                                  className={`inline-block px-2.5 py-1 rounded-xl text-xs font-black ${
                                    subStat.warning
                                      ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                      : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  }`}
                                >
                                  {subStat.attendanceRate}%
                                </span>
                              )}
                            </td>
                            <td className="p-3.5 text-center">
                              {!subStat?.isApplicable ? (
                                <span className="text-slate-400 text-[11px]">--</span>
                              ) : subStat?.warning ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>Cảnh báo</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Đạt</span>
                                </span>
                              )}
                            </td>
                          </>
                        )}

                        <td className="p-3.5 text-right">
                          <Link
                            href={`/students/${s.student.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                          >
                            <span>Xem</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="p-12 text-center text-slate-400 text-sm">
                      Không tìm thấy học sinh nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
