// lib/push/client.ts
// Đăng ký thiết bị nhận thông báo đẩy (chạy trong trình duyệt).

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export type PushSetupResult = "subscribed" | "unsupported" | "not-configured" | "denied" | "error";

/** Đăng ký nhận thông báo đẩy (cần quyền thông báo đã được cấp) */
export async function ensurePushSubscription(): Promise<PushSetupResult> {
  if (!isPushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  if (Notification.permission !== "granted") return "error";

  try {
    const keyRes = await fetch("/api/push/key", { cache: "no-store" });
    const { configured, publicKey } = await keyRes.json();
    if (!configured || !publicKey) return "not-configured";

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
      });
    }

    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: sub.toJSON() }),
    });
    return res.ok ? "subscribed" : "error";
  } catch (err) {
    console.warn("[push] subscribe failed:", err);
    return "error";
  }
}

/** Hủy đăng ký nhận thông báo đẩy trên thiết bị này */
export async function removePushSubscription(): Promise<void> {
  if (!isPushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    await fetch("/api/push/subscribe", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    }).catch(() => {});
    await sub.unsubscribe();
  } catch {}
}
