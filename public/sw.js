// public/sw.js
// Service Worker for CNTT-K19 PWA - Push Notifications & Class Reminders
// Version: 2.0

const CACHE_NAME = "cntt-k19-v2";
const STATIC_ASSETS = ["/", "/today", "/schedule", "/subjects", "/icon-192.png", "/icon-512.png"];

// ─── Install: cache static assets ───────────────────────────────────────────
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
});

// ─── Activate: cleanup old caches ───────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ─── Fetch: Network-first for API, cache-first for static ───────────────────
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET and API routes
  if (event.request.method !== "GET" || url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && event.request.destination !== "document") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ─── Push: Receive push from server (future) ────────────────────────────────
self.addEventListener("push", (event) => {
  let data = {
    title: "🔔 CNTT-K19: Sắp đến giờ học!",
    body: "Lớp học sắp bắt đầu. Bấm để vào lớp ngay!",
    url: "/today",
    icon: "/icon-192.png",
  };

  if (event.data) {
    try {
      Object.assign(data, event.data.json());
    } catch {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || "/icon-192.png",
      badge: "/icon-192.png",
      vibrate: [300, 100, 300, 100, 500],
      tag: "cntt-k19-class-reminder",
      renotify: true,
      requireInteraction: true,
      data: { url: data.url || "/today" },
      actions: [
        { action: "open_class", title: "📹 Vào lớp ngay" },
        { action: "dismiss", title: "Nhắc lại sau" },
      ],
    })
  );
});

// ─── Notification Click ──────────────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const action = event.action;
  const targetUrl = event.notification.data?.url || "/today";

  if (action === "dismiss") return;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // Focus existing window if open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate && client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// ─── Background Sync for Scheduled Reminders ────────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data?.type === "SCHEDULE_REMINDER") {
    const { title, body, url, delayMs } = event.data;
    setTimeout(() => {
      self.registration.showNotification(title, {
        body,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        vibrate: [400, 100, 400, 100, 800],
        tag: "cntt-k19-scheduled-" + Date.now(),
        requireInteraction: true,
        data: { url: url || "/today" },
        actions: [
          { action: "open_class", title: "📹 Vào lớp ngay" },
          { action: "dismiss", title: "Bỏ qua" },
        ],
      });
    }, delayMs || 0);
  }
});
