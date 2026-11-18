// components/stats/stats-pdf-preview.tsx
"use client";

import React, { useEffect } from "react";
import { X, Download, FileText } from "lucide-react";
import { ComprehensiveAttendanceReport, StudentComprehensiveStat } from "@/lib/attendance/stats";

interface StatsPdfPreviewProps {
  report: ComprehensiveAttendanceReport;
  students: StudentComprehensiveStat[];
  selectedSubjectId: string;
  filterLabel: string;
  displayMode: "fraction" | "percent";
  onClose: () => void;
}

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function StatsPdfPreview({
  report,
  students,
  selectedSubjectId,
  filterLabel,
  displayMode,
  onClose,
}: StatsPdfPreviewProps) {
  const subject = report.subjectStats.find((s) => s.subjectId === selectedSubjectId);
  const title = subject
    ? `Thống kê chuyên cần môn ${subject.subjectName}`
    : "Thống kê chuyên cần tất cả các môn";
  const today = new Date().toLocaleDateString("vi-VN");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // In / lưu PDF: trình duyệt dùng tiêu đề trang làm tên file mặc định
  const handleExport = () => {
    const previousTitle = document.title;
    document.title = `${slugify(title)}-${new Date().toISOString().slice(0, 10)}`;
    const restore = () => {
      document.title = previousTitle;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    window.print();
  };

  const cell = (value: string | number) => (value === "" ? "--" : value);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-sm overflow-y-auto stats-pdf-overlay">
      <style>{`
        @page { size: A4 landscape; margin: 10mm; }
        @media print {
          body * { visibility: hidden !important; }
          #stats-pdf-area, #stats-pdf-area * { visibility: visible !important; }
          .stats-pdf-overlay { position: static !important; overflow: visible !important; background: #fff !important; }
          #stats-pdf-area { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; margin: 0 !important; padding: 0 !important; }
          .stats-pdf-hide-print { display: none !important; }
          #stats-pdf-area thead { display: table-header-group; }
          #stats-pdf-area tr { page-break-inside: avoid; }
        }
      `}</style>

      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        <div className="stats-pdf-hide-print flex flex-wrap items-center justify-between gap-3 mb-4 text-white">
          <div className="flex items-center gap-2 font-bold">
            <FileText className="w-5 h-5" />
            <span>Xem nhanh PDF • {students.length} học viên</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-bold cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Xuất PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-semibold cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Đóng</span>
            </button>
          </div>
        </div>

        <div
          id="stats-pdf-area"
          className="bg-white text-slate-900 rounded-xl shadow-2xl p-6 sm:p-8"
          style={{ colorScheme: "light" }}
        >
          <div className="text-center mb-4">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Lớp CNTT - K19 CĐ
            </div>
            <h1 className="text-xl font-black mt-1">{title}</h1>
            <div className="text-xs text-slate-500 mt-1">
              Ngày xuất: {today} • Bộ lọc: {filterLabel}
              {subject ? ` • GV: ${subject.teacher || "--"} • Đã học ${subject.recordedSessions}/${subject.totalSessions} buổi` : ""}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Mỗi buổi tính 1 lần điểm danh: X = có mặt • P = có phép • M = muộn • V = vắng
            </div>
          </div>

          <div className="overflow-x-auto">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 p-1.5 w-9">STT</th>
                <th className="border border-slate-300 p-1.5 text-left">Họ và tên</th>
                <th className="border border-slate-300 p-1.5">Ngày sinh</th>
                {selectedSubjectId === "ALL" ? (
                  <>
                    {report.subjectStats.map((sub) => (
                      <th key={sub.subjectId} className="border border-slate-300 p-1.5">
                        {sub.subjectName}
                      </th>
                    ))}
                    <th className="border border-slate-300 p-1.5">Tổng hợp</th>
                  </>
                ) : (
                  <>
                    <th className="border border-slate-300 p-1.5">Số buổi có mặt</th>
                    <th className="border border-slate-300 p-1.5">X</th>
                    <th className="border border-slate-300 p-1.5">P</th>
                    <th className="border border-slate-300 p-1.5">M</th>
                    <th className="border border-slate-300 p-1.5">V</th>
                    <th className="border border-slate-300 p-1.5">Tỷ lệ</th>
                    <th className="border border-slate-300 p-1.5">Đánh giá</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {students.map((s, idx) => {
                const subStat = s.subjects.find((sub) => sub.subjectId === selectedSubjectId);
                return (
                  <tr key={s.student.id || idx}>
                    <td className="border border-slate-300 p-1.5 text-center">{s.student.stt || idx + 1}</td>
                    <td className="border border-slate-300 p-1.5 font-semibold">{s.student.fullName}</td>
                    <td className="border border-slate-300 p-1.5 text-center">{cell(s.student.dateOfBirth || "")}</td>
                    {selectedSubjectId === "ALL" ? (
                      <>
                        {s.subjects.map((item) => (
                          <td
                            key={item.subjectId}
                            className={`border border-slate-300 p-1.5 text-center ${
                              item.isApplicable && item.recordedSessions > 0 && item.warning
                                ? "text-rose-700 font-bold"
                                : ""
                            }`}
                          >
                            {!item.isApplicable
                              ? "K/A"
                              : item.recordedSessions === 0
                              ? "--"
                              : displayMode === "fraction"
                              ? `${item.sessionFraction} (${item.attendanceRate}%)`
                              : `${item.attendanceRate}%`}
                          </td>
                        ))}
                        <td
                          className={`border border-slate-300 p-1.5 text-center font-bold ${
                            s.overallWarning ? "text-rose-700" : ""
                          }`}
                        >
                          {s.totalSlotsAllSubjects > 0
                            ? displayMode === "fraction"
                              ? `${s.overallSessionFraction} (${s.overallAttendanceRate}%)`
                              : `${s.overallAttendanceRate}%`
                            : "--"}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="border border-slate-300 p-1.5 text-center">{subStat?.sessionFraction || "--"}</td>
                        <td className="border border-slate-300 p-1.5 text-center">{subStat?.countX || 0}</td>
                        <td className="border border-slate-300 p-1.5 text-center">{subStat?.countP || 0}</td>
                        <td className="border border-slate-300 p-1.5 text-center">{subStat?.countM || 0}</td>
                        <td className="border border-slate-300 p-1.5 text-center">{subStat?.countAbsent || 0}</td>
                        <td className="border border-slate-300 p-1.5 text-center font-bold">
                          {!subStat?.isApplicable || subStat.recordedSessions === 0 ? "--" : `${subStat.attendanceRate}%`}
                        </td>
                        <td
                          className={`border border-slate-300 p-1.5 text-center font-semibold ${
                            subStat?.warning ? "text-rose-700" : ""
                          }`}
                        >
                          {!subStat?.isApplicable || subStat.recordedSessions === 0
                            ? "--"
                            : subStat.warning
                            ? "Cảnh báo"
                            : "Đạt"}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
              {students.length === 0 && (
                <tr>
                  <td colSpan={12} className="border border-slate-300 p-6 text-center text-slate-500">
                    Không có học viên nào phù hợp với bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>

          <div className="mt-3 text-[10px] text-slate-400 text-right">
            Cảnh báo: tỷ lệ chuyên cần dưới 80% • K/A: không áp dụng
          </div>
        </div>
      </div>
    </div>
  );
}
