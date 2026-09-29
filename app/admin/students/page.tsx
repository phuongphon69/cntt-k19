// app/admin/students/page.tsx
import React from "react";
import { Users, UserCheck, ShieldAlert } from "lucide-react";
import { getStudents } from "@/lib/google-sheets/reader";
import { AdminStudentsClient } from "@/components/admin/admin-students-client";

export const dynamic = "force-dynamic";

export default async function AdminStudentsPage() {
  const students = await getStudents();

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Quản lý Sinh viên
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Danh sách sinh viên chính thức lấy từ sheet <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">CNTT - K19</code>. Dữ liệu nhạy cảm (SĐT/CCCD) được bảo vệ chỉ hiển thị trong khu vực Quản trị.
        </p>
      </div>

      <AdminStudentsClient initialStudents={students} />
    </div>
  );
}
