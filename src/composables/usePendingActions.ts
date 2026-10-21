import { reactive } from "vue";

/**
 * 按记录（或操作）标识跟踪处理中的写操作，防止请求返回前重复提交。
 *
 * 在确认框、前置检查之前就占用标识，直到请求结束才释放；页面可用 isPending 禁用对应按钮。
 */
export function usePendingActions() {
  const pending = reactive(new Set<string>());

  function isPending(key: string) {
    return pending.has(key);
  }

  /**
   * 标识空闲时执行操作并占用该标识；已在处理中时直接忽略本次调用。
   *
   * @param key - 记录 ID 或操作名。
   * @param action - 包含确认与请求的完整操作。
   * @returns 操作结果；被忽略时为 undefined。
   */
  async function run<T>(key: string, action: () => Promise<T>): Promise<T | undefined> {
    if (pending.has(key)) return undefined;
    pending.add(key);
    try {
      return await action();
    } finally {
      pending.delete(key);
    }
  }

  return { isPending, run, hasPending: () => pending.size > 0 };
}
