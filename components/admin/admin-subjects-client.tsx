// components/admin/admin-subjects-client.tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Plus,
  RefreshCw,
  Sparkles,
  ExternalLink,
  Calendar,
  User,
  Phone,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  X,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { Subject } from "@/types";

interface AdminSubjectsClientProps {
  subjects: Subject[];
}

export function AdminSubjectsClient({ subjects }: AdminSubjectsClientProps) {
  const router = useRouter();
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMode, setSyncMode] = useState<"accumulate" | "additive">("accumulate");
  const [syncResult, setSyncResult] = useState<any | null>(null);

  // Preview data
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<{
    previewNew: any[];
    previewExisting: any[];
  } | null>(null);

  const openSyncModal = async () => {
    setSyncModalOpen(true);
    setSyncResult(null);
    setPreviewLoading(true);
    try {
      const res = await fetch("/api/admin/subjects/sync-tkb");
      const data = await res.json();
      if (data.success) {
        setPreviewData({
          previewNew: data.previewNew || [],
          previewExisting: data.previewExisting || [],
        });
      }
    } catch (err) {
      console.warn("Failed to fetch preview:", err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleExecuteSync = async () => {
    setSyncLoading(true);
    try {
      const res = await fetch("/api/admin/subjects/sync-tkb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: syncMode }),
      });
      const data = await res.json();
      if (data.success) {
        setSyncResult(data);
        router.refresh();
      } else {
        alert("Lỗi khi đồng bộ: " + (data.error || "Không xác định"));
      }
    } catch (err: any) {
      alert("Lỗi kết nối khi đồng bộ: " + err.message);
    } finally {
      setSyncLoading(false);
    }
  };

  // Count items needing attention
  const tkbPendingSubjects = subjects.filter((s) => s.isFromTkb && !s.hasSheet);
  const tkbSubjectsWithMoreSessions = subjects.filter(
    (s) => s.tkbSessionsCount && s.tkbSessionsCount > s.totalSessions
  );

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Quản lý Môn học
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Quản lý các môn đang mở, tự động nhận diện môn mới từ Thời khóa biểu và cộng dồn số buổi học.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {/* Nút Đồng bộ môn từ TKB */}
          <button
            type="button"
            onClick={openSyncModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-md shadow-indigo-500/20 active:scale-95 transition-all"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>ĐỒNG BỘ MÔN TỪ TKB</span>
          </button>

          {/* Nút Thêm Môn Mới thủ công */}
          <Link
            href="/admin/subjects/new"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>THÊM THỦ CÔNG</span>
          </Link>
        </div>
      </div>

      {/* Discovery Banner */}
      {(tkbPendingSubjects.length > 0 || tkbSubjectsWithMoreSessions.length > 0) && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-indigo-50 via-purple-50 to-sky-50 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-sky-950/30 border border-indigo-200/80 dark:border-indigo-800/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-sm shrink-0">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-extrabold text-indigo-950 dark:text-indigo-200">
                Phát hiện dữ liệu môn học mới từ Thời Khóa Biểu (TKB)
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {tkbPendingSubjects.length > 0 && (
                  <span>
                    Có <strong>{tkbPendingSubjects.length} môn mới</strong> ({tkbPendingSubjects.map((s) => s.name).join(", ")}) chưa có sheet điểm danh.{" "}
                  </span>
                )}
                {tkbSubjectsWithMoreSessions.length > 0 && (
                  <span>
                    Có <strong>{tkbSubjectsWithMoreSessions.length} môn</strong> ({tkbSubjectsWithMoreSessions.map((s) => s.name).join(", ")}) có số buổi trong TKB nhiều hơn quy mô hiện tại.
                  </span>
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openSyncModal}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm shrink-0 transition-all self-start sm:self-auto"
          >
            Đồng bộ ngay
          </button>
        </div>
      )}

      {/* Subjects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {subjects.map((sub) => {
          const isTkbOnly = sub.isFromTkb && !sub.hasSheet;

          return (
            <div
              key={sub.id}
              className={`p-5 rounded-3xl border shadow-sm space-y-4 flex flex-col justify-between transition-all ${
                isTkbOnly
                  ? "bg-gradient-to-b from-purple-50/60 via-white to-white dark:from-purple-950/30 dark:via-slate-900 dark:to-slate-900 border-purple-200 dark:border-purple-800"
                  : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                    {sub.attendanceSheet}
                  </span>

                  {isTkbOnly ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 uppercase tracking-wide">
                      TỪ TKB
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      {sub.status}
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">{sub.name}</h3>
                  <div className="text-xs text-slate-500 mt-1 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>GV: {sub.teacher}</span>
                    </div>

                    {sub.teacherPhone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>SĐT: {sub.teacherPhone}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        Sĩ số: <strong>{sub.enrolledStudentsCount || 24}/{sub.totalClassStudents || 43} học sinh</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        Quy mô: <strong>{sub.totalSessions} buổi</strong>
                        {sub.recordedSessionsCount !== undefined && sub.recordedSessionsCount > 0 ? (
                          <span> ({sub.recordedSessionsCount} buổi đã điểm danh)</span>
                        ) : null}
                      </span>
                    </div>

                    {sub.tkbSessionsCount && sub.tkbSessionsCount > sub.totalSessions && (
                      <div className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md">
                        <TrendingUp className="w-3 h-3" />
                        <span>TKB đã xếp: {sub.tkbSessionsCount} buổi (có thể cộng dồn)</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <Link
                  href={`/subjects/${sub.id}`}
                  target="_blank"
                  className="text-xs font-semibold text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition-colors"
                >
                  <span>Xem ma trận</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>

                {isTkbOnly ? (
                  <button
                    type="button"
                    onClick={openSyncModal}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/60 hover:bg-purple-200 transition-colors"
                  >
                    Tạo Sheet ngay
                  </button>
                ) : (
                  <Link
                    href={`/admin/attendance/zoom`}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 transition-colors"
                  >
                    Điểm danh
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sync Modal */}
      {syncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 max-w-xl w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Đồng bộ Môn học từ sheet "TKB"
                  </h3>
                  <p className="text-xs text-slate-500">
                    Bổ sung môn mới và tự động cộng dồn số buổi cho môn cũ
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSyncModalOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sync Result Banner */}
            {syncResult && (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{syncResult.message}</span>
                </div>

                {syncResult.newSubjectsAdded?.length > 0 && (
                  <div className="text-[11px] pl-6 space-y-0.5">
                    <strong>Môn mới đã bổ sung:</strong>
                    <ul className="list-disc pl-4 space-y-0.5 text-slate-700 dark:text-slate-300">
                      {syncResult.newSubjectsAdded.map((s: any) => (
                        <li key={s.id}>
                          {s.name} ({s.sessions} buổi) - GV: {s.teacher}
                          {s.createdOnSheet ? " [Đã tạo sheet trên Google Sheets]" : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {syncResult.existingSubjectsUpdated?.length > 0 && (
                  <div className="text-[11px] pl-6 space-y-0.5">
                    <strong>Môn cũ đã cộng dồn:</strong>
                    <ul className="list-disc pl-4 space-y-0.5 text-slate-700 dark:text-slate-300">
                      {syncResult.existingSubjectsUpdated.map((s: any) => (
                        <li key={s.id}>
                          {s.name}: {s.oldSessions} buổi ➔ <strong>{s.newSessions} buổi</strong> (+{s.addedSessions} buổi)
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Preview Section */}
            {previewLoading ? (
              <div className="py-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                <span>Đang quét sheet TKB để so khớp môn học...</span>
              </div>
            ) : previewData ? (
              <div className="space-y-4">
                {/* 1. Môn mới */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    1. Môn học mới phát hiện từ TKB ({previewData.previewNew.length})
                  </h4>
                  {previewData.previewNew.length > 0 ? (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {previewData.previewNew.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/60 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">
                              {item.name}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              GV: {item.teacher} • {item.sheetName}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                            {item.tkbSessions} buổi
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      Không có môn mới nào cần bổ sung.
                    </p>
                  )}
                </div>

                {/* 2. Môn cũ cộng dồn */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    2. Môn cũ cập nhật & cộng dồn số buổi ({previewData.previewExisting.length})
                  </h4>
                  {previewData.previewExisting.length > 0 ? (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {previewData.previewExisting.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">
                              {item.name}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Hiện tại: {item.oldSessions} buổi • TKB xếp: {item.tkbSessions} buổi
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">
                              ➔ {item.accumulatedSessions} buổi
                            </span>
                            {item.addedSessions > 0 && (
                              <div className="text-[10px] text-emerald-600 font-semibold">
                                (+{item.addedSessions} buổi)
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      Tất cả môn cũ đã đúng số buổi.
                    </p>
                  )}
                </div>

                {/* Chế độ cộng dồn */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-2.5">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Chế độ cộng dồn số buổi cho môn cũ:
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <label
                      className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                        syncMode === "accumulate"
                          ? "bg-white dark:bg-slate-900 border-indigo-600 text-indigo-900 dark:text-indigo-200 shadow-xs"
                          : "bg-transparent border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <input
                        type="radio"
                        name="syncMode"
                        value="accumulate"
                        checked={syncMode === "accumulate"}
                        onChange={() => setSyncMode("accumulate")}
                        className="mt-0.5 accent-indigo-600"
                      />
                      <div>
                        <div className="font-bold">Theo TKB mới nhất</div>
                        <div className="text-[11px] opacity-80 mt-0.5">
                          Tự động cập nhật tổng số buổi tích lũy theo TKB (Khuyên dùng)
                        </div>
                      </div>
                    </label>

                    <label
                      className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                        syncMode === "additive"
                          ? "bg-white dark:bg-slate-900 border-indigo-600 text-indigo-900 dark:text-indigo-200 shadow-xs"
                          : "bg-transparent border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <input
                        type="radio"
                        name="syncMode"
                        value="additive"
                        checked={syncMode === "additive"}
                        onChange={() => setSyncMode("additive")}
                        className="mt-0.5 accent-indigo-600"
                      />
                      <div>
                        <div className="font-bold">Cộng dồn thêm</div>
                        <div className="text-[11px] opacity-80 mt-0.5">
                          Cộng thẳng số buổi TKB vào số buổi hiện tại
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Modal Actions */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSyncModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {syncResult ? "Đóng" : "Hủy"}
              </button>

              <button
                type="button"
                disabled={syncLoading}
                onClick={handleExecuteSync}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 shadow-md shadow-indigo-500/20 active:scale-95 transition-all"
              >
                {syncLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang đồng bộ...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Xác nhận Đồng bộ ngay</span>
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
