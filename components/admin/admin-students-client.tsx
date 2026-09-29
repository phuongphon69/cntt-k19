// components/admin/admin-students-client.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  User,
  Plus,
  Phone,
  MapPin,
  Calendar,
  Check,
  X,
  Shield,
  Eye,
  EyeOff,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { Student } from "@/types";
import { normalizeVietnameseNameWithoutAccent } from "@/lib/vietnamese/normalize";

interface AdminStudentsClientProps {
  initialStudents: Student[];
}

export function AdminStudentsClient({ initialStudents }: AdminStudentsClientProps) {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [searchQuery, setSearchQuery] = useState("");
  const [showPrivateInfo, setShowPrivateInfo] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [studySystem, setStudySystem] = useState("CQ");
  const [phone, setPhone] = useState("");
  const [cccd, setCccd] = useState("");
  const [placeOfBirth, setPlaceOfBirth] = useState("");
  const [dateJoinedGroup, setDateJoinedGroup] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const cleanQ = normalizeVietnameseNameWithoutAccent(searchQuery);

  const filteredStudents = students.filter((s) => {
    if (!cleanQ) return true;
    const nameNorm = normalizeVietnameseNameWithoutAccent(s.fullName);
    const dob = s.dateOfBirth || "";
    const phoneNum = s.phone || "";
    const cccdNum = s.cccd || "";
    return (
      nameNorm.includes(cleanQ) ||
      dob.includes(cleanQ) ||
      phoneNum.includes(cleanQ) ||
      cccdNum.includes(cleanQ)
    );
  });

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      alert("Vui lòng nhập họ và tên học viên");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          dateOfBirth,
          studySystem,
          phone,
          cccd,
          placeOfBirth,
          dateJoinedGroup,
          notes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMessage(data.message);
        // Refresh local student list
        const newStu: Student = {
          id: normalizeVietnameseNameWithoutAccent(fullName).replace(/\s+/g, "_"),
          stt: students.length + 1,
          fullName: fullName.trim(),
          hoVa: "",
          ten: "",
          normalizedName: fullName.trim(),
          normalizedNameNoAccent: normalizeVietnameseNameWithoutAccent(fullName),
          dateOfBirth,
          studySystem,
          phone,
          cccd,
          placeOfBirth,
          dateJoinedGroup,
          notes,
          active: true,
          sourceSheet: "CNTT - K19",
          sourceRow: students.length + 2,
        };
        setStudents([...students, newStu]);
        setShowAddModal(false);
        // Reset form
        setFullName("");
        setDateOfBirth("");
        setPhone("");
        setCccd("");
        setPlaceOfBirth("");
        setDateJoinedGroup("");
        setNotes("");

        setTimeout(() => setSuccessMessage(""), 4000);
        router.refresh();
      } else {
        alert("Lỗi: " + data.error);
      }
    } catch (err) {
      alert("Lỗi kết nối khi thêm học viên");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Action and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên, ngày sinh, số điện thoại, CCCD..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border outline-none text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPrivateInfo(!showPrivateInfo)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
          >
            {showPrivateInfo ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showPrivateInfo ? "Ẩn CCCD / SĐT" : "Hiện CCCD / SĐT"}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ THÊM HỌC VIÊN</span>
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Đang hiển thị <strong>{filteredStudents.length}</strong> / <strong>{students.length}</strong> học viên
        </span>
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
                <th className="p-3.5 text-center">Nguồn Sheet</th>
                <th className="p-3.5 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredStudents.map((s, idx) => (
                <tr key={s.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                  <td className="p-3.5 text-center text-slate-400 font-bold">{s.stt || idx + 1}</td>
                  <td className="p-3.5 font-bold text-slate-900 dark:text-white">{s.fullName}</td>
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
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {s.sourceSheet}
                    </span>
                  </td>
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

      {/* Modal: Thêm học viên mới */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                <span>Thêm học viên mới</span>
              </h3>
              <button onClick={() => setShowAddModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleAddStudent} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Họ và tên học viên *
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs sm:text-sm text-slate-900 dark:text-white outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Ngày sinh (dd/mm/yyyy)
                  </label>
                  <input
                    type="text"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    placeholder="15/08/1995"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Hệ học
                  </label>
                  <select
                    value={studySystem}
                    onChange={(e) => setStudySystem(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs"
                  >
                    <option value="CQ">Chính quy (CQ)</option>
                    <option value="LT">Liên thông (LT)</option>
                    <option value="VB2">Văn bằng 2 (VB2)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Số điện thoại
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0987654321"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Số CCCD / CMND
                  </label>
                  <input
                    type="text"
                    value={cccd}
                    onChange={(e) => setCccd(e.target.value)}
                    placeholder="00109..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Nơi sinh
                  </label>
                  <input
                    type="text"
                    value={placeOfBirth}
                    onChange={(e) => setPlaceOfBirth(e.target.value)}
                    placeholder="Hà Nội, Nam Định..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Ngày vào nhóm lớp
                  </label>
                  <input
                    type="text"
                    value={dateJoinedGroup}
                    onChange={(e) => setDateJoinedGroup(e.target.value)}
                    placeholder="01/08/2026"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Ghi chú
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ghi chú thêm..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 bg-slate-100 dark:bg-slate-800 font-semibold text-xs"
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>XÁC NHẬN THÊM</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
