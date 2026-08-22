// components/footer.tsx
import React from "react";
import Link from "next/link";
import { GraduationCap, ShieldCheck, Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full border-t border-slate-200/80 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/50 py-8 mb-16 md:mb-0">
      <div className="container mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            Lớp CNTT - K19 CĐ
          </span>
          <span>•</span>
          <span>Hệ thống Điểm danh & Thời khóa biểu</span>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className="flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Khu vực Quản trị</span>
          </Link>
          <span>•</span>
          <span>Dữ liệu đồng bộ trực tiếp từ Google Sheets</span>
        </div>
      </div>
    </footer>
  );
}
