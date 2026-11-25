import {
  ANONYMOUS_CLIENT_ACTIONS,
  CLIENT_ACTIONS,
  CLIENT_PAGES,
  CLIENT_RESULTS,
  CLIENT_VALUES,
  PUBLIC_CLIENT_PAGES,
  type ClientOperationAction,
  type ClientOperationEvent,
  type ClientOperationPage,
  type ClientOperationResult,
  type ClientOperationValue,
} from "@/types/operation-log";
import { AuthStorage, type SessionState } from "@/utils/auth-storage";
import { sessionGate } from "@/utils/session-gate";

const API_BASE_URL = (import.meta.env.VITE_APP_BASE_API || "/api").replace(/\/$/, "");
const CLIENT_PAGE_SET = new Set<string>(CLIENT_PAGES);
const PUBLIC_PAGE_SET = new Set<string>(PUBLIC_CLIENT_PAGES);
const CLIENT_ACTION_SET = new Set<string>(CLIENT_ACTIONS);
const ANONYMOUS_ACTION_SET = new Set<string>(ANONYMOUS_CLIENT_ACTIONS);
const CLIENT_RESULT_SET = new Set<string>(CLIENT_RESULTS);
const CLIENT_VALUE_SET = new Set<string>(CLIENT_VALUES);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEFAULT_RETRY_DELAYS_MS = [1500, 4000, 10000];
const MAX_PENDING_EVENTS = 50;

export interface ClientEventSendResult {
  ok: boolean;
  status?: number;
  retryable: boolean;
}

/**
 * 上报单条浏览器本地操作事件。
 * 直接使用 fetch 绕过写请求计数与 401 自动登出，避免阻断账号切换或打断用户当前业务。
 */
export async function sendClientOperationEvent(
  event: ClientOperationEvent,
  options: { accessToken?: string } = {},
): Promise<ClientEventSendResult> {
  if (typeof fetch !== "function") {
    return { ok: false, retryable: false };
  }
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Operation-Origin": "user",
  };
  if (options.accessToken) {
    headers.Authorization = `Bearer ${options.accessToken}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/system/operation-logs/client-events`, {
      method: "POST",
      headers,
      body: JSON.stringify(event),
      keepalive: true,
    });

    if (response.status === 204 || response.ok) {
      return { ok: true, status: response.status, retryable: false };
    }

    const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
    return { ok: false, status: response.status, retryable };
  } catch {
    return { ok: false, retryable: true };
  }
}

export interface ClientOperationInput {
  page?: ClientOperationPage;
  action: ClientOperationAction;
  result?: ClientOperationResult;
  recordId?: string;
  value?: ClientOperationValue;
  /** 复用同一次动作的事件 ID（例如用户显式重试同一动作）。 */
  eventId?: string;
  /** 复用同一次动作的原发生时间。 */
  occurredAt?: string;
}

export interface ClientOperationLoggerDeps {
  send: (
    event: ClientOperationEvent,
    options: { accessToken?: string },
  ) => Promise<ClientEventSendResult>;
  getAccessToken: () => string;
  getRefreshToken: () => string;
  refreshToken: (staleAccessToken: string) => Promise<void>;
  getEpoch: () => number;
  isSessionFrozen: () => boolean;
  isSessionRetired: () => boolean;
  isSessionStale: () => boolean;
  getSessionState: () => SessionState | null;
  getActorId: () => string | undefined;
  getCurrentPage: () => ClientOperationPage;
  createUuid: () => string;
  now: () => string;
  retryDelaysMs?: number[];
  setTimer?: (callback: () => void, ms: number) => ReturnType<typeof setTimeout>;
  clearTimer?: (timer: ReturnType<typeof setTimeout>) => void;
}

interface QueuedClientEvent {
  event: ClientOperationEvent;
  authenticated: boolean;
  generation: number;
  epoch: number;
  sessionKey: string | null;
  actorId: string | undefined;
  attempt: number;
  refreshedOnce: boolean;
  timer?: ReturnType<typeof setTimeout>;
  inFlight: boolean;
}

/**
 * 将当前路由对象解析为后端白名单中的固定页面名。
 */
export function resolveClientPage(
  route?: { name?: string | symbol | null; path: string } | null,
): ClientOperationPage {
  const name = typeof route?.name === "string" ? route.name : "";
  if (name && CLIENT_PAGE_SET.has(name)) {
    return name as ClientOperationPage;
  }

  const path = route?.path ?? "";
  if (path === "/login") return "Login";
  if (path === "/unavailable") return "Unavailable";
  if (path === "/401") return "Forbidden";
  if (path === "/404") return "NotFound";
  if (path === "/redirect" || path.startsWith("/redirect/")) return "Redirect";
  return "App";
}

