import { ApiError } from "@/api/request";

const RETRY_BASE_MS = 2_000;
const RETRY_MAX_MS = 30_000;

/** 401/403/404 等客户端错误重试无意义；超时、限流、5xx 与网络错误才退避重试。 */
function isRetryable(cause: unknown) {
  if (!(cause instanceof ApiError) || cause.status === undefined) return true;
  return cause.status >= 500 || cause.status === 408 || cause.status === 429;
}

/**
 * 合并同一资源的刷新：同一轮微任务内多次请求只执行一次；执行中再请求则结束后补跑一次，
 * 不丢失最后一次变化。失败时按上限退避重试，直到成功、再次请求或取消。
 *
 * @param run - 实际读取；抛出的错误决定是否重试。
 * @returns request 标记需要刷新；cancel 丢弃待执行与重试，不中断已发出的请求。
 */
export function createCoalescedTask(run: () => Promise<void>) {
  let running = false;
  let queued = false;
  let scheduled = false;
  let failures = 0;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let generation = 0;

  function clearRetry() {
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = undefined;
  }

  async function execute() {
    scheduled = false;
    const current = generation;
    running = true;
    queued = false;
    clearRetry();
    try {
      await run();
      if (current === generation) failures = 0;
    } catch (cause) {
      if (current === generation && !queued && isRetryable(cause)) {
        failures++;
        const delay = Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 2 ** (failures - 1));
        retryTimer = setTimeout(() => request(), delay);
      }
    } finally {
      running = false;
      // 取消后新发起的请求也在这里补跑，queued 已由 cancel 清除旧标记。
      if (queued) request();
    }
  }

  function request() {
    if (running) {
      queued = true;
      return;
    }
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      if (scheduled) void execute();
    });
  }

  function cancel() {
    generation++;
    queued = false;
    scheduled = false;
    failures = 0;
    clearRetry();
  }

  return { request, cancel };
}
