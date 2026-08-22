// app/api/auth/logout/route.ts
import { NextResponse } from "next/server";
import { clearAdminSessionCookie } from "@/lib/auth/session";

export async function POST() {
  await clearAdminSessionCookie();
  return NextResponse.json({ success: true, message: "Đã đăng xuất" });
}
