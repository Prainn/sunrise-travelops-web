import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reactive } from "vue";
import { createPinia, setActivePinia } from "pinia";
import type { UserInfo } from "@/types/user";
import type { WhatsappStreamSignal } from "@/types/whatsapp";

const mocks = vi.hoisted(() => ({ summary: vi.fn(), markRead: vi.fn(), getUserInfo: vi.fn() }));
const stream = vi.hoisted(() => ({
  status: "stopped",
  listeners: new Set<(signal: unknown) => void>(),
  start: vi.fn(),
  stop: vi.fn(),
  subscribe(listener: (signal: unknown) => void) {
    stream.listeners.add(listener);
    return () => stream.listeners.delete(listener);
  },
}));
vi.mock("@/services/whatsapp.service", () => ({ whatsappService: mocks }));
vi.mock("@/lang/utils", () => ({ translate: (key: string) => key, translateIfExists: () => undefined }));
vi.mock("./user", () => ({ useUserStore: () => user }));
vi.mock("./permission", () => ({ usePermissionStore: () => permission }));
vi.mock("./whatsapp-stream", () => ({ useWhatsappStreamStore: () => stream }));
import { useWhatsappNotificationsStore } from "./whatsapp-notifications";

const user = reactive<{ userInfo: UserInfo; getUserInfo: typeof mocks.getUserInfo }>({
  userInfo: { roles: [], perms: [] },
  getUserInfo: mocks.getUserInfo,
});
const permission = reactive({ routes: [] as { children: { name: string }[] }[] });
let store: ReturnType<typeof useWhatsappNotificationsStore>;
const counts = { unreadCount: 3, unassignedCount: 2 };
async function flush() { for (let i = 0; i < 6; i++) await Promise.resolve(); }
const emit = (signal: WhatsappStreamSignal) => stream.listeners.forEach((listener) => listener(signal));

beforeEach(() => {
  vi.useFakeTimers();
  setActivePinia(createPinia());
  user.userInfo = { userId: "user-a", identityId: "identity-a", scope: "website", roles: ["BUSINESS_MANAGER"], perms: ["whatsapp:conversation:list"] };
  permission.routes = [{ children: [{ name: "WhatsappInbox" }] }];
  mocks.summary.mockReset().mockResolvedValue(counts);
  mocks.markRead.mockReset();
  mocks.getUserInfo.mockReset().mockResolvedValue(undefined);
  stream.start.mockReset();
  stream.stop.mockReset();
  stream.listeners.clear();
  store = useWhatsappNotificationsStore();
});
afterEach(() => {
  store.stop();
  store.$dispose();
  vi.useRealTimers();
});

describe("全局WhatsApp角标", () => {
  it("布局启动时持有实时流；正常连接无周期轮询，也不标记已读", async () => {
    store.start();
    store.start();
    await flush();
    expect(stream.start).toHaveBeenCalledTimes(1);
    expect(stream.listeners.size).toBe(1);
    expect(store.counts).toEqual(counts);
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(mocks.summary).toHaveBeenCalledTimes(1);
    expect(mocks.markRead).not.toHaveBeenCalled();
  });

  it("summary/ready 信号合并重取，会话变化本身不重取角标", async () => {
    store.start();
    await flush();
    emit({ type: "summary" });
    emit({ type: "sync" });
    emit({ type: "summary" });
    emit({ type: "conversation", conversationId: "c-1", reasons: ["message"] });
    await flush();
    expect(mocks.summary).toHaveBeenCalledTimes(2);
  });

  it("进行中又收到失效时结束后补跑一次，不丢失最后一次变化", async () => {
    let resolveOld!: (result: typeof counts) => void;
    mocks.summary.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }));
    store.start();
    await flush();
    emit({ type: "summary" });
    emit({ type: "summary" });
    await flush();
    expect(mocks.summary).toHaveBeenCalledTimes(1);
    mocks.summary.mockResolvedValue({ unreadCount: 9, unassignedCount: 0 });
    resolveOld(counts);
    await flush();
    expect(mocks.summary).toHaveBeenCalledTimes(2);
    expect(store.counts).toEqual({ unreadCount: 9, unassignedCount: 0 });
  });

  it("权限范围变化时重新确认身份并重取角标", async () => {
    store.start();
    await flush();
    emit({ type: "access" });
    emit({ type: "access" });
    await flush();
    expect(mocks.getUserInfo).toHaveBeenCalledTimes(1);
    expect(mocks.summary).toHaveBeenCalledTimes(2);
  });

  it("菜单不可见时不建流不请求；权限撤销后清空并关闭流", async () => {
    permission.routes = [];
    store.start();
    await flush();
    expect(mocks.summary).not.toHaveBeenCalled();
    expect(stream.start).not.toHaveBeenCalled();
    permission.routes = [{ children: [{ name: "WhatsappInbox" }] }];
    await flush();
    expect(store.counts).toEqual(counts);
    expect(stream.start).toHaveBeenCalledTimes(1);
    permission.routes = [];
    expect(store.counts).toBeNull();
    expect(stream.stop).toHaveBeenCalledTimes(3);
    emit({ type: "summary" });
    await flush();
    expect(mocks.summary).toHaveBeenCalledTimes(1);
  });

  it("切换身份关闭旧流后重建，丢弃旧响应，未分配null保持隐藏", async () => {
    let resolveOld!: (result: typeof counts) => void;
    mocks.summary.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }));
    store.start();
    await flush();
    mocks.summary.mockResolvedValue({ unreadCount: 1, unassignedCount: null });
    user.userInfo = { ...user.userInfo, identityId: "identity-b", roles: ["COORDINATOR"] };
    expect(stream.stop).toHaveBeenCalledTimes(2);
    expect(stream.start).toHaveBeenCalledTimes(2);
    await flush();
    resolveOld(counts);
    await flush();
    expect(store.counts).toEqual({ unreadCount: 1, unassignedCount: null });
  });

  it("卸载后关闭流，迟到响应不能恢复计数", async () => {
    let resolveOld!: (result: typeof counts) => void;
    mocks.summary.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }));
    store.start();
    await flush();
    store.stop();
    expect(stream.listeners.size).toBe(0);
    expect(stream.stop).toHaveBeenCalledTimes(2);
    resolveOld(counts);
    await flush();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(store.counts).toBeNull();
    expect(mocks.summary).toHaveBeenCalledTimes(1);
  });

  it("失败显示不可用而非零，有限退避后恢复", async () => {
    mocks.summary.mockRejectedValueOnce(new Error("network"));
    store.start();
    await flush();
    expect(store.hasError).toBe(true);
    expect(store.counts).toBeNull();
    await vi.advanceTimersByTimeAsync(2_000);
    expect(store.hasError).toBe(false);
    expect(store.counts).toEqual(counts);
  });
});
