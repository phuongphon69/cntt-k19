// app/admin/stats-access/page.tsx
import React from "react";
import { AdminStatsAccessClient } from "@/components/admin/admin-stats-access-client";

export const dynamic = "force-dynamic";

export default function AdminStatsAccessPage() {
  return <AdminStatsAccessClient />;
}
