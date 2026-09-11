const CACHE_TTL_MS = 5 * 60 * 1000;
const entries = new Map<string, { expiresAt: number; promise: Promise<unknown> }>();

export function clearResourceOptionsCache() {
  entries.clear();
}

/** 仅缓存资源下拉分页结果，同条件并发请求共用一个 Promise。 */
export function loadResourceOptions<T>(path: string, params: Record<string, unknown>, fetcher: () => Promise<T>): Promise<T> {
  const now = Date.now();
  for (const [key, entry] of entries) {
    if (entry.expiresAt <= now) entries.delete(key);
  }
  const key = JSON.stringify([path, Object.entries(params).filter(([, value]) => value !== undefined).sort(([a], [b]) => a.localeCompare(b))]);
  const cached = entries.get(key);
  if (cached) return cached.promise as Promise<T>;
  const promise = fetcher();
  const entry = { expiresAt: now + CACHE_TTL_MS, promise };
  entries.set(key, entry);
  void promise.catch(() => {
    if (entries.get(key) === entry) entries.delete(key);
  });
  return promise;
}
