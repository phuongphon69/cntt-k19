// app/api/push/subscribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  addSubscription,
  isPushStoreConfigured,
  isValidSubscription,
  removeSubscription,
} from "@/lib/push/store";

export const dynamic = "force-dynamic";

// Đăng ký thiết bị nhận thông báo
export async function POST(req: NextRequest) {
  if (!isPushStoreConfigured()) {
    return NextResponse.json({ success: false, error: "Chưa cấu hình thông báo đẩy" }, { status: 503 });
  }
  try {
    const body = await req.json();
    const sub = body?.subscription;
    if (!isValidSubscription(sub)) {
      return NextResponse.json({ success: false, error: "Dữ liệu đăng ký không hợp lệ" }, { status: 400 });
    }
    await addSubscription(sub);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST /api/push/subscribe error:", error);
    return NextResponse.json({ success: false, error: "Không lưu được đăng ký" }, { status: 500 });
  }
}

// Hủy đăng ký
export async function DELETE(req: NextRequest) {
  if (!isPushStoreConfigured()) {
    return NextResponse.json({ success: false, error: "Chưa cấu hình thông báo đẩy" }, { status: 503 });
  }
  try {
    const body = await req.json();
    const endpoint = body?.endpoint;
    if (typeof endpoint !== "string" || !endpoint) {
      return NextResponse.json({ success: false, error: "Thiếu endpoint" }, { status: 400 });
    }
    await removeSubscription(endpoint);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/push/subscribe error:", error);
    return NextResponse.json({ success: false, error: "Không hủy được đăng ký" }, { status: 500 });
  }
}
