// lib/push/store.ts
// Lưu danh sách thiết bị đăng ký nhận thông báo bằng Upstash Redis (REST API, miễn phí).
// Cần biến môi trường: UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
// (hoặc KV_REST_API_URL + KV_REST_API_TOKEN nếu tạo bằng Vercel KV / Upstash trong Vercel Marketplace).
import { createHash } from "crypto";

export interface PushSubscriptionJSON {
  endpoint: string;
  expirationTime?: number | null;
  keys: { p256dh: string; auth: string };
}

const SUBS_KEY = "cntt-k19:push:subs";

function config(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ""), token };
}

export function isPushStoreConfigured(): boolean {
  return config() !== null;
}

async function redis(command: (string | number)[]): Promise<any> {
  const cfg = config();
  if (!cfg) throw new Error("PUSH_STORE_NOT_CONFIGURED");
  const res = await fetch(cfg.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Redis HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(String(data.error));
  return data.result;
}

function idOf(endpoint: string): string {
  return createHash("sha256").update(endpoint).digest("hex").slice(0, 32);
}

export function isValidSubscription(sub: any): sub is PushSubscriptionJSON {
  return (
    !!sub &&
    typeof sub.endpoint === "string" &&
    sub.endpoint.startsWith("https://") &&
    sub.endpoint.length < 1000 &&
    typeof sub.keys?.p256dh === "string" &&
    typeof sub.keys?.auth === "string"
  );
}

export async function addSubscription(sub: PushSubscriptionJSON): Promise<void> {
  const clean: PushSubscriptionJSON = {
    endpoint: sub.endpoint,
    expirationTime: sub.expirationTime ?? null,
    keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
  };
  await redis(["HSET", SUBS_KEY, idOf(sub.endpoint), JSON.stringify(clean)]);
}

export async function removeSubscription(endpoint: string): Promise<void> {
  await redis(["HDEL", SUBS_KEY, idOf(endpoint)]);
}

export async function listSubscriptions(): Promise<PushSubscriptionJSON[]> {
  const flat: string[] = (await redis(["HGETALL", SUBS_KEY])) || [];
  const subs: PushSubscriptionJSON[] = [];
  for (let i = 1; i < flat.length; i += 2) {
    try {
      const parsed = JSON.parse(flat[i]);
      if (isValidSubscription(parsed)) subs.push(parsed);
    } catch {}
  }
  return subs;
}

/** Đánh dấu đã gửi nhắc cho 1 buổi học; trả về true nếu đây là lần đầu (chưa gửi) */
export async function claimReminder(key: string, ttlSeconds = 2 * 24 * 3600): Promise<boolean> {
  const result = await redis(["SET", `cntt-k19:push:sent:${key}`, "1", "NX", "EX", ttlSeconds]);
  return result === "OK";
}
