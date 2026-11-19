// lib/google-sheets/cache.ts

interface CacheItem<T> {
  data: T;
  expiresAt: number;
}

// Gắn vào globalThis để mọi bundle (trang, API route) dùng chung một cache,
// tránh mỗi nơi tự tải lại dữ liệu Google Sheet từ đầu.
const g = globalThis as unknown as { __sheetMemoryCache?: Map<string, CacheItem<any>> };
const memoryCache: Map<string, CacheItem<any>> = (g.__sheetMemoryCache ??= new Map());
const DEFAULT_TTL_MS = 45 * 1000; // 45 seconds default cache

export function getCached<T>(key: string): T | null {
  const item = memoryCache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return item.data as T;
}

export function setCached<T>(key: string, data: T, ttlMs = DEFAULT_TTL_MS): void {
  memoryCache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
}

export function invalidateCache(prefix?: string): void {
  if (!prefix) {
    memoryCache.clear();
    invalidateStale();
  } else {
    invalidateStale(prefix);
    for (const key of Array.from(memoryCache.keys())) {
      if (key.startsWith(prefix)) {
        memoryCache.delete(key);
      }
    }
  }
}

export let lastSyncTimestamp: string = new Date().toISOString();

export function updateSyncTimestamp(): void {
  lastSyncTimestamp = new Date().toISOString();
}

// ---- Stale-while-revalidate cho dữ liệu tải từ Google Sheet ----
// Trả ngay dữ liệu cũ (tối đa HARD_TTL) và làm mới ngầm khi đã quá SOFT_TTL,
// nên người dùng không phải chờ Google Sheet mỗi 45 giây.
const SOFT_TTL_MS = 45 * 1000;
const HARD_TTL_MS = 30 * 60 * 1000;

const g2 = globalThis as unknown as {
  __sheetStale?: Map<string, { data: any; fetchedAt: number }>;
  __sheetInflight?: Map<string, Promise<any>>;
};
const staleStore: Map<string, { data: any; fetchedAt: number }> = (g2.__sheetStale ??= new Map());
const inflight: Map<string, Promise<any>> = (g2.__sheetInflight ??= new Map());

export function invalidateStale(prefix?: string): void {
  for (const key of Array.from(staleStore.keys())) {
    if (!prefix || key.startsWith(prefix)) staleStore.delete(key);
  }
}

/**
 * loader chạy tối đa một lần cho mỗi key tại một thời điểm (gộp các request đồng thời).
 * Chỉ lưu kết quả khi loader trả về dữ liệu hợp lệ (isValid).
 */
export async function swr<T>(
  key: string,
  loader: () => Promise<T>,
  opts: { forceFresh?: boolean; isValid?: (v: T) => boolean } = {}
): Promise<T> {
  const isValid = opts.isValid ?? (() => true);
  const entry = staleStore.get(key);
  const now = Date.now();

  const run = (): Promise<T> => {
    const existing = inflight.get(key);
    if (existing) return existing;
    const p = loader()
      .then((v) => {
        if (isValid(v)) staleStore.set(key, { data: v, fetchedAt: Date.now() });
        return v;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, p);
    return p;
  };

  if (!opts.forceFresh && entry && now - entry.fetchedAt < HARD_TTL_MS) {
    if (now - entry.fetchedAt >= SOFT_TTL_MS) run().catch(() => {});
    return entry.data as T;
  }
  return run();
}
