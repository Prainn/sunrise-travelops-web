import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { ApiError, refreshAccessToken } from "@/api/request";
import { whatsappService } from "@/services/whatsapp.service";
import type {
  WhatsappChangeReason,
  WhatsappStreamSignal,
  WhatsappStreamStatus,
} from "@/types/whatsapp";
import { AuthStorage } from "@/utils/auth-storage";
import { createSseParser, type SseMessage } from "@/utils/sse-parser";

export const FALLBACK_VISIBLE_MS = 30_000;
export const FALLBACK_HIDDEN_MS = 60_000;
/** 服务端每 20 秒发送心跳；超过该时长未收到任何字节视为连接失活。 */
export const IDLE_TIMEOUT_MS = 50_000;
const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 60_000;
/** 连接正常保持超过该时长才重置退避，避免 ready 后立即断开形成快速重连循环。 */
const STABLE_CONNECTION_MS = 60_000;
const MAX_FRAME_CHARS = 64 * 1024;
const CHANGE_REASONS = new Set<string>(["message", "status", "state", "assign", "notes", "inquiry", "read", "consultation"]);

type StreamEvent =
  | { name: "ready" | "resync" | "auth.expired" | "connection.limited" }
  | { name: "signal"; signal: WhatsappStreamSignal };

type ConnectionEnd = "eof" | "limited" | "expired" | "error";

export class InvalidStreamEventError extends Error {
  constructor(event: string) {
    super(`Invalid WhatsApp stream event: ${event}`);
    this.name = "InvalidStreamEventError";
  }
}

