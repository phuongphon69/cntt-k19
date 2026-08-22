// app/api/students/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getStudents, getSubjects, getAttendanceSheetData } from "@/lib/google-sheets/reader";
import { PublicStudent, StudentAttendanceRecord } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const students = await getStudents();
    const student = students.find((s) => s.id === id || s.normalizedNameNoAccent === id);

    if (!student) {
      return NextResponse.json({ success: false, error: "Student not found" }, { status: 404 });
    }

    const publicStudent: PublicStudent = {
      id: student.id,
      fullName: student.fullName,
      studySystem: student.studySystem,
      dateOfBirth: student.dateOfBirth,
      active: student.active,
    };

    // Calculate student attendance across all subjects
    const subjects = await getSubjects();
    const subjectAttendance: {
      subjectId: string;
      subjectName: string;
      teacher: string;
      record?: StudentAttendanceRecord;
    }[] = [];

    for (const sub of subjects) {
      const parsed = await getAttendanceSheetData(sub.attendanceSheet);
      const studentRec = parsed.records.find(
        (r) => r.studentId === student.id || r.studentName === student.fullName
      );

      subjectAttendance.push({
        subjectId: sub.id,
        subjectName: sub.name,
        teacher: sub.teacher,
        record: studentRec,
      });
    }

    return NextResponse.json({
      success: true,
      student: publicStudent,
      subjectAttendance,
    });
  } catch (error: any) {
    console.error("GET /api/students/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch student details" },
      { status: 500 }
    );
  }
}
