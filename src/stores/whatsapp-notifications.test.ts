import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reactive } from "vue";
import { createPinia, setActivePinia } from "pinia";
import type { UserInfo } from "@/types/user";

const mocks = vi.hoisted(() => ({ summary: vi.fn(), markRead: vi.fn() }));
vi.mock("@/services/whatsapp.service", () => ({ whatsappService: mocks }));
vi.mock("./user", () => ({ useUserStore: () => user }));
vi.mock("./permission", () => ({ usePermissionStore: () => permission }));
import { useWhatsappNotificationsStore } from "./whatsapp-notifications";

const user = reactive<{ userInfo: UserInfo }>({ userInfo: { roles: [], perms: [] } });
const permission = reactive({ routes: [] as { children: { name: string }[] }[] });
const doc = Object.assign(new EventTarget(), { visibilityState: "visible" });
const win = new EventTarget();
let store: ReturnType<typeof useWhatsappNotificationsStore>;
const counts = { unreadCount: 3, unassignedCount: 2 };
async function flush() { for (let i = 0; i < 6; i++) await Promise.resolve(); }

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("document", doc);
  vi.stubGlobal("window", win);
  doc.visibilityState = "visible";
  setActivePinia(createPinia());
  user.userInfo = { userId: "user-a", identityId: "identity-a", scope: "website", roles: ["BUSINESS_MANAGER"], perms: ["whatsapp:conversation:list"] };
  permission.routes = [{ children: [{ name: "WhatsappInbox" }] }];
  mocks.summary.mockReset().mockResolvedValue(counts);
  mocks.markRead.mockReset();
  store = useWhatsappNotificationsStore();
});
afterEach(() => {
  store.stop();
  store.$dispose();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("全局WhatsApp角标", () => {
  it("不依赖收件箱页面，持续轮询且不标记已读", async () => {
    store.start();
    await flush();
    expect(store.counts).toEqual(counts);
    await vi.advanceTimersByTimeAsync(15000);
    expect(mocks.summary).toHaveBeenCalledTimes(2);
    expect(mocks.markRead).not.toHaveBeenCalled();
  });
  it("菜单不可见时不请求；权限撤销后清空并停止", async () => {
    permission.routes = [];
    store.start();
    await flush();
    expect(mocks.summary).not.toHaveBeenCalled();
    permission.routes = [{ children: [{ name: "WhatsappInbox" }] }];
    await flush();
    expect(store.counts).toEqual(counts);
    permission.routes = [];
    expect(store.counts).toBeNull();
    await vi.advanceTimersByTimeAsync(60000);
    expect(mocks.summary).toHaveBeenCalledTimes(1);
  });
  it("切换身份丢弃旧响应，未分配null保持隐藏", async () => {
    let resolveOld!: (result: typeof counts) => void;
    mocks.summary.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }));
    store.start();
    await flush();
    mocks.summary.mockResolvedValue({ unreadCount: 1, unassignedCount: null });
    user.userInfo = { ...user.userInfo, identityId: "identity-b", roles: ["COORDINATOR"] };
    await flush();
    resolveOld(counts);
    await flush();
    expect(store.counts).toEqual({ unreadCount: 1, unassignedCount: null });
  });
  it("卸载后迟到响应不能恢复计数或计时器", async () => {
    let resolveOld!: (result: typeof counts) => void;
    mocks.summary.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }));
    store.start();
    store.stop();
    resolveOld(counts);
    await flush();
    await vi.advanceTimersByTimeAsync(60000);
    expect(store.counts).toBeNull();
    expect(mocks.summary).toHaveBeenCalledTimes(1);
  });
  it("失败显示不可用而非零，随后轮询恢复", async () => {
    mocks.summary.mockRejectedValueOnce(new Error("network"));
    store.start();
    await flush();
    expect(store.hasError).toBe(true);
    expect(store.counts).toBeNull();
    await vi.advanceTimersByTimeAsync(15000);
    expect(store.hasError).toBe(false);
    expect(store.counts).toEqual(counts);
  });
  it("后台放缓轮询，重新可见立即刷新", async () => {
    doc.visibilityState = "hidden";
    store.start();
    await flush();
    await vi.advanceTimersByTimeAsync(15000);
    expect(mocks.summary).toHaveBeenCalledTimes(1);
    doc.visibilityState = "visible";
    doc.dispatchEvent(new Event("visibilitychange"));
    await flush();
    expect(mocks.summary).toHaveBeenCalledTimes(2);
  });
  it("慢请求不重叠，重复启动不建立多个轮询", async () => {
    let resolveOld!: (result: typeof counts) => void;
    mocks.summary.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }));
    store.start();
    store.start();
    win.dispatchEvent(new Event("focus"));
    await vi.advanceTimersByTimeAsync(60000);
    expect(mocks.summary).toHaveBeenCalledTimes(1);
    resolveOld(counts);
    await flush();
    expect(mocks.summary).toHaveBeenCalledTimes(2);
  });
});
