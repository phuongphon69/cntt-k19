// components/admin/admin-schedule-client.tsx
"use client";

import React, { useState } from "react";
import { Calendar, Plus, Clock, Video, User, Sparkles, Check, X, RefreshCw } from "lucide-react";
import { ScheduleItem, Subject } from "@/types";

interface AdminScheduleClientProps {
  initialSchedule: ScheduleItem[];
  subjects: Subject[];
}

export function AdminScheduleClient({ initialSchedule, subjects }: AdminScheduleClientProps) {
  const [schedule, setSchedule] = useState<ScheduleItem[]>(initialSchedule);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);

  // Form states
  const [subjectName, setSubjectName] = useState(subjects[0]?.name || "");
  const [date, setDate] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("Thứ 2");
  const [startPeriod, setStartPeriod] = useState(11);
  const [endPeriod, setEndPeriod] = useState(13);
  const [teacher, setTeacher] = useState(subjects[0]?.teacher || "");
  const [classUrl, setClassUrl] = useState("");

  // Batch states
  const [batchDay, setBatchDay] = useState("Thứ 2");
  const [batchFromDate, setBatchFromDate] = useState("");
  const [batchToDate, setBatchToDate] = useState("");

  const handleAddSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !subjectName) {
      alert("Vui lòng điền đủ thông tin ngày và môn học");
      return;
    }

    const newItem: ScheduleItem = {
      id: `tkb-manual-${Date.now()}`,
      subjectId: subjectName.toLowerCase().replace(/\s+/g, "_"),
      subjectName,
      date,
      dayOfWeek,
      startPeriod,
      endPeriod,
      startTime: "19:00",
      endTime: "21:30",
      teacher,
      classUrl,
      sessionType: "Học online",
      status: "SCHEDULED",
    };

    setSchedule([newItem, ...schedule]);
    setShowAddModal(false);
    setDate("");
    alert("Đã thêm buổi học vào danh sách!");
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="text-xs text-slate-500">
          Tổng số buổi trong thời khóa biểu: <strong>{schedule.length} buổi</strong>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowBatchModal(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Tạo lịch hàng loạt</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Thêm buổi học</span>
          </button>
        </div>
      </div>

      {/* Schedule Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                <th className="p-3.5">Thứ / Ngày</th>
                <th className="p-3.5">Môn học</th>
                <th className="p-3.5">Giảng viên</th>
                <th className="p-3.5">Buổi học</th>
                <th className="p-3.5">Khung giờ</th>
                <th className="p-3.5">Link lớp</th>
                <th className="p-3.5 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {schedule.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                  <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                    <span className="text-indigo-600 dark:text-indigo-400 mr-1">{item.dayOfWeek}</span>
                    <span>{item.date}</span>
                  </td>
                  <td className="p-3.5 font-bold text-slate-900 dark:text-white">{item.subjectName}</td>
                  <td className="p-3.5 text-slate-600 dark:text-slate-400">{item.teacher}</td>
                  <td className="p-3.5 font-medium">
                    {item.sessionNumber ? `Buổi ${item.sessionNumber}` : "--"}
                  </td>
                  <td className="p-3.5 text-slate-500">{item.startTime} - {item.endTime}</td>
                  <td className="p-3.5">
                    {item.classUrl ? (
                      <a
                        href={item.classUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Zoom</span>
                      </a>
                    ) : (
                      <span className="text-slate-400 italic">Chưa có link</span>
                    )}
                  </td>
                  <td className="p-3.5 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Single Session Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 space-y-4 shadow-2xl border">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">+ Thêm buổi học mới</h3>
              <button onClick={() => setShowAddModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleAddSession} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Môn học *</label>
                <select
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Thứ *</label>
                  <select
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs"
                  >
                    {["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"].map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Ngày (dd/mm/yyyy) *</label>
                  <input
                    type="text"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    placeholder="25/08/2026"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Giảng viên</label>
                <input
                  type="text"
                  value={teacher}
                  onChange={(e) => setTeacher(e.target.value)}
                  placeholder="Tên giảng viên..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Link Zoom / Meet</label>
                <input
                  type="url"
                  value={classUrl}
                  onChange={(e) => setClassUrl(e.target.value)}
                  placeholder="https://us06web.zoom.us/..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                LƯU BUỔI HỌC
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Batch Generator Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 space-y-4 shadow-2xl border">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Tạo lịch lặp hàng loạt</h3>
              <button onClick={() => setShowBatchModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Môn học</label>
                <select className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs">
                  {subjects.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Lặp vào thứ</label>
                <select
                  value={batchDay}
                  onChange={(e) => setBatchDay(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs"
                >
                  {["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"].map((d) => (
                    <option key={d} value={d}>
                      {d} hàng tuần
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Từ ngày</label>
                  <input
                    type="date"
                    value={batchFromDate}
                    onChange={(e) => setBatchFromDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Đến ngày</label>
                  <input
                    type="date"
                    value={batchToDate}
                    onChange={(e) => setBatchToDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  alert("Đã tạo lịch hàng loạt thành công!");
                  setShowBatchModal(false);
                }}
                className="w-full py-3 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-md mt-2"
              >
                XÁC NHẬN TẠO LỊCH LẶP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
