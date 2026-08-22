// app/api/today/route.ts
import { NextResponse } from "next/server";
import { getSchedule } from "@/lib/google-sheets/reader";
import { ScheduleItem } from "@/types";
import { formatDateVN } from "@/lib/utils";

export const dynamic = "force-dynamic";

export interface TodayClassInfo extends ScheduleItem {
  statusText: string;
  isLiveNow: boolean;
  minutesUntilStart?: number;
}

export async function GET() {
  try {
    const schedule = await getSchedule();

    // Get current date & time in Asia/Ho_Chi_Minh
    const now = new Date();
    const vnTimeStr = now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
    const vnDate = new Date(vnTimeStr);

    const todayStr = formatDateVN(vnDate); // e.g. "22/08/2026"
    const currentHour = vnDate.getHours();
    const currentMinute = vnDate.getMinutes();
    const currentTotalMinutes = currentHour * 60 + currentMinute;

    // Filter schedule items for today or next upcoming
    const todayItems: TodayClassInfo[] = [];

    for (const item of schedule) {
      if (item.date === todayStr) {
        // Calculate minutes
        let isLiveNow = false;
        let statusText = "Sắp diễn ra";
        let minutesUntilStart: number | undefined = undefined;

        if (item.startTime && item.endTime) {
          const [sH, sM] = item.startTime.split(":").map((x) => parseInt(x, 10));
          const [eH, eM] = item.endTime.split(":").map((x) => parseInt(x, 10));
          const startTotal = sH * 60 + sM;
          const endTotal = eH * 60 + eM;

          if (currentTotalMinutes >= startTotal && currentTotalMinutes <= endTotal) {
            isLiveNow = true;
            statusText = "ĐANG HỌC";
          } else if (currentTotalMinutes < startTotal) {
            const diff = startTotal - currentTotalMinutes;
            minutesUntilStart = diff;
            if (diff <= 60) {
              statusText = `Bắt đầu sau ${diff} phút`;
            } else {
              statusText = `Bắt đầu lúc ${item.startTime}`;
            }
          } else {
            statusText = "Đã kết thúc";
          }
        }

        todayItems.push({
          ...item,
          statusText,
          isLiveNow,
          minutesUntilStart,
        });
      }
    }

    // Next upcoming class from future days
    const nextUpcoming = schedule.find((s) => s.date !== todayStr);

    return NextResponse.json({
      success: true,
      currentDate: todayStr,
      currentTime: `${String(currentHour).padStart(2, "0")}:${String(currentMinute).padStart(2, "0")}`,
      todayClasses: todayItems,
      hasClassesToday: todayItems.length > 0,
      nextUpcoming,
    });
  } catch (error: any) {
    console.error("GET /api/today error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch today schedule" },
      { status: 500 }
    );
  }
}