function payload(message: SseMessage): Record<string, unknown> {
  let value: unknown;
  try {
    value = JSON.parse(message.data);
  } catch {
    throw new InvalidStreamEventError(message.event);
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new InvalidStreamEventError(message.event);
  return value as Record<string, unknown>;
}

/**
 * 校验并转换服务端事件；未知事件返回 undefined 并保持连接，已知事件 payload 非法时抛出以重连校准。
 * payload 只做结构检查，不执行或展示其中任何内容。
 *
 * @param message - 解析出的 SSE 事件。
 * @returns 流事件；未知事件为 undefined。
 */
export function toStreamEvent(message: SseMessage): StreamEvent | undefined {
  switch (message.event) {
    case "ready": {
      if (typeof payload(message).serverTime !== "string") throw new InvalidStreamEventError(message.event);
      return { name: "ready" };
    }
    case "resync":
    case "auth.expired":
    case "connection.limited":
      payload(message);
      return { name: message.event };
    case "summary.changed":
      payload(message);
      return { name: "signal", signal: { type: "summary" } };
    case "access.changed":
      payload(message);
      return { name: "signal", signal: { type: "access" } };
    case "conversation.changed": {
      const data = payload(message);
      const { conversationId, reasons } = data;
      if (typeof conversationId !== "string" || !conversationId || !Array.isArray(reasons) ||
        !reasons.every((reason) => typeof reason === "string")) throw new InvalidStreamEventError(message.event);
      // 原因枚举新增时忽略未知值，会话仍按列表与当前会话刷新。
      const known = [...new Set(reasons as string[])].filter((reason) => CHANGE_REASONS.has(reason)) as WhatsappChangeReason[];
      return { name: "signal", signal: { type: "conversation", conversationId, reasons: known } };
    }
    default:
      return undefined;
  }
}

/**
 * WhatsApp 实时失效流：每个标签页一条连接，由全局布局经角标 store 持有，工作台与角标订阅信号。
 *
 * 正常连接时不发周期性信号；未启用、断流或连接受限时按可见 30 秒、后台 60 秒发出 sync 兜底，
 * 断流按上限退避加抖动重连，connection.limited 与 403 不自动重连。
 */
export const useWhatsappStreamStore = defineStore("whatsapp-stream", () => {
  const status = ref<WhatsappStreamStatus>("stopped");
  const isLive = computed(() => status.value === "live");
  const listeners = new Set<(signal: WhatsappStreamSignal) => void>();
  let connection = 0;
  let controller: AbortController | undefined;
  let attempts = 0;
  let nextAttemptAt = 0;
  let lastByteAt = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;

  const isEnabled = () => import.meta.env.VITE_APP_WHATSAPP_STREAM === "true";
  const isVisible = () => document.visibilityState === "visible";

  function emit(signal: WhatsappStreamSignal) {
    for (const listener of [...listeners]) {
      try {
        listener(signal);
      } catch {
        // 单个订阅者异常不影响其他订阅者与连接。
      }
    }
  }

  /**
   * 订阅刷新信号；全局角标与工作台分别订阅，路由进出只增删订阅，不重建连接。
   *
   * @param listener - 信号处理函数。
   * @returns 取消订阅。
   */
  function subscribe(listener: (signal: WhatsappStreamSignal) => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function clearTimers() {
    clearTimeout(reconnectTimer);
    clearTimeout(fallbackTimer);
    clearTimeout(idleTimer);
    reconnectTimer = undefined;
    fallbackTimer = undefined;
    idleTimer = undefined;
  }

  function scheduleFallback() {
    clearTimeout(fallbackTimer);
    fallbackTimer = setTimeout(() => {
      fallbackTimer = undefined;
      emit({ type: "sync" });
      scheduleFallback();
    }, isVisible() ? FALLBACK_VISIBLE_MS : FALLBACK_HIDDEN_MS);
  }

  function scheduleReconnect() {
    attempts++;
    const base = Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * 2 ** (attempts - 1));
    const delay = base / 2 + Math.random() * (base / 2);
    nextAttemptAt = Date.now() + delay;
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => void connect(), delay);
  }

  function enterFallback() {
    status.value = "fallback";
    if (!fallbackTimer) scheduleFallback();
    scheduleReconnect();
  }

  function armIdle(abort: AbortController) {
    lastByteAt = Date.now();
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => abort.abort(), IDLE_TIMEOUT_MS);
  }

  async function connect() {
    clearTimeout(reconnectTimer);
    reconnectTimer = undefined;
    controller?.abort();
    const current = ++connection;
    const abort = new AbortController();
    controller = abort;
    status.value = "connecting";
    // 等待响应头也计入失活检测，代理挂起时同样取消重连。
    armIdle(abort);
    const token = AuthStorage.getAccessToken();
    let end: ConnectionEnd = "error";
    let failure: unknown;
    let liveAt = 0;
    try {
      const response = await whatsappService.stream(abort.signal);
      if (current !== connection) return;
      const reader = response.body!.getReader();
      let closing: ConnectionEnd | undefined;
      const parser = createSseParser((message) => {
        if (closing) return;
        const event = toStreamEvent(message);
        if (!event) return;
        if (event.name === "ready") {
          liveAt = Date.now();
          status.value = "live";
          clearTimeout(fallbackTimer);
          fallbackTimer = undefined;
          emit({ type: "sync" });
        } else if (event.name === "auth.expired") {
          closing = "expired";
        } else if (event.name === "connection.limited") {
          closing = "limited";
        } else if (status.value !== "live") {
          return;
        } else if (event.name === "resync") {
          emit({ type: "sync" });
        } else if (event.name === "signal") {
          emit(event.signal);
        }
      }, MAX_FRAME_CHARS);
      for (;;) {
        const { done, value } = await reader.read();
        if (current !== connection) return;
        if (done) {
          parser.end();
          end = closing ?? "eof";
          break;
        }
        armIdle(abort);
        parser.push(value);
        if (closing) {
          end = closing;
          void reader.cancel().catch(() => undefined);
          break;
        }
      }
    } catch (cause) {
      if (current !== connection) return;
      failure = cause;
    } finally {
      if (current === connection) {
        clearTimeout(idleTimer);
        idleTimer = undefined;
        controller = undefined;
      }
      abort.abort();
    }
    finish(current, end, failure, token, liveAt);
  }

  function finish(current: number, end: ConnectionEnd, failure: unknown, token: string, liveAt: number) {
    if (current !== connection) return;
    if (liveAt && Date.now() - liveAt >= STABLE_CONNECTION_MS) attempts = 0;
    if (end === "limited") {
      // 被同用户新连接替换：停止自动重连，避免多个标签页循环互踢；只保留低频兜底。
      status.value = "limited";
      if (!fallbackTimer) scheduleFallback();
      return;
    }
    if (failure instanceof ApiError && failure.status === 401) {
      // request 已按现有规则尝试刷新或进入登录处理，不再重连。
      clearTimers();
      status.value = "stopped";
      return;
    }
    if (failure instanceof ApiError && failure.status === 403) {
      clearTimers();
      status.value = "forbidden";
      return;
    }
    if (end === "expired") {
      void renew(current, token);
      return;
    }
    enterFallback();
  }

  /** 收到 auth.expired：与普通请求共用单次刷新，成功后用新令牌重连。 */
  async function renew(current: number, token: string) {
    status.value = "connecting";
    try {
      await refreshAccessToken(token);
    } catch (cause) {
      if (current !== connection) return;
      if (cause instanceof ApiError && cause.status === 401) {
        clearTimers();
        status.value = "stopped";
      } else {
        enterFallback();
      }
      return;
    }
    if (current === connection) void connect();
  }

  function handleVisibility() {
    if (status.value === "stopped" || status.value === "forbidden") return;
    // 后台计时器可能被浏览器延后，恢复可见时按实际状态校准，不依赖计时器准时触发。
    if (fallbackTimer) scheduleFallback();
    if (!isVisible()) return;
    if (status.value === "live") {
      if (Date.now() - lastByteAt > IDLE_TIMEOUT_MS) void connect();
      return;
    }
    if (status.value === "connecting") return;
    emit({ type: "sync" });
    if (status.value === "fallback" && Date.now() >= nextAttemptAt) void connect();
  }

  /** 由全局布局（经角标 store）在身份确定后调用；同一身份重复调用不重复建连。 */
  function start() {
    if (status.value !== "stopped") return;
    document.addEventListener("visibilitychange", handleVisibility);
    attempts = 0;
    if (!isEnabled()) {
      status.value = "disabled";
      scheduleFallback();
      return;
    }
    void connect();
  }

  /** 关闭连接与全部计时器；身份变化、退出或权限撤销时调用。订阅保留给仍挂载的页面。 */
  function stop() {
    connection++;
    controller?.abort();
    controller = undefined;
    clearTimers();
    attempts = 0;
    nextAttemptAt = 0;
    document.removeEventListener("visibilitychange", handleVisibility);
    status.value = "stopped";
  }

  /** 用户明确刷新时，受限或断流的标签页再尝试一次连接。 */
  function retry() {
    if (status.value !== "limited" && status.value !== "fallback") return;
    attempts = 0;
    void connect();
  }

  return { status, isLive, subscribe, start, stop, retry };
});
