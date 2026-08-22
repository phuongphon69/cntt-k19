// components/attendance/matrix-table.tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Search, User, ArrowUpDown, Info, AlertTriangle } from "lucide-react";
import { ParsedAttendanceSheet } from "@/lib/attendance/parser";
import { StudentAttendanceRecord, Subject } from "@/types";
import { AttendanceBadge } from "@/components/attendance-badge";
import { StudentDrawer, SessionDetailData } from "@/components/student-drawer";
import { normalizeVietnameseNameWithoutAccent } from "@/lib/vietnamese/normalize";

interface MatrixTableProps {
  subject: Subject;
  attendanceData: ParsedAttendanceSheet;
}

export function MatrixTable({ subject, attendanceData }: MatrixTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"default" | "name" | "rate">("default");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [activeDrawer, setActiveDrawer] = useState<SessionDetailData | null>(null);

  const cleanQ = normalizeVietnameseNameWithoutAccent(searchQuery);

  // Filter records
  let records = attendanceData.records.filter((r) => {
    if (!cleanQ) return true;
    return normalizeVietnameseNameWithoutAccent(r.studentName).includes(cleanQ);
  });

  // Sort records
  if (sortBy === "rate") {
    records = [...records].sort((a, b) => {
      const diff = a.attendanceRate - b.attendanceRate;
      return sortOrder === "asc" ? diff : -diff;
    });
  } else if (sortBy === "name") {
    records = [...records].sort((a, b) => {
      const diff = a.studentName.localeCompare(b.studentName);
      return sortOrder === "asc" ? diff : -diff;
    });
  }

  const handleCellClick = (record: StudentAttendanceRecord, date: string) => {
    const sess = record.sessions[date];
    if (!sess) return;

    setActiveDrawer({
      isOpen: true,
      studentName: record.studentName,
      subjectName: subject.name,
      date,
      round1: sess.round1,
      round2: sess.round2,
      round3: sess.round3,
      rate: sess.rate,
      displayText: sess.isRecorded ? `${sess.rate}%` : "--",
      isRecorded: sess.isRecorded,
    });
  };

  const toggleSort = (type: "name" | "rate") => {
    if (sortBy === type) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(type);
      setSortOrder("desc");
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm tên học viên trong bảng..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-white"
          />
        </div>

        {/* Sort Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => toggleSort("rate")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
              sortBy === "rate"
                ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
            }`}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>Xếp theo Chuyên cần</span>
          </button>

          <button
            type="button"
            onClick={() => toggleSort("name")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
              sortBy === "name"
                ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Xếp theo Tên</span>
          </button>
        </div>
      </div>

      {/* Guide Note */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs border border-indigo-100 dark:border-indigo-900/60">
        <Info className="w-4 h-4 shrink-0" />
        <span>
          Bấm vào từng ô kết quả buổi học (ví dụ <strong>3/3</strong> hoặc <strong>2/3</strong>) để xem chi tiết kết quả của từng Lần điểm danh.
        </span>
      </div>

      {/* Attendance Matrix Table */}
      <div className="relative rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-w-full">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                {/* Sticky Student Column */}
                <th className="sticky left-0 z-20 bg-slate-50 dark:bg-slate-800 p-3.5 min-w-[180px] sm:min-w-[220px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] border-r border-slate-200 dark:border-slate-800">
                  Học viên ({records.length})
                </th>

                {/* Session Dates Columns */}
                {attendanceData.sessions.map((sess) => (
                  <th
                    key={sess.index}
                    className="p-3 text-center min-w-[70px] whitespace-nowrap border-r border-slate-100 dark:border-slate-800/60 font-semibold"
                  >
                    <div className="text-[10px] text-indigo-600 dark:text-indigo-400 uppercase">
                      B{sess.index}
                    </div>
                    <div className="text-slate-800 dark:text-slate-200 mt-0.5">
                      {sess.date}
                    </div>
                  </th>
                ))}

                {/* Total Stats Columns */}
                <th className="p-3 text-center min-w-[65px] font-bold text-slate-700 dark:text-slate-300">
                  Tổng X
                </th>
                <th className="p-3 text-center min-w-[65px] font-bold text-slate-700 dark:text-slate-300">
                  Tổng P
                </th>
                <th className="p-3 text-center min-w-[65px] font-bold text-slate-700 dark:text-slate-300">
                  Tổng M
                </th>
                <th className="p-3.5 text-center min-w-[85px] font-extrabold text-indigo-700 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/30">
                  Chuyên cần
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {records.map((rec, idx) => {
                const isWarning = rec.warning && rec.recordedSessions > 0;

                return (
                  <tr
                    key={rec.studentId || idx}
                    className={`hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-colors ${
                      isWarning ? "bg-rose-50/30 dark:bg-rose-950/10" : ""
                    }`}
                  >
                    {/* Sticky Student Name Cell */}
                    <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 p-3 font-semibold text-slate-900 dark:text-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] border-r border-slate-100 dark:border-slate-800">
                      <Link
                        href={`/students/${rec.studentId}`}
                        className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline flex items-center justify-between gap-2"
                      >
                        <span className="truncate">{rec.studentName}</span>
                        {isWarning && (
                          <span title="Chuyên cần dưới ngưỡng">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          </span>
                        )}
                      </Link>
                      <div className="text-[10px] text-slate-400 font-normal mt-0.5 space-y-0.5">
                        <div className="flex items-center gap-2">
                          {rec.dateOfBirth && <span>NS: {rec.dateOfBirth}</span>}
                          {rec.studySystem && <span>Hệ: {rec.studySystem}</span>}
                        </div>
                        {rec.dateJoinedGroup && (
                          <div className="text-indigo-600 dark:text-indigo-400 font-medium">
                            Vào lớp: {rec.dateJoinedGroup}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Session Cells */}
                    {attendanceData.sessions.map((sess) => {
                      const sessionRecord = rec.sessions[sess.date];
                      const countText = sessionRecord?.isRecorded ? `${sessionRecord.rate >= 100 ? "3/3" : sessionRecord.rate >= 66 ? "2/3" : sessionRecord.rate > 0 ? "1/3" : "0/3"}` : "--";
                      const rate = sessionRecord?.rate;

                      return (
                        <td
                          key={sess.index}
                          className="p-2 text-center border-r border-slate-50 dark:border-slate-800/40"
                        >
                          <AttendanceBadge
                            countText={countText}
                            rate={rate}
                            isApplicable={rec.isApplicable}
                            onClick={() => handleCellClick(rec, sess.date)}
                          />
                        </td>
                      );
                    })}

                    {/* Summary Values */}
                    <td className="p-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                      {rec.totalX}
                    </td>
                    <td className="p-3 text-center font-medium text-sky-600 dark:text-sky-400">
                      {rec.totalP}
                    </td>
                    <td className="p-3 text-center font-medium text-amber-600 dark:text-amber-400">
                      {rec.totalM}
                    </td>
                    <td className="p-3 text-center font-black bg-indigo-50/50 dark:bg-indigo-950/30">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-xs ${
                          rec.attendanceRate >= 80
                            ? "text-emerald-700 dark:text-emerald-300 font-extrabold"
                            : rec.recordedSessions === 0
                            ? "text-slate-400"
                            : "text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/50"
                        }`}
                      >
                        {rec.recordedSessions > 0 ? `${rec.attendanceRate}%` : "--"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <StudentDrawer data={activeDrawer} onClose={() => setActiveDrawer(null)} />
    </div>
  );
}
