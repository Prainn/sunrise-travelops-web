import { AuthStorage, type SessionState } from "@/utils/auth-storage";

/**
 * 当前标签页的请求闸门：账号切换期间冻结请求与刷新，身份替换后按代次丢弃旧请求，
 * 并记录在途写请求供切换前检查。状态仅属于本标签页。
 */
let frozen = false;
let retired = false;
let epoch = 0;
let pendingWrites = 0;
let known: SessionState | null = null;
let verifying: Promise<void> | null = null;
const knownListeners = new Set<(state: SessionState | null) => void>();

export const sessionGate = {
  isFrozen: () => frozen,
  isRetired: () => retired,
  /** 身份代次；请求开始与结束代次不同即视为旧身份请求。 */
  epoch: () => epoch,
  pendingWrites: () => pendingWrites,

  freeze(): void {
    frozen = true;
  },

  unfreeze(): void {
    frozen = false;
  },

  /** 本页身份已被替换：之后只放行切换流程自身的请求，旧请求回包与重试一律丢弃。 */
  retire(): void {
    retired = true;
    epoch += 1;
  },

  getKnown: () => known,

  /** 本页实际加载的会话；由 /auth/me 结果设置。 */
  setKnown(state: SessionState | null): void {
    known = state;
    knownListeners.forEach((listener) => listener(state));
  },

  onKnownChange(listener: (state: SessionState | null) => void): () => void {
    knownListeners.add(listener);
    return () => knownListeners.delete(listener);
  },

  /** 存储中的会话与本页加载的不同：本页错过了切换广播（休眠、恢复）。 */
  isStale(): boolean {
    if (!known) return false;
    const stored = AuthStorage.getSessionState();
    return Boolean(
      stored && (stored.sessionId !== known.sessionId || stored.version !== known.version),
    );
  },

  /** 记录一次写请求，返回结束回调；多次调用结束回调只计一次。 */
  beginWrite(): () => void {
    pendingWrites += 1;
    let done = false;
    return () => {
      if (done) return;
      done = true;
      pendingWrites -= 1;
    };
  },

  /** 恢复的标签页先确认会话版本，确认期间其他请求等待；确认失败不阻塞后续请求。 */
  verify(task: () => Promise<void>): Promise<void> {
    verifying ??= task()
      .catch(() => undefined)
      .finally(() => {
        verifying = null;
      });
    return verifying;
  },

  waitVerified(): Promise<void> {
    return verifying ?? Promise.resolve();
  },

  /** 仅供测试复位。 */
  resetForTest(): void {
    frozen = false;
    retired = false;
    epoch = 0;
    pendingWrites = 0;
    known = null;
    verifying = null;
    knownListeners.clear();
  },
};
