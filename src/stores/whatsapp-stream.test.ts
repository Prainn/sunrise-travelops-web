import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { ApiError } from "@/api/request";
import type { WhatsappStreamSignal } from "@/types/whatsapp";

const mocks = vi.hoisted(() => ({ stream: vi.fn(), refreshAccessToken: vi.fn(), token: "token-1" }));
vi.mock("@/services/whatsapp.service", () => ({ whatsappService: { stream: mocks.stream } }));
vi.mock("@/lang/utils", () => ({ translate: (key: string) => key, translateIfExists: () => undefined }));
vi.mock("@/api/request", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  refreshAccessToken: mocks.refreshAccessToken,
}));
vi.mock("@/utils/auth-storage", () => ({ AuthStorage: { getAccessToken: () => mocks.token } }));
import { FALLBACK_HIDDEN_MS, FALLBACK_VISIBLE_MS, IDLE_TIMEOUT_MS, useWhatsappStreamStore } from "./whatsapp-stream";

interface FakeStream {
  signal: AbortSignal;
  token: string;
  send: (text: string) => void;
  close: () => void;
}

const doc = Object.assign(new EventTarget(), { visibilityState: "visible" });
const encoder = new TextEncoder();
let streams: FakeStream[];
let signals: WhatsappStreamSignal[];
let store: ReturnType<typeof useWhatsappStreamStore>;

async function flush() { for (let i = 0; i < 10; i++) await Promise.resolve(); }
const READY = 'event: ready\ndata: {"serverTime":"2026-11-12T01:00:00Z"}\n\n';
const last = () => streams[streams.length - 1]!;
const syncCount = () => signals.filter((signal) => signal.type === "sync").length;
const apiError = (status: number, code: string) => new ApiError(code, { code, status });

function openStream(signal: AbortSignal) {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const body = new ReadableStream<Uint8Array>({ start(value) { controller = value; } });
  const stream: FakeStream = {
    signal,
    token: mocks.token,
    send: (text) => controller.enqueue(encoder.encode(text)),
    close: () => {
      try { controller.close(); } catch { /* 客户端已取消读取 */ }
    },
  };
  signal.addEventListener("abort", () => {
    try { controller.error(new DOMException("aborted", "AbortError")); } catch { /* 已关闭 */ }
  });
  streams.push(stream);
  return Promise.resolve({ body } as Response);
}

