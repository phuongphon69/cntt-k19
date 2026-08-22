// app/admin/subjects/new/page.tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, BookOpen, Plus, Sparkles, RefreshCw, CheckCircle2 } from "lucide-react";

export default function NewSubjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [teacher, setTeacher] = useState("");
  const [teacherPhone, setTeacherPhone] = useState("");
  const [totalSessions, setTotalSessions] = useState(12);
  const [createSheet, setCreateSheet] = useState(true);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Vui lòng nhập tên môn học");
      return;
    }

    setLoading(true);
    setSuccess("");
    try {
      const res = await fetch("/api/admin/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          teacher: teacher.trim(),
          teacherPhone: teacherPhone.trim(),
          totalSessions,
          createSheet,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(data.message);
        setTimeout(() => {
          router.push("/admin/subjects");
          router.refresh();
        }, 1500);
      } else {
        alert("Lỗi: " + data.error);
      }
    } catch (e) {
      alert("Lỗi kết nối khi tạo môn học");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-2">
        <Link
          href="/admin/subjects"
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Quay lại Quản lý Môn học</span>
        </Link>
      </div>

      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Thêm Môn học Mới
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Hệ thống sẽ tự động nhân bản sheet <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">MẪU MÔN HỌC</code> và nạp danh sách học viên Active từ <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">DANH SÁCH LỚP</code>.
        </p>
      </div>

      {success && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4"
      >
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Tên môn học * (ví dụ: Mạng máy tính)
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nhập tên môn học..."
            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border text-sm text-slate-900 dark:text-white outline-none"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Giảng viên phụ trách
            </label>
            <input
              type="text"
              value={teacher}
              onChange={(e) => setTeacher(e.target.value)}
              placeholder="Thầy / Cô..."
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border text-sm text-slate-900 dark:text-white outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Số điện thoại GV (tùy chọn)
            </label>
            <input
              type="text"
              value={teacherPhone}
              onChange={(e) => setTeacherPhone(e.target.value)}
              placeholder="09..."
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border text-sm text-slate-900 dark:text-white outline-none"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Số buổi học dự kiến
          </label>
          <input
            type="number"
            value={totalSessions}
            onChange={(e) => setTotalSessions(parseInt(e.target.value || "12", 10))}
            min={1}
            max={60}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border text-sm text-slate-900 dark:text-white outline-none"
          />
        </div>

        <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-start gap-3">
          <input
            type="checkbox"
            id="createSheet"
            checked={createSheet}
            onChange={(e) => setCreateSheet(e.target.checked)}
            className="w-4 h-4 mt-0.5 rounded text-indigo-600 cursor-pointer"
          />
          <label htmlFor="createSheet" className="text-xs text-indigo-900 dark:text-indigo-200 cursor-pointer">
            <span className="font-bold">Tự động tạo sheet Google Sheets mới: </span>
            <span>
              Hệ thống sẽ tạo sheet <code>DD {name.toUpperCase().trim() || "TÊN MÔN"}</code> từ template <code>MẪU MÔN HỌC</code> và nạp 100% học viên active.
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-500/20 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Đang tạo môn & nhân bản sheet Google Sheets...</span>
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              <span>TẠO MÔN HỌC & SHEET ĐIỂM DANH</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
