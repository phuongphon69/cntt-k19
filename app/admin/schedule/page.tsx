// app/admin/schedule/page.tsx
import React from "react";
import { Calendar } from "lucide-react";
import { getSchedule, getSubjects } from "@/lib/google-sheets/reader";
import { AdminScheduleClient } from "@/components/admin/admin-schedule-client";

export const dynamic = "force-dynamic";

export default async function AdminSchedulePage() {
  const schedule = await getSchedule();
  const subjects = await getSubjects();

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Quản lý Thời khóa biểu
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Xem, thêm buổi học mới, tạo lịch hàng loạt hoặc điều chỉnh link Zoom/Google Meet.
        </p>
      </div>

      <AdminScheduleClient initialSchedule={schedule} subjects={subjects} />
    </div>
  );
}
