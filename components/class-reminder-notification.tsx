// components/class-reminder-notification.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Bell, BellRing, Check, Calendar, ExternalLink, Sparkles, Volume2 } from "lucide-react";
import { ScheduleItem } from "@/types";

interface ClassReminderProps {
  todayClasses?: ScheduleItem[];
  upcomingClass?: ScheduleItem;
}

export function ClassReminderNotification({ todayClasses = [], upcomingClass }: ClassReminderProps) {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const [scheduled, setScheduled] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setIsSupported(true);
      setPermission(Notification.permission);

      // Register Service Worker
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            console.log("[SW] Registered successfully:", reg.scope);
          })
          .catch((err) => {
            console.warn("[SW] Registration error:", err);
          });
      }
    }
  }, []);

  // Monitor upcoming class and schedule in-app reminder
  useEffect(() => {
    if (permission !== "granted" || !upcomingClass) return;

    // Check minutes remaining to class
    const checkScheduleReminder = () => {
      if (!upcomingClass.startTime) return;
      const [h, m] = upcomingClass.startTime.split(":").map((x) => parseInt(x, 10));
      const now = new Date();
      const classDate = new Date();
      classDate.setHours(h, m, 0, 0);

      const diffMs = classDate.getTime() - now.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));

      // If class is within 15 minutes and hasn't notified yet
      const storageKey = `notified_${upcomingClass.id}_${now.toDateString()}`;
      const alreadyNotified = localStorage.getItem(storageKey);

      if (diffMinutes <= 15 && diffMinutes > -60 && !alreadyNotified) {
        sendNativeNotification(
          `🔔 Sắp đến giờ học: ${upcomingClass.subjectName}`,
          `Lớp bắt đầu lúc ${upcomingClass.startTime} (${upcomingClass.teacher || "Giảng viên"}). Chạm để vào Zoom ngay!`,
          upcomingClass.classUrl || "/today"
        );
        localStorage.setItem(storageKey, "true");
        setScheduled(true);
      }
    };

    checkScheduleReminder();
    const interval = setInterval(checkScheduleReminder, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [permission, upcomingClass]);

  const requestPermission = async () => {
    if (!isSupported) {
      alert("Trình duyệt này chưa hỗ trợ tính năng Thông báo.");
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === "granted") {
        sendNativeNotification(
          "🔔 CNTT - K19: Đã bật thông báo thành công!",
          "Hệ thống sẽ tự động nhắc nhở trên màn hình điện thoại trước giờ học 15 phút.",
          "/today"
        );
      }
    } catch (e) {
      console.error("Error requesting notification permission:", e);
    }
  };

  const sendNativeNotification = (title: string, body: string, url: string) => {
    // Vibrate phone if supported
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }

    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(title, {
          body,
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          vibrate: [200, 100, 200, 100, 200],
          data: { url },
        } as any);
      });
    } else {
      new Notification(title, {
        body,
        icon: "/icon-192.png",
      });
    }
  };

  const handleTestNotification = () => {
    if (permission !== "granted") {
      requestPermission();
      return;
    }

    setTestSent(true);
    sendNativeNotification(
      "🔔 [Thử nghiệm] Chuông thông báo giờ học CNTT - K19",
      `Lớp ${upcomingClass?.subjectName || "Cấu Trúc Dữ Liệu"} sẽ bắt đầu lúc ${
        upcomingClass?.startTime || "19h00"
      }. Chạm để vào học ngay!`,
      upcomingClass?.classUrl || "/today"
    );

    setTimeout(() => setTestSent(false), 3000);
  };

  // Generate Google Calendar Link
  const getGoogleCalendarUrl = (item: ScheduleItem) => {
    if (!item.date || !item.startTime) return "#";
    const parts = item.date.split("/");
    if (parts.length < 3) return "#";
    const [d, m, y] = parts;
    const [sH, sM] = (item.startTime || "19:00").split(":");
    const [eH, eM] = (item.endTime || "21:30").split(":");

    const startIso = `${y}${m.padStart(2, "0")}${d.padStart(2, "0")}T${sH.padStart(2, "0")}${sM.padStart(2, "0")}00`;
    const endIso = `${y}${m.padStart(2, "0")}${d.padStart(2, "0")}T${eH.padStart(2, "0")}${eM.padStart(2, "0")}00`;

    const title = encodeURIComponent(`[CNTT-K19] ${item.subjectName}`);
    const details = encodeURIComponent(
      `Môn học: ${item.subjectName}\nGiảng viên: ${item.teacher}\nPhòng Zoom: ${item.classUrl || ""}`
    );
    const location = encodeURIComponent(item.classUrl || "Zoom Online");

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}&location=${location}`;
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/10 border border-indigo-200/80 dark:border-indigo-800/80 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/20">
            {permission === "granted" ? (
              <BellRing className="w-5 h-5 animate-bounce" />
            ) : (
              <Bell className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
              <span>Thông báo nhắc giờ học trên điện thoại</span>
              {permission === "granted" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <Check className="w-3 h-3" /> Đã bật
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Tự động rung chuông & hiện thông báo trên màn hình khóa trước giờ học 15 phút.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {permission !== "granted" ? (
            <button
              type="button"
              onClick={requestPermission}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Bật Thông Báo Nhắc Học</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleTestNotification}
              disabled={testSent}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Volume2 className="w-3.5 h-3.5 text-indigo-500" />
              <span>{testSent ? "Đã phát chuông thử!" : "Thử chuông thông báo"}</span>
            </button>
          )}

          {upcomingClass && (
            <a
              href={getGoogleCalendarUrl(upcomingClass)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 transition-all flex items-center gap-1.5"
              title="Thêm lịch học vào Google Calendar / Apple Calendar để điện thoại tự động báo thức"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Lưu vào Lịch ĐT</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
