// components/student-drawer.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Calendar,
  User,
  BookOpen,
  CheckCircle,
  Clock,
  FileText,
  AlertCircle,
  Edit3,
  Trash2,
  Save,
  RotateCcw,
  Check,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { AttendanceBadge } from "./attendance-badge";
import { AttendanceValue } from "@/types";

export interface SessionDetailData {
  isOpen: boolean;
  studentName: string;
  studentId?: string;
  subjectName: string;
  sheetName?: string;
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
  onUpdated?: () => void;
}

export function StudentDrawer({ data, onClose, onUpdated }: StudentDrawerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [r1, setR1] = useState<AttendanceValue>("");
  const [r2, setR2] = useState<AttendanceValue>("");
  const [r3, setR3] = useState<AttendanceValue>("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Sync state whenever drawer opens for a student
  useEffect(() => {
    if (data && data.isOpen) {
      setR1(data.round1 || "");
      setR2(data.round2 || "");
      setR3(data.round3 || "");
      setIsEditing(false);
      setShowConfirmDelete(false);
      setFeedback(null);
    }
  }, [data]);

  if (!data || !data.isOpen) return null;

  // Compute live statistics for current edit state
  const editRounds = [r1, r2, r3];
  let liveCountX = 0;
  let liveCountP = 0;
  let liveCountM = 0;
  editRounds.forEach((v) => {
    const u = String(v || "").trim().toUpperCase();
    if (u === "X") liveCountX++;
    else if (u === "P") liveCountP++;
    else if (u === "M") liveCountM++;
  });
  const liveRate = Math.round((liveCountX / 3) * 100 * 10) / 10;
  const isAllEmpty = !r1 && !r2 && !r3;

  const handleSaveEdit = async () => {
    if (!data.sheetName || !data.date || !data.studentId) {
      setFeedback({ type: "error", message: "Thiếu thông tin nhận diện môn học hoặc học viên" });
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/attendance/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheetName: data.sheetName,
          sessionDate: data.date,
          studentId: data.studentId,
          round1: r1,
          round2: r2,
          round3: r3,
        }),
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        setFeedback({
          type: "success",
          message: "✓ Đã cập nhật kết quả điểm danh thành công!",
        });
        setIsEditing(false);
        if (onUpdated) onUpdated();
      } else {
        setFeedback({
          type: "error",
          message: resData.error || "Không thể lưu thay đổi vào hệ thống",
        });
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: "Lỗi kết nối máy chủ: " + (err?.message || err),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAttendance = async () => {
    if (!data.sheetName || !data.date || !data.studentId) {
      setFeedback({ type: "error", message: "Thiếu thông tin nhận diện môn học hoặc học viên" });
      return;
    }

    setDeleting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/attendance/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheetName: data.sheetName,
          sessionDate: data.date,
          studentId: data.studentId,
          mode: "student",
        }),
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        setR1("");
        setR2("");
        setR3("");
        setShowConfirmDelete(false);
        setIsEditing(false);
        setFeedback({
          type: "success",
          message: "✓ Đã xóa kết quả điểm danh của học viên trong buổi học này!",
        });
        if (onUpdated) onUpdated();
      } else {
        setFeedback({
          type: "error",
          message: resData.error || "Không thể xóa kết quả điểm danh",
        });
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: "Lỗi kết nối máy chủ: " + (err?.message || err),
      });
    } finally {
      setDeleting(false);
    }
  };

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
      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <AttendanceBadge value={u} />
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{text}</span>
        </div>
      </div>
    );
  }

  function renderRoundSelector(
    label: string,
    currentVal: AttendanceValue,
    onChange: (v: AttendanceValue) => void
  ) {
    const u = String(currentVal || "").trim().toUpperCase();
    const options: { val: AttendanceValue; label: string; desc: string; color: string; activeColor: string }[] = [
      {
        val: "X",
        label: "Có mặt (X)",
        desc: "Có mặt",
        color: "border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40",
        activeColor: "bg-emerald-600 text-white border-emerald-600 shadow-sm",
      },
      {
        val: "P",
        label: "Có phép (P)",
        desc: "Nghỉ phép",
        color: "border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-sky-950/40",
        activeColor: "bg-sky-600 text-white border-sky-600 shadow-sm",
      },
      {
        val: "M",
        label: "Muộn (M)",
        desc: "Đi muộn",
        color: "border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-amber-950/40",
        activeColor: "bg-amber-600 text-white border-amber-600 shadow-sm",
      },
      {
        val: "",
        label: "Trống / Xóa (-)",
        desc: "Xóa dấu",
        color: "border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
        activeColor: "bg-slate-600 text-white border-slate-600 shadow-sm",
      },
    ];

    return (
      <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
          <span>{label}</span>
          <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
            {u === "X" ? "Có mặt" : u === "P" ? "Có phép" : u === "M" ? "Muộn" : "Trống"}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {options.map((opt) => {
            const isActive = u === opt.val;
            return (
              <button
                key={opt.label}
                type="button"
                onClick={() => onChange(opt.val)}
                className={`py-1.5 px-1 text-[11px] font-bold rounded-lg border text-center transition-all cursor-pointer ${
                  isActive ? opt.activeColor : opt.color
                }`}
              >
                {opt.label}
              </button>
            );
          })}
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
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>{data.studentName}</span>
            </h3>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1 font-medium">
                <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                {data.subjectName}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-medium">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {data.date}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback message */}
        {feedback && (
          <div
            className={`px-5 py-2.5 text-xs font-semibold flex items-center gap-2 ${
              feedback.type === "success"
                ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-b border-emerald-100 dark:border-emerald-900/40"
                : "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-b border-rose-100 dark:border-rose-900/40"
            }`}
          >
            {feedback.type === "success" ? (
              <Check className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* EDIT MODE */}
          {isEditing ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Chỉnh sửa kết quả 3 lần điểm danh</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline font-medium"
                >
                  Hủy chỉnh sửa
                </button>
              </div>

              {renderRoundSelector("Lần 1 (Đầu buổi)", r1, setR1)}
              {renderRoundSelector("Lần 2 (Giữa buổi)", r2, setR2)}
              {renderRoundSelector("Lần 3 (Cuối buổi)", r3, setR3)}

              {/* Live Preview of Calculated Status */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">
                    Xem trước kết quả buổi học:
                  </div>
                  <div className="text-xs font-extrabold text-indigo-950 dark:text-indigo-200 mt-0.5">
                    {isAllEmpty
                      ? "Chưa ghi nhận (Trống)"
                      : liveCountX >= 2
                      ? "Có tham gia học đầy đủ"
                      : "Vắng mặt buổi học"}
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block px-2.5 py-1 rounded-lg text-xs font-black border ${
                      isAllEmpty
                        ? "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400"
                        : liveCountX >= 2
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300"
                    }`}
                  >
                    {isAllEmpty ? "--" : `${liveCountX}/3 (${liveRate}%)`}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* VIEW MODE */
            <div className="space-y-4">
              {data.isLateJoinMissed ? (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-2">
                  <div className="font-bold text-sm flex items-center gap-2 text-amber-800 dark:text-amber-300">
                    <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>Trạng thái: Thiếu buổi (Vào lớp sau)</span>
                  </div>
                  <p className="leading-relaxed">
                    {data.note ||
                      "Buổi học này diễn ra trước ngày học viên vào nhóm lớp, nên được ghi nhận là Thiếu buổi (không bị tính là vắng, không làm giảm tỷ lệ chuyên cần)."}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Chi tiết 3 lần điểm danh trong buổi
                    </h4>
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Sửa kết quả</span>
                    </button>
                  </div>
                  <div className="space-y-2">
                    {renderRoundRow("Lần 1 (Đầu buổi)", r1)}
                    {renderRoundRow("Lần 2 (Giữa buổi)", r2)}
                    {renderRoundRow("Lần 3 (Cuối buổi)", r3)}
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
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 space-y-2">
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
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 space-y-2">
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
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 space-y-2">
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
          )}

          {/* Delete confirmation box */}
          {showConfirmDelete && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-start gap-2.5 text-xs text-rose-900 dark:text-rose-200">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-sm text-rose-800 dark:text-rose-300">
                    Xác nhận xóa kết quả điểm danh?
                  </div>
                  <p className="mt-1 leading-relaxed">
                    Bạn có chắc muốn xóa toàn bộ kết quả điểm danh buổi ngày <strong>{data.date}</strong> của học viên{" "}
                    <strong>{data.studentName}</strong>? Dữ liệu các cột Lần 1, 2, 3 của học viên này sẽ được xóa trắng trên Google Sheets và hệ thống.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setShowConfirmDelete(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  Không xóa
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDeleteAttendance}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang xóa...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xác nhận xóa</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {!showConfirmDelete && (
              <button
                type="button"
                onClick={() => setShowConfirmDelete(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                title="Xóa kết quả điểm danh buổi này của học viên"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa kết quả</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveEdit}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Lưu thay đổi</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800/80 rounded-xl transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Sửa kết quả</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
