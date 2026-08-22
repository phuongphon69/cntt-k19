// app/admin/attendance/zoom/page.tsx
import React from "react";
import { getSubjects, getPublicStudents } from "@/lib/google-sheets/reader";
import { ZoomAttendanceClient } from "@/components/admin/zoom-attendance-client";

export const dynamic = "force-dynamic";

export default async function AdminZoomAttendancePage() {
  const subjects = await getSubjects();
  const students = await getPublicStudents();

  return <ZoomAttendanceClient subjects={subjects} students={students} />;
}
