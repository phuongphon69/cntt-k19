// components/admin/manual-attendance-client.tsx
"use client";

import React, { useState } from "react";
import { CheckSquare, Save, RefreshCw, CheckCircle2, User } from "lucide-react";
import { Subject, PublicStudent, AttendanceValue } from "@/types";

interface ManualAttendanceClientProps {
  subjects: Subject[];
  students: PublicStudent[];
}

export function ManualAttendanceClient({ subjects, students }: ManualAttendanceClientProps) {
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
  const currentSubject =
    subjectsList.find((s) => s.attendanceSheet === selectedSubjectSheet) || subjectsList[0];
  const availableDates = currentSubject?.sessionDates || [];
  const [sessionDate, setSessionDate] = useState(availableDates[0]?.date || "");
  const [isCustomDate, setIsCustomDate] = useState(false);

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
  const [values, setValues] = useState<Record<string, AttendanceValue>>({});
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handleSetAll = (val: AttendanceValue) => {
    const newVals: Record<string, AttendanceValue> = {};
    students.forEach((s) => {
      newVals[s.id] = val;
    });
    setValues(newVals);
  };

  const handleValueChange = (studentId: string, val: AttendanceValue) => {
    setValues((prev) => ({ ...prev, [studentId]: val }));
  };

  const handleSave = async () => {
    if (!selectedSubjectSheet || !sessionDate) {
      alert("Vui lòng chọn môn học và nhập ngày học");
      return;
    }

    setSaving(true);
    setSuccessMessage("");
    try {
      const updates = Object.entries(values).map(([studentId, val]) => ({
        studentId,
        value: val,
      }));

      const res = await fetch("/api/admin/attendance/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheetName: selectedSubjectSheet,
          sessionDate,
          roundNumber,
          updates,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMessage(data.message);
      } else {
        alert("Lỗi ghi điểm danh: " + data.error);
      }
    } catch (e) {
      alert("Lỗi kết nối khi ghi dữ liệu");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Điểm danh thủ công
          </h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Nhập trực tiếp trạng thái Có mặt (X), Có phép (P), Muộn (M) cho từng học viên.
        </p>
      </div>

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 text-emerald-800 dark:text-emerald-300 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {syncNotification && (
        <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/80 dark:border-indigo-800/80 text-indigo-800 dark:text-indigo-300 text-xs sm:text-sm flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="font-semibold">{syncNotification}</span>
          </div>
          <button
            type="button"
            onClick={() => setSyncNotification(null)}
            className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>
      )}

      {/* Form Controls */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Môn học</label>
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
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white outline-none"
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

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Ngày học (theo TKB)</label>
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
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs"
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
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs font-medium"
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

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Lần điểm danh</label>
            <div className="flex gap-2">
              {[1, 2, 3].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setRoundNumber(num as 1 | 2 | 3)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold ${
                    roundNumber === num ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-slate-800"
                  }`}
                >
                  Lần {num}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Date Pills */}
        {availableDates.length > 0 && !isCustomDate && (
          <div className="p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-indigo-900 dark:text-indigo-200">
                Các buổi học trong TKB ({availableDates.length} buổi):
              </span>
              <span className="text-slate-500">
                Đang chọn: <strong className="text-indigo-600 dark:text-indigo-400">{sessionDate}</strong>
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
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      isSelected
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 border border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    B{s.index}: {s.date.slice(0, 5)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Batch Actions */}
        <div className="pt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold">Thao tác nhanh:</span>
          <button
            type="button"
            onClick={() => handleSetAll("X")}
            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
          >
            Tất cả Có mặt (X)
          </button>
          <button
            type="button"
            onClick={() => handleSetAll("P")}
            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300"
          >
            Tất cả Có phép (P)
          </button>
          <button
            type="button"
            onClick={() => handleSetAll("")}
            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            Xóa hết
          </button>
        </div>
      </div>

      {/* Student List Grid */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
        {students.map((stu) => {
          const currVal = values[stu.id] || "";
          return (
            <div key={stu.id} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">{stu.fullName}</div>
                  <div className="text-[11px] text-slate-400">
                    {stu.dateOfBirth ? `NS: ${stu.dateOfBirth}` : ""} {stu.studySystem ? `• Hệ ${stu.studySystem}` : ""}
                  </div>
                </div>
              </div>

              {/* Value Selector Buttons */}
              <div className="flex items-center gap-1.5">
                {(["X", "P", "M", ""] as AttendanceValue[]).map((v) => (
                  <button
                    key={v || "BLANK"}
                    type="button"
                    onClick={() => handleValueChange(stu.id, v)}
                    className={`w-9 h-8 rounded-lg text-xs font-black transition-all ${
                      currVal === v
                        ? v === "X"
                          ? "bg-emerald-600 text-white"
                          : v === "P"
                          ? "bg-sky-600 text-white"
                          : v === "M"
                          ? "bg-amber-600 text-white"
                          : "bg-slate-700 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                    }`}
                  >
                    {v || "--"}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Submit Button */}
      <button
        type="button"
        disabled={saving}
        onClick={handleSave}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-500/20 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
      >
        {saving ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Đang lưu vào Google Sheets...</span>
          </>
        ) : (
          <>
            <Save className="w-4 h-4" />
            <span>LƯU ĐIỂM DANH THỦ CÔNG</span>
          </>
        )}
      </button>
    </div>
  );
}