function normalizeRecordId(recordId: string | undefined): string | undefined {
  if (!recordId) return undefined;
  const trimmed = recordId.trim();
  return UUID_PATTERN.test(trimmed) ? trimmed : undefined;
}

function sessionKeyOf(state: SessionState | null): string | null {
  return state ? `${state.sessionId}:${state.version}` : null;
}

export function createClientOperationLogger(deps: ClientOperationLoggerDeps) {
  const retryDelaysMs = deps.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS;
  const setTimer = deps.setTimer ?? ((cb, ms) => setTimeout(cb, ms));
  const clearTimer = deps.clearTimer ?? ((timer) => clearTimeout(timer));

  let identityGeneration = 0;
  const queue = new Map<string, QueuedClientEvent>();

  function cancelEntry(entry: QueuedClientEvent): void {
    if (entry.timer !== undefined) {
      clearTimer(entry.timer);
      entry.timer = undefined;
    }
    queue.delete(entry.event.eventId);
  }

  /**
   * 身份发生变化（登录、退出、切换账号、会话淘汰）时清空旧身份待重试事件，防止把旧动作归到新身份。
   */
  function resetIdentity(): void {
    identityGeneration += 1;
    for (const entry of queue.values()) {
      if (entry.timer !== undefined) {
        clearTimer(entry.timer);
        entry.timer = undefined;
      }
    }
    queue.clear();
  }

  function isIdentityStillValid(entry: QueuedClientEvent): boolean {
    if (entry.generation !== identityGeneration) return false;
    const currentToken = deps.getAccessToken();

    if (!entry.authenticated) {
      // 匿名事件在用户已登录后不得携带新身份凭证发送，直接放弃。
      return !currentToken;
    }

    if (!currentToken) return false;
    if (deps.isSessionRetired() || deps.isSessionStale() || deps.isSessionFrozen()) return false;
    if (deps.getEpoch() !== entry.epoch) return false;

    const currentSessionKey = sessionKeyOf(deps.getSessionState());
    if (entry.sessionKey && currentSessionKey !== entry.sessionKey) return false;

    const currentActorId = deps.getActorId();
    if (entry.actorId && currentActorId && currentActorId !== entry.actorId) return false;

    return true;
  }

  async function dispatch(entry: QueuedClientEvent): Promise<void> {
    if (entry.inFlight) return;
    if (!isIdentityStillValid(entry)) {
      cancelEntry(entry);
      return;
    }

    const token = entry.authenticated ? deps.getAccessToken() : undefined;
    if (entry.authenticated && !token) {
      cancelEntry(entry);
      return;
    }

    entry.inFlight = true;
    let result: ClientEventSendResult;
    try {
      result = await deps.send(entry.event, { accessToken: token });
    } catch {
      result = { ok: false, retryable: true };
    } finally {
      entry.inFlight = false;
    }

    if (result.ok) {
      cancelEntry(entry);
      return;
    }

    if (!isIdentityStillValid(entry)) {
      cancelEntry(entry);
      return;
    }

    // 仅同身份访问令牌过期时尝试一次刷新并复用同一 eventId 重试。
    if (
      result.status === 401 &&
      entry.authenticated &&
      !entry.refreshedOnce &&
      token &&
      deps.getRefreshToken()
    ) {
      entry.refreshedOnce = true;
      try {
        await deps.refreshToken(token);
      } catch {
        cancelEntry(entry);
        return;
      }
      if (isIdentityStillValid(entry)) {
        void dispatch(entry);
      } else {
        cancelEntry(entry);
      }
      return;
    }

    if (!result.retryable || entry.attempt >= retryDelaysMs.length) {
      cancelEntry(entry);
      return;
    }

    const delay = retryDelaysMs[entry.attempt]!;
    entry.attempt += 1;
    entry.timer = setTimer(() => {
      entry.timer = undefined;
      void dispatch(entry);
    }, delay);
  }

  function record(input: ClientOperationInput): ClientOperationEvent | null {
    const page = input.page ?? deps.getCurrentPage();
    if (!CLIENT_PAGE_SET.has(page)) return null;
    if (!CLIENT_ACTION_SET.has(input.action)) return null;

    const result = input.result ?? "success";
    if (!CLIENT_RESULT_SET.has(result)) return null;

    const accessToken = deps.getAccessToken();
    const authenticated = Boolean(accessToken);

    if (!authenticated) {
      if (!PUBLIC_PAGE_SET.has(page) || !ANONYMOUS_ACTION_SET.has(input.action)) {
        return null;
      }
    } else if (deps.isSessionRetired() || deps.isSessionStale() || deps.isSessionFrozen()) {
      return null;
    }

    const eventId =
      input.eventId && UUID_PATTERN.test(input.eventId) ? input.eventId : deps.createUuid();
    const occurredAt = input.occurredAt ?? deps.now();
    const recordId = authenticated ? normalizeRecordId(input.recordId) : undefined;
    const value =
      input.value && CLIENT_VALUE_SET.has(input.value) ? input.value : undefined;

    const event: ClientOperationEvent = {
      eventId,
      page,
      action: input.action,
      result,
      occurredAt,
      ...(recordId ? { recordId } : {}),
      ...(value ? { value } : {}),
    };

    const existing = queue.get(eventId);
    if (existing) {
      if (!existing.inFlight && existing.timer !== undefined) {
        clearTimer(existing.timer);
        existing.timer = undefined;
        void dispatch(existing);
      }
      return existing.event;
    }

    if (queue.size >= MAX_PENDING_EVENTS) {
      const oldest = queue.values().next().value;
      if (oldest) cancelEntry(oldest);
    }

    const entry: QueuedClientEvent = {
      event,
      authenticated,
      generation: identityGeneration,
      epoch: deps.getEpoch(),
      sessionKey: authenticated ? sessionKeyOf(deps.getSessionState()) : null,
      actorId: authenticated ? deps.getActorId() : undefined,
      attempt: 0,
      refreshedOnce: false,
      inFlight: false,
    };
    queue.set(eventId, entry);
    void dispatch(entry);
    return event;
  }

  function flushPending(): void {
    for (const entry of [...queue.values()]) {
      if (entry.inFlight) continue;
      if (!isIdentityStillValid(entry)) {
        cancelEntry(entry);
        continue;
      }
      if (entry.timer !== undefined) {
        clearTimer(entry.timer);
        entry.timer = undefined;
      }
      void dispatch(entry);
    }
  }

  return {
    record,
    resetIdentity,
    flushPending,
    pendingCount: () => queue.size,
  };
}

