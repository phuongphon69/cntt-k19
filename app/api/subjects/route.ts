// app/api/subjects/route.ts
import { NextResponse } from "next/server";
import { getSubjects } from "@/lib/google-sheets/reader";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const subjects = await getSubjects();
    return NextResponse.json({ success: true, subjects });
  } catch (error: any) {
    console.error("GET /api/subjects error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch subjects" },
      { status: 500 }
    );
  }
}
