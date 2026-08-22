// app/api/schedule/route.ts
import { NextResponse } from "next/server";
import { getSchedule } from "@/lib/google-sheets/reader";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const schedule = await getSchedule();
    return NextResponse.json({ success: true, schedule });
  } catch (error: any) {
    console.error("GET /api/schedule error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch schedule" },
      { status: 500 }
    );
  }
}
