// components/admin/admin-students-client.tsx
"use client";

import React, { useState } from "react";
import { Search, User, Phone, MapPin, Calendar, Check, X, Shield, Eye, EyeOff } from "lucide-react";
import { Student } from "@/types";
import { normalizeVietnameseNameWithoutAccent } from "@/lib/vietnamese/normalize";

interface AdminStudentsClientProps {
  initialStudents: Student[];
}

export function AdminStudentsClient({ initialStudents }: AdminStudentsClientProps) {
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [searchQuery, setSearchQuery] = useState("");
  const [showPrivateInfo, setShowPrivateInfo] = useState(false);

  const cleanQ = normalizeVietnameseNameWithoutAccent(searchQuery);

  const filteredStudents = students.filter((s) => {
    if (!cleanQ) return true;
    const nameNorm = normalizeVietnameseNameWithoutAccent(s.fullName);
    const dob = s.dateOfBirth || "";
    const phone = s.phone || "";
    return nameNorm.includes(cleanQ) || dob.includes(cleanQ) || phone.includes(cleanQ);
  });

  return (
    <div className="space-y-4">
      {/* Search & Privacy toggle */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên, ngày sinh, số điện thoại..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border outline-none text-slate-900 dark:text-white"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowPrivateInfo(!showPrivateInfo)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
        >
          {showPrivateInfo ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          <span>{showPrivateInfo ? "Ẩn CCCD / SĐT" : "Hiện CCCD / SĐT"}</span>
        </button>
      </div>

      {/* Students Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                <th className="p-3.5 text-center w-12">STT</th>
                <th className="p-3.5">Họ và tên</th>
                <th className="p-3.5">Ngày sinh</th>
                <th className="p-3.5">Hệ học</th>
                {showPrivateInfo && <th className="p-3.5">Số điện thoại</th>}
                {showPrivateInfo && <th className="p-3.5">CCCD</th>}
                <th className="p-3.5">Nơi sinh</th>
                <th className="p-3.5">Ngày vào nhóm</th>
                <th className="p-3.5 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredStudents.map((s, idx) => (
                <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                  <td className="p-3.5 text-center text-slate-400 font-bold">{s.stt || idx + 1}</td>
                  <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                    {s.fullName}
                  </td>
                  <td className="p-3.5 text-slate-600 dark:text-slate-400">{s.dateOfBirth || "--"}</td>
                  <td className="p-3.5">
                    {s.studySystem ? (
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-semibold text-[11px]">
                        {s.studySystem}
                      </span>
                    ) : (
                      "--"
                    )}
                  </td>
                  {showPrivateInfo && (
                    <td className="p-3.5 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                      {s.phone || "--"}
                    </td>
                  )}
                  {showPrivateInfo && (
                    <td className="p-3.5 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                      {s.cccd || "--"}
                    </td>
                  )}
                  <td className="p-3.5 text-slate-500">{s.placeOfBirth || "--"}</td>
                  <td className="p-3.5 text-slate-500">{s.dateJoinedGroup || "--"}</td>
                  <td className="p-3.5 text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      <Check className="w-3 h-3" />
                      <span>Active</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
