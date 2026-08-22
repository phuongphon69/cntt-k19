// components/admin-sidebar.tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  BookOpen,
  Camera,
  CheckSquare,
  Calendar,
  Clock,
  Activity,
  Settings,
  FileText,
  RefreshCw,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Menu,
  X,
} from "lucide-react";

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/sync", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        alert("Đồng bộ Google Sheets thành công!");
        router.refresh();
      } else {
        alert("Lỗi đồng bộ: " + data.error);
      }
    } catch (e) {
      alert("Lỗi kết nối khi đồng bộ");
    } finally {
      setSyncing(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const menuItems = [
    { href: "/admin", label: "Tổng quan", icon: LayoutDashboard },
    { href: "/admin/attendance/zoom", label: "Điểm danh Zoom OCR", icon: Camera, highlight: true },
    { href: "/admin/attendance/manual", label: "Điểm danh thủ công", icon: CheckSquare },
    { href: "/admin/students", label: "Quản lý Sinh viên", icon: Users },
    { href: "/admin/student-mapping", label: "Ghép SV (Mapping)", icon: UserCheck },
    { href: "/admin/subjects", label: "Quản lý Môn học", icon: BookOpen },
    { href: "/admin/schedule", label: "Thời khóa biểu", icon: Calendar },
    { href: "/admin/periods", label: "Quản lý Tiết học", icon: Clock },
    { href: "/admin/data-health", label: "Kiểm tra Dữ liệu", icon: Activity },
    { href: "/admin/settings", label: "Cấu hình Hệ thống", icon: Settings },
    { href: "/admin/logs", label: "Nhật ký Hoạt động", icon: FileText },
  ];

  return (
    <>
      {/* Mobile Sidebar Toggle Button */}
      <div className="lg:hidden p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <span className="font-extrabold text-sm text-slate-900 dark:text-white">Admin Dashboard</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 flex flex-col justify-between transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-4 space-y-6 overflow-y-auto">
          {/* Admin Header */}
          <div className="flex items-center justify-between">
            <Link href="/admin" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="font-extrabold text-sm text-slate-900 dark:text-white leading-none">
                  Quản trị viên
                </div>
                <div className="text-[11px] text-slate-500 mt-1">CNTT K19 CĐ</div>
              </div>
            </Link>

            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                      : item.highlight
                      ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/40 hover:bg-indigo-100"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.highlight && !isActive && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-indigo-600 text-white">
                      HOT
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200/80 dark:border-slate-800 space-y-2 bg-slate-50/50 dark:bg-slate-900/50">
          {/* Sync Button */}
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin text-indigo-600" : ""}`} />
            <span>{syncing ? "Đang đồng bộ..." : "Đồng bộ Google Sheets"}</span>
          </button>

          {/* Logout */}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>
    </>
  );
}
