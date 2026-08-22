// components/admin/zoom-attendance-client.tsx
"use client";

import React, { useState } from "react";
import {
  Camera,
  Upload,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Users,
  Calendar,
  BookOpen,
  ArrowRight,
  RefreshCw,
  X,
  Sparkles,
  Save,
  Eye,
  Check,
} from "lucide-react";
import { Subject, PublicStudent, OcrCandidate, OcrResultSummary, AttendanceValue } from "@/types";

interface ZoomAttendanceClientProps {
  subjects: Subject[];
  students: PublicStudent[];
}

export function ZoomAttendanceClient({ subjects, students }: ZoomAttendanceClientProps) {
  const [selectedSubjectSheet, setSelectedSubjectSheet] = useState(
    subjects[0]?.attendanceSheet || ""
  );
  const [sessionDate, setSessionDate] = useState("");
  const [roundNumber, setRoundNumber] = useState<1 | 2 | 3>(1);
  const [files, setFiles] = useState<File[]>([]);
  const [rawText, setRawText] = useState("");
  const [loading, setLoading] = useState(false);
  const [ocrSummary, setOcrSummary] = useState<OcrResultSummary | null>(null);
  const [candidates, setCandidates] = useState<OcrCandidate[]>([]);
  const [showUnmatchedModal, setShowUnmatchedModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleProcessOcr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectSheet || !sessionDate) {
      alert("Vui lòng chọn môn học và nhập ngày học (dd/mm/yyyy)");
      return;
    }

    if (files.length === 0 && !rawText.trim()) {
      alert("Vui lòng tải lên ít nhất 1 ảnh chụp màn hình Zoom hoặc dán danh sách tên");
      return;
    }

    setLoading(true);
    setSuccessMessage("");
    try {
      const formData = new FormData();
      formData.append("sheetName", selectedSubjectSheet);
      formData.append("sessionDate", sessionDate);
      formData.append("roundNumber", String(roundNumber));
      if (rawText.trim()) formData.append("rawOcrText", rawText);

      files.forEach((f) => formData.append("images", f));

      const res = await fetch("/api/admin/attendance/ocr", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setOcrSummary(data.summary);
        setCandidates(data.summary.candidates || []);
      } else {
        alert("Lỗi xử lý OCR: " + data.error);
      }
    } catch (err: any) {
      alert("Lỗi kết nối khi gửi ảnh OCR");
    } finally {
      setLoading(false);
    }
  };

  const toggleCandidateConfirm = (idx: number) => {
    setCandidates((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, confirmed: !c.confirmed } : c))
    );
  };

  const changeCandidateStudent = (idx: number, studentId: string) => {
    const stu = students.find((s) => s.id === studentId);
    setCandidates((prev) =>
      prev.map((c, i) =>
        i === idx
          ? {
              ...c,
              matchedStudent: stu,
              confidenceScore: 100,
              status: "MATCHED",
              confirmed: true,
            }
          : c
      )
    );
  };

  const resolveConflict = (idx: number, chosenVal: AttendanceValue) => {
    setCandidates((prev) =>
      prev.map((c, i) =>
        i === idx ? { ...c, resolvedValue: chosenVal, hasConflict: false } : c
      )
    );
  };

  const confirmedCandidates = candidates.filter((c) => c.confirmed && c.matchedStudent);

  const handleConfirmAndWrite = async () => {
    setSaving(true);
    try {
      const updates = confirmedCandidates.map((c) => ({
        studentId: c.matchedStudent!.id,
        value: c.resolvedValue || "X",
      }));

      // Collect new aliases to save
      const newAliases = confirmedCandidates
        .filter((c) => c.rawText && c.matchedStudent)
        .map((c) => ({
          studentId: c.matchedStudent!.id,
          zoomAlias: c.rawText,
        }));

      const res = await fetch("/api/admin/attendance/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheetName: selectedSubjectSheet,
          sessionDate,
          roundNumber,
          updates,
          newAliases,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowPreviewModal(false);
        setSuccessMessage(data.message);
        // Clear state
        setCandidates([]);
        setOcrSummary(null);
        setFiles([]);
        setRawText("");
      } else {
        alert("Lỗi ghi Google Sheets: " + data.error);
      }
    } catch (e) {
      alert("Lỗi kết nối khi ghi điểm danh");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <Camera className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Điểm danh bằng ảnh chụp Zoom OCR
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Hỗ trợ tải lên nhiều ảnh chụp danh sách người tham gia Zoom, tự động tách tên tiếng Việt, loại bỏ K19/CNTT và đối chiếu danh sách lớp.
        </p>
      </div>

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <span className="font-bold">Thành công!</span> {successMessage}
          </div>
        </div>
      )}

      {/* Step 1: Form Selection & Image Upload */}
      {!ocrSummary && (
        <form
          onSubmit={handleProcessOcr}
          className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Subject Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                <span>Môn học *</span>
              </label>
              <select
                value={selectedSubjectSheet}
                onChange={(e) => setSelectedSubjectSheet(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white outline-none"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.attendanceSheet}>
                    {s.name} ({s.attendanceSheet})
                  </option>
                ))}
              </select>
            </div>

            {/* Date Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                <span>Ngày học (dd/mm/yyyy) *</span>
              </label>
              <input
                type="text"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                placeholder="Ví dụ: 22/08/2026"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white outline-none"
                required
              />
            </div>

            {/* Round Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                <span>Lần điểm danh *</span>
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setRoundNumber(num as 1 | 2 | 3)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      roundNumber === num
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                    }`}
                  >
                    Lần {num}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Multi-Image Upload Area */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-slate-400" />
              <span>Tải lên 1 hoặc nhiều ảnh chụp Zoom (PNG, JPG, WEBP, HEIC)</span>
            </label>
            <div className="p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400 rounded-3xl text-center space-y-3 bg-slate-50/50 dark:bg-slate-800/30 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <label className="inline-block px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-md transition-all">
                  Chọn ảnh từ máy / điện thoại
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                <div className="text-xs text-slate-400 mt-2">
                  {files.length > 0
                    ? `Đã chọn ${files.length} ảnh: ${files.map((f) => f.name).join(", ")}`
                    : "Hỗ trợ chọn nhiều ảnh cùng lúc trên iPhone/Android/PC"}
                </div>
              </div>
            </div>
          </div>

          {/* Optional Text Paste Fallback */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500">
              Hoặc dán trực tiếp danh sách tên người tham gia (tùy chọn):
            </label>
            <textarea
              rows={3}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Dán văn bản nếu có (ví dụ: Phạm Ngọc Hà 02.12.1985 K19 CNTT...)"
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none"
            />
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-500/20 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Đang xử lý OCR & Đối chiếu danh sách...</span>
              </>
            ) : (
              <>
                <Camera className="w-4 h-4" />
                <span>BẮT ĐẦU NHẬN DIỆN OCR</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* Step 2: OCR Review & Matching Table */}
      {ocrSummary && (
        <div className="space-y-6">
          {/* Summary Metric Strip */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                  {selectedSubjectSheet} • {sessionDate} • Lần {roundNumber}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Kết quả nhận diện: {confirmedCandidates.length} / {students.length} học viên có mặt
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowUnmatchedModal(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition-colors"
              >
                Xem {ocrSummary.unmatchedStudents.length} SV chưa thấy
              </button>

              <button
                type="button"
                onClick={() => setShowPreviewModal(true)}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>XÁC NHẬN & GHI SHEETS</span>
              </button>
            </div>
          </div>

          {/* Candidate List Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 font-bold text-xs text-slate-500">
              DANH SÁCH TÊN NHẬN DIỆN ĐƯỢC ({candidates.length} mục)
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {candidates.map((cand, idx) => {
                const isMatched = cand.status === "MATCHED";
                const isReview = cand.status === "NEEDS_REVIEW";

                return (
                  <div
                    key={idx}
                    className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                      cand.confirmed ? "bg-white dark:bg-slate-900" : "bg-slate-50/60 dark:bg-slate-950/40 opacity-70"
                    }`}
                  >
                    {/* Raw Text & Cleaned Name */}
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={cand.confirmed}
                          onChange={() => toggleCandidateConfirm(idx)}
                          className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                        />
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {cand.cleanedName || cand.rawText}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isMatched
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : isReview
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          {cand.confidenceScore}% {isMatched ? "Khớp" : isReview ? "Cần kiểm tra" : "Chưa xác định"}
                        </span>
                        {cand.matchedByAlias && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
                            Alias đã lưu
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-400 pl-6">
                        Zoom text: &quot;{cand.rawText}&quot; {cand.extractedDob ? `• NS tách: ${cand.extractedDob}` : ""}
                      </div>

                      {/* Conflict Notification */}
                      {cand.hasConflict && (
                        <div className="mt-2 ml-6 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>
                              Ô hiện tại trong Sheet đang là <strong>{cand.currentValue}</strong>.
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => resolveConflict(idx, cand.currentValue!)}
                              className="px-2 py-1 bg-white dark:bg-slate-800 rounded text-[11px] font-bold border"
                            >
                              Giữ {cand.currentValue}
                            </button>
                            <button
                              type="button"
                              onClick={() => resolveConflict(idx, "X")}
                              className="px-2 py-1 bg-emerald-600 text-white rounded text-[11px] font-bold"
                            >
                              Đổi thành X
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Matched Student Selector */}
                    <div className="sm:w-64 pl-6 sm:pl-0">
                      <select
                        value={cand.matchedStudent?.id || ""}
                        onChange={(e) => changeCandidateStudent(idx, e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none"
                      >
                        <option value="">-- Chọn sinh viên thủ công --</option>
                        {students.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.fullName} {s.dateOfBirth ? `(${s.dateOfBirth})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setOcrSummary(null);
                setCandidates([]);
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700"
            >
              Hủy & Tải ảnh khác
            </button>

            <button
              type="button"
              onClick={() => setShowPreviewModal(true)}
              className="px-6 py-3 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-500/20 active:scale-95 transition-all flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>TIẾP TỤC XÁC NHẬN ({confirmedCandidates.length} HỌC VIÊN)</span>
            </button>
          </div>
        </div>
      )}

      {/* Unmatched Students Modal */}
      {showUnmatchedModal && ocrSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Học viên chưa được nhận diện ({ocrSummary.unmatchedStudents.length})
              </h3>
              <button onClick={() => setShowUnmatchedModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="text-xs text-slate-500">
              Những học viên này KHÔNG xuất hiện trong ảnh Zoom. Hệ thống sẽ KHÔNG tự động đánh vắng mà giữ nguyên ô trong Google Sheets.
            </div>
            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {ocrSummary.unmatchedStudents.map((s) => (
                <div key={s.id} className="py-2 flex items-center justify-between">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{s.fullName}</span>
                  <span className="text-slate-400">{s.dateOfBirth ? `NS: ${s.dateOfBirth}` : ""}</span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowUnmatchedModal(false)}
              className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 font-bold text-xs rounded-xl"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* Preview & Write Confirmation Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 space-y-5 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Xác nhận ghi vào Google Sheets
              </h3>
              <button onClick={() => setShowPreviewModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 space-y-1.5">
                <div>
                  <strong>Môn học:</strong> {selectedSubjectSheet}
                </div>
                <div>
                  <strong>Ngày học:</strong> {sessionDate}
                </div>
                <div>
                  <strong>Cột cập nhật:</strong> LẦN {roundNumber}
                </div>
                <div className="text-indigo-700 dark:text-indigo-300 font-bold pt-1">
                  ✓ {confirmedCandidates.length} học viên sẽ được ghi &quot;X&quot;.
                </div>
                <div className="text-slate-500">
                  - Các học viên còn lại và các Lần khác được giữ nguyên 100%.
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800"
              >
                Hủy
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={handleConfirmAndWrite}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang ghi Sheets...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>XÁC NHẬN GHI SHEETS</span>
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
