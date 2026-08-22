// app/admin/student-mapping/page.tsx
import React from "react";
import { UserCheck, HelpCircle, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { getStudents, getAttendanceSheetData, getWorkbookSheetNames } from "@/lib/google-sheets/reader";
import { normalizeVietnameseNameWithoutAccent } from "@/lib/vietnamese/normalize";

export const dynamic = "force-dynamic";

export default async function StudentMappingPage() {
  const masterStudents = await getStudents();
  const sheetNames = await getWorkbookSheetNames();
  const ddSheets = sheetNames.filter((s) => s.trim().toUpperCase().startsWith("DD "));

  const masterIds = new Set(masterStudents.map((s) => s.id));

  // Collect all students across all DD sheets
  const unmappedCandidates: {
    sheetName: string;
    studentName: string;
    dob?: string;
    studySystem?: string;
  }[] = [];

  for (const sheet of ddSheets) {
    const parsed = await getAttendanceSheetData(sheet);
    for (const rec of parsed.records) {
      if (!masterIds.has(rec.studentId)) {
        unmappedCandidates.push({
          sheetName: sheet,
          studentName: rec.studentName,
          dob: rec.dateOfBirth,
          studySystem: rec.studySystem,
        });
      }
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <UserCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Ghép Định danh Sinh viên (Student Mapping)
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Liên kết các học viên giữa các sheet điểm danh cũ và danh sách lớp chính thức. Không đoán mò nếu thông tin chưa chắc chắn.
        </p>
      </div>

      {unmappedCandidates.length === 0 ? (
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            100% Học viên đã được định danh chính xác!
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Tất cả sinh viên trong các sheet điểm danh đều đã khớp hoàn toàn với danh sách lớp theo chuẩn Họ tên và Ngày sinh.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-xs font-semibold text-slate-500">
            Phát hiện {unmappedCandidates.length} trường hợp cần xem xét ghép:
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-800">
            {unmappedCandidates.map((item, idx) => (
              <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      Chưa ghép
                    </span>
                    <span className="text-xs text-slate-400">Sheet: [{item.sheetName}]</span>
                  </div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">
                    {item.studentName}
                  </div>
                  <div className="text-xs text-slate-500">
                    {item.dob ? `Ngày sinh: ${item.dob}` : ""} {item.studySystem ? `• Hệ ${item.studySystem}` : ""}
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:w-72">
                  <select className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs text-slate-900 dark:text-white">
                    <option value="">-- Chọn học viên trong Danh sách lớp --</option>
                    {masterStudents.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName} ({s.dateOfBirth || "Chưa có NS"})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
