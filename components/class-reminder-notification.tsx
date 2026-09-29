// components/class-reminder-notification.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Bell,
  BellRing,
  Check,
  Calendar,
  ExternalLink,
  Volume2,
  Clock,
  X,
  Smartphone,
  Zap,
} from "lucide-react";
import { ScheduleItem } from "@/types";

interface ClassReminderProps {
  todayClasses?: ScheduleItem[];
  upcomingClass?: ScheduleItem;
}

interface CountdownState {
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
  isLive: boolean;
}

// ─── Utility helpers ─────────────────────────────────────────────────────────
function getClassTotalMinutes(timeStr: string): number {
  const parts = timeStr.split(":").map((x) => parseInt(x, 10));
  return parts[0] * 60 + (parts[1] || 0);
}

function computeCountdown(startTime?: string, endTime?: string): CountdownState | null {
  if (!startTime) return null;
  const now = new Date();
  const vnStr = now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
  const vnNow = new Date(vnStr);
  const currentMinutes = vnNow.getHours() * 60 + vnNow.getMinutes();
  const currentSeconds = currentMinutes * 60 + vnNow.getSeconds();

  const startMinutes = getClassTotalMinutes(startTime);
  const endMinutes = endTime ? getClassTotalMinutes(endTime) : startMinutes + 150;

  const startSeconds = startMinutes * 60;
  const endSeconds = endMinutes * 60;

  if (currentSeconds >= startSeconds && currentSeconds <= endSeconds) {
    return { hours: 0, minutes: 0, seconds: 0, isPast: false, isLive: true };
  }
  if (currentSeconds > endSeconds) {
    return { hours: 0, minutes: 0, seconds: 0, isPast: true, isLive: false };
  }

  const diff = startSeconds - currentSeconds;
  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;
  return { hours, minutes, seconds, isPast: false, isLive: false };
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function ClassReminderNotification({
  todayClasses = [],
  upcomingClass,
}: ClassReminderProps) {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);
  const [swReady, setSwReady] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const [countdown, setCountdown] = useState<CountdownState | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const notifiedRef = useRef<Set<string>>(new Set());

  // ─── Init: Register SW + read permission ───────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    setIsSupported(true);
    setPermission(Notification.permission);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          console.log("[SW] Registered:", reg.scope);
          // Wait for SW to be ready
          return navigator.serviceWorker.ready;
        })
        .then(() => {
          setSwReady(true);
        })
        .catch((err) => {
          console.warn("[SW] Error:", err);
        });
    }
  }, []);

  // ─── Countdown ticker ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!upcomingClass?.startTime) return;

    const tick = () => {
      setCountdown(computeCountdown(upcomingClass.startTime, upcomingClass.endTime));
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [upcomingClass]);

  // ─── Auto-reminder scheduler ────────────────────────────────────────────────
  const scheduleReminder = useCallback(
    (minutesBefore: number) => {
      if (!upcomingClass?.startTime || permission !== "granted") return;

      const dateStr = upcomingClass.date || new Date().toLocaleDateString("vi-VN");
      const key = `notified_${upcomingClass.id}_${dateStr}_${minutesBefore}min`;
      if (notifiedRef.current.has(key) || localStorage.getItem(key)) return;

      const now = new Date();
      const vnStr = now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
      const vnNow = new Date(vnStr);
      const currentMinutes = vnNow.getHours() * 60 + vnNow.getMinutes();
      const startMinutes = getClassTotalMinutes(upcomingClass.startTime);
      const diff = startMinutes - currentMinutes;

      if (diff <= minutesBefore && diff > minutesBefore - 2) {
        notifiedRef.current.add(key);
        localStorage.setItem(key, "true");

        const title =
          minutesBefore <= 10
            ? `🚨 Còn ${diff} phút! Vào lớp ngay: ${upcomingClass.subjectName}`
            : `🔔 Còn ${diff} phút đến giờ học: ${upcomingClass.subjectName}`;

        const body = `Lớp bắt đầu lúc ${upcomingClass.startTime} • GV: ${
          upcomingClass.teacher || "Giảng viên"
        }. ${diff <= 10 ? "ĐÃ ĐẾN GIỜ VÀO LỚP!" : "Chuẩn bị thiết bị và vào lớp nhé!"}`;

        sendNotification(title, body, upcomingClass.classUrl || "/today");
      }
    },
    [upcomingClass, permission]
  );

  useEffect(() => {
    if (permission !== "granted" || !upcomingClass?.startTime) return;
    const interval = setInterval(() => {
      scheduleReminder(30);
      scheduleReminder(15);
      scheduleReminder(10);
      scheduleReminder(5);
    }, 30000); // check every 30s
    scheduleReminder(30);
    scheduleReminder(15);
    scheduleReminder(10);
    scheduleReminder(5);
    return () => clearInterval(interval);
  }, [permission, upcomingClass, scheduleReminder]);

  // ─── Core notification sender ───────────────────────────────────────────────
  const sendNotification = (title: string, body: string, url: string) => {
    // Vibrate device
    if ("vibrate" in navigator) {
      navigator.vibrate([300, 100, 300, 100, 500, 200, 500]);
    }

    if (swReady && "serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(title, {
          body,
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          vibrate: [300, 100, 300, 100, 500],
          tag: "cntt-k19-class",
          renotify: true,
          requireInteraction: true,
          data: { url },
          actions: [
            { action: "open_class", title: "📹 Vào lớp ngay" },
            { action: "dismiss", title: "Bỏ qua" },
          ],
        } as NotificationOptions);
      });
    } else {
      new Notification(title, {
        body,
        icon: "/icon-192.png",
      });
    }
  };

  const requestPermission = async () => {
    if (!isSupported) return;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") {
      sendNotification(
        "✅ CNTT-K19: Đã bật thông báo!",
        "Bạn sẽ nhận chuông thông báo trước giờ học 30 phút, 15 phút và 5 phút.",
        "/today"
      );
    }
  };

  const handleTest = () => {
    if (permission !== "granted") {
      requestPermission();
      return;
    }
    setTestSent(true);
    sendNotification(
      "🔔 [Thử] Còn 15 phút đến giờ học CNTT-K19",
      `${upcomingClass?.subjectName || "Cấu Trúc Dữ Liệu"} lúc ${
        upcomingClass?.startTime || "19:00"
      }. Chuẩn bị thiết bị nhé!`,
      upcomingClass?.classUrl || "/today"
    );
    setTimeout(() => setTestSent(false), 4000);
  };

  // Google Calendar URL
  const getCalendarUrl = (item: ScheduleItem) => {
    if (!item.date || !item.startTime) return "#";
    const parts = item.date.split("/");
    if (parts.length < 3) return "#";
    const [d, m, y] = parts;
    const [sH, sM] = (item.startTime || "19:00").split(":");
    const [eH, eM] = (item.endTime || "21:30").split(":");
    const start = `${y}${m.padStart(2, "0")}${d.padStart(2, "0")}T${sH.padStart(2, "0")}${sM.padStart(2, "0")}00`;
    const end = `${y}${m.padStart(2, "0")}${d.padStart(2, "0")}T${eH.padStart(2, "0")}${eM.padStart(2, "0")}00`;
    const title = encodeURIComponent(`[CNTT-K19] ${item.subjectName}`);
    const details = encodeURIComponent(
      `Môn: ${item.subjectName}\nGV: ${item.teacher}\nZoom: ${item.classUrl || ""}`
    );
    const location = encodeURIComponent(item.classUrl || "Zoom Online");
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`;
  };

  if (dismissed) return null;

  const isGranted = permission === "granted";
  const isDenied = permission === "denied";

  // Countdown display text
  const countdownText = (() => {
    if (!countdown) return null;
    if (countdown.isLive) return "🟢 ĐANG HỌC";
    if (countdown.isPast) return "Đã kết thúc";
    if (countdown.hours === 0 && countdown.minutes <= 30) {
      return `⏰ Còn ${countdown.minutes}p ${countdown.seconds}s`;
    }
    if (countdown.hours === 0) {
      return `Còn ${countdown.minutes} phút`;
    }
    return `Còn ${countdown.hours}h ${countdown.minutes}p`;
  })();

  const isUrgent = countdown && !countdown.isPast && !countdown.isLive && countdown.hours === 0 && countdown.minutes <= 15;

  return (
    <div
      className={`relative rounded-2xl border p-4 sm:p-5 transition-all ${
        isUrgent
          ? "bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 border-amber-300/80 dark:border-amber-700/80"
          : "bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/10 border-indigo-200/80 dark:border-indigo-800/80"
      }`}
    >
      {/* Dismiss button */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center transition-colors"
        title="Ẩn thông báo"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        {/* Icon + Status */}
        <div className="flex items-start gap-3 flex-1">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
              isGranted
                ? isUrgent
                  ? "bg-amber-500 text-white shadow-amber-500/30"
                  : "bg-indigo-600 text-white shadow-indigo-600/20"
                : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
            }`}
          >
            {isGranted ? (
              <BellRing className={`w-5 h-5 ${isUrgent ? "animate-bounce" : ""}`} />
            ) : (
              <Bell className="w-5 h-5" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                Thông báo nhắc giờ học
              </span>
              {isGranted && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <Check className="w-3 h-3" />
                  Đã bật
                </span>
              )}
              {isDenied && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300">
                  Bị chặn
                </span>
              )}
            </div>

            {/* Countdown + class info */}
            {upcomingClass && (
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  {upcomingClass.subjectName}
                  {upcomingClass.startTime && ` • ${upcomingClass.startTime}`}
                </span>
                {countdownText && (
                  <span
                    className={`font-bold tabular-nums ${
                      isUrgent
                        ? "text-amber-700 dark:text-amber-400"
                        : countdown?.isLive
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-indigo-700 dark:text-indigo-400"
                    }`}
                  >
                    {countdownText}
                  </span>
                )}
              </div>
            )}

            {!upcomingClass && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Tự động rung chuông trước giờ học <strong>30 phút</strong>, <strong>15 phút</strong> và <strong>5 phút</strong>.
              </p>
            )}

            {isDenied && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                Thông báo bị chặn. Vào <strong>Cài đặt trình duyệt</strong> → cho phép thông báo từ trang này.
              </p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {!isGranted && !isDenied ? (
            <button
              type="button"
              onClick={requestPermission}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Bật Thông Báo</span>
            </button>
          ) : isGranted ? (
            <button
              type="button"
              onClick={handleTest}
              disabled={testSent}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-60"
            >
              {testSent ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Đã gửi!</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  <span>Thử chuông</span>
                </>
              )}
            </button>
          ) : null}

          {upcomingClass && upcomingClass.date && (
            <a
              href={getCalendarUrl(upcomingClass)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 transition-all flex items-center gap-1.5"
              title="Lưu vào Google Calendar / Apple Calendar — điện thoại sẽ tự báo thức"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Lưu vào Lịch</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
          )}

          {!isSupported && (
            <span className="text-xs text-slate-400 italic">Trình duyệt chưa hỗ trợ</span>
          )}
        </div>
      </div>

      {/* Urgency banner */}
      {isUrgent && isGranted && countdown && !countdown.isLive && (
        <div className="mt-3 p-2.5 rounded-xl bg-amber-500/15 border border-amber-400/30 text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2 animate-pulse">
          <Volume2 className="w-4 h-4 shrink-0" />
          <span>
            Còn <strong>{countdown.minutes} phút {countdown.seconds} giây</strong> là đến giờ học — hãy chuẩn bị thiết bị!
          </span>
        </div>
      )}
    </div>
  );
}
