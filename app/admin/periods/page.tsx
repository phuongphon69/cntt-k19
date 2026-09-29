// app/admin/periods/page.tsx
"use client";

import React, { useState } from "react";
import { Clock, Plus, Save, Sparkles, CheckCircle2 } from "lucide-react";
import { Period } from "@/types";

export default function AdminPeriodsPage() {
  const [periods, setPeriods] = useState<Period[]>([
    { id: "tiet-1", periodNumber: 1, name: "Tiết 1", startTime: "07:00", endTime: "07:45", sortOrder: 1, active: true },
    { id: "tiet-2", periodNumber: 2, name: "Tiết 2", startTime: "07:50", endTime: "08:35", sortOrder: 2, active: true },
    { id: "tiet-3", periodNumber: 3, name: "Tiết 3", startTime: "08:40", endTime: "09:25", sortOrder: 3, active: true },
    { id: "tiet-4", periodNumber: 4, name: "Tiết 4", startTime: "09:35", endTime: "10:20", sortOrder: 4, active: true },
    { id: "tiet-5", periodNumber: 5, name: "Tiết 5", startTime: "10:25", endTime: "11:10", sortOrder: 5, active: true },
    { id: "tiet-6", periodNumber: 6, name: "Tiết 6", startTime: "13:00", endTime: "13:45", sortOrder: 6, active: true },
    { id: "tiet-7", periodNumber: 7, name: "Tiết 7", startTime: "13:50", endTime: "14:35", sortOrder: 7, active: true },
    { id: "tiet-8", periodNumber: 8, name: "Tiết 8", startTime: "14:40", endTime: "15:25", sortOrder: 8, active: true },
    { id: "tiet-9", periodNumber: 9, name: "Tiết 9", startTime: "15:35", endTime: "16:20", sortOrder: 9, active: true },
    { id: "tiet-10", periodNumber: 10, name: "Tiết 10", startTime: "16:25", endTime: "17:10", sortOrder: 10, active: true },
    { id: "tiet-11", periodNumber: 11, name: "Tiết 11", startTime: "19:00", endTime: "19:45", sortOrder: 11, active: true },
    { id: "tiet-12", periodNumber: 12, name: "Tiết 12", startTime: "19:50", endTime: "20:35", sortOrder: 12, active: true },
    { id: "tiet-13", periodNumber: 13, name: "Tiết 13", startTime: "20:45", endTime: "21:30", sortOrder: 13, active: true },
    { id: "tiet-14", periodNumber: 14, name: "Tiết 14", startTime: "20:30", endTime: "21:15", sortOrder: 14, active: true },
  ]);

  const [testStart, setTestStart] = useState(1);
  const [testEnd, setTestEnd] = useState(3);
  const [savedMessage, setSavedMessage] = useState("");

  const handleTimeChange = (id: string, field: "startTime" | "endTime", val: string) => {
    setPeriods((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: val } : p))
    );
  };

  // Calculate calculated hours for test range
  const startP = periods.find((p) => p.periodNumber === testStart);
  const endP = periods.find((p) => p.periodNumber === testEnd);
  const calculatedRange = `${startP?.startTime || "07:00"} → ${endP?.endTime || "09:25"}`;

  const handleSave = () => {
    setSavedMessage("Đã lưu khung giờ các tiết học thành công!");
    setTimeout(() => setSavedMessage(""), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Cấu hình Tiết học
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Thiết lập khung giờ các tiết học của nhà trường. Hệ thống sẽ tự động tính toán giờ bắt đầu và kết thúc khi bạn chọn dải tiết.
        </p>
      </div>

      {savedMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{savedMessage}</span>
        </div>
      )}

      {/* Auto Range Calculator Demo */}
      <div className="p-5 rounded-3xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-300">
          <Sparkles className="w-4 h-4" />
          <span>Công cụ tự tính giờ từ dải tiết:</span>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span>Từ:</span>
            <select
              value={testStart}
              onChange={(e) => setTestStart(parseInt(e.target.value, 10))}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border font-bold"
            >
              {periods.map((p) => (
                <option key={p.id} value={p.periodNumber}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span>Đến:</span>
            <select
              value={testEnd}
              onChange={(e) => setTestEnd(parseInt(e.target.value, 10))}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border font-bold"
            >
              {periods.map((p) => (
                <option key={p.id} value={p.periodNumber}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">
            Giờ tự động: {calculatedRange}
          </div>
        </div>
      </div>

      {/* Periods Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-bold border-b">
              <th className="p-3.5">Tiết</th>
              <th className="p-3.5">Tên hiển thị</th>
              <th className="p-3.5">Giờ bắt đầu</th>
              <th className="p-3.5">Giờ kết thúc</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {periods.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/50">
                <td className="p-3.5 font-bold text-slate-900 dark:text-white">{p.periodNumber}</td>
                <td className="p-3.5 font-medium">{p.name}</td>
                <td className="p-3.5">
                  <input
                    type="time"
                    value={p.startTime}
                    onChange={(e) => handleTimeChange(p.id, "startTime", e.target.value)}
                    className="px-2 py-1 rounded bg-slate-50 dark:bg-slate-800 border text-xs font-mono"
                  />
                </td>
                <td className="p-3.5">
                  <input
                    type="time"
                    value={p.endTime}
                    onChange={(e) => handleTimeChange(p.id, "endTime", e.target.value)}
                    className="px-2 py-1 rounded bg-slate-50 dark:bg-slate-800 border text-xs font-mono"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={handleSave}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-500/20 cursor-pointer"
      >
        <Save className="w-4 h-4" />
        <span>LƯU KHUNG GIỜ TIẾT HỌC</span>
      </button>
    </div>
  );
}