export interface ClientOperationRuntimeBindings {
  getCurrentPage: () => ClientOperationPage;
  getActorId: () => string | undefined;
  refreshToken: (staleAccessToken: string) => Promise<void>;
}

let runtimeBindings: ClientOperationRuntimeBindings = {
  getCurrentPage: () => "App",
  getActorId: () => undefined,
  refreshToken: () => Promise.reject(new Error("Token refresher unavailable")),
};

let lastObservedSessionKey: string | null = null;

export const clientOperationLog = createClientOperationLogger({
  send: (event, options) => sendClientOperationEvent(event, options),
  getAccessToken: () => (typeof window === "undefined" ? "" : AuthStorage.getAccessToken()),
  getRefreshToken: () => (typeof window === "undefined" ? "" : AuthStorage.getRefreshToken()),
  refreshToken: (staleToken) => runtimeBindings.refreshToken(staleToken),
  getEpoch: () => sessionGate.epoch(),
  isSessionFrozen: () => sessionGate.isFrozen(),
  isSessionRetired: () => sessionGate.isRetired(),
  isSessionStale: () => sessionGate.isStale(),
  getSessionState: () => sessionGate.getKnown(),
  getActorId: () => runtimeBindings.getActorId(),
  getCurrentPage: () => runtimeBindings.getCurrentPage(),
  createUuid: () => crypto.randomUUID(),
  now: () => new Date().toISOString(),
});

/**
 * 绑定运行时路由、身份和令牌刷新，并订阅会话切换与网络恢复事件。
 */
let lifecycleBound = false;
export function setupClientOperationLogLifecycle(bindings: ClientOperationRuntimeBindings): void {
  runtimeBindings = bindings;
  if (lifecycleBound) return;
  lifecycleBound = true;

  sessionGate.onRetire(() => {
    lastObservedSessionKey = null;
    clientOperationLog.resetIdentity();
  });

  sessionGate.onKnownChange((state) => {
    const nextKey = sessionKeyOf(state);
    if (lastObservedSessionKey && nextKey !== lastObservedSessionKey) {
      clientOperationLog.resetIdentity();
    }
    lastObservedSessionKey = nextKey;
  });

  if (typeof window !== "undefined") {
    window.addEventListener("online", () => {
      clientOperationLog.flushPending();
    });
  }
}

export function recordClientOperation(input: ClientOperationInput): ClientOperationEvent | null {
  return clientOperationLog.record(input);
}

export function resetClientOperationIdentity(): void {
  lastObservedSessionKey = null;
  clientOperationLog.resetIdentity();
}
