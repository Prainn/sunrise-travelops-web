import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/api/request";
import { createCoalescedTask } from "./coalesced-task";

vi.mock("@/lang/utils", () => ({ translate: (key: string) => key, translateIfExists: () => undefined }));

async function flush() { for (let i = 0; i < 6; i++) await Promise.resolve(); }
function deferred() {
  let resolve!: () => void;
  let reject!: (cause: unknown) => void;
  const promise = new Promise<void>((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("合并刷新任务", () => {
  it("同一批次多次请求只执行一次；进行中再失效结束后补跑一次", async () => {
    const pending = deferred();
    const run = vi.fn().mockReturnValueOnce(pending.promise).mockResolvedValue(undefined);
    const task = createCoalescedTask(run);
    task.request();
    task.request();
    await flush();
    expect(run).toHaveBeenCalledTimes(1);
    task.request();
    task.request();
    pending.resolve();
    await flush();
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("网络错误有上限退避重试，成功后停止", async () => {
    const run = vi.fn().mockRejectedValueOnce(new Error("network")).mockRejectedValueOnce(new Error("network"))
      .mockResolvedValue(undefined);
    createCoalescedTask(run).request();
    await flush();
    await vi.advanceTimersByTimeAsync(2_000);
    expect(run).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(4_000);
    expect(run).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(120_000);
    expect(run).toHaveBeenCalledTimes(3);
  });

  it("401/403/404 不重试；取消后丢弃待执行与重试", async () => {
    const run = vi.fn().mockRejectedValue(new ApiError("forbidden", { code: "AUTH_FORBIDDEN", status: 403 }));
    const task = createCoalescedTask(run);
    task.request();
    await flush();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(run).toHaveBeenCalledTimes(1);

    run.mockRejectedValue(new Error("network"));
    task.request();
    await flush();
    task.cancel();
    task.request();
    task.cancel();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(run).toHaveBeenCalledTimes(2);
  });
});
