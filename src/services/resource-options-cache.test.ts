import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { clearResourceOptionsCache, loadResourceOptions } from "./resource-options-cache";

beforeEach(() => { clearResourceOptionsCache(); vi.useFakeTimers(); });
afterEach(() => vi.useRealTimers());

it("shares concurrent and repeated pages across selectors regardless of parameter order", async () => {
  const fetcher = vi.fn().mockResolvedValue({ list: [{ id: "bus" }], total: 1 });
  const first = loadResourceOptions("transports", { page: 1, tier: "standard" }, fetcher);
  const second = loadResourceOptions("transports", { tier: "standard", page: 1 }, fetcher);
  expect(first).toBe(second);
  await first;
  await loadResourceOptions("transports", { page: 1, tier: "standard" }, fetcher);
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it("separates kinds, filters, keywords and pages", async () => {
  const fetcher = vi.fn().mockResolvedValue({ list: [], total: 0 });
  for (const [path, query] of [
    ["transports", { page: 1, tier: "standard" }],
    ["transports", { page: 2, tier: "standard" }],
    ["transports", { page: 1, tier: "vip" }],
    ["transports", { page: 1, tier: "standard", keyword: "bus" }],
    ["hotels", { page: 1, tier: "standard" }],
  ] as const) await loadResourceOptions(path, query, fetcher);
  expect(fetcher).toHaveBeenCalledTimes(5);
});

it("refreshes after expiry or invalidation and retries failures", async () => {
  const fetcher = vi.fn().mockResolvedValue({ list: [], total: 0 });
  const load = () => loadResourceOptions("transports", {}, fetcher);
  await load();
  vi.advanceTimersByTime(300001);
  await load();
  clearResourceOptionsCache();
  fetcher.mockRejectedValueOnce(new Error("offline"));
  await expect(load()).rejects.toThrow("offline");
  await load();
  expect(fetcher).toHaveBeenCalledTimes(4);
});

it("does not let an invalidated pending response replace fresh data", async () => {
  let resolve!: (value: string) => void;
  const old = loadResourceOptions("transports", {}, () => new Promise<string>(done => { resolve = done; }));
  clearResourceOptionsCache();
  await loadResourceOptions("transports", {}, async () => "new");
  resolve("old");
  await old;
  expect(await loadResourceOptions("transports", {}, async () => "unexpected")).toBe("new");
});
