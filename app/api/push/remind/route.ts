// app/api/push/remind/route.ts
// Gọi định kỳ (mỗi 5 phút) bởi bộ hẹn giờ bên ngoài: gửi thông báo cho các buổi học sắp bắt đầu.
// Xác thực bằng CRON_SECRET: header "Authorization: Bearer <secret>" hoặc tham số ?secret=<secret>.
import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { timingSafeEqual } from "crypto";
import { getSchedule } from "@/lib/google-sheets/reader";
import { buildReminderMessage, findDueReminders } from "@/lib/push/reminders";
import { claimReminder, isPushStoreConfigured, listSubscriptions, removeSubscription } from "@/lib/push/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") || "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : req.nextUrl.searchParams.get("secret") || "";
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY || !isPushStoreConfigured()) {
    return NextResponse.json({ success: false, error: "Chưa cấu hình thông báo đẩy" }, { status: 503 });
  }

  try {
    const dryRun = req.nextUrl.searchParams.get("dry") === "1";
    const schedule = await getSchedule();
    const due = findDueReminders(schedule);

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        due: due.map((d) => ({ key: d.key, minutesLeft: d.minutesLeft, message: buildReminderMessage(d) })),
      });
    }

    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:admin@cntt-k19.local",
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    let sent = 0;
    let failed = 0;
    let removed = 0;
    const handled: string[] = [];

    for (const reminder of due) {
      // Chỉ gửi 1 lần cho mỗi buổi + mốc nhắc
      if (!(await claimReminder(reminder.key))) continue;
      handled.push(reminder.key);

      const payload = JSON.stringify(buildReminderMessage(reminder));
      const subs = await listSubscriptions();
      await Promise.all(
        subs.map(async (sub) => {
          try {
            await webpush.sendNotification(sub, payload, { TTL: 15 * 60, urgency: "high" });
            sent++;
          } catch (err: any) {
            if (err?.statusCode === 404 || err?.statusCode === 410) {
              await removeSubscription(sub.endpoint).catch(() => {});
              removed++;
            } else {
              failed++;
            }
          }
        })
      );
    }

    return NextResponse.json({ success: true, due: due.length, handled, sent, failed, removed });
  } catch (error: any) {
    console.error("GET /api/push/remind error:", error);
    return NextResponse.json({ success: false, error: error.message || "Lỗi gửi thông báo" }, { status: 500 });
  }
}
