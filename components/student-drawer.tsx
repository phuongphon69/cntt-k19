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

          {/* Session Summary Card */}
          <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                Tổng kết buổi học
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                {data.isRecorded ? `Tỷ lệ có mặt: ${data.rate}%` : "Chưa có dữ liệu"}
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                {data.displayText}
              </span>
            </div>
          </div>
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
