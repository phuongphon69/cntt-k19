// components/fund/fund-client.tsx
"use client";

import React, { useMemo, useState } from "react";
import { Wallet, TrendingUp, TrendingDown, Users, Search, CheckCircle2, Clock } from "lucide-react";
import type { FundData } from "@/lib/google-sheets/fund";

type Tab = "members" | "income" | "expense" | "months";

const money = (n: number) => `${new Intl.NumberFormat("vi-VN").format(n)} đ`;

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

export function FundClient({ data }: { data: FundData }) {
  const { summary, members, incomes, expenses, months } = data;
  const [tab, setTab] = useState<Tab>("members");
  const [query, setQuery] = useState("");
  const [onlyUnpaid, setOnlyUnpaid] = useState(false);
  const q = normalize(query.trim());

  const filteredMembers = useMemo(
    () =>
      members.filter((m) => {
        if (onlyUnpaid && m.missing <= 0) return false;
        return !q || normalize(m.name).includes(q);
      }),
    [members, q, onlyUnpaid]
  );
  const filteredIncomes = useMemo(
    () => incomes.filter((i) => !q || normalize(`${i.payer} ${i.content} ${i.code}`).includes(q)),
    [incomes, q]
  );
  const filteredExpenses = useMemo(
    () => expenses.filter((e) => !q || normalize(`${e.content} ${e.receiver} ${e.group} ${e.code}`).includes(q)),
    [expenses, q]
  );

  const tabs: { id: Tab; label: string }[] = [
    { id: "members", label: `Đóng quỹ (${members.length})` },
    { id: "income", label: `Thu (${incomes.length})` },
    { id: "expense", label: `Chi (${expenses.length})` },
    { id: "months", label: "Theo tháng" },
  ];

  const progress = Math.min(100, Math.max(0, summary.completionRate));
  const maxMonth = Math.max(1, ...months.map((m) => Math.max(m.income, m.expense)));

  return (
    <div className="space-y-6">
      {/* Số dư */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm">
        <div className="flex items-center gap-2 text-indigo-100 text-sm">
          <Wallet className="w-4 h-4" />
          <span>Số dư quỹ hiện tại</span>
        </div>
        <div className="text-3xl sm:text-4xl font-bold mt-1 tabular-nums">{money(summary.balance)}</div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-indigo-100 mb-1.5">
            <span>
              Đã thu {money(summary.collected)} / {money(summary.totalDue)}
            </span>
            <span className="font-semibold">{summary.completionRate}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/20 overflow-hidden">
            <div className="h-full rounded-full bg-white" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {/* Chỉ số */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            <span>Tổng thu</span>
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
            {money(summary.totalIncome)}
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
            <span>Tổng chi</span>
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
            {money(summary.totalExpense)}
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Users className="w-3.5 h-3.5 text-indigo-500" />
            <span>Đã đóng đủ</span>
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">
            {summary.paidCount}/{summary.memberCount}
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Còn phải thu</span>
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
            {money(summary.remaining)}
          </div>
          <div className="text-[11px] text-slate-500">{summary.unpaidCount} người chưa đủ</div>
        </div>
      </div>

      {/* Tab */}
      <div className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3.5 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              tab === t.id
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab !== "months" && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tab === "members" ? "Tìm tên thành viên..." : "Tìm kiếm..."}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {tab === "members" && (
            <label className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyUnpaid}
                onChange={(e) => setOnlyUnpaid(e.target.checked)}
                className="w-4 h-4 accent-indigo-600"
              />
              Chỉ người chưa đủ
            </label>
          )}
        </div>
      )}

      {/* Đóng quỹ */}
      {tab === "members" && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 text-xs">
                  <th className="p-3 text-center w-12">STT</th>
                  <th className="p-3 text-left">Họ và tên</th>
                  <th className="p-3 text-right">Đã nộp</th>
                  <th className="p-3 text-right">Còn thiếu</th>
                  <th className="p-3 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredMembers.map((m) => {
                  const done = m.missing <= 0;
                  return (
                    <tr key={m.stt + m.name}>
                      <td className="p-3 text-center text-slate-400">{m.stt}</td>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">{m.name}</td>
                      <td className="p-3 text-right tabular-nums">{money(m.paid)}</td>
                      <td
                        className={`p-3 text-right tabular-nums ${
                          done ? "text-slate-400" : "text-rose-600 dark:text-rose-400 font-semibold"
                        }`}
                      >
                        {money(m.missing)}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                            done
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                          }`}
                        >
                          {done && <CheckCircle2 className="w-3 h-3" />}
                          {m.status || (done ? "Đã đủ" : "Chưa nộp")}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredMembers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      Không có thành viên phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Thu */}
      {tab === "income" && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 text-xs">
                  <th className="p-3 text-left">Ngày</th>
                  <th className="p-3 text-left">Người nộp</th>
                  <th className="p-3 text-left">Nội dung</th>
                  <th className="p-3 text-left">Phương thức</th>
                  <th className="p-3 text-right">Số tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {[...filteredIncomes].reverse().map((i, idx) => (
                  <tr key={i.code || idx}>
                    <td className="p-3 whitespace-nowrap text-slate-500">{i.date}</td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">{i.payer}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">{i.type || i.content}</td>
                    <td className="p-3 text-slate-500">{i.method}</td>
                    <td className="p-3 text-right font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap">
                      +{money(i.amount)}
                    </td>
                  </tr>
                ))}
                {filteredIncomes.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      Chưa có khoản thu nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Chi */}
      {tab === "expense" && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 text-xs">
                  <th className="p-3 text-left">Ngày</th>
                  <th className="p-3 text-left">Nội dung chi</th>
                  <th className="p-3 text-left">Nhóm</th>
                  <th className="p-3 text-left">Người nhận</th>
                  <th className="p-3 text-right">Số tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {[...filteredExpenses].reverse().map((e, idx) => (
                  <tr key={e.code || idx}>
                    <td className="p-3 whitespace-nowrap text-slate-500">{e.date}</td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">
                      {e.content}
                      {e.note && <div className="text-xs font-normal text-slate-500">{e.note}</div>}
                    </td>
                    <td className="p-3 text-slate-500">{e.group}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">{e.receiver}</td>
                    <td className="p-3 text-right font-semibold text-rose-600 dark:text-rose-400 tabular-nums whitespace-nowrap">
                      -{money(e.amount)}
                    </td>
                  </tr>
                ))}
                {filteredExpenses.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      Chưa có khoản chi nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Theo tháng */}
      {tab === "months" && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 text-xs">
                  <th className="p-3 text-left">Tháng</th>
                  <th className="p-3 text-right">Thu</th>
                  <th className="p-3 text-right">Chi</th>
                  <th className="p-3 text-right">Chênh lệch</th>
                  <th className="p-3 text-right">Số dư lũy kế</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {months.map((m) => {
                  const empty = m.income === 0 && m.expense === 0;
                  return (
                    <tr key={m.month} className={empty ? "text-slate-400" : ""}>
                      <td className="p-3 font-semibold">{m.month}</td>
                      <td className="p-3 text-right tabular-nums">
                        {money(m.income)}
                        {!empty && (
                          <div className="mt-1 h-1 rounded bg-emerald-500/70" style={{ width: `${(m.income / maxMonth) * 100}%`, marginLeft: "auto" }} />
                        )}
                      </td>
                      <td className="p-3 text-right tabular-nums">
                        {money(m.expense)}
                        {!empty && m.expense > 0 && (
                          <div className="mt-1 h-1 rounded bg-rose-500/70" style={{ width: `${(m.expense / maxMonth) * 100}%`, marginLeft: "auto" }} />
                        )}
                      </td>
                      <td
                        className={`p-3 text-right tabular-nums ${
                          m.diff < 0 ? "text-rose-600 dark:text-rose-400" : ""
                        }`}
                      >
                        {money(m.diff)}
                      </td>
                      <td className="p-3 text-right tabular-nums font-semibold">{money(m.cumulative)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-slate-400 text-center">
        Dữ liệu đồng bộ tự động từ sổ quỹ lớp • Cập nhật lúc{" "}
        {new Date(data.fetchedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
      </p>
    </div>
  );
}
