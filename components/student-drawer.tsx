// components/student-drawer.tsx
"use client";

import React from "react";
import { X, Calendar, User, BookOpen, CheckCircle, Clock, FileText, AlertCircle } from "lucide-react";
import { AttendanceBadge } from "./attendance-badge";
import { AttendanceValue } from "@/types";

export interface SessionDetailData {
  isOpen: boolean;
  studentName: string;
  subjectName: string;
  date: string;
  round1: AttendanceValue;
  round2: AttendanceValue;
  round3: AttendanceValue;
  rate: number;
  displayText: string;
  isRecorded: boolean;
  isLateJoinMissed?: boolean;
  isAbsent?: boolean;
  isFullAttendance?: boolean;
  note?: string;
}

interface StudentDrawerProps {
  data: SessionDetailData | null;
  onClose: () => void;
}

export function StudentDrawer({ data, onClose }: StudentDrawerProps) {
  if (!data || !data.isOpen) return null;

  function renderRoundRow(label: string, val: AttendanceValue) {
    const u = String(val || "").trim().toUpperCase();
    let text = "Chưa ghi nhận";
    let icon = <AlertCircle className="w-4 h-4 text-slate-400" />;

    if (u === "X") {
      text = "Có mặt";
      icon = <CheckCircle className="w-4 h-4 text-emerald-500" />;
    } else if (u === "P") {
      text = "Nghỉ có phép";
      icon = <FileText className="w-4 h-4 text-sky-500" />;
    } else if (u === "M") {
      text = "Muộn";
      icon = <Clock className="w-4 h-4 text-amber-500" />;
    } else if (u === "V" || u === "K") {
      text = "Vắng mặt";
      icon = <X className="w-4 h-4 text-rose-500" />;
    }

    return (
      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <AttendanceBadge value={u} />
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{text}</span>
        </div>
      </div>
    );
  }

  const is0of3 = !data.isRecorded || data.rate === 0;
  const is1of3 = !is0of3 && data.rate < 66; // 1/3
  const isFullAttended = !is0of3 && data.rate >= 66; // 2/3 hoặc 3/3

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              {data.studentName}
            </h3>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5" />
                {data.subjectName}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {data.date}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {data.isLateJoinMissed ? (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-2">
              <div className="font-bold text-sm flex items-center gap-2 text-amber-800 dark:text-amber-300">
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Trạng thái: Thiếu buổi (Vào lớp sau)</span>
              </div>
              <p className="leading-relaxed">
                {data.note || "Buổi học này diễn ra trước ngày học viên vào nhóm lớp, nên được ghi nhận là Thiếu buổi (không bị tính là vắng, không làm giảm tỷ lệ chuyên cần)."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Chi tiết các lần điểm danh trong buổi
              </h4>
              <div className="space-y-2">
                {renderRoundRow("Lần 1", data.round1)}
                {renderRoundRow("Lần 2", data.round2)}
                {renderRoundRow("Lần 3", data.round3)}
              </div>
            </div>
          )}

          {/* Session Summary Card */}
          {data.isLateJoinMissed ? (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                  Tổng kết buổi học
                </div>
                <div className="text-xs text-amber-700/80 dark:text-amber-400 mt-0.5">
                  Thiếu buổi (vào lớp sau ngày học)
                </div>
              </div>
              <span className="text-lg font-black text-amber-700 dark:text-amber-300">
                Thiếu buổi
              </span>
            </div>
          ) : is0of3 ? (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-rose-500"></span>
                    <span>Tổng kết buổi học: Vắng mặt</span>
                  </div>
                  <div className="text-xs text-rose-600/90 dark:text-rose-400 mt-0.5">
                    Có mặt: 0/3 lần điểm danh (0%)
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-200 border border-rose-300/80 dark:border-rose-800">
                    0/3 • Vắng mặt
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-rose-700/80 dark:text-rose-300 leading-relaxed border-t border-rose-200/60 dark:border-rose-900/60 pt-2">
                * Trường hợp 0/3 cũng là vắng mặt. Học viên không có mặt lần nào trong 3 lần điểm danh của buổi học này.
              </p>
            </div>
          ) : is1of3 ? (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-rose-500"></span>
                    <span>Tổng kết buổi học: Vắng mặt</span>
                  </div>
                  <div className="text-xs text-rose-600/90 dark:text-rose-400 mt-0.5">
                    Có mặt: 1/3 lần điểm danh ({data.rate}%)
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-200 border border-rose-300/80 dark:border-rose-800">
                    1/3 • Vắng mặt
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-rose-700/80 dark:text-rose-300 leading-relaxed border-t border-rose-200/60 dark:border-rose-900/60 pt-2">
                * Quy định: Cần có mặt từ 2/3 lần điểm danh trở lên mới được tính là có tham gia học đầy đủ. Trường hợp 1/3 được tính là vắng mặt buổi học này.
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Tổng kết buổi học: Có tham gia học đầy đủ</span>
                  </div>
                  <div className="text-xs text-emerald-700/80 dark:text-emerald-400 mt-0.5">
                    Tỷ lệ có mặt: {data.displayText || `${data.rate}%`} ({data.rate}%)
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border border-emerald-300/80 dark:border-emerald-800">
                    {data.displayText || "2/3"} • Đầy đủ
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300 leading-relaxed border-t border-emerald-200/60 dark:border-emerald-900/60 pt-2">
                * Đạt điều kiện: Có mặt từ 2/3 lần điểm danh trở lên được tính ngày đó có tham gia học đầy đủ.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 text-right">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
