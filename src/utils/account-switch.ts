/**
 * 同一后端会话（sessionId）多标签页的账号切换协调，不依赖 Vue 与业务模块，便于确定性测试。
 *
 * - 每个存活标签页持有以 sessionId 命名的在场锁；会话未确认的标签页持有 pending 锁，视为状态不明。
 * - 发起者独占该会话的发起锁，先冻结本页，再向全部在场标签页征询；任一未保存、保存中、
 *   无响应或状态不明即解除冻结并阻止，不发送切换请求。
 * - 全部就绪后只调用一次切换任务；明确失败解除冻结，结果不明通知各页重新登录，成功广播提交。
 * - 准备就绪的标签页在发起锁释放后仍未收到结论时按结果不明处理（发起页崩溃或关闭）。
 */

export type SwitchBlockReason =
  | "dirty"
  | "saving"
  | "unresponsive"
  | "unknown"
  | "busy"
  | "unsupported";

export type SwitchMessage<P> =
  | { type: "prepare"; sessionId: string; switchId: string; from: string }
  | { type: "reply"; sessionId: string; switchId: string; from: string; blockers: SwitchBlockReason[] }
  | { type: "release"; sessionId: string; switchId: string; from: string }
  | { type: "commit"; sessionId: string; switchId: string; from: string; payload: P }
  | { type: "unknown"; sessionId: string; switchId: string; from: string };

export interface SwitchBus<P> {
  post(message: SwitchMessage<P>): void;
  subscribe(handler: (message: SwitchMessage<P>) => void): () => void;
}

export const LOCK_UNAVAILABLE = Symbol("lock-unavailable");

export interface SwitchLocks {
  /** 立即尝试独占，已被占用返回 LOCK_UNAVAILABLE。 */
  tryExclusive<T>(name: string, task: () => Promise<T>): Promise<T | typeof LOCK_UNAVAILABLE>;
  /** 排队等待独占后执行。 */
  run<T>(name: string, task: () => Promise<T>): Promise<T>;
  /** 持续持有，返回释放函数。 */
  hold(name: string): () => void;
  /** 当前全部持有中的锁名。 */
  heldNames(): Promise<string[]>;
}

export interface SwitchCoordinatorDeps<P> {
  tabId: string;
  bus: SwitchBus<P>;
  locks: SwitchLocks;
  getSessionId(): string | undefined;
  /** 本页身份仍是存储中的最新版本；已被切换或替换时不能再发起。 */
  isSessionCurrent(): boolean;
  /** 本页未保存/保存中等阻止原因；在冻结后调用。 */
  getBlockers(): SwitchBlockReason[];
  freeze(): void;
  unfreeze(): void;
  /** 其他标签页切换成功。 */
  onCommitted(payload: P): void;
  /** 其他标签页切换结果不明或发起页失联。 */
  onUnknown(): void;
  /** 明确失败（服务端已拒绝）可恢复编辑；其余均视为结果不明。 */
  isDefiniteFailure(error: unknown): boolean;
  createId(): string;
  replyTimeoutMs?: number;
  /** 发起锁释放后等待结论消息的宽限时间。 */
  settleGraceMs?: number;
  sleep?(ms: number): Promise<void>;
}

export type SwitchResult<P> =
  | { status: "committed"; payload: P }
  | { status: "blocked"; reasons: SwitchBlockReason[]; local: boolean }
  | { status: "failed"; error: unknown }
  | { status: "unknown"; error: unknown };

const LOCK_PREFIX = "sunrise-account-switch";
const PENDING_SESSION = "pending";

export function presenceLockName(sessionId: string | undefined, tabId: string): string {
  return `${LOCK_PREFIX}:${sessionId ?? PENDING_SESSION}:tab:${tabId}`;
}

function initiatorLockName(sessionId: string): string {
  return `${LOCK_PREFIX}:${sessionId}:initiator`;
}

