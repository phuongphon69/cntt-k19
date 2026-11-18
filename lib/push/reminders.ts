// lib/push/reminders.ts
// Chọn các buổi học sắp bắt đầu để gửi thông báo (giờ Việt Nam, UTC+7 không đổi giờ mùa hè).
import { ScheduleItem } from "@/types";

/** Các mốc nhắc (phút trước giờ học), từ xa tới gần */
export const REMINDER_STAGES = [30, 10] as const;

const VN_OFFSET_HOURS = 7;

/** Thời điểm bắt đầu buổi học (epoch ms) từ ngày dd/mm/yyyy và giờ HH:mm theo giờ Việt Nam */
export function classStartEpoch(item: Pick<ScheduleItem, "date" | "startTime">): number | null {
  const d = String(item.date || "").match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  const t = String(item.startTime || "").match(/(\d{1,2}):(\d{2})/);
  if (!d || !t) return null;
  const year = d[3].length === 2 ? 2000 + Number(d[3]) : Number(d[3]);
  return Date.UTC(year, Number(d[2]) - 1, Number(d[1]), Number(t[1]) - VN_OFFSET_HOURS, Number(t[2]));
}

export interface DueReminder {
  item: ScheduleItem;
  stage: number; // mốc nhắc (phút)
  minutesLeft: number;
  key: string; // khóa chống gửi trùng
}

function isHoliday(item: ScheduleItem): boolean {
  const name = String(item.subjectName || "").toLowerCase();
  return (
    item.status === "CANCELLED" ||
    name.includes("nghỉ") ||
    name.includes("nghi hoc") ||
    name === "ôn tập" ||
    name === "on tap"
  );
}

/**
 * Trả về các buổi học cần nhắc ngay lúc này: buổi bắt đầu trong vòng `stage` phút tới.
 * Mỗi buổi chỉ lấy mốc nhỏ nhất đã tới (ví dụ còn 8 phút → mốc 10), nên nếu bộ hẹn giờ chạy chậm
 * vẫn không gửi dồn nhiều thông báo cho cùng một buổi.
 */
export function findDueReminders(schedule: ScheduleItem[], nowMs: number = Date.now()): DueReminder[] {
  const due: DueReminder[] = [];
  for (const item of schedule) {
    if (isHoliday(item)) continue;
    const start = classStartEpoch(item);
    if (start === null) continue;
    const minutesLeft = Math.ceil((start - nowMs) / 60000);
    if (minutesLeft <= 0) continue;

    // Mốc nhỏ nhất mà buổi học đã lọt vào
    const stage = [...REMINDER_STAGES].reverse().find((s) => minutesLeft <= s);
    if (stage === undefined) continue;

    due.push({
      item,
      stage,
      minutesLeft,
      key: `${item.id || item.subjectName}:${item.date}:${item.startTime}:${stage}`,
    });
  }
  return due;
}

export function buildReminderMessage(reminder: DueReminder) {
  const { item, minutesLeft } = reminder;
  const time = item.endTime ? `${item.startTime} - ${item.endTime}` : item.startTime;
  const parts = [time];
  if (item.teacher) parts.push(item.teacher);
  return {
    title: `⏰ Còn ${minutesLeft} phút đến giờ học: ${item.subjectName}`,
    body: parts.join(" • "),
    url: "/today",
    tag: `class-${item.date}-${item.startTime}`,
  };
}
