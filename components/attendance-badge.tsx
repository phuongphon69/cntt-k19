// components/attendance-badge.tsx
import React from "react";
import { cn } from "@/lib/utils";
import { Check, Clock, FileText, X as XIcon, Minus, HelpCircle } from "lucide-react";

interface AttendanceBadgeProps {
  value?: string;
  countText?: string; // e.g. "3/3", "2/3", "1/3", "0/3"
  rate?: number; // e.g. 100, 66.7
  isApplicable?: boolean;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  onClick?: () => void;
  className?: string;
}

export function AttendanceBadge({
  value,
  countText,
  rate,
  isApplicable = true,
  size = "md",
  showIcon = true,
  onClick,
  className,
}: AttendanceBadgeProps) {
  if (!isApplicable) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500",
          className
        )}
      >
        <Minus className="w-3 h-3" />
        <span>K/A</span>
      </span>
    );
  }

  // If single value (X, P, M, etc.)
  if (value !== undefined) {
    const val = value.trim().toUpperCase();

    if (val === "X") {
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
            size === "sm" ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-xs",
            className
          )}
        >
          {showIcon && <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
          <span>X</span>
        </span>
      );
    }

    if (val === "P") {
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md font-semibold text-sky-700 bg-sky-50 border border-sky-200/80 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
            size === "sm" ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-xs",
            className
          )}
        >
          {showIcon && <FileText className="w-3 h-3 text-sky-600 dark:text-sky-400" />}
          <span>P</span>
        </span>
      );
    }

    if (val === "M") {
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md font-semibold text-amber-700 bg-amber-50 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
            size === "sm" ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-xs",
            className
          )}
        >
          {showIcon && <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />}
          <span>M</span>
        </span>
      );
    }

    if (val === "V" || val === "K") {
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md font-semibold text-rose-700 bg-rose-50 border border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
            size === "sm" ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-xs",
            className
          )}
        >
          {showIcon && <XIcon className="w-3 h-3 text-rose-600 dark:text-rose-400" />}
          <span>Vắng</span>
        </span>
      );
    }

    // Blank
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-md text-xs text-slate-400 bg-slate-50 dark:bg-slate-900 dark:text-slate-600",
          size === "sm" ? "px-1.5 py-0.5" : "px-2 py-1",
          className
        )}
      >
        --
      </span>
    );
  }

  // If session summary (e.g. "3/3", "2/3", "1/3", "--")
  if (countText !== undefined) {
    const isUnrecorded =
      countText === "--" ||
      countText === "0/3" ||
      countText === "" ||
      rate === undefined ||
      rate === 0;

    if (isUnrecorded) {
      return (
        <button
          type="button"
          onClick={onClick}
          title="0/3: Vắng mặt"
          className={cn(
            "inline-flex items-center justify-center rounded-md text-xs font-medium text-slate-400 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer",
            size === "sm" ? "px-1.5 py-0.5" : "px-2.5 py-1",
            className
          )}
        >
          --
        </button>
      );
    }

    let colorClasses = "text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300";
    let titleText = "";

    if (rate >= 100) {
      // 3/3: Tham gia học đầy đủ
      colorClasses =
        "text-emerald-700 bg-emerald-50 border border-emerald-200/90 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800";
      titleText = "3/3: Có tham gia học đầy đủ";
    } else if (rate >= 66) {
      // 2/3: Đạt ngưỡng có mặt đầy đủ
      colorClasses =
        "text-amber-700 bg-amber-50 border border-amber-200/90 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800";
      titleText = "2/3: Có tham gia học đầy đủ (đạt từ 2/3 lần trở lên)";
    } else {
      // 1/3: Tính vắng mặt
      colorClasses =
        "text-rose-700 bg-rose-50 border border-rose-200/90 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800";
      titleText = "1/3: Vắng mặt (dưới ngưỡng 2/3)";
    }

    return (
      <button
        type="button"
        onClick={onClick}
        title={titleText}
        className={cn(
          "inline-flex items-center justify-center gap-1 rounded-md text-xs font-semibold hover:scale-105 active:scale-95 transition-all shadow-sm cursor-pointer",
          colorClasses,
          size === "sm" ? "px-2 py-0.5" : "px-2.5 py-1",
          className
        )}
      >
        <span>{countText}</span>
      </button>
    );
  }

  return null;
}
