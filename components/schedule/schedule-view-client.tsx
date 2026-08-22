// components/schedule/schedule-view-client.tsx
"use client";

import React, { useState } from "react";
import {
  Calendar as CalendarIcon,
  List,
  Clock,
  Video,
  ExternalLink,
  Search,
  BookOpen,
  User,
  Phone,
  MapPin,
  Filter,
} from "lucide-react";
import { ScheduleItem } from "@/types";
import { normalizeVietnameseNameWithoutAccent } from "@/lib/vietnamese/normalize";

interface ScheduleViewClientProps {
  schedule: ScheduleItem[];
}

export function ScheduleViewClient({ schedule }: ScheduleViewClientProps) {
  const [viewMode, setViewMode] = useState<"list" | "week">("list");
  const [subjectFilter, setSubjectFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const cleanQ = normalizeVietnameseNameWithoutAccent(searchQuery);

  // Extract unique subjects for filter dropdown
  const uniqueSubjects = Array.from(new Set(schedule.map((s) => s.subjectName))).filter(Boolean);

  // Filter schedule
  const filteredSchedule = schedule.filter((item) => {
    if (subjectFilter !== "ALL" && item.subjectName !== subjectFilter) return false;
    if (!cleanQ) return true;
    const sName = normalizeVietnameseNameWithoutAccent(item.subjectName);
    const tName = normalizeVietnameseNameWithoutAccent(item.teacher || "");
    const dStr = normalizeVietnameseNameWithoutAccent(item.date);
    return sName.includes(cleanQ) || tName.includes(cleanQ) || dStr.includes(cleanQ);
  });

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo môn, giảng viên, ngày..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-slate-900 dark:text-white"
          />
        </div>

        {/* Filter & View Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Subject Filter */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="bg-transparent border-none outline-none text-slate-700 dark:text-slate-200 font-semibold cursor-pointer"
            >
              <option value="ALL">Tất cả môn ({schedule.length})</option>
              {uniqueSubjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "list"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Danh sách</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode("week")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "week"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Dạng lưới</span>
            </button>
          </div>
        </div>
      </div>

      {/* Schedule Items: List View */}
      {viewMode === "list" ? (
        <div className="space-y-3">
          {filteredSchedule.length > 0 ? (
            filteredSchedule.map((item) => (
              <div
                key={item.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start sm:items-center gap-4 flex-1">
                  {/* Date Badge */}
                  <div className="min-w-[80px] p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-center shrink-0">
                    <div className="text-[11px] font-black uppercase text-indigo-600 dark:text-indigo-400">
                      {item.dayOfWeek}
                    </div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {item.date}
                    </div>
                  </div>

                  {/* Class Info */}
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                        {item.subjectName}
                      </h3>
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        Tiết {item.startPeriod} - {item.endPeriod}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                        <User className="w-3.5 h-3.5 text-indigo-500" />
                        GV: {item.teacher || "Chưa cập nhật"}
                      </span>
                      {item.teacherPhone && (
                        <span className="flex items-center gap-1 text-slate-400">
                          <Phone className="w-3 h-3" />
                          {item.teacherPhone}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        {item.startTime} - {item.endTime}
                      </span>
                      {item.room && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-rose-500" />
                          Phòng: {item.room}
                        </span>
                      )}
                    </div>

                    {item.zoomAccount && (
                      <div className="text-[11px] text-slate-500 italic mt-1">
                        Tài khoản: {item.zoomAccount}
                      </div>
                    )}
                  </div>
                </div>

                {/* Class Link Action */}
                {item.classUrl && (
                  <a
                    href={item.classUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-500/20 active:scale-95 transition-all self-start sm:self-center"
                  >
                    <Video className="w-4 h-4" />
                    <span>VÀO LỚP</span>
                    <ExternalLink className="w-3 h-3 opacity-70" />
                  </a>
                )}
              </div>
            ))
          ) : (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-400 text-sm">
              Không tìm thấy buổi học nào phù hợp với bộ lọc.
            </div>
          )}
        </div>
      ) : (
        /* Grid / Calendar View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSchedule.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                    {item.dayOfWeek} • {item.date}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    Tiết {item.startPeriod}-{item.endPeriod}
                  </span>
                </div>

                <div>
                  <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
                    {item.subjectName}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">GV: {item.teacher}</p>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>{item.startTime} - {item.endTime}</span>
                </div>
              </div>

              {item.classUrl && (
                <a
                  href={item.classUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-500 transition-all text-center"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Vào lớp Zoom / Meet</span>
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
