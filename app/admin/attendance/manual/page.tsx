// app/admin/attendance/manual/page.tsx
import React from "react";
import { getSubjects, getPublicStudents } from "@/lib/google-sheets/reader";
import { ManualAttendanceClient } from "@/components/admin/manual-attendance-client";

export const dynamic = "force-dynamic";

export default async function AdminManualAttendancePage() {
  const subjects = await getSubjects();
  const students = await getPublicStudents();

  return <ManualAttendanceClient subjects={subjects} students={students} />;
}
