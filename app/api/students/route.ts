// app/api/students/route.ts
import { NextResponse } from "next/server";
import { getPublicStudents } from "@/lib/google-sheets/reader";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const students = await getPublicStudents();
    return NextResponse.json({ success: true, students });
  } catch (error: any) {
    console.error("GET /api/students error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch students" },
      { status: 500 }
    );
  }
}
