// components/attendance/student-profile-client.tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronRight, Calendar } from "lucide-react";
import { Student, Subject, StudentAttendanceRecord } from "@/types";
import { AttendanceBadge } from "@/components/attendance-badge";
import { StudentDrawer, SessionDetailData } from "@/components/student-drawer";

interface StudentProfileClientProps {
  student: Student;
  subjectList: {
    subject: Subject;
    sheetSessions: { index: number; date: string }[];
    record?: StudentAttendanceRecord;
  }[];
}

export function StudentProfileClient({ student, subjectList }: StudentProfileClientProps) {
  const [activeDrawer, setActiveDrawer] = useState<SessionDetailData | null>(null);

  const handleBadgeClick = (sub: Subject, date: string, sessRecord: any) => {
    if (!sessRecord) return;
    const is0of3 = !sessRecord.isRecorded || sessRecord.rate === 0;
    const isAbsent1of3 = sessRecord.isRecorded && sessRecord.rate > 0 && sessRecord.rate < 66;
    const isFullAttended = sessRecord.isRecorded && sessRecord.rate >= 66;

    let displayText = "--";
    if (is0of3) {
      displayText = "--";
    } else {
      displayText = sessRecord.rate >= 100 ? "3/3" : sessRecord.rate >= 66 ? "2/3" : "1/3";
    }

    setActiveDrawer({
      isOpen: true,
      studentName: student.fullName,
      subjectName: sub.name,
      date,
      round1: sessRecord.round1,
      round2: sessRecord.round2,
      round3: sessRecord.round3,
      rate: sessRecord.rate,
      displayText,
      isRecorded: true,
      isAbsent: is0of3 || isAbsent1of3,
      isFullAttendance: isFullAttended,
      note: is0of3
        ? "Trường hợp 0/3 cũng là vắng mặt. Học viên không có mặt lần nào trong 3 lần điểm danh của buổi học này."
        : isAbsent1of3
        ? "Tính là vắng mặt ngày học này do chỉ có mặt 1/3 lần điểm danh (quy định yêu cầu có mặt từ 2/3 lần điểm danh trở lên mới được tính là có tham gia học đầy đủ)."
        : "Đạt điều kiện: Có mặt từ 2/3 lần điểm danh trở lên được tính ngày đó có tham gia học đầy đủ.",
    });
  };

  return (
    <div className="space-y-4">
      {subjectList.map(({ subject, sheetSessions, record }) => {
        const isEnrolled = record && record.isApplicable;
        const rate = isEnrolled ? record.attendanceRate : 0;

        return (
          <div
            key={subject.id}
            className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                    {subject.attendanceSheet}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                  {subject.name}
                </h3>
                <div className="text-xs text-slate-500 mt-0.5">
                  GV: {subject.teacher} • Số buổi: {subject.totalSessions}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-xs text-slate-400 font-medium">Chuyên cần môn</div>
                  <div
                    className={`text-xl font-extrabold ${
                      !isEnrolled
                        ? "text-slate-400"
                        : rate >= 80
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {!isEnrolled ? "Không áp dụng" : `${rate}%`}
                  </div>
                </div>

                <Link
                  href={`/subjects/${subject.id}`}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                  title="Xem toàn bộ ma trận lớp"
                >
                  <ChevronRight className="w-5 h-5" />
                </Link>
              </div>
            </div>

            {/* Sessions Badges */}
            {isEnrolled ? (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Chi tiết các buổi học:</span>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {sheetSessions.map((s) => {
                    const sessRec = record.sessions[s.date];
                    const isUnrecorded = !sessRec?.isRecorded || sessRec.rate === 0;
                    const countText = isUnrecorded
                      ? "--"
                      : sessRec.rate >= 100
                      ? "3/3"
                      : sessRec.rate >= 66
                      ? "2/3"
                      : "1/3";

                    return (
                      <div
                        key={s.index}
                        className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60"
                      >
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                          {s.date}:
                        </span>
                        <AttendanceBadge
                          countText={countText}
                          rate={sessRec?.rate}
                          onClick={() => handleBadgeClick(subject, s.date, sessRec)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-400 text-center italic">
                Học viên không nằm trong danh sách theo học môn này.
              </div>
            )}
          </div>
        );
      })}

      <StudentDrawer data={activeDrawer} onClose={() => setActiveDrawer(null)} />
    </div>
  );
}
