// app/quy-lop/page.tsx
import React from "react";
import { Wallet } from "lucide-react";
import { getFundData } from "@/lib/google-sheets/fund";
import { FundClient } from "@/components/fund/fund-client";
import { StatsAccessGate } from "@/components/stats/stats-access-gate";
import { hasStatsAccess } from "@/lib/auth/stats-access";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Quỹ lớp - CNTT K19 CĐ",
};

export default async function FundPage() {
  // Mục Quỹ lớp: chỉ quản trị viên hoặc người có mã do Lớp trưởng cấp mới xem được
  if (!(await hasStatsAccess())) {
    return <StatsAccessGate submitLabel="Xem quỹ lớp" hint="Để được xem quỹ lớp" />;
  }

  const data = await getFundData();

  return (
    <div className="container mx-auto px-4 sm:px-6 pt-6 space-y-6 max-w-5xl">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Wallet className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Quỹ lớp</h1>
        </div>
        <p className="text-sm text-slate-500">
          Theo dõi thu, chi và tình hình đóng quỹ của lớp CNTT - K19 CĐ.
        </p>
      </div>

      <FundClient data={data} />
    </div>
  );
}
