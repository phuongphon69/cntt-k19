// app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ authenticated: false, role: "VIEWER" });
  }
  return NextResponse.json({
    authenticated: true,
    user: { username: session.username, role: session.role },
  });
}
