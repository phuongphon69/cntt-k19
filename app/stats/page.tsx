// app/stats/page.tsx
import React from "react";
import { BarChart3 } from "lucide-react";
import { getComprehensiveAttendanceReport } from "@/lib/attendance/stats";
import { StatsDashboardClient } from "@/components/stats/stats-dashboard-client";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const report = await getComprehensiveAttendanceReport();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Thống Kê Chuyên Cần Lớp Học
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-500">
          Báo cáo thống kê chi tiết tỷ lệ chuyên cần của từng học sinh theo từng môn học và tổng quan toàn lớp CNTT - K19 CĐ.
        </p>
      </div>

      <StatsDashboardClient report={report} />
    </div>
  );
}
