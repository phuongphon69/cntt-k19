// app/admin/layout.tsx
import React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { AdminSidebar } from "@/components/admin-sidebar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session || session.role !== "ADMIN") {
    redirect("/login");
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50/60 dark:bg-slate-950">
      <AdminSidebar />
      <div className="flex-1 overflow-x-hidden p-4 sm:p-8">{children}</div>
    </div>
  );
}
