// app/api/push/key/route.ts
import { NextResponse } from "next/server";
import { isPushStoreConfigured } from "@/lib/push/store";

export const dynamic = "force-dynamic";

// Trả về khóa công khai VAPID và cho biết hệ thống thông báo đẩy đã được cấu hình đủ chưa
export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY || "";
  const configured = !!publicKey && !!process.env.VAPID_PRIVATE_KEY && isPushStoreConfigured();
  return NextResponse.json({ configured, publicKey: configured ? publicKey : "" });
}
