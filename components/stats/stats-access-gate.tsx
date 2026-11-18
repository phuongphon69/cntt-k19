// components/stats/stats-access-gate.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Lock, Loader2, Phone } from "lucide-react";

// Số điện thoại Lớp trưởng
const MONITOR_PHONE = "0972521997";

interface StatsAccessGateProps {
  submitLabel?: string;
  hint?: string;
}

export function StatsAccessGate({
  submitLabel = "Xem thống kê",
  hint = "Để được xem thống kê",
}: StatsAccessGateProps) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPhone, setShowPhone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stats-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.success) {
        router.refresh();
      } else {
        setError(data.error || "Mã không đúng");
      }
    } catch {
      setError("Không kết nối được máy chủ. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 sm:mt-16">
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
        {/* Thông báo */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">
            Liên hệ Lớp trưởng để được xem mục này
          </h1>

          {showPhone ? (
            <a
              href={`tel:${MONITOR_PHONE}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-base font-bold tracking-wide transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span>{MONITOR_PHONE}</span>
            </a>
          ) : (
            <button
              type="button"
              onClick={() => setShowPhone(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors cursor-pointer"
            >
              <Phone className="w-4 h-4" />
              <span>Liên hệ</span>
            </button>
          )}
        </div>

        {/* Nhập mã */}
        <form onSubmit={handleSubmit} className="space-y-2.5 pt-1 border-t border-slate-100 dark:border-slate-800">
          <div className="relative mt-4">
            <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Nhập mã"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="w-full pl-9 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono tracking-wider text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <p className="text-xs text-slate-500 text-center">{hint}</p>

          {error && (
            <div className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-bold transition-colors cursor-pointer"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{submitLabel}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
