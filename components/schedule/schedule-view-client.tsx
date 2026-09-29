// components/schedule/schedule-view-client.tsx
"use client";

import React, { useState, useMemo } from "react";
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
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CalendarDays,
  Grid,
} from "lucide-react";
import { ScheduleItem } from "@/types";
import { normalizeVietnameseNameWithoutAccent } from "@/lib/vietnamese/normalize";

interface ScheduleViewClientProps {
  schedule: ScheduleItem[];
}

interface WeekInfo {
  weekNumber: number;
  label: string;
  startDate: Date;
  endDate: Date;
  startDateStr: string;
  endDateStr: string;
  items: ScheduleItem[];
}

function parseItemDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split("/").map((p) => parseInt(p.trim(), 10));
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return null;
  }
  const year = parts[2] < 100 ? 2000 + parts[2] : parts[2];
  // parts[0] = day, parts[1] = month, parts[2] = year
  return new Date(year, parts[1] - 1, parts[0]);
}

function formatDateDisplay(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}

export function ScheduleViewClient({ schedule }: ScheduleViewClientProps) {
  const [viewMode, setViewMode] = useState<"week" | "month" | "list">("week");
  const [subjectFilter, setSubjectFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // 1. Extract all available Months from schedule sorted chronologically
  const availableMonths = useMemo(() => {
    const monthsMap = new Map<string, { label: string; year: number; month: number }>();
    schedule.forEach((item) => {
      const d = parseItemDate(item.date);
      if (d) {
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const key = `${y}-${String(m).padStart(2, "0")}`;
        const label = `Tháng ${String(m).padStart(2, "0")}/${y}`;
        if (!monthsMap.has(key)) {
          monthsMap.set(key, { label, year: y, month: m });
        }
      }
    });

    const sorted = Array.from(monthsMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    return sorted.map(([key, val]) => ({ key, ...val }));
  }, [schedule]);

  // Determine current month or default to earliest month in schedule
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const defaultMonthKey = availableMonths.some((m) => m.key === currentMonthKey)
    ? currentMonthKey
    : availableMonths[0]?.key || "ALL";

  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(defaultMonthKey);

  // 2. Filter items by Subject and Search query (WITHOUT month restriction)
  // This ensures weeks spanning across month boundaries (e.g. 28/09 - 04/10) retain all sessions!
  const cleanQ = normalizeVietnameseNameWithoutAccent(searchQuery);

  const queryFilteredSchedule = useMemo(() => {
    return schedule.filter((item) => {
      if (subjectFilter !== "ALL" && item.subjectName !== subjectFilter) {
        return false;
      }

      if (cleanQ) {
        const sName = normalizeVietnameseNameWithoutAccent(item.subjectName);
        const tName = normalizeVietnameseNameWithoutAccent(item.teacher || "");
        const dStr = normalizeVietnameseNameWithoutAccent(item.date);
        if (!sName.includes(cleanQ) && !tName.includes(cleanQ) && !dStr.includes(cleanQ)) {
          return false;
        }
      }

      return true;
    });
  }, [schedule, subjectFilter, cleanQ]);

  // Month-filtered schedule specifically for Month view and List view
  const monthFilteredSchedule = useMemo(() => {
    return queryFilteredSchedule.filter((item) => {
      if (selectedMonthKey !== "ALL") {
        const d = parseItemDate(item.date);
        if (!d) return false;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (key !== selectedMonthKey) return false;
      }
      return true;
    });
  }, [queryFilteredSchedule, selectedMonthKey]);

  // 3. Generate Weeks for the selected Month (or all weeks if "ALL")
  const weeksOfMonth = useMemo<WeekInfo[]>(() => {
    if (selectedMonthKey === "ALL") {
      const dates = schedule
        .map((s) => parseItemDate(s.date))
        .filter((d): d is Date => d !== null)
        .sort((a, b) => a.getTime() - b.getTime());

      if (dates.length === 0) return [];

      const minDate = dates[0];
      const maxDate = dates[dates.length - 1];

      let currentMonday = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
      const dayOfWeek = currentMonday.getDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      currentMonday.setDate(currentMonday.getDate() + diffToMonday);

      const weeks: WeekInfo[] = [];
      let weekNum = 1;

      while (currentMonday <= maxDate) {
        const currentSunday = new Date(currentMonday);
        currentSunday.setDate(currentSunday.getDate() + 6);

        const monTime = new Date(currentMonday.getFullYear(), currentMonday.getMonth(), currentMonday.getDate(), 0, 0, 0, 0).getTime();
        const sunTime = new Date(currentSunday.getFullYear(), currentSunday.getMonth(), currentSunday.getDate(), 23, 59, 59, 999).getTime();

        const itemsInWeek = queryFilteredSchedule.filter((item) => {
          const d = parseItemDate(item.date);
          if (!d) return false;
          const t = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0).getTime();
          return t >= monTime && t <= sunTime;
        });

        const label = `Tuần ${weekNum} (${formatDateDisplay(currentMonday)} - ${formatDateDisplay(currentSunday)})`;
        weeks.push({
          weekNumber: weekNum,
          label,
          startDate: new Date(currentMonday),
          endDate: new Date(currentSunday),
          startDateStr: formatDateDisplay(currentMonday),
          endDateStr: formatDateDisplay(currentSunday),
          items: itemsInWeek,
        });

        currentMonday = new Date(currentMonday);
        currentMonday.setDate(currentMonday.getDate() + 7);
        weekNum++;
      }

      return weeks;
    }

    const [yearStr, monthStr] = selectedMonthKey.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1; // 0-indexed

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const weeks: WeekInfo[] = [];
    let currentMonday = new Date(firstDay);
    // Find Monday of the first week
    const dayOfWeek = currentMonday.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    currentMonday.setDate(currentMonday.getDate() + diffToMonday);

    let weekNum = 1;
    while (currentMonday <= lastDay) {
      const currentSunday = new Date(currentMonday);
      currentSunday.setDate(currentSunday.getDate() + 6);

      const monTime = new Date(currentMonday.getFullYear(), currentMonday.getMonth(), currentMonday.getDate(), 0, 0, 0, 0).getTime();
      const sunTime = new Date(currentSunday.getFullYear(), currentSunday.getMonth(), currentSunday.getDate(), 23, 59, 59, 999).getTime();

      // Collect items falling in this week from queryFilteredSchedule so crossing-month items
      // (like 01/10, 02/10, 03/10 in week 28/09 - 04/10) are NEVER lost!
      const itemsInWeek = queryFilteredSchedule.filter((item) => {
        const d = parseItemDate(item.date);
        if (!d) return false;
        const t = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0).getTime();
        return t >= monTime && t <= sunTime;
      });

      const label = `Tuần ${weekNum} (${formatDateDisplay(currentMonday)} - ${formatDateDisplay(currentSunday)})`;
      weeks.push({
        weekNumber: weekNum,
        label,
        startDate: new Date(currentMonday),
        endDate: new Date(currentSunday),
        startDateStr: formatDateDisplay(currentMonday),
        endDateStr: formatDateDisplay(currentSunday),
        items: itemsInWeek,
      });

      // Next Monday
      currentMonday = new Date(currentMonday);
      currentMonday.setDate(currentMonday.getDate() + 7);
      weekNum++;
    }

    return weeks;
  }, [selectedMonthKey, queryFilteredSchedule, schedule]);

  // Find current week index in the active month
  const currentWeekIndexInMonth = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return weeksOfMonth.findIndex((w) => {
      const s = new Date(w.startDate);
      s.setHours(0, 0, 0, 0);
      const e = new Date(w.endDate);
      e.setHours(23, 59, 59, 999);
      return today >= s && today <= e;
    });
  }, [weeksOfMonth]);

  // Default week index: prioritize current week, then first week with classes, then 0
  const defaultWeekIndex = useMemo(() => {
    if (weeksOfMonth.length === 0) return 0;
    if (currentWeekIndexInMonth !== -1) {
      return currentWeekIndexInMonth;
    }
    const hasItemsIdx = weeksOfMonth.findIndex((w) => w.items.length > 0);
    return hasItemsIdx !== -1 ? hasItemsIdx : 0;
  }, [weeksOfMonth, currentWeekIndexInMonth]);

  // Selected week index: null means follow defaultWeekIndex (prioritizing current week)
  const [userSelectedWeekIndex, setUserSelectedWeekIndex] = useState<number | null>(null);

  const selectedWeekIndex =
    userSelectedWeekIndex !== null && userSelectedWeekIndex >= 0 && userSelectedWeekIndex < weeksOfMonth.length
      ? userSelectedWeekIndex
      : defaultWeekIndex;

  const activeWeek = weeksOfMonth[selectedWeekIndex] || weeksOfMonth[0];

  const studySessionsCount = useMemo(() => {
    if (!activeWeek) return 0;
    return activeWeek.items.filter(
      (item) => !item.subjectName.toLowerCase().includes("nghỉ")
    ).length;
  }, [activeWeek]);

  const dayOffCount = useMemo(() => {
    if (!activeWeek) return 0;
    return activeWeek.items.length - studySessionsCount;
  }, [activeWeek, studySessionsCount]);

  // Extract unique subjects for dropdown
  const uniqueSubjects = Array.from(new Set(schedule.map((s) => s.subjectName))).filter(Boolean);

  // Handlers for month/week navigation
  const handleSelectMonth = (monthKey: string) => {
    setSelectedMonthKey(monthKey);
    setUserSelectedWeekIndex(null);
  };

  const handlePrevMonth = () => {
    const idx = availableMonths.findIndex((m) => m.key === selectedMonthKey);
    if (idx > 0) {
      setSelectedMonthKey(availableMonths[idx - 1].key);
      setUserSelectedWeekIndex(null);
    }
  };

  const handleNextMonth = () => {
    const idx = availableMonths.findIndex((m) => m.key === selectedMonthKey);
    if (idx >= 0 && idx < availableMonths.length - 1) {
      setSelectedMonthKey(availableMonths[idx + 1].key);
      setUserSelectedWeekIndex(null);
    }
  };

  const handleGoToCurrentWeek = () => {
    if (availableMonths.some((m) => m.key === currentMonthKey)) {
      setSelectedMonthKey(currentMonthKey);
    }
    setUserSelectedWeekIndex(null);
    setViewMode("week");
  };

  // Day columns for Week view (Thứ 2 -> Chủ Nhật)
  const weekDays = useMemo(() => {
    if (!activeWeek) return [];
    const days = [];
    const dayNames = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"];

    for (let i = 0; i < 7; i++) {
      const d = new Date(activeWeek.startDate);
      d.setDate(d.getDate() + i);

      const dDay = String(d.getDate()).padStart(2, "0");
      const dMonth = String(d.getMonth() + 1).padStart(2, "0");
      const dYear = d.getFullYear();
      const dateStr = `${dDay}/${dMonth}/${dYear}`;

      const itemsOnDay = activeWeek.items.filter((item) => {
        const itemDate = parseItemDate(item.date);
        if (!itemDate) return false;
        return (
          itemDate.getDate() === d.getDate() &&
          itemDate.getMonth() === d.getMonth() &&
          itemDate.getFullYear() === d.getFullYear()
        );
      });

      const isToday =
        now.getDate() === d.getDate() &&
        now.getMonth() === d.getMonth() &&
        now.getFullYear() === d.getFullYear();

      days.push({
        name: dayNames[i],
        date: d,
        dateStr,
        displayDate: `${dDay}/${dMonth}`,
        items: itemsOnDay,
        isToday,
      });
    }

    return days;
  }, [activeWeek, now]);

  return (
    <div className="space-y-6">
      {/* Month Selector Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Month Navigation */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              disabled={availableMonths.findIndex((m) => m.key === selectedMonthKey) <= 0}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
              title="Tháng trước"
            >
              <ChevronLeft className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            </button>

            <div className="flex flex-wrap items-center gap-1.5">
              {availableMonths.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => handleSelectMonth(m.key)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedMonthKey === m.key
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  <span>{m.label}</span>
                  {m.key === currentMonthKey && (
                    <span className="ml-1 text-[10px] opacity-90 font-bold">• Hiện tại</span>
                  )}
                </button>
              ))}

              <button
                type="button"
                onClick={() => {
                  setSelectedMonthKey("ALL");
                  setUserSelectedWeekIndex(null);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedMonthKey === "ALL"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                Tất cả tháng
              </button>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              disabled={
                availableMonths.findIndex((m) => m.key === selectedMonthKey) >=
                availableMonths.length - 1
              }
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
              title="Tháng sau"
            >
              <ChevronRight className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            </button>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
            {/* Quick button to jump to Current Week */}
            <button
              type="button"
              onClick={handleGoToCurrentWeek}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-bold transition-all ${
                selectedMonthKey === currentMonthKey && selectedWeekIndex === currentWeekIndexInMonth && viewMode === "week"
                  ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20"
                  : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 hover:bg-emerald-100 dark:hover:bg-emerald-900/60"
              }`}
              title="Nhảy nhanh đến tuần hiện tại"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              <span>Tuần hiện tại</span>
            </button>

            {/* View Mode Switcher */}
            <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode("week")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === "week"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Dạng Tuần</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode("month")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === "month"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Dạng Tháng</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === "list"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Danh sách</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Inputs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo môn, giảng viên, ngày..."
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 outline-none text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="bg-transparent border-none outline-none text-slate-700 dark:text-slate-200 font-semibold cursor-pointer"
            >
              <option value="ALL">Tất cả môn ({monthFilteredSchedule.length} buổi)</option>
              {uniqueSubjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Week Selector Tab (Active when in 'week' view) */}
      {viewMode === "week" && weeksOfMonth.length > 0 && (
        <div className="bg-indigo-50/70 dark:bg-indigo-950/40 p-4 rounded-3xl border border-indigo-100 dark:border-indigo-900/60 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-300">
              <CalendarDays className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Chọn tuần trong tháng:</span>
              {selectedWeekIndex === currentWeekIndexInMonth && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Đang xem tuần hiện tại
                </span>
              )}
            </div>

            <div className="text-xs font-semibold text-slate-500">
              Tuần đang xem có <strong>{studySessionsCount}</strong> buổi học
              {dayOffCount > 0 && (
                <span className="text-amber-600 dark:text-amber-400 font-medium ml-1">
                  ({dayOffCount} ngày nghỉ)
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {weeksOfMonth.map((w, idx) => {
              const isCurrentWeek = idx === currentWeekIndexInMonth;
              const isSelected = selectedWeekIndex === idx;

              return (
                <button
                  key={w.weekNumber}
                  type="button"
                  onClick={() => setUserSelectedWeekIndex(idx)}
                  className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                      : isCurrentWeek
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-2 border-emerald-400 dark:border-emerald-600 hover:bg-emerald-100/70"
                      : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-indigo-100/50 border border-indigo-100/60 dark:border-indigo-900/40"
                  }`}
                >
                  <span>{w.label}</span>

                  {isCurrentWeek && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200"
                      }`}
                    >
                      Hiện tại
                    </span>
                  )}

                  {w.items.length > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                        isSelected
                          ? "bg-white text-indigo-700"
                          : isCurrentWeek
                          ? "bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200"
                          : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300"
                      }`}
                    >
                      {w.items.filter((it) => !it.subjectName.toLowerCase().includes("nghỉ")).length || w.items.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 1: WEEK GRID VIEW (Thứ 2 -> Chủ Nhật) */}
      {viewMode === "week" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
            {weekDays.map((day) => (
              <div
                key={day.name}
                className={`rounded-3xl border p-3.5 space-y-3 flex flex-col justify-between transition-all ${
                  day.isToday
                    ? "bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-700 shadow-sm"
                    : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800"
                }`}
              >
                {/* Day Header */}
                <div className="border-b border-slate-100 dark:border-slate-800/80 pb-2 text-center">
                  <div
                    className={`text-xs font-black uppercase ${
                      day.isToday
                        ? "text-indigo-600 dark:text-indigo-400"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {day.name}
                  </div>
                  <div
                    className={`text-sm font-bold mt-0.5 ${
                      day.isToday ? "text-indigo-600 dark:text-indigo-300 font-extrabold" : "text-slate-800 dark:text-slate-200"
                    }`}
                  >
                    {day.displayDate}
                  </div>
                  {day.isToday && (
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-600 text-white">
                      HÔM NAY
                    </span>
                  )}
                </div>

                {/* Day Items */}
                <div className="space-y-2.5 flex-1">
                  {day.items.length > 0 ? (
                    day.items.map((item) => {
                      const isDayOff =
                        item.subjectName.toLowerCase().includes("nghỉ") ||
                        item.subjectId.includes("nghi");

                      if (isDayOff) {
                        return (
                          <div
                            key={item.id}
                            className="p-3 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 shadow-xs space-y-1.5 text-center py-4 transition-all"
                          >
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-900/80 dark:text-amber-200 uppercase tracking-wide">
                              {item.subjectName}
                            </span>
                            {item.note ? (
                              <p className="text-[11px] text-amber-700 dark:text-amber-300 italic">
                                {item.note}
                              </p>
                            ) : (
                              <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80">
                                Lịch nghỉ theo TKB
                              </p>
                            )}
                          </div>
                        );
                      }

                      return (
                        <div
                          key={item.id}
                          className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200/70 dark:border-slate-700 shadow-xs space-y-2"
                        >
                          <div className="space-y-0.5">
                            <h4 className="font-extrabold text-xs text-slate-900 dark:text-white line-clamp-2">
                              {item.subjectName}
                            </h4>
                            <span className="inline-block text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                              {item.sessionNumber
                                ? `Buổi ${item.sessionNumber}`
                                : "19h00 - 21h30"}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-500 space-y-0.5">
                            <div className="flex items-center gap-1 truncate">
                              <User className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{item.teacher || "Chưa cập nhật"}</span>
                            </div>
                            <div className="flex items-center gap-1 font-mono text-[10px] text-slate-600 dark:text-slate-300">
                              <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                              <span>
                                {item.startTime === "19:00" && item.endTime === "21:30"
                                  ? "19h00 - 21h30"
                                  : `${item.startTime} - ${item.endTime}`}
                              </span>
                            </div>
                          </div>

                          {item.classUrl && (
                            <a
                              href={item.classUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl font-bold text-[11px] text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition-all"
                            >
                              <Video className="w-3 h-3" />
                              <span>VÀO LỚP</span>
                            </a>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-8 text-center text-slate-300 dark:text-slate-700 text-xs italic">
                      Nghỉ
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 2: MONTH CALENDAR GRID VIEW */}
      {viewMode === "month" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {monthFilteredSchedule.length > 0 ? (
              monthFilteredSchedule.map((item) => (
                <div
                  key={item.id}
                  className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                        {item.dayOfWeek} • {item.date}
                      </span>
                      {item.subjectName.toLowerCase().includes("nghỉ") ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                          Nghỉ học
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                          {item.sessionNumber
                            ? `Buổi ${item.sessionNumber}`
                            : "Lịch học"}
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                        {item.subjectName}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">GV: {item.teacher}</p>
                    </div>

                    <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      <span>
                        {item.startTime === "19:00" && item.endTime === "21:30"
                          ? "19h00 - 21h30"
                          : `${item.startTime} - ${item.endTime}`}
                      </span>
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
              ))
            ) : (
              <div className="col-span-full p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-400 text-sm">
                Không tìm thấy buổi học nào trong tháng này.
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 3: LIST VIEW */}
      {viewMode === "list" && (
        <div className="space-y-3">
          {monthFilteredSchedule.length > 0 ? (
            monthFilteredSchedule.map((item) => (
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
                      {item.subjectName.toLowerCase().includes("nghỉ") ? (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                          Nghỉ học
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                          {item.sessionNumber
                            ? `Buổi ${item.sessionNumber}`
                            : "Lịch học"}
                        </span>
                      )}
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
                        {item.startTime === "19:00" && item.endTime === "21:30"
                          ? "19h00 - 21h30"
                          : `${item.startTime} - ${item.endTime}`}
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
      )}
    </div>
  );
}
