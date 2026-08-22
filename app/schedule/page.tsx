// app/schedule/page.tsx
import React from "react";
import { Calendar } from "lucide-react";
import { getSchedule } from "@/lib/google-sheets/reader";
import { ScheduleViewClient } from "@/components/schedule/schedule-view-client";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const schedule = await getSchedule();

  return (
    <div className="container mx-auto px-4 sm:px-6 pt-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="flex items-center gap-2">
          <Calendar className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Thời khóa biểu lớp CNTT - K19 CĐ
          </h1>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Theo dõi lịch học, khung giờ tiết học và nhận link vào lớp Zoom / Google Meet trực tiếp
        </p>
      </div>

      <ScheduleViewClient schedule={schedule} />
    </div>
  );
}
