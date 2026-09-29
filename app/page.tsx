// app/page.tsx
import React from "react";
import Link from "next/link";
import {
  Users,
  BookOpen,
  CalendarCheck,
  Percent,
  Clock,
  Video,
  ArrowRight,
  ExternalLink,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { getPublicStudents, getSubjects, getSchedule } from "@/lib/google-sheets/reader";
import { formatDateVN, parseVNDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const students = await getPublicStudents();
  const subjects = await getSubjects();
  const schedule = await getSchedule();

  // Find today's schedule
  const now = new Date();
  const vnTimeStr = now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
  const vnDate = new Date(vnTimeStr);
  const todayStr = formatDateVN(vnDate);

  const todayMidnight = new Date(vnDate.getFullYear(), vnDate.getMonth(), vnDate.getDate(), 0, 0, 0, 0);

  // 1. Classes today
  const todayClasses = schedule.filter((s) => {
    const d = parseVNDate(s.date);
    if (!d) return s.date === todayStr;
    return (
      d.getDate() === vnDate.getDate() &&
      d.getMonth() === vnDate.getMonth() &&
      d.getFullYear() === vnDate.getFullYear()
    );
  });

  // 2. Future upcoming classes
  const futureClasses = schedule
    .map((item) => ({ item, date: parseVNDate(item.date) }))
    .filter(({ date }) => {
      if (!date) return false;
      const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
      return d.getTime() > todayMidnight.getTime();
    })
    .sort((a, b) => (a.date?.getTime() || 0) - (b.date?.getTime() || 0));

  // 3. Past classes
  const pastClasses = schedule
    .map((item) => ({ item, date: parseVNDate(item.date) }))
    .filter(({ date }) => {
      if (!date) return false;
      const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
      return d.getTime() <= todayMidnight.getTime();
    })
    .sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));

  const isActuallyToday = todayClasses.length > 0;
  const isUpcoming = !isActuallyToday && futureClasses.length > 0;
  const todayClass = todayClasses[0] || futureClasses[0]?.item || pastClasses[0]?.item || null;

  // Compute metrics
  const totalStudents = students.length;
  const totalSubjects = subjects.length;
  const totalRecordedSessions = subjects.reduce(
    (acc, s) => acc + (s.recordedSessionsCount || 0),
    0
  );

  let totalRates = 0;
  let subWithRates = 0;
  for (const s of subjects) {
    if (s.averageAttendanceRate && s.averageAttendanceRate > 0) {
      totalRates += s.averageAttendanceRate;
      subWithRates++;
    }
  }
  const averageRate = subWithRates > 0 ? Math.round((totalRates / subWithRates) * 10) / 10 : 85.0;

  return (
    <div className="container mx-auto px-4 sm:px-6 pt-6 space-y-8 max-w-7xl">
      {/* Top Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-sky-600 text-white p-6 sm:p-10 shadow-xl shadow-indigo-600/15">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 backdrop-blur-md text-indigo-100 border border-white/20">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Niên khóa CNTT - K19 Cao đẳng</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Hệ thống Điểm danh & Thời khóa biểu
          </h1>
          <p className="text-sm sm:text-base text-indigo-100/90 leading-relaxed">
            Tra cứu kết quả chuyên cần, ma trận điểm danh theo từng buổi học và thông tin link lớp
            trực tuyến được đồng bộ tự động từ Google Sheets.
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              href="/schedule"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-white text-indigo-700 hover:bg-indigo-50 shadow-md hover:shadow-lg transition-all"
            >
              <span>Xem Thời khóa biểu</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/subjects"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/20 transition-colors"
            >
              <span>Bảng điểm danh môn học</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Dashboard Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Tổng học viên
            </span>
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {totalStudents}
            </span>
            <span className="text-xs text-slate-500 font-medium">học viên active</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Môn học
            </span>
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {totalSubjects}
            </span>
            <span className="text-xs text-slate-500 font-medium">môn trong kỳ</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Buổi đã ghi nhận
            </span>
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {totalRecordedSessions}
            </span>
            <span className="text-xs text-slate-500 font-medium">buổi điểm danh</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Chuyên cần TB
            </span>
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {averageRate}%
            </span>
            <span className="text-xs text-slate-500 font-medium">toàn khóa</span>
          </div>
        </div>
      </div>

      {/* Live Today Class Card */}
      {todayClass && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  isActuallyToday
                    ? "bg-emerald-500 animate-pulse"
                    : isUpcoming
                    ? "bg-indigo-500 animate-pulse"
                    : "bg-slate-400"
                }`}
              />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {isActuallyToday
                  ? "Lịch học hôm nay"
                  : isUpcoming
                  ? "Lịch học tiếp theo"
                  : "Buổi học gần nhất vừa qua"}{" "}
                ({todayClass.dayOfWeek} - {todayClass.date})
              </h2>
            </div>
            <Link
              href="/today"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>Xem chi tiết phòng & giờ</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-block px-2.5 py-0.5 rounded-md text-xs font-semibold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                  {todayClass.subjectName}
                </div>
                {todayClass.sessionNumber && (
                  <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                    Buổi {todayClass.sessionNumber}
                  </span>
                )}
              </div>
              <div className="text-base font-bold text-slate-900 dark:text-white">
                Giảng viên: {todayClass.teacher || "Chưa cập nhật"}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  {todayClass.startTime === "19:00" && todayClass.endTime === "21:30"
                    ? "19h00 - 21h30"
                    : `${todayClass.startTime} - ${todayClass.endTime}`}
                </span>
                {todayClass.room && <span>• Phòng: {todayClass.room}</span>}
                {todayClass.zoomAccount && <span>• {todayClass.zoomAccount}</span>}
              </div>
            </div>

            {todayClass.classUrl ? (
              <a
                href={todayClass.classUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-500/20 active:scale-95 transition-all"
              >
                <Video className="w-4 h-4" />
                <span>VÀO LỚP NGAY</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>
            ) : (
              <span className="text-xs text-slate-400 italic">Chưa có link trực tuyến</span>
            )}
          </div>
        </div>
      )}

      {/* Subject List Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Danh sách môn học
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Chọn môn để xem bảng điểm danh chi tiết từng buổi
            </p>
          </div>
          <Link
            href="/subjects"
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            <span>Tất cả môn</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {subjects.map((sub) => {
            const progress = sub.totalSessions > 0 ? Math.min(100, Math.round(((sub.recordedSessionsCount || 0) / sub.totalSessions) * 100)) : 0;
            return (
              <Link
                key={sub.id}
                href={`/subjects/${sub.id}`}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {sub.attendanceSheet}
                    </span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {sub.averageAttendanceRate || 0}% CC
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {sub.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">GV: {sub.teacher}</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Tiến độ: {sub.recordedSessionsCount || 0}/{sub.totalSessions} buổi</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