function unique(reasons: SwitchBlockReason[]): SwitchBlockReason[] {
  return [...new Set(reasons)];
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function createAccountSwitchCoordinator<P>(deps: SwitchCoordinatorDeps<P>) {
  const replyTimeoutMs = deps.replyTimeoutMs ?? 3000;
  const settleGraceMs = deps.settleGraceMs ?? 1000;
  const sleep = deps.sleep ?? defaultSleep;
  /** 本页已就绪等待结论的切换 ID。 */
  let preparedSwitchId: string | null = null;
  let releasePresence: (() => void) | null = null;
  let initiating = false;

  function post(message: SwitchMessage<P>): void {
    deps.bus.post(message);
  }

  /** 已就绪的标签页等待发起锁释放；释放后仍无结论则按结果不明处理。 */
  function watchInitiator(sessionId: string, switchId: string): void {
    void deps.locks
      .run(initiatorLockName(sessionId), async () => undefined)
      .then(() => sleep(settleGraceMs))
      .then(() => {
        if (preparedSwitchId !== switchId) return;
        preparedSwitchId = null;
        deps.onUnknown();
      });
  }

  function handleMessage(message: SwitchMessage<P>): void {
    if (message.from === deps.tabId || message.sessionId !== deps.getSessionId()) return;

    switch (message.type) {
      case "prepare": {
        deps.freeze();
        const blockers = unique(deps.getBlockers());
        if (blockers.length) deps.unfreeze();
        else {
          preparedSwitchId = message.switchId;
          watchInitiator(message.sessionId, message.switchId);
        }
        post({
          type: "reply",
          sessionId: message.sessionId,
          switchId: message.switchId,
          from: deps.tabId,
          blockers,
        });
        return;
      }
      case "release":
        if (preparedSwitchId !== message.switchId) return;
        preparedSwitchId = null;
        deps.unfreeze();
        return;
      case "commit":
        preparedSwitchId = null;
        deps.onCommitted(message.payload);
        return;
      case "unknown":
        preparedSwitchId = null;
        deps.onUnknown();
        return;
      default:
    }
  }

  /** 向同会话其他在场标签页征询；超时未答复记为无响应。 */
  function collectReplies(
    sessionId: string,
    switchId: string,
    peers: string[],
  ): Promise<SwitchBlockReason[]> {
    if (!peers.length) return Promise.resolve([]);
    return new Promise((resolve) => {
      const waiting = new Set(peers);
      const reasons: SwitchBlockReason[] = [];
      let settled = false;
      const finish = (extra: SwitchBlockReason[] = []) => {
        if (settled) return;
        settled = true;
        unsubscribe();
        resolve(unique([...reasons, ...extra]));
      };
      const unsubscribe = deps.bus.subscribe((message) => {
        if (message.type !== "reply" || message.switchId !== switchId) return;
        if (!waiting.delete(message.from)) return;
        reasons.push(...message.blockers);
        if (!waiting.size) finish();
      });
      post({ type: "prepare", sessionId, switchId, from: deps.tabId });
      void sleep(replyTimeoutMs).then(() => finish(waiting.size ? ["unresponsive"] : []));
    });
  }

  async function peerTabs(sessionId: string): Promise<{ peers: string[]; pending: boolean }> {
    const names = await deps.locks.heldNames();
    const sessionPrefix = `${LOCK_PREFIX}:${sessionId}:tab:`;
    const pendingPrefix = `${LOCK_PREFIX}:${PENDING_SESSION}:tab:`;
    const peers = new Set<string>();
    let pending = false;
    for (const name of names) {
      if (name.startsWith(pendingPrefix) && !name.endsWith(`:${deps.tabId}`)) pending = true;
      if (!name.startsWith(sessionPrefix)) continue;
      const tabId = name.slice(sessionPrefix.length);
      if (tabId !== deps.tabId) peers.add(tabId);
    }
    return { peers: [...peers], pending };
  }

  async function prepareAndRun(
    sessionId: string,
    task: () => Promise<P>,
  ): Promise<SwitchResult<P>> {
    if (!deps.isSessionCurrent()) return { status: "blocked", reasons: ["unknown"], local: true };

    deps.freeze();
    const localBlockers = unique(deps.getBlockers());
    if (localBlockers.length) {
      deps.unfreeze();
      return { status: "blocked", reasons: localBlockers, local: true };
    }

    const switchId = deps.createId();
    const { peers, pending } = await peerTabs(sessionId);
    const reasons = await collectReplies(sessionId, switchId, peers);
    if (pending) reasons.push("unknown");
    if (reasons.length) {
      post({ type: "release", sessionId, switchId, from: deps.tabId });
      deps.unfreeze();
      return { status: "blocked", reasons: unique(reasons), local: false };
    }

    let payload: P;
    try {
      payload = await task();
    } catch (error) {
      if (deps.isDefiniteFailure(error)) {
        post({ type: "release", sessionId, switchId, from: deps.tabId });
        deps.unfreeze();
        return { status: "failed", error };
      }
      // 结果不明：本页保持冻结，由调用方清除凭证并转登录。
      post({ type: "unknown", sessionId, switchId, from: deps.tabId });
      return { status: "unknown", error };
    }
    post({ type: "commit", sessionId, switchId, from: deps.tabId, payload });
    return { status: "committed", payload };
  }

  return {
    /** 开始接收同会话消息，返回停止函数。 */
    start(): () => void {
      const unsubscribe = deps.bus.subscribe(handleMessage);
      return () => {
        unsubscribe();
        releasePresence?.();
        releasePresence = null;
      };
    },

    /** 更新在场锁；sessionId 为 undefined 表示已登录但会话未确认，null 表示未登录。 */
    updatePresence(sessionId: string | null | undefined): void {
      releasePresence?.();
      releasePresence =
        sessionId === null ? null : deps.locks.hold(presenceLockName(sessionId, deps.tabId));
    },

    /** 发起切换；task 仅在全部标签页就绪后调用一次。 */
    async initiate(task: () => Promise<P>): Promise<SwitchResult<P>> {
      const sessionId = deps.getSessionId();
      if (!sessionId) return { status: "blocked", reasons: ["unknown"], local: true };
      if (initiating) return { status: "blocked", reasons: ["busy"], local: true };
      initiating = true;
      try {
        const result = await deps.locks.tryExclusive(initiatorLockName(sessionId), () =>
          prepareAndRun(sessionId, task),
        );
        return result === LOCK_UNAVAILABLE
          ? { status: "blocked", reasons: ["busy"], local: false }
          : result;
      } finally {
        initiating = false;
      }
    },
  };
}

export type AccountSwitchCoordinator<P> = ReturnType<typeof createAccountSwitchCoordinator<P>>;
