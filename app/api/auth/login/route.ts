// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { checkAdminPassword, createAdminToken, setAdminSessionCookie } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json({ success: false, error: "Vui lòng nhập mật khẩu" }, { status: 400 });
    }

    const isValid = checkAdminPassword(password);
    if (!isValid) {
      return NextResponse.json({ success: false, error: "Mật khẩu quản trị không chính xác" }, { status: 401 });
    }

    const token = await createAdminToken("admin");
    await setAdminSessionCookie(token);

    return NextResponse.json({
      success: true,
      message: "Đăng nhập Quản trị thành công",
      user: { username: "admin", role: "ADMIN" },
    });
  } catch (error: any) {
    console.error("POST /api/auth/login error:", error);
    return NextResponse.json({ success: false, error: "Đã xảy ra lỗi khi đăng nhập" }, { status: 500 });
  }
}
