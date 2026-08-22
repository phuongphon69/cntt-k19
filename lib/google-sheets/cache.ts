// lib/google-sheets/cache.ts

interface CacheItem<T> {
  data: T;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheItem<any>>();
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
  } else {
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