async function connectLive() {
  store.start();
  await flush();
  last().send(READY);
  await flush();
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("document", doc);
  vi.stubEnv("VITE_APP_WHATSAPP_STREAM", "true");
  vi.spyOn(Math, "random").mockReturnValue(1);
  doc.visibilityState = "visible";
  streams = [];
  signals = [];
  mocks.token = "token-1";
  mocks.stream.mockReset().mockImplementation(openStream);
  mocks.refreshAccessToken.mockReset().mockResolvedValue(undefined);
  setActivePinia(createPinia());
  store = useWhatsappStreamStore();
  store.subscribe((signal) => signals.push(signal));
});
afterEach(() => {
  store.stop();
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("WhatsApp 实时流", () => {
  it("收到 ready 才进入正常状态并全量校准；心跳只维持连接，正常时无周期信号", async () => {
    store.start();
    store.start();
    await flush();
    expect(mocks.stream).toHaveBeenCalledTimes(1);
    expect(store.status).toBe("connecting");
    expect(signals).toEqual([]);
    last().send(READY);
    await flush();
    expect(store.status).toBe("live");
    expect(signals).toEqual([{ type: "sync" }]);
    for (let i = 0; i < 30; i++) {
      await vi.advanceTimersByTimeAsync(20_000);
      last().send(": ping\n\n");
      await flush();
    }
    expect(signals).toEqual([{ type: "sync" }]);
    expect(mocks.stream).toHaveBeenCalledTimes(1);
  });

  it("转发失效事件，过滤未知原因；未知事件忽略并保持连接", async () => {
    await connectLive();
    last().send('event: future.event\ndata: {"x":1}\n\n' +
      'event: conversation.changed\ndata: {"conversationId":"c-1","reasons":["message","read","message","other"]}\n\n' +
      "event: summary.changed\ndata: {}\n\nevent: access.changed\ndata: {}\n\nevent: resync\ndata: {}\n\n");
    await flush();
    expect(signals.slice(1)).toEqual([
      { type: "conversation", conversationId: "c-1", reasons: ["message", "read"] },
      { type: "summary" },
      { type: "access" },
      { type: "sync" },
    ]);
    expect(store.status).toBe("live");
    expect(mocks.stream).toHaveBeenCalledTimes(1);
  });

  it("断流后低频兜底并退避重连，重连 ready 后停止兜底", async () => {
    await connectLive();
    last().close();
    await flush();
    expect(store.status).toBe("fallback");
    mocks.stream.mockRejectedValueOnce(apiError(503, "INTERNAL_SERVER_ERROR"));
    await vi.advanceTimersByTimeAsync(1_000);
    expect(mocks.stream).toHaveBeenCalledTimes(2);
    mocks.stream.mockRejectedValueOnce(apiError(404, "NOT_FOUND"));
    await vi.advanceTimersByTimeAsync(1_999);
    expect(mocks.stream).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(mocks.stream).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(FALLBACK_VISIBLE_MS - 3_000);
    expect(syncCount()).toBe(2);
    await vi.advanceTimersByTimeAsync(4_000);
    expect(mocks.stream).toHaveBeenCalledTimes(4);
    last().send(READY);
    await flush();
    expect(store.status).toBe("live");
    const synced = syncCount();
    for (let i = 0; i < 6; i++) {
      await vi.advanceTimersByTimeAsync(20_000);
      last().send(": ping\n\n");
      await flush();
    }
    expect(syncCount()).toBe(synced);
    expect(mocks.stream).toHaveBeenCalledTimes(4);
  });

  it("退避有上限：后端持续不可用时重连间隔不超过 60 秒", async () => {
    mocks.stream.mockRejectedValue(apiError(503, "INTERNAL_SERVER_ERROR"));
    store.start();
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    const calls = mocks.stream.mock.calls.length;
    await vi.advanceTimersByTimeAsync(60_000);
    expect(mocks.stream.mock.calls.length).toBe(calls + 1);
  });

  it("已知事件 payload 非法或超长帧时断开重连，不转发内容", async () => {
    await connectLive();
    last().send('event: conversation.changed\ndata: {"conversationId":1}\n\n');
    await flush();
    expect(store.status).toBe("fallback");
    expect(signals).toEqual([{ type: "sync" }]);
    await vi.advanceTimersByTimeAsync(1_000);
    last().send(READY);
    await flush();
    last().send("data: " + "x".repeat(70 * 1024));
    await flush();
    expect(store.status).toBe("fallback");
  });

  it("超过失活时长未收到任何字节时取消旧请求并重连", async () => {
    await connectLive();
    const first = last();
    await vi.advanceTimersByTimeAsync(IDLE_TIMEOUT_MS);
    expect(first.signal.aborted).toBe(true);
    expect(store.status).toBe("fallback");
    await vi.advanceTimersByTimeAsync(1_000);
    expect(mocks.stream).toHaveBeenCalledTimes(2);
  });

  it("connection.limited 后 EOF、可见性变化都不自动重连，只低频兜底；用户刷新才再连", async () => {
    await connectLive();
    last().send("event: connection.limited\ndata: {}\n\n");
    await flush();
    last().close();
    await flush();
    expect(store.status).toBe("limited");
    doc.visibilityState = "hidden";
    doc.dispatchEvent(new Event("visibilitychange"));
    doc.visibilityState = "visible";
    doc.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(mocks.stream).toHaveBeenCalledTimes(1);
    expect(syncCount()).toBeGreaterThanOrEqual(20);
    store.retry();
    await flush();
    expect(mocks.stream).toHaveBeenCalledTimes(2);
  });

  it("auth.expired 复用共享刷新，用新令牌重连且只保留一条连接", async () => {
    await connectLive();
    mocks.refreshAccessToken.mockImplementation(async () => { mocks.token = "token-2"; });
    last().send("event: auth.expired\ndata: {}\n\n");
    await flush();
    expect(mocks.refreshAccessToken).toHaveBeenCalledExactlyOnceWith("token-1");
    expect(mocks.stream).toHaveBeenCalledTimes(2);
    expect(streams[0]!.signal.aborted).toBe(true);
    expect(last().token).toBe("token-2");
    expect(last().signal.aborted).toBe(false);
  });

  it("刷新失败进入登录处理后不再重连；401/403 不无限重试", async () => {
    await connectLive();
    mocks.refreshAccessToken.mockRejectedValue(apiError(401, "AUTH_REFRESH_TOKEN_INVALID"));
    last().send("event: auth.expired\ndata: {}\n\n");
    await flush();
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    expect(store.status).toBe("stopped");
    expect(mocks.stream).toHaveBeenCalledTimes(1);

    store.stop();
    mocks.stream.mockRejectedValueOnce(apiError(403, "AUTH_FORBIDDEN"));
    store.start();
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    expect(store.status).toBe("forbidden");
    expect(mocks.stream).toHaveBeenCalledTimes(2);

    store.stop();
    mocks.stream.mockRejectedValueOnce(apiError(401, "AUTH_TOKEN_INVALID"));
    store.start();
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    expect(store.status).toBe("stopped");
    expect(mocks.stream).toHaveBeenCalledTimes(3);
  });

  it("未启用环境不建立连接，可见 30 秒、后台 60 秒低频校准", async () => {
    vi.stubEnv("VITE_APP_WHATSAPP_STREAM", "");
    store.start();
    await vi.advanceTimersByTimeAsync(FALLBACK_VISIBLE_MS);
    expect(store.status).toBe("disabled");
    expect(mocks.stream).not.toHaveBeenCalled();
    expect(syncCount()).toBe(1);
    doc.visibilityState = "hidden";
    doc.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(FALLBACK_VISIBLE_MS);
    expect(syncCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(FALLBACK_HIDDEN_MS - FALLBACK_VISIBLE_MS);
    expect(syncCount()).toBe(2);
    doc.visibilityState = "visible";
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(syncCount()).toBe(3);
  });

  it("停止后关闭连接并清理计时器，迟到数据不再转发", async () => {
    await connectLive();
    const first = last();
    store.stop();
    expect(first.signal.aborted).toBe(true);
    expect(store.status).toBe("stopped");
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(mocks.stream).toHaveBeenCalledTimes(1);
    expect(signals).toEqual([{ type: "sync" }]);
  });
});
