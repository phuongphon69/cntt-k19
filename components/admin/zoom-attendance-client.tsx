// components/admin/zoom-attendance-client.tsx
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
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
  EyeOff,
  Check,
  BarChart3,
  Database,
  Key,
  Zap,
  ShieldCheck,
  Sliders,
  ExternalLink,
} from "lucide-react";
import { Subject, PublicStudent, OcrCandidate, OcrResultSummary, AttendanceValue } from "@/types";
import { recognizeImagesWithClientTesseract, TesseractProgress } from "@/lib/ocr/client-tesseract";
import { optimizeImageForOcr } from "@/lib/ocr/image-optimizer";

interface ZoomAttendanceClientProps {
  subjects: Subject[];
  students: PublicStudent[];
}

export function ZoomAttendanceClient({ subjects, students }: ZoomAttendanceClientProps) {
  const [subjectsList, setSubjectsList] = useState<Subject[]>(subjects);
  const [syncingTkb, setSyncingTkb] = useState(false);
  const [syncNotification, setSyncNotification] = useState<string | null>(null);

  React.useEffect(() => {
    if (subjects && subjects.length > 0) {
      setSubjectsList(subjects);
    }
  }, [subjects]);

  const [selectedSubjectSheet, setSelectedSubjectSheet] = useState(
    subjects[0]?.attendanceSheet || ""
  );

  // Find the selected subject to get its session dates
  const currentSubject = subjectsList.find(
    (s) => s.attendanceSheet === selectedSubjectSheet || s.name === selectedSubjectSheet
  );
  const availableDates = currentSubject?.sessionDates || [];

  const [sessionDate, setSessionDate] = useState(availableDates[0]?.date || "");
  const [isCustomDate, setIsCustomDate] = useState(false);

  // Automatically update sessionDate when selectedSubjectSheet changes
  React.useEffect(() => {
    if (availableDates.length > 0) {
      const exists = availableDates.some((d) => d.date === sessionDate);
      if (!exists && !isCustomDate) {
        setSessionDate(availableDates[0].date);
      }
    }
  }, [selectedSubjectSheet, availableDates, isCustomDate]);

  const handleSyncTkb = async () => {
    setSyncingTkb(true);
    setSyncNotification(null);
    try {
      const res = await fetch("/api/admin/subjects/sync-tkb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "accumulate" }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.subjects && data.subjects.length > 0) {
          setSubjectsList(data.subjects);
        } else {
          const subRes = await fetch("/api/subjects?fresh=true");
          const subData = await subRes.json();
          if (subData.subjects) setSubjectsList(subData.subjects);
        }
        setSyncNotification(data.message || "Đã đồng bộ môn học và số buổi từ TKB thành công!");
        setTimeout(() => setSyncNotification(null), 5000);
      } else {
        alert("Lỗi đồng bộ TKB: " + (data.error || "Không thể đồng bộ"));
      }
    } catch (err: any) {
      alert("Lỗi kết nối khi đồng bộ môn học từ TKB");
    } finally {
      setSyncingTkb(false);
    }
  };

  const [roundNumber, setRoundNumber] = useState<1 | 2 | 3>(1);
  const [files, setFiles] = useState<File[]>([]);
  const [rawText, setRawText] = useState("");
  const [loading, setLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrSummary, setOcrSummary] = useState<OcrResultSummary | null>(null);
  const [candidates, setCandidates] = useState<OcrCandidate[]>([]);
  const [showUnmatchedModal, setShowUnmatchedModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // ─── OCR Mode & API Key State (Default: browser mode so it works immediately without API) ───
  const [ocrMode, setOcrMode] = useState<"browser" | "gemini">("browser");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [serverHasKey, setServerHasKey] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [showKeySecret, setShowKeySecret] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [keyTestResult, setKeyTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [progressInfo, setProgressInfo] = useState<TesseractProgress | null>(null);

  // Initialize key from localStorage and check server status
  useEffect(() => {
    try {
      const savedKey = localStorage.getItem("cntt_gemini_api_key");
      if (savedKey) {
        setGeminiApiKey(savedKey);
        setKeyInput(savedKey);
        setOcrMode("gemini");
      }
    } catch (e) {}

    fetch("/api/admin/attendance/ocr")
      .then((r) => r.json())
      .then((data) => {
        if (data.hasServerKey) {
          setServerHasKey(true);
          setOcrMode("gemini");
        }
      })
      .catch(() => {});
  }, []);

  const handleTestApiKey = async () => {
    if (!keyInput.trim()) {
      setKeyTestResult({ ok: false, message: "Vui lòng dán mã API Key trước khi kiểm tra" });
      return;
    }
    setTestingKey(true);
    setKeyTestResult(null);
    try {
      const res = await fetch("/api/admin/attendance/ocr/test-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: keyInput.trim() }),
      });
      const data = await res.json();
      setKeyTestResult(data);
    } catch (err: any) {
      setKeyTestResult({ ok: false, message: "Lỗi kết nối máy chủ kiểm tra API Key" });
    } finally {
      setTestingKey(false);
    }
  };

  const handleSaveApiKey = () => {
    const clean = keyInput.trim();
    if (clean) {
      try {
        localStorage.setItem("cntt_gemini_api_key", clean);
      } catch (e) {}
      setGeminiApiKey(clean);
      setOcrMode("gemini");
      setOcrError(null);
      setShowApiKeyModal(false);
      setKeyTestResult(null);
    } else {
      try {
        localStorage.removeItem("cntt_gemini_api_key");
      } catch (e) {}
      setGeminiApiKey("");
      setOcrMode("browser");
      setKeyTestResult(null);
    }
  };

  const handleClearApiKey = () => {
    try {
      localStorage.removeItem("cntt_gemini_api_key");
    } catch (e) {}
    setGeminiApiKey("");
    setKeyInput("");
    setOcrMode("browser");
    setKeyTestResult(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  // ─── Browser OCR Runner (100% Free, Runs via WebAssembly in browser) ─────
  const runBrowserOcrAndMatch = async (inputFiles: File[], extraText: string) => {
    setProgressInfo({ progress: 5, statusText: "Đang tối ưu ảnh và tăng độ tương phản chữ..." });
    const optimizedFiles = await Promise.all(
      inputFiles.map((f) => optimizeImageForOcr(f, { invertIfDark: true }))
    );

    const ocrTexts = await recognizeImagesWithClientTesseract(optimizedFiles, (p) => {
      setProgressInfo(p);
    });

    if (ocrTexts.length === 0 && !extraText.trim()) {
      setOcrError("Không trích xuất được chữ nào từ ảnh. Bạn vui lòng chụp ảnh Zoom rõ hơn hoặc dán tên vào ô văn bản.");
      return;
    }

    setProgressInfo({ progress: 95, statusText: "Đang đối chiếu danh sách lớp CNTT K19..." });

    const formData = new FormData();
    formData.append("sheetName", selectedSubjectSheet);
    formData.append("sessionDate", sessionDate);
    formData.append("roundNumber", String(roundNumber));
    const allOcr = [...ocrTexts];
    if (extraText.trim()) allOcr.push(extraText.trim());
    formData.append("rawOcrText", allOcr.join("\n"));

    const res = await fetch("/api/admin/attendance/ocr", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (data.success) {
      setOcrSummary(data.summary);
      setCandidates(data.summary.candidates || []);
      setOcrError(null);
    } else {
      setOcrError(data.error || "Lỗi xử lý kết quả đối chiếu danh sách");
    }
  };

  // ─── Main OCR Dispatcher (Auto-selects best available engine) ─────────────
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
    setOcrError(null);

    try {
      const hasAnyKey = Boolean(geminiApiKey || serverHasKey);

      // If user selected browser mode, OR if no API key is set anywhere:
      // AUTOMATICALLY run browser OCR directly without throwing any errors!
      if (ocrMode === "browser" || !hasAnyKey) {
        await runBrowserOcrAndMatch(files, rawText);
        return;
      }

      // If user has a Gemini key, try Gemini Vision first
      try {
        let filesToSend = files;
        if (files.length > 0) {
          setProgressInfo({ progress: 15, statusText: "Đang nén và tối ưu dung lượng ảnh..." });
          filesToSend = await Promise.all(files.map((f) => optimizeImageForOcr(f)));
        }

        setProgressInfo({ progress: 40, statusText: "Đang gửi ảnh đến Google Gemini AI Vision..." });

        const formData = new FormData();
        formData.append("sheetName", selectedSubjectSheet);
        formData.append("sessionDate", sessionDate);
        formData.append("roundNumber", String(roundNumber));
        if (rawText.trim()) formData.append("rawOcrText", rawText);
        if (geminiApiKey) formData.append("geminiApiKey", geminiApiKey);
        filesToSend.forEach((f) => formData.append("images", f));

        const res = await fetch("/api/admin/attendance/ocr", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (data.success) {
          setOcrSummary(data.summary);
          setCandidates(data.summary.candidates || []);
          return;
        }

        // If Gemini failed (key invalid, rate limit, timeout):
        // AUTOMATICALLY fallback to browser OCR immediately!
        console.warn("Gemini call failed, auto-falling back to browser OCR:", data.error);
        if (files.length > 0) {
          setProgressInfo({
            progress: 20,
            statusText: "Đang tự động chuyển sang bộ quét tích hợp trên máy...",
          });
          await runBrowserOcrAndMatch(files, rawText);
          return;
        }

        setOcrError(data.error || "Lỗi xử lý OCR");
      } catch (geminiErr: any) {
        console.warn("Gemini threw error, auto-falling back to browser OCR:", geminiErr);
        if (files.length > 0) {
          await runBrowserOcrAndMatch(files, rawText);
          return;
        }
        setOcrError("Lỗi kết nối máy chủ. Vui lòng thử lại.");
      }
    } catch (err: any) {
      setOcrError("Lỗi xử lý quét ảnh: " + (err?.message || err));
    } finally {
      setLoading(false);
      setProgressInfo(null);
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
              confidenceScore: stu ? 100 : 0,
              status: stu ? "MATCHED" : "UNMATCHED",
              confirmed: Boolean(stu),
            }
          : c
      )
    );
  };

  const confirmedCandidates = candidates.filter((c) => c.confirmed && c.matchedStudent);

  const handleConfirmAndWrite = async () => {
    if (confirmedCandidates.length === 0) {
      alert("Chưa có học viên nào được chọn xác nhận để ghi điểm danh");
      return;
    }

    setSaving(true);
    setSuccessMessage("");
    try {
      const records = confirmedCandidates.map((c) => ({
        studentId: c.matchedStudent!.id,
        round1: roundNumber === 1 ? ("X" as AttendanceValue) : undefined,
        round2: roundNumber === 2 ? ("X" as AttendanceValue) : undefined,
        round3: roundNumber === 3 ? ("X" as AttendanceValue) : undefined,
      }));

      const res = await fetch("/api/admin/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheetName: selectedSubjectSheet,
          sessionDate,
          records,
          rawOcrNames: candidates.map((c) => c.rawText),
          confirmedStudentIds: confirmedCandidates.map((c) => c.matchedStudent!.id),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMessage(
          `✓ Đã ghi nhận thành công ${confirmedCandidates.length} học viên có mặt vào cột Lần ${roundNumber} (${sessionDate}) trên Google Sheets!`
        );
        setShowPreviewModal(false);
        setOcrSummary(null);
        setCandidates([]);
        setFiles([]);
        setRawText("");
      } else {
        alert("Lỗi ghi dữ liệu vào Google Sheets: " + (data.error || "Không thể ghi"));
      }
    } catch (err: any) {
      alert("Lỗi kết nối máy chủ khi ghi điểm danh");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Camera className="w-6 h-6 text-indigo-500" />
            <span>Điểm danh bằng ảnh chụp Zoom OCR</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Tải lên ảnh chụp danh sách người tham gia Zoom, tự động nhận diện tên tiếng Việt và đối chiếu danh sách lớp.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick API Key Button in header */}
          <button
            type="button"
            onClick={() => {
              setKeyInput(geminiApiKey);
              setKeyTestResult(null);
              setShowApiKeyModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 shadow-xs transition-all cursor-pointer"
            title="Cài đặt Google Gemini API Key để tăng độ chính xác tiếng Việt"
          >
            <Key className="w-3.5 h-3.5 text-indigo-500" />
            <span>{serverHasKey || geminiApiKey ? "AI Key: Đã bật" : "Cài đặt Gemini AI"}</span>
            {serverHasKey || geminiApiKey ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            ) : (
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            )}
          </button>

          <Link
            href="/admin/attendance/manual"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 shadow-xs transition-all"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Điểm danh thủ công</span>
          </Link>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-emerald-800 dark:text-emerald-200 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage("")} className="text-xs opacity-60 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* Sync TKB Notification */}
      {syncNotification && (
        <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between text-indigo-900 dark:text-indigo-200 text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>{syncNotification}</span>
          </div>
          <button onClick={() => setSyncNotification(null)} className="text-xs opacity-60 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* Step 1: Upload & Configuration Form */}
      {!ocrSummary && (
        <div className="space-y-4">
          <form
            onSubmit={handleProcessOcr}
            className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Subject Selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Môn học *</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleSyncTkb}
                    disabled={syncingTkb}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 px-2 py-0.5 rounded-lg border border-indigo-200/60 dark:border-indigo-800/60 transition-all cursor-pointer disabled:opacity-50"
                    title="Tự động liên kết và đồng bộ môn mới cùng số buổi từ TKB"
                  >
                    <RefreshCw className={`w-3 h-3 ${syncingTkb ? "animate-spin" : ""}`} />
                    <span>{syncingTkb ? "Đang đồng bộ..." : "Đồng bộ TKB"}</span>
                  </button>
                </div>
                <select
                  value={selectedSubjectSheet}
                  onChange={(e) => setSelectedSubjectSheet(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white outline-none font-medium"
                >
                  {subjectsList.map((s) => {
                    const count = s.sessionDates?.length || s.totalSessions || 0;
                    return (
                      <option key={s.id} value={s.attendanceSheet}>
                        {s.name} ({s.attendanceSheet}) — {count} buổi
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Date Input / Selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-500" />
                    <span>Ngày học (theo TKB) *</span>
                  </label>
                  {availableDates.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsCustomDate(!isCustomDate)}
                      className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      {isCustomDate ? "Chọn theo TKB" : "Tự gõ ngày"}
                    </button>
                  )}
                </div>

                {isCustomDate || availableDates.length === 0 ? (
                  <input
                    type="text"
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    placeholder="Ví dụ: 21/03/2026"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white outline-none"
                    required
                  />
                ) : (
                  <select
                    value={sessionDate}
                    onChange={(e) => {
                      if (e.target.value === "__custom__") {
                        setIsCustomDate(true);
                      } else {
                        setSessionDate(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white outline-none font-medium"
                  >
                    {availableDates.map((s) => (
                      <option key={s.index} value={s.date}>
                        Buổi {s.index}: {s.dayOfWeek ? `${s.dayOfWeek} ` : ""}({s.date})
                      </option>
                    ))}
                    <option value="__custom__">-- ✏️ Tự gõ ngày khác --</option>
                  </select>
                )}
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
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                        roundNumber === num
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      Lần {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Session Date Pills */}
            {availableDates.length > 0 && !isCustomDate && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-medium flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-indigo-500" />
                    <span>Chọn nhanh buổi học theo TKB ({availableDates.length} buổi):</span>
                  </span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Đang chọn: <strong>{sessionDate}</strong>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {availableDates.map((s) => {
                    const isSelected = sessionDate === s.date;
                    return (
                      <button
                        key={s.index}
                        type="button"
                        onClick={() => setSessionDate(s.date)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                          isSelected
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 scale-105"
                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-100/70 dark:hover:bg-indigo-950/70 border border-slate-200/80 dark:border-slate-700/80"
                        }`}
                      >
                        <span>B{s.index}:</span>
                        <span>{s.date.slice(0, 5)}</span>
                        {s.dayOfWeek && (
                          <span className="opacity-70 text-[10px]">
                            ({s.dayOfWeek.replace("Thứ ", "T")})
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* OCR Engine Info Strip */}
            <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100/80 dark:border-indigo-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-600 text-white">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <div className="text-xs">
                  <span className="font-bold text-slate-900 dark:text-white">
                    {serverHasKey || geminiApiKey
                      ? "Đang dùng: Google Gemini AI Vision (Nhận diện tiếng Việt 99%)"
                      : "Đang dùng: Bộ quét trực tiếp tích hợp (Miễn phí 100%, không cần API)"}
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Tự động nhận diện danh sách học viên, lọc icon Zoom và đối chiếu danh sách lớp.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setKeyInput(geminiApiKey);
                    setShowApiKeyModal(true);
                  }}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100/80 dark:bg-indigo-900/60 hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-all cursor-pointer"
                >
                  {serverHasKey || geminiApiKey ? "Quản lý API Key" : "Thêm Gemini Key (Tùy chọn)"}
                </button>
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
                  <label className="inline-block px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-md transition-all active:scale-95">
                    Chọn ảnh từ máy / điện thoại
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  <div className="text-xs text-slate-400 mt-2 font-medium">
                    {files.length > 0
                      ? `Đã chọn ${files.length} ảnh: ${files.map((f) => f.name).join(", ")}`
                      : "Hỗ trợ ảnh chụp màn hình máy tính hoặc điện thoại"}
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

            {/* Real-time Progress Bar */}
            {loading && (
              <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-indigo-900 dark:text-indigo-200">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
                    <span>{progressInfo?.statusText || "Đang xử lý ảnh & đối chiếu danh sách..."}</span>
                  </div>
                  <span>{progressInfo?.progress || 15}%</span>
                </div>
                <div className="w-full h-2 bg-indigo-100 dark:bg-indigo-900/60 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 transition-all duration-300 rounded-full"
                    style={{ width: `${Math.max(10, progressInfo?.progress || 15)}%` }}
                  />
                </div>
              </div>
            )}

            {/* OCR Error Banner */}
            {ocrError && (
              <div className="p-4 rounded-2xl border text-sm space-y-2 bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <div className="space-y-1 flex-1">
                    <p className="font-semibold">{ocrError}</p>
                    <p className="text-xs text-rose-700 dark:text-rose-300">
                      Gợi ý: Hãy chụp ảnh Zoom rõ hơn hoặc dán trực tiếp tên vào ô văn bản phía trên.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOcrError(null)}
                    className="text-xs opacity-60 hover:opacity-100 shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Submit Action */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-500/20 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>
                    {progressInfo?.statusText || "Đang quét ảnh & đối chiếu danh sách..."}
                  </span>
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4" />
                  <span>BẮT ĐẦU QUÉT & ĐỐI CHIẾU DANH SÁCH</span>
                </>
              )}
            </button>
          </form>
        </div>
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
                <span className="text-xs text-slate-400">
                  ({files.length} ảnh được phân tích)
                </span>
              </div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Kết quả đối chiếu người tham gia Zoom ({ocrSummary.totalExtracted} người)
              </h2>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                ✓ Khớp chuẩn: {ocrSummary.matchedCount}
              </div>
              {ocrSummary.reviewCount > 0 && (
                <div className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-xs font-bold text-amber-700 dark:text-amber-300">
                  ⚠️ Cần rà soát: {ocrSummary.reviewCount}
                </div>
              )}
              {ocrSummary.unmatchedStudents.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowUnmatchedModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors"
                >
                  Xem {ocrSummary.unmatchedStudents.length} SV chưa thấy
                </button>
              )}
            </div>
          </div>

          {/* Candidates Matching Review Table */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 flex items-center justify-between">
              <span>DANH SÁCH ĐỐI CHIẾU HỌC VIÊN TỪ ẢNH ZOOM</span>
              <span>Đang chọn {confirmedCandidates.length} / {candidates.length} người có mặt</span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[600px] overflow-y-auto">
              {candidates.map((cand, idx) => {
                const isMatched = cand.status === "MATCHED";
                const isReview = cand.status === "NEEDS_REVIEW";

                return (
                  <div
                    key={idx}
                    className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                      cand.confirmed
                        ? "bg-white dark:bg-slate-900"
                        : "bg-slate-50/60 dark:bg-slate-950/40 opacity-60"
                    }`}
                  >
                    {/* Left: OCR Extracted info */}
                    <div className="flex items-start gap-3 min-w-0 sm:w-1/2">
                      <button
                        type="button"
                        onClick={() => toggleCandidateConfirm(idx)}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 transition-all ${
                          cand.confirmed
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-400"
                        }`}
                      >
                        {cand.confirmed ? "✓" : ""}
                      </button>

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {cand.cleanedName || cand.rawText}
                          </span>
                          {cand.extractedDob && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              NS: {cand.extractedDob}
                            </span>
                          )}
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              isMatched
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                : isReview
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                            }`}
                          >
                            {cand.confidenceScore}% {isMatched ? "Khớp" : isReview ? "Cần xem" : "Chưa rõ"}
                          </span>
                        </div>

                        {cand.rawText !== cand.cleanedName && (
                          <div className="text-[11px] text-slate-400 truncate">
                            Gốc: &quot;{cand.rawText}&quot;
                          </div>
                        )}

                        {cand.hasConflict && (
                          <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Đã có dữ liệu trước đó: &quot;{cand.currentValue}&quot;</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Matched student selector */}
                    <div className="sm:w-1/2 flex items-center gap-2">
                      <select
                        value={cand.matchedStudent?.id || ""}
                        onChange={(e) => changeCandidateStudent(idx, e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl text-xs border outline-none font-medium transition-all ${
                          cand.matchedStudent
                            ? "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                            : "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200"
                        }`}
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

      {/* ─── Unmatched Students Modal ────────────────────────────────────── */}
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

      {/* ─── API Key Configuration Modal (Optional) ──────────────────────── */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 space-y-5 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Google Gemini API Key (Tùy chọn)
                  </h3>
                  <p className="text-xs text-slate-500">Dùng để tăng tốc và nhận diện tiếng Việt chính xác 99%</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowApiKeyModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notice */}
            <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-xs text-indigo-900 dark:text-indigo-200">
              💡 <strong>Lưu ý:</strong> Bạn <strong>không bắt buộc</strong> phải có API Key. Hệ thống đã tích hợp sẵn bộ quét trực tiếp trong trình duyệt để bạn điểm danh ngay mà không cần làm gì thêm!
            </div>

            {/* API Key Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Mã Gemini API Key:
              </label>
              <div className="relative">
                <input
                  type={showKeySecret ? "text" : "password"}
                  value={keyInput}
                  onChange={(e) => {
                    setKeyInput(e.target.value);
                    setKeyTestResult(null);
                  }}
                  placeholder="AIzaSy..."
                  className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-mono text-slate-900 dark:text-white outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowKeySecret(!showKeySecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showKeySecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Key Test Feedback */}
            {keyTestResult && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  keyTestResult.ok
                    ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 text-emerald-800 dark:text-emerald-200"
                    : "bg-rose-50 dark:bg-rose-950/50 border-rose-200 text-rose-800 dark:text-rose-200"
                }`}
              >
                {keyTestResult.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{keyTestResult.message}</span>
              </div>
            )}

            {/* Step-by-step 30s guide */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs text-slate-700 dark:text-slate-300">
              <div className="font-bold flex items-center justify-between">
                <span>Cách lấy key miễn phí từ Google:</span>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 underline font-semibold"
                >
                  <span>Mở Google AI Studio</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <ol className="list-decimal list-inside space-y-1 pl-1 text-[11px] text-slate-500 dark:text-slate-400">
                <li>Truy cập <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline font-bold text-indigo-500">aistudio.google.com/app/apikey</a></li>
                <li>Bấm nút <strong>&quot;+ Create API key&quot;</strong> ở góc trên bên phải.</li>
                <li>Sao chép mã <code>AIzaSy...</code> và dán vào ô trên rồi bấm <strong>Lưu Key</strong>.</li>
              </ol>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
              <div>
                {geminiApiKey && (
                  <button
                    type="button"
                    onClick={handleClearApiKey}
                    className="text-xs text-rose-500 hover:underline font-semibold"
                  >
                    Xóa Key
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestApiKey}
                  disabled={testingKey || !keyInput.trim()}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {testingKey ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Kiểm tra kết nối</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveApiKey}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 active:scale-95 cursor-pointer"
                >
                  Lưu vào trình duyệt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Preview & Write Confirmation Modal ──────────────────────────── */}
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
              {/* Sheet auto-create badge vs existing sheet */}
              {!currentSubject?.hasSheet ? (
                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Tự động tạo sheet mới theo môn của TKB</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Môn học này chưa có sheet riêng. Khi bấm xác nhận, hệ thống sẽ tự động tạo sheet mới <strong>{selectedSubjectSheet}</strong> trên Google Sheets với toàn bộ danh sách lớp và lịch học TKB.
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Ghi trực tiếp vào Google Sheets: <strong>{selectedSubjectSheet}</strong></span>
                </div>
              )}

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
                <div className="text-slate-500 text-[11px]">
                  - Các học viên còn lại và các Lần khác được giữ nguyên 100%.
                </div>
              </div>

              {/* Class stats sync notice */}
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Tự động cập nhật vào <strong>Thống kê điểm danh của lớp</strong> ngay sau khi xác nhận.</span>
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
