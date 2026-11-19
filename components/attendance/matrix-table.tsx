// components/attendance/matrix-table.tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  User,
  ArrowUpDown,
  Info,
  AlertTriangle,
  Database,
  Smartphone,
  Trash2,
  RefreshCw,
  Loader2,
  Check,
} from "lucide-react";
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
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"default" | "name" | "rate">("default");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [activeDrawer, setActiveDrawer] = useState<SessionDetailData | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<{ index: number; date: string } | null>(null);
  const [deletingSession, setDeletingSession] = useState(false);
  const [sessionDeleteMsg, setSessionDeleteMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

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

  const totalClassStudents = attendanceData.totalClassStudents || subject.totalClassStudents || 43;

  const handleSync = async () => {
    setIsRefreshing(true);
    setSyncMsg(null);
    try {
      const res = await fetch("/api/subjects/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetName: subject.attendanceSheet }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Đồng bộ thất bại");
      router.refresh();
      setSyncMsg({
        type: "success",
        text: json.throttled
          ? "Vừa đồng bộ xong, dữ liệu đang là mới nhất."
          : `Đã đồng bộ từ Google Sheet: ${json.students} học viên, ${json.sessions} buổi.`,
      });
    } catch (e: any) {
      setSyncMsg({ type: "error", text: e.message || "Đồng bộ thất bại" });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCellClick = (record: StudentAttendanceRecord, date: string) => {
    const sess = record.sessions[date];
    const isLateJoinMissed = sess?.status === "NOT_APPLICABLE";
    // Mỗi buổi chỉ tính 1 lần điểm danh: X = có mặt, còn lại không tính có mặt
    const mark = String(sess?.round1 || "").trim().toUpperCase();
    const isFullAttended = !!sess?.isRecorded && mark === "X";
    const is0of3 = !isFullAttended;
    const isAbsent1of3 = false;

    let displayText = "--";
    if (isLateJoinMissed) {
      displayText = "Thiếu buổi";
    } else if (is0of3) {
      displayText = "--";
    } else {
      displayText = sess?.isRecorded && mark ? mark : "--";
    }

    setActiveDrawer({
      isOpen: true,
      studentName: record.studentName,
      studentId: record.studentId,
      subjectName: subject.name,
      sheetName: subject.attendanceSheet,
      date,
      round1: sess?.round1 || "",
      round2: sess?.round2 || "",
      round3: sess?.round3 || "",
      rate: sess?.rate || 0,
      displayText,
      isRecorded: !isLateJoinMissed,
      isLateJoinMissed,
      isAbsent: is0of3 || isAbsent1of3,
      isFullAttendance: isFullAttended,
      note: isLateJoinMissed
        ? `Học viên vào lớp ngày ${record.dateJoinedGroup || "chưa rõ"} (sau ngày diễn ra buổi học ${date}) nên được ghi nhận là: Thiếu buổi (không tính vào tỷ lệ chuyên cần).`
        : isFullAttended
        ? "Có mặt: buổi học này được tính là có tham gia."
        : mark === "P"
        ? "Có phép: buổi học này không được tính là có mặt."
        : mark === "M"
        ? "Đi muộn: buổi học này không được tính là có mặt."
        : sess?.isRecorded
        ? "Vắng mặt buổi học này."
        : "Buổi học này chưa có kết quả điểm danh.",
    });
  };

  const handleConfirmDeleteSession = async () => {
    if (!sessionToDelete) return;
    setDeletingSession(true);
    setSessionDeleteMsg(null);
    try {
      const res = await fetch("/api/admin/attendance/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheetName: subject.attendanceSheet,
          sessionDate: sessionToDelete.date,
          mode: "session",
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSessionDeleteMsg({ type: "success", text: `Đã xóa toàn bộ điểm danh Buổi ${sessionToDelete.index} (${sessionToDelete.date})!` });
        setTimeout(() => {
          setSessionToDelete(null);
          setSessionDeleteMsg(null);
          router.refresh();
        }, 1200);
      } else {
        setSessionDeleteMsg({ type: "error", text: data.error || "Không thể xóa điểm danh buổi học" });
      }
    } catch (e: any) {
      setSessionDeleteMsg({ type: "error", text: "Lỗi kết nối máy chủ: " + (e?.message || e) });
    } finally {
      setDeletingSession(false);
    }
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

        {/* Sort & Actions */}
        <div className="flex flex-wrap items-center gap-2">
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

          <button
            type="button"
            disabled={isRefreshing}
            onClick={handleSync}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 shadow-xs transition-all cursor-pointer disabled:opacity-60"
            title="Đồng bộ kết quả điểm danh mới nhất từ Google Sheet"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-indigo-600" : ""}`} />
            <span>{isRefreshing ? "Đang đồng bộ..." : "Đồng bộ Google Sheet"}</span>
          </button>

          <Link
            href="/admin/backup"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition-all"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Sao Lưu Sheets</span>
          </Link>

          <div className="hidden sm:flex items-center px-3.5 py-2 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/50 border border-indigo-200/80 dark:border-indigo-800 text-xs font-bold text-indigo-700 dark:text-indigo-300 whitespace-nowrap">
            Sĩ số: {attendanceData.records.length} học sinh
          </div>
        </div>
      </div>

      {syncMsg && (
        <div
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
            syncMsg.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900"
              : "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900"
          }`}
        >
          {syncMsg.type === "success" ? <Check className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{syncMsg.text}</span>
        </div>
      )}

      {/* Guide Note & Mobile Swipe Hint */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs border border-indigo-100 dark:border-indigo-900/60">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0" />
          <span>
            Bấm vào từng ô kết quả buổi học (<strong>X</strong> có mặt, <strong>P</strong> phép, <strong>M</strong> muộn, <strong>V</strong> vắng) để xem chi tiết và sửa kết quả.
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] opacity-80 shrink-0">
          <Smartphone className="w-3.5 h-3.5 sm:hidden" />
          <span className="sm:hidden">Vuốt ngang bảng để xem các buổi (cột học viên được ghim cố định)</span>
        </div>
      </div>

      {/* Attendance Matrix Table */}
      <div className="relative rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-w-full">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                {/* Sticky Student Column */}
                <th className="sticky left-0 z-20 bg-slate-50 dark:bg-slate-800 p-3.5 min-w-[190px] sm:min-w-[240px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] border-r border-slate-200 dark:border-slate-800">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-extrabold text-slate-800 dark:text-slate-200">
                      Học viên ({records.length} học sinh)
                    </span>
                    {searchQuery && (
                      <span className="text-[10px] text-slate-400 font-normal">
                        (Khớp: {records.length}/{attendanceData.records.length})
                      </span>
                    )}
                  </div>
                </th>

                {/* Session Dates Columns */}
                {attendanceData.sessions.map((sess) => (
                  <th
                    key={sess.index}
                    className="p-3 text-center min-w-[85px] whitespace-nowrap border-r border-slate-100 dark:border-slate-800/60 font-semibold group relative"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-black uppercase tracking-tight">
                        B{sess.index}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSessionToDelete(sess);
                        }}
                        className="opacity-40 group-hover:opacity-100 text-slate-400 hover:text-rose-600 p-0.5 rounded transition-all cursor-pointer"
                        title={`Xóa kết quả điểm danh Buổi ${sess.index} (${sess.date})`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
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
                const isWarning = rec.isApplicable && rec.warning && rec.recordedSessions > 0;

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
                      const cleanTarget = (sess.date || "").replace(/[^0-9]/g, "");
                      let sessionRecord = rec.sessions[sess.date];
                      if (!sessionRecord && rec.sessions) {
                        for (const [key, val] of Object.entries(rec.sessions)) {
                          if (key.replace(/[^0-9]/g, "") === cleanTarget) {
                            sessionRecord = val;
                            break;
                          }
                        }
                      }

                      const isNotApplicable =
                        sessionRecord?.status === "NOT_APPLICABLE" || (!rec.isApplicable && !sessionRecord?.isRecorded);

                      if (isNotApplicable) {
                        return (
                          <td
                            key={sess.index}
                            className="p-2 text-center border-r border-slate-50 dark:border-slate-800/40"
                          >
                            <button
                              type="button"
                              onClick={() => handleCellClick(rec, sess.date)}
                              title={`Chưa vào lớp (vào lớp ngày ${rec.dateJoinedGroup || ""}), không tính buổi học ${sess.date}`}
                              className="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs text-slate-300 dark:text-slate-600 hover:text-slate-400 transition-colors cursor-pointer select-none"
                            >
                              –
                            </button>
                          </td>
                        );
                      }

                      const rounds = [sessionRecord?.round1];
                      const countX = rounds.filter((x) => (x || "").toUpperCase() === "X").length;
                      const hasMarks = rounds.some((x) => x && String(x).trim().length > 0);
                      const isUnrecorded = !sessionRecord?.isRecorded && !hasMarks;

                      const countText = isUnrecorded
                        ? "--"
                        : countX > 0
                        ? "X"
                        : rounds.some((x) => (x || "").toUpperCase() === "P")
                        ? "P"
                        : rounds.some((x) => (x || "").toUpperCase() === "M")
                        ? "M"
                        : "V";

                      const rate = sessionRecord?.rate ?? (countX > 0 ? 100 : 0);

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
                          !rec.isApplicable
                            ? "text-slate-400"
                            : rec.attendanceRate >= 80
                            ? "text-emerald-700 dark:text-emerald-300 font-extrabold"
                            : rec.recordedSessions === 0
                            ? "text-slate-400"
                            : "text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/50"
                        }`}
                      >
                        {!rec.isApplicable
                          ? "--"
                          : rec.recordedSessions > 0
                          ? `${rec.attendanceRate}%`
                          : "--"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <StudentDrawer
        data={activeDrawer}
        onClose={() => setActiveDrawer(null)}
        onUpdated={() => router.refresh()}
      />

      {/* Modal Confirm Delete Entire Session */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Xóa kết quả Buổi {sessionToDelete.index} ({sessionToDelete.date})?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Môn học: {subject.name}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-rose-50/50 dark:bg-rose-950/30 p-3.5 rounded-2xl border border-rose-100 dark:border-rose-900/40">
              Hành động này sẽ xóa trắng toàn bộ điểm danh (kết quả điểm danh) của tất cả <strong>{attendanceData.records.length} học viên</strong> trong buổi học ngày <strong>{sessionToDelete.date}</strong> trên Google Sheets.
            </p>

            {sessionDeleteMsg && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  sessionDeleteMsg.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300"
                }`}
              >
                {sessionDeleteMsg.type === "success" ? (
                  <Check className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span>{sessionDeleteMsg.text}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={deletingSession}
                onClick={() => setSessionToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={deletingSession}
                onClick={handleConfirmDeleteSession}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {deletingSession ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang xóa...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xác nhận xóa buổi này</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
