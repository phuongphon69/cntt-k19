// components/admin/admin-stats-access-client.tsx
"use client";

import React, { useState } from "react";
import { KeyRound, Copy, Check, Loader2 } from "lucide-react";

export function AdminStatsAccessClient() {
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [issued, setIssued] = useState<{ code: string; expiresAt: number }[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/stats-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days }),
      });
      const data = await res.json();
      if (data.success) {
        setIssued((prev) => [{ code: data.code, expiresAt: data.expiresAt }, ...prev]);
      } else {
        setError(data.error || "Không tạo được mã");
      }
    } catch {
      setError("Không kết nối được máy chủ");
    } finally {
      setLoading(false);
    }
  };

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <KeyRound className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Cấp mã xem thống kê</h1>
        </div>
        <p className="text-sm text-slate-500">
          Người không phải quản trị viên cần mã này để xem trang Thống kê. Lớp trưởng tạo mã tại đây rồi gửi cho
          người cần xem.
        </p>
      </div>

      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Thời hạn sử dụng (ngày)</label>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
            >
              <option value={1}>1 ngày</option>
              <option value={7}>7 ngày</option>
              <option value={30}>30 ngày</option>
              <option value={90}>90 ngày</option>
              <option value={180}>180 ngày</option>
            </select>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-bold cursor-pointer"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Tạo mã mới</span>
          </button>
        </div>

        {error && <div className="text-xs text-rose-600">{error}</div>}

        {issued.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="text-xs font-bold text-slate-500">Mã vừa tạo (chỉ hiện trong lần này, hãy lưu lại)</div>
            {issued.map((item) => (
              <div
                key={item.code}
                className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              >
                <div>
                  <div className="font-mono text-lg font-bold tracking-wider text-slate-900 dark:text-white">
                    {item.code}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Dùng được đến hết ngày {new Date(item.expiresAt - 1).toLocaleDateString("vi-VN")}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => copy(item.code)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  {copied === item.code ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied === item.code ? "Đã chép" : "Sao chép"}</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-xs text-slate-500 space-y-1 leading-relaxed">
        <p>• Mã tự hết hạn theo thời hạn đã chọn; người nhập đúng mã được xem thống kê trên thiết bị đó tối đa 30 ngày.</p>
        <p>
          • Muốn thu hồi tất cả mã đã cấp, đổi biến môi trường <code className="font-mono">AUTH_SECRET</code> trên Vercel
          (quản trị viên sẽ phải đăng nhập lại).
        </p>
      </div>
    </div>
  );
}
