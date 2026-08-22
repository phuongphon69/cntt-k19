// app/today/page.tsx
import React from "react";
import Link from "next/link";
import {
  Clock,
  Video,
  User,
  Calendar,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Phone,
  BookOpen,
  MapPin,
} from "lucide-react";
import { getSchedule } from "@/lib/google-sheets/reader";
import { formatDateVN } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const schedule = await getSchedule();

  // Current Vietnam time
  const now = new Date();
  const vnTimeStr = now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
  const vnDate = new Date(vnTimeStr);
  const todayStr = formatDateVN(vnDate);

  const currentHour = vnDate.getHours();
  const currentMinute = vnDate.getMinutes();
  const currentTotalMinutes = currentHour * 60 + currentMinute;

  // Filter classes today
  const todayClasses = schedule.filter((s) => s.date === todayStr);

  // Future upcoming classes
  const upcomingClasses = schedule.filter((s) => s.date !== todayStr).slice(0, 5);

  return (
    <div className="container mx-auto px-4 sm:px-6 pt-6 space-y-8 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 mb-2">
            <Calendar className="w-3.5 h-3.5" />
            <span>Ngày {todayStr} • Giờ VN ({String(currentHour).padStart(2, "0")}:{String(currentMinute).padStart(2, "0")})</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Lịch học hôm nay
          </h1>
        </div>

        <Link
          href="/schedule"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm self-start sm:self-auto"
        >
          <span>Xem toàn bộ thời khóa biểu</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Today's Classes List */}
      {todayClasses.length > 0 ? (
        <div className="space-y-4">
          {todayClasses.map((item) => {
            let isLiveNow = false;
            let statusBadge = (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                Sắp diễn ra
              </span>
            );

            if (item.startTime && item.endTime) {
              const [sH, sM] = item.startTime.split(":").map((x) => parseInt(x, 10));
              const [eH, eM] = item.endTime.split(":").map((x) => parseInt(x, 10));
              const startTotal = sH * 60 + sM;
              const endTotal = eH * 60 + eM;

              if (currentTotalMinutes >= startTotal && currentTotalMinutes <= endTotal) {
                isLiveNow = true;
                statusBadge = (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white shadow-sm shadow-emerald-500/30 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                    <span>ĐANG HỌC</span>
                  </span>
                );
              } else if (currentTotalMinutes < startTotal) {
                const diff = startTotal - currentTotalMinutes;
                if (diff <= 60) {
                  statusBadge = (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                      Bắt đầu sau {diff} phút
                    </span>
                  );
                } else {
                  statusBadge = (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                      Bắt đầu lúc {item.startTime}
                    </span>
                  );
                }
              } else {
                statusBadge = (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500">
                    Đã kết thúc
                  </span>
                );
              }
            }

            return (
              <div
                key={item.id}
                className={`p-6 rounded-3xl bg-white dark:bg-slate-900 border transition-all ${
                  isLiveNow
                    ? "border-emerald-500/80 shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-500/20"
                    : "border-slate-200/80 dark:border-slate-800 shadow-sm"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      {statusBadge}
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                        Tiết {item.startPeriod} - {item.endPeriod}
                      </span>
                    </div>

                    <div>
                      <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                        {item.subjectName}
                      </h2>
                      <div className="mt-2 flex flex-wrap items-center gap-y-2 gap-x-4 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                        <span className="flex items-center gap-1.5 font-medium">
                          <User className="w-4 h-4 text-indigo-500" />
                          Giảng viên: {item.teacher || "Chưa cập nhật"}
                        </span>
                        {item.teacherPhone && (
                          <span className="flex items-center gap-1 text-slate-500">
                            <Phone className="w-3.5 h-3.5" />
                            {item.teacherPhone}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5 font-medium">
                          <Clock className="w-4 h-4 text-amber-500" />
                          {item.startTime} - {item.endTime}
                        </span>
                        {item.room && (
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-rose-500" />
                            Phòng: {item.room}
                          </span>
                        )}
                      </div>
                    </div>

                    {item.zoomAccount && (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300">
                        <span className="font-semibold">Tài khoản lớp: </span>
                        <span>{item.zoomAccount}</span>
                        {item.note && <span className="ml-2 italic text-slate-400">({item.note})</span>}
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="flex flex-col gap-2 min-w-[180px]">
                    {item.classUrl ? (
                      <a
                        href={item.classUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-500/25 active:scale-95 transition-all text-center"
                      >
                        <Video className="w-4 h-4" />
                        <span>VÀO LỚP</span>
                        <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                      </a>
                    ) : (
                      <div className="text-center p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-400">
                        Chưa có link lớp trực tuyến
                      </div>
                    )}

                    <Link
                      href={`/subjects/${item.subjectId}`}
                      className="w-full inline-flex items-center justify-center gap-1 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Xem điểm danh môn</span>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
            <Sparkles className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Hôm nay lớp không có lịch học.
            </h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Bạn có thể xem lại bảng điểm danh các môn đã học hoặc tra cứu thời khóa biểu của các buổi sắp tới.
            </p>
          </div>
        </div>
      )}

      {/* Upcoming Schedule Preview */}
      <div className="space-y-4 pt-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <span>Các buổi học sắp tới</span>
        </h2>

        <div className="space-y-2.5">
          {upcomingClasses.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="text-center min-w-[70px] p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                  <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                    {item.dayOfWeek}
                  </div>
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                    {item.date}
                  </div>
                </div>

                <div>
                  <div className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                    {item.subjectName}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    GV: {item.teacher} • Giờ: {item.startTime} - {item.endTime}
                  </div>
                </div>
              </div>

              {item.classUrl && (
                <a
                  href={item.classUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Zoom / Meet</span>
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
