// app/api/subjects/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSubjects } from "@/lib/google-sheets/reader";
import { invalidateCache } from "@/lib/google-sheets/cache";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    if (req.nextUrl.searchParams.get("fresh") === "true") {
      invalidateCache();
    }
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
