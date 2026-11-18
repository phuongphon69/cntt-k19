import { describe, it, expect, afterEach, vi } from "vitest";
import { buildReminderMessage, classStartEpoch, findDueReminders } from "../lib/push/reminders";
import { addSubscription, claimReminder, isValidSubscription, listSubscriptions } from "../lib/push/store";
import { ScheduleItem } from "../types";

function item(partial: Partial<ScheduleItem>): ScheduleItem {
  return {
    id: "s1",
    subjectId: "co_so_du_lieu",
    subjectName: "Cơ Sở Dữ Liệu",
    date: "19/10/2026",
    dayOfWeek: "Thứ 2",
    startPeriod: 11,
    endPeriod: 13,
    startTime: "19:00",
    endTime: "21:30",
    sessionType: "Học online",
    status: "SCHEDULED",
    teacher: "Cô Hòa",
    ...partial,
  } as ScheduleItem;
}

// 19:00 giờ Việt Nam ngày 19/10/2026 = 12:00 UTC
const START = Date.UTC(2026, 9, 19, 12, 0);

describe("Push reminders", () => {
  it("computes class start in Vietnam time", () => {
    expect(classStartEpoch({ date: "19/10/2026", startTime: "19:00" })).toBe(START);
    expect(classStartEpoch({ date: "19/10/26", startTime: "07:30" })).toBe(Date.UTC(2026, 9, 19, 0, 30));
    expect(classStartEpoch({ date: "", startTime: "19:00" })).toBeNull();
  });

  it("only reminds classes starting within 30 minutes, with the nearest stage", () => {
    const s = [item({})];
    expect(findDueReminders(s, START - 45 * 60000)).toHaveLength(0);
    const at28 = findDueReminders(s, START - 28 * 60000);
    expect(at28).toHaveLength(1);
    expect(at28[0].stage).toBe(30);
    const at8 = findDueReminders(s, START - 8 * 60000);
    expect(at8[0].stage).toBe(10);
    expect(findDueReminders(s, START + 60000)).toHaveLength(0);
  });

  it("uses different dedupe keys per stage and skips holidays or cancelled classes", () => {
    const s = [item({})];
    const k30 = findDueReminders(s, START - 25 * 60000)[0].key;
    const k10 = findDueReminders(s, START - 5 * 60000)[0].key;
    expect(k30).not.toBe(k10);

    const skipped = [item({ subjectName: "Nghỉ học" }), item({ status: "CANCELLED" })];
    expect(findDueReminders(skipped, START - 20 * 60000)).toHaveLength(0);
  });

  it("builds a readable message", () => {
    const [r] = findDueReminders([item({})], START - 29 * 60000);
    const msg = buildReminderMessage(r);
    expect(msg.title).toContain("Cơ Sở Dữ Liệu");
    expect(msg.title).toContain("29 phút");
    expect(msg.body).toContain("19:00 - 21:30");
    expect(msg.body).toContain("Cô Hòa");
    expect(msg.url).toBe("/today");
  });
});

describe("Push store (Upstash REST)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it("validates subscriptions", () => {
    expect(isValidSubscription({ endpoint: "https://fcm.googleapis.com/x", keys: { p256dh: "a", auth: "b" } })).toBe(true);
    expect(isValidSubscription({ endpoint: "http://insecure", keys: { p256dh: "a", auth: "b" } })).toBe(false);
    expect(isValidSubscription({ endpoint: "https://x" })).toBe(false);
    expect(isValidSubscription(null)).toBe(false);
  });

  it("talks to Redis REST with the right commands", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.com/";
    process.env.UPSTASH_REDIS_REST_TOKEN = "tok";
    const calls: any[] = [];
    const sub = { endpoint: "https://push.example.com/abc", expirationTime: null, keys: { p256dh: "P", auth: "A" } };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: any) => {
        const cmd = JSON.parse(init.body);
        calls.push({ url, auth: init.headers.Authorization, cmd });
        if (cmd[0] === "HGETALL") return new Response(JSON.stringify({ result: ["id1", JSON.stringify(sub)] }));
        if (cmd[0] === "SET") return new Response(JSON.stringify({ result: calls.filter((c) => c.cmd[0] === "SET").length === 1 ? "OK" : null }));
        return new Response(JSON.stringify({ result: 1 }));
      })
    );

    await addSubscription(sub as any);
    expect(calls[0].url).toBe("https://redis.example.com");
    expect(calls[0].auth).toBe("Bearer tok");
    expect(calls[0].cmd[0]).toBe("HSET");

    const subs = await listSubscriptions();
    expect(subs).toHaveLength(1);
    expect(subs[0].endpoint).toBe(sub.endpoint);

    expect(await claimReminder("k1")).toBe(true); // lần đầu
    expect(await claimReminder("k1")).toBe(false); // trùng
  });
});
