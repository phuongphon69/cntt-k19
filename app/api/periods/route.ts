// app/api/periods/route.ts
import { NextResponse } from "next/server";
import { getPeriods } from "@/lib/google-sheets/reader";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const periods = await getPeriods();
    return NextResponse.json({ success: true, periods });
  } catch (error: any) {
    console.error("GET /api/periods error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch periods" },
      { status: 500 }
    );
  }
}
