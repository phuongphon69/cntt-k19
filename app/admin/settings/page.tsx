// app/admin/settings/page.tsx
"use client";

import React, { useState } from "react";
import { Settings, Save, CheckCircle2 } from "lucide-react";

export default function AdminSettingsPage() {
  const [warningThreshold, setWarningThreshold] = useState(80);
  const [highThreshold, setHighThreshold] = useState(90);
  const [reviewThreshold, setReviewThreshold] = useState(75);
  const [timezone, setTimezone] = useState("Asia/Ho_Chi_Minh");
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <Settings className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Cấu hình Hệ thống
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Tùy chỉnh ngưỡng so khớp OCR, ngưỡng cảnh báo chuyên cần và các giá trị điểm danh.
        </p>
      </div>

      {saved && (
        <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Đã lưu cấu hình hệ thống thành công!</span>
        </div>
      )}

      <form
        onSubmit={handleSave}
        className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6"
      >
        <div className="space-y-4 text-xs">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            1. Ngưỡng Chuyên cần & Cảnh báo
          </h3>

          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Ngưỡng chuyên cần cảnh báo (%)
            </label>
            <input
              type="number"
              value={warningThreshold}
              onChange={(e) => setWarningThreshold(parseInt(e.target.value, 10))}
              min={1}
              max={100}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs"
            />
            <div className="text-slate-400 text-[11px]">
              Sinh viên có tỷ lệ chuyên cần dưới mức này sẽ được hiển thị cảnh báo màu đỏ.
            </div>
          </div>
        </div>

        <div className="space-y-4 text-xs pt-4 border-t border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            2. Ngưỡng Nhận diện Zoom OCR
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Ngưỡng Tự động Khớp (Score &gt;= %)
              </label>
              <input
                type="number"
                value={highThreshold}
                onChange={(e) => setHighThreshold(parseInt(e.target.value, 10))}
                min={50}
                max={100}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Ngưỡng Cần Kiểm tra (Score &gt;= %)
              </label>
              <input
                type="number"
                value={reviewThreshold}
                onChange={(e) => setReviewThreshold(parseInt(e.target.value, 10))}
                min={30}
                max={90}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 text-xs pt-4 border-t border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            3. Múi giờ Hệ thống
          </h3>

          <div className="space-y-1.5">
            <input
              type="text"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-500/20 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>LƯU CẤU HÌNH</span>
        </button>
      </form>
    </div>
  );
}
