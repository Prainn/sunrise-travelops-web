import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick } from "vue";
import { ApiError } from "@/api/request";
import type { WhatsappConversationDetail, WhatsappCustomerNotes, WhatsappMessage, WhatsappStreamSignal } from "@/types/whatsapp";
import type { WebsiteInquiryInput } from "@/types/website";

const service = vi.hoisted(() => ({
  conversations: vi.fn(),
  conversation: vi.fn(),
  messages: vi.fn(),
  markRead: vi.fn(),
  sendText: vi.fn(),
  sendReaction: vi.fn(),
  sendImageBatch: vi.fn(),
  retryMessage: vi.fn(),
  customerNotes: vi.fn(),
  saveCustomerNotes: vi.fn(),
}));
vi.mock("@/services/whatsapp.service", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  whatsappService: service,
}));
const stream = vi.hoisted(() => ({
  listeners: new Set<(signal: unknown) => void>(),
  subscribe(listener: (signal: unknown) => void) {
    stream.listeners.add(listener);
    return () => stream.listeners.delete(listener);
  },
}));
vi.mock("@/stores/whatsapp-stream", () => ({ useWhatsappStreamStore: () => stream }));
vi.mock("@/lang/utils", () => ({ translate: (key: string) => key, translateIfExists: () => undefined }));
vi.mock("@/stores/user", async () => {
  const { reactive } = await import("vue");
  const store = reactive({ userInfo: { userId: "user-1", identityId: "identity-1", scope: "website", roles: [], perms: [] } });
  return { useUserStore: () => store };
});

import { useUserStore } from "@/stores/user";
import { whatsappInquiryInput } from "@/services/whatsapp.service";
import { canConfirmFailedMessage, canRetryMessage, compareSeq, linkedConversationId, mergeLatestPage, messageSourceLabel, messageReply, sortMessages, maxSeq, threadAccess, threadMessages } from "./message-utils";
import { useCustomerNotes } from "./useCustomerNotes";
import { useWhatsappWorkbench } from "./useWhatsappWorkbench";

const BIG_SEQ = "9007199254740993";
const doc = { visibilityState: "visible", hasFocus: vi.fn(() => true), addEventListener: vi.fn(), removeEventListener: vi.fn() };

function message(patch: Partial<WhatsappMessage>): WhatsappMessage {
  return {
    id: "m-1", seq: "1", accountId: "a", conversationId: "c-1", providerId: null, taskId: null, clientRequestId: null,
    retryOf: null, direction: "inbound", source: "customer", kind: "text", text: "hi", attachment: null, status: "received",
    actorId: null, actorIdentityId: null, occurredAt: "2026-11-06T00:00:00Z", createdAt: "", updatedAt: "", errorCode: null,
    ...patch,
  };
}
const detail = (id = "c-1") => ({
  id, state: "open", version: 1, tours: [], capabilities: { canReply: true, canAssign: false, canCreateInquiry: false, canStartConsultation: false },
}) as unknown as WhatsappConversationDetail;
const page = <T>(list: T[]) => ({ list, total: list.length, page: 1, pageSize: 50 });
const networkError = () => new ApiError("network", { code: "NETWORK_ERROR" });
const conflict = () => new ApiError("conflict", { code: "CONFLICT", status: 409, serverMessage: "已超出24小时回复窗口" });
async function flush() { for (let i = 0; i < 6; i++) { await Promise.resolve(); await nextTick(); } }
async function settle() { for (let i = 0; i < 10; i++) await flush(); }
const emit = (signal: WhatsappStreamSignal) => stream.listeners.forEach((listener) => listener(signal));
const callsOf = (fn: { mock: { calls: unknown[] } }) => fn.mock.calls.length;

let scope: ReturnType<typeof effectScope>;
function setup() {
  scope = effectScope();
  return scope.run(() => useWhatsappWorkbench())!;
}

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    key: (index: number) => [...values.keys()][index] ?? null,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("document", doc);
  vi.stubGlobal("localStorage", memoryStorage());
  doc.visibilityState = "visible";
  doc.hasFocus.mockReturnValue(true);
  for (const fn of Object.values(service)) fn.mockReset();
  stream.listeners.clear();
  service.conversations.mockResolvedValue(page([{ id: "c-1", unreadCount: 2 }]));
  service.conversation.mockImplementation(async (id: string) => detail(id));
  service.messages.mockResolvedValue(page([message({ id: "m-2", seq: BIG_SEQ }), message({ id: "m-1", seq: "1" })]));
  service.markRead.mockResolvedValue({ lastSeq: BIG_SEQ });
});
afterEach(() => {
  scope?.stop();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("消息序号与合并", () => {
  it("补录旧消息按发生时间展示，增量游标仍取最大入库序号", () => {
    const newest = message({ id: "new", seq: "1", occurredAt: "2026-11-10T01:31:11Z" });
    const history = message({ id: "history", seq: "2", occurredAt: "2026-11-06T06:00:00Z" });
    const sameTime = message({ id: "tie", seq: "3", occurredAt: history.occurredAt });
    expect(sortMessages([newest, sameTime, history]).map((item) => item.id)).toEqual(["history", "tie", "new"]);
    expect(maxSeq([newest, history, sameTime])).toBe("3");
  });
  it("用 BigInt 比较超出安全整数的序号", () => {
    expect(compareSeq("9007199254740993", "9007199254740992")).toBe(1);
  });

  it("重取最新页时移除服务端已合并的手机临时行并更新状态", () => {
    const current = [message({ id: "old", seq: "1" }), message({ id: "temp-mobile", seq: "5", source: "mobile" }), message({ id: "m-6", seq: "6", status: "sent" })];
    const latest = [message({ id: "m-6", seq: "6", status: "read" }), message({ id: "m-4", seq: "4" })];
    const merged = mergeLatestPage(current, latest, false);
    expect(merged.map((item) => item.id)).toEqual(["old", "m-4", "m-6"]);
    expect(merged.at(-1)?.status).toBe("read");
  });
});

describe("来源与重试能力", () => {
  const t = (key: string, values?: Record<string, unknown>) => (values ? `${key}:${String(values.name)}` : key);

  it("手机端消息标记为手机端发送，不显示具体员工", () => {
    expect(messageSourceLabel(message({ source: "mobile", direction: "outbound", actorName: "张三" }), t)).toBe("whatsapp.sources.mobile");
    expect(messageSourceLabel(message({ source: "system", direction: "outbound", actorName: "李四" }), t)).toBe("whatsapp.systemBy:李四");
  });

  it("结果未知不提供重发，只有未重试过的明确失败可重试", () => {
    const failed = message({ id: "f", source: "system", direction: "outbound", status: "failed" });
    expect(canRetryMessage({ ...failed, status: "unknown" }, new Set(), true)).toBe(false);
    expect(canRetryMessage(failed, new Set(), true)).toBe(true);
    expect(canRetryMessage(failed, new Set(["f"]), true)).toBe(false);
    expect(canRetryMessage(failed, new Set(), false)).toBe(false);
  });

  it("结果待核实满 10 分钟的系统消息仅主管可确认未送达", () => {
    const updatedAt = "2026-11-06T00:00:00Z";
    const unknown = message({ source: "system", direction: "outbound", status: "unknown", updatedAt });
    const due = Date.parse(updatedAt) + 10 * 60_000;
    expect(canConfirmFailedMessage(unknown, true, due)).toBe(true);
    expect(canConfirmFailedMessage(unknown, true, due - 1)).toBe(false);
    expect(canConfirmFailedMessage(unknown, false, due)).toBe(false);
    expect(canConfirmFailedMessage({ ...unknown, status: "failed" }, true, due)).toBe(false);
    expect(canConfirmFailedMessage({ ...unknown, source: "mobile" }, true, due)).toBe(false);
  });
});

describe("历史咨询只读", () => {
  const capabilities = { canReply: true, canAssign: false, canCreateInquiry: false, canStartConsultation: false, canUpdateCustomer: false, canConfirmFailed: false };

  it("归档咨询始终只读，即使服务端能力误报可回复，并提供进入新咨询入口", () => {
    expect(threadAccess({ id: "old", state: "archived", currentConversationId: "new", capabilities }))
      .toEqual({ isReadOnly: true, canCompose: false, currentConversationId: "new" });
  });

  it("当前咨询按回复能力开放输入，不显示新咨询跳转", () => {
    expect(threadAccess({ id: "c", state: "open", currentConversationId: "c", capabilities }))
      .toEqual({ isReadOnly: false, canCompose: true, currentConversationId: null });
    expect(threadAccess({ id: "c", state: "closed", currentConversationId: "c", capabilities: { ...capabilities, canReply: false } }).canCompose).toBe(false);
  });
});

describe("会话建询盘请求体", () => {
  it("删除负责人、状态、流失原因和业务，并携带会话版本", () => {
    const input = {
      businessUnit: "website", ownerId: "owner-x", status: "quoted", lostReason: "x", countryItemId: "country-1",
      customerName: "Tom", plannedDays: 5, requirements: "trip", contactInfo: "bsuid-1", receivedAt: null, contactChannel: "WhatsApp",
      whatsappSourceId: "", websiteInquiryNo: "", landingPage: "", acquisitionSource: "", startDate: null, pax: null,
      destinations: [], internalRemark: "",
    } as WebsiteInquiryInput;
    const body = whatsappInquiryInput(input, 3);
    for (const key of ["ownerId", "status", "lostReason", "businessUnit"]) expect(body).not.toHaveProperty(key);
    expect(body).toMatchObject({ version: 3, countryItemId: "country-1", customerName: "Tom" });
  });
});

describe("useWhatsappWorkbench", () => {
  it("积压超过5页分轮续取，已读不越过尚未补齐的消息", async () => {
    const workbench = setup();
    service.messages.mockResolvedValueOnce(page([message({ id: "m-1", seq: "1" })]));
    await workbench.selectConversation("c-1");
    const all = Array.from({ length: 651 }, (_, index) => message({ id: `m-${index + 1}`, seq: String(index + 1) }));
    service.messages.mockImplementation(async (_id, query) => {
      const selected = query.afterSeq ? all.filter((row) => BigInt(row.seq) > BigInt(query.afterSeq)) : [...all].reverse();
      return { list: selected.slice(0, 50), total: selected.length, page: 1, pageSize: 50 };
    });
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    service.messages.mockImplementation(async (_id, query) => {
      if (query.afterSeq === "251") await gate;
      const selected = query.afterSeq ? all.filter((row) => BigInt(row.seq) > BigInt(query.afterSeq)) : [...all].reverse();
      return { list: selected.slice(0, 50), total: selected.length, page: 1, pageSize: 50 };
    });
    await workbench.reloadSelected();
    await settle();
    // 达到单批上限后主动发出下一批，不等待新的事件；尚未返回时已读不越过已取得的行。
    expect(maxSeq(workbench.messages.value)).toBe("251");
    expect(service.messages.mock.calls.some(([, query]) => query.afterSeq === "251")).toBe(true);
    await workbench.markDisplayed("c-1", true);
    expect(service.markRead).toHaveBeenLastCalledWith("c-1", "251");
    // A local successful send can append an outbox row ahead of the incoming backlog.
    workbench.messages.value = [...workbench.messages.value, message({ id: "own-send", seq: "700", direction: "outbound" })];
    await workbench.markDisplayed("c-1", true);
    expect(service.markRead).toHaveBeenCalledTimes(1);
    release();
    await settle();
    expect(workbench.messages.value.filter((row) => row.id !== "own-send").map((row) => row.seq)).toEqual(all.map((row) => row.seq));
    await workbench.markDisplayed("c-1", true);
    expect(service.markRead).toHaveBeenLastCalledWith("c-1", "651");
    expect(service.messages.mock.calls.filter(([, query]) => query.afterSeq).every(([, query]) => query.page === 1)).toBe(true);
  });

  it("同查询网络失败保留列表，权限失效清空列表与会话", async () => {
    const workbench = setup();
    workbench.start();
    await flush();
    await workbench.selectConversation("c-1");
    service.conversations.mockRejectedValueOnce(networkError());
    workbench.refreshNow();
    await flush();
    expect(workbench.conversations.value).toHaveLength(1);
    expect(workbench.total.value).toBe(1);
    expect(workbench.listError.value).not.toBe("");
    expect(workbench.detail.value?.id).toBe("c-1");
    service.conversations.mockRejectedValueOnce(new ApiError("forbidden", { status: 403, code: "AUTH_FORBIDDEN" }));
    workbench.refreshNow();
    await flush();
    expect(workbench.conversations.value).toEqual([]);
    expect(workbench.detail.value).toBeNull();
  });

  it("更换筛选后失败不沿用上个查询的结果", async () => {
    const workbench = setup();
    workbench.start();
    await flush();
    service.conversations.mockRejectedValue(networkError());
    workbench.view.value = "unassigned";
    await flush();
    expect(workbench.conversations.value).toEqual([]);
    expect(workbench.total.value).toBe(0);
  });

  it("只有展示后显式标记已读，后台刷新不标记", async () => {
    const workbench = setup();
    workbench.start();
    await flush();
    await workbench.selectConversation("c-1");
    workbench.refreshNow();
    await flush();
    expect(service.markRead).not.toHaveBeenCalled();

    doc.hasFocus.mockReturnValue(false);
    await workbench.markDisplayed("c-1", false);
    expect(service.markRead).not.toHaveBeenCalled();

    await workbench.markDisplayed("c-1", true);
    expect(service.markRead).toHaveBeenCalledExactlyOnceWith("c-1", BIG_SEQ);
    await workbench.markDisplayed("c-1", true);
    expect(service.markRead).toHaveBeenCalledTimes(1);

    doc.visibilityState = "hidden";
    await workbench.markDisplayed("c-1", true);
    expect(service.markRead).toHaveBeenCalledTimes(1);
  });

  it("结果不明的发送只能用同一请求编号再次提交，明确拒绝不可再提交", async () => {
    const workbench = setup();
    await workbench.selectConversation("c-1");
    service.sendText.mockRejectedValueOnce(networkError());
    expect((await workbench.sendText("hello")).kind).toBe("uncertain");
    const [, firstId] = service.sendText.mock.calls[0]!;
    expect(workbench.pending.value[0]).toMatchObject({ state: "uncertain", clientRequestId: firstId });

    service.sendText.mockResolvedValueOnce(message({ id: "m-out", seq: "10", direction: "outbound", source: "system", status: "queued", clientRequestId: firstId }));
    expect((await workbench.resubmitPending(firstId))?.kind).toBe("queued");
    expect(service.sendText.mock.calls[1]?.[1]).toBe(firstId);
    expect(workbench.pending.value).toEqual([]);

    service.sendText.mockRejectedValueOnce(conflict());
    const feedback = await workbench.sendText("late");
    expect(feedback).toEqual({ kind: "rejected", message: "已超出24小时回复窗口" });
    expect(workbench.resubmitPending(workbench.pending.value[0]!.clientRequestId)).toBeUndefined();
    expect(service.sendText).toHaveBeenCalledTimes(3);
  });

  it("表情回应保留目标和请求编号，未知结果不允许换表情重复提交", async () => {
    const workbench = setup();
    await workbench.selectConversation("c-1");
    const target = message({ id: "customer-message", providerId: "provider-original" });
    service.sendReaction.mockRejectedValueOnce(networkError());
    expect((await workbench.sendReaction(target, "👍"))?.kind).toBe("uncertain");
    const requestId = service.sendReaction.mock.calls[0]![2];
    expect(workbench.sendReaction(target, "❤️")).toBeUndefined();
    service.sendReaction.mockResolvedValueOnce(message({ id: "reaction", seq: "12", kind: "reaction", clientRequestId: requestId }));
    await workbench.resubmitPending(requestId);
    expect(service.sendReaction.mock.calls[1]).toEqual(["c-1", target.id, requestId, "👍"]);
    expect(service.sendText).not.toHaveBeenCalled();
  });
  it("引用回复的未知提交保留原目标、文字和幂等编号", async () => {
    const workbench = setup();
    await workbench.selectConversation("c-1");
    const replyTo = { id: "original", text: "客户原文", kind: "text", direction: "inbound" as const, source: "customer" as const };
    service.sendText.mockRejectedValueOnce(networkError());
    await workbench.sendText("*回复*", replyTo);
    const requestId = workbench.pending.value[0]!.clientRequestId;
    expect(workbench.pending.value[0]!.replyTo).toEqual(replyTo);
    expect(service.sendText.mock.calls[0]).toEqual(["c-1", requestId, "*回复*", "original"]);
    service.sendText.mockResolvedValueOnce(message({ id: "quoted", seq: "30", clientRequestId: requestId, attachment: { replyTo } }));
    await workbench.resubmitPending(requestId);
    expect(service.sendText.mock.calls[1]).toEqual(service.sendText.mock.calls[0]);
    expect(messageReply(workbench.messages.value.find((item) => item.id === "quoted")!)).toEqual(replyTo);
    expect(workbench.pending.value).toHaveLength(0);
    expect(messageReply(message({ attachment: { replyTo: { text: "broken" } } }))).toBeUndefined();
  });

  it("多图结果未知时原样重提整组编号，资源过期 404 标记需重新上传", async () => {
    const workbench = setup();
    await workbench.selectConversation("c-1");
    const images = ["m-1", "m-2"].map((mediaAssetId) => ({ mediaAssetId, name: `${mediaAssetId}.jpg`, mimeType: "image/jpeg", thumbnailUrl: null }));
    const replyTo = { id: "original", text: "客户原文", kind: "text", direction: "inbound" as const, source: "customer" as const };
    service.sendImageBatch.mockRejectedValueOnce(networkError());
    await workbench.sendImages(images, "说明", replyTo);
    const [input] = service.sendImageBatch.mock.calls[0]!.slice(1);
    expect(input.images.map((image: { mediaAssetId: string }) => image.mediaAssetId)).toEqual(["m-1", "m-2"]);
    expect(new Set([...input.images.map((image: { clientRequestId: string }) => image.clientRequestId), input.textMessage.clientRequestId]).size).toBe(3);
    expect(input.textMessage.text).toBe("说明");
    expect(input.replyToMessageId).toBe("original");
    expect(workbench.pending.value[0]!.state).toBe("uncertain");
    service.sendImageBatch.mockResolvedValueOnce({ messages: [
      message({ id: "i-1", seq: "40", kind: "image", clientRequestId: input.images[0].clientRequestId }),
      message({ id: "i-2", seq: "41", kind: "image", clientRequestId: input.images[1].clientRequestId }),
      message({ id: "t-1", seq: "42", clientRequestId: input.textMessage.clientRequestId }),
    ] });
    await workbench.resubmitPending(workbench.pending.value[0]!.clientRequestId);
    expect(service.sendImageBatch.mock.calls[1]).toEqual(service.sendImageBatch.mock.calls[0]);
    expect(workbench.messages.value.filter((item) => ["i-1", "i-2", "t-1"].includes(item.id))).toHaveLength(3);
    expect(workbench.pending.value).toHaveLength(0);

    service.sendImageBatch.mockRejectedValueOnce(new ApiError("gone", { code: "NOT_FOUND", status: 404 }));
    await workbench.sendImages(images, "");
    expect(service.sendImageBatch.mock.calls[2]![1].textMessage).toBeUndefined();
    expect(workbench.pending.value[0]).toMatchObject({ state: "rejected", isExpired: true });
  });

  it("失败重试生成新编号，结果不明时复用该编号；unknown 不请求重试", async () => {
    const workbench = setup();
    await workbench.selectConversation("c-1");
    const failed = message({ id: "f-1", seq: "3", direction: "outbound", source: "system", status: "failed", clientRequestId: "orig" });

    service.retryMessage.mockRejectedValueOnce(networkError());
    expect((await workbench.retryMessage(failed)).kind).toBe("uncertain");
    service.retryMessage.mockResolvedValueOnce(message({ id: "r-1", seq: "11", retryOf: "f-1", status: "queued" }));
    expect((await workbench.retryMessage(failed)).kind).toBe("queued");
    const [first, second] = service.retryMessage.mock.calls;
    expect(first?.[2]).not.toBe("orig");
    expect(second?.[2]).toBe(first?.[2]);

    await workbench.retryMessage({ ...failed, id: "u-1", status: "unknown" });
    expect(service.retryMessage).toHaveBeenCalledTimes(2);
  });

  it("切换身份清空会话缓存并丢弃旧身份的在途响应", async () => {
    const workbench = setup();
    workbench.start();
    await flush();
    await workbench.selectConversation("c-1");
    expect(workbench.detail.value?.id).toBe("c-1");

    let resolveLate!: (value: unknown) => void;
    service.conversation.mockImplementationOnce(() => new Promise((resolve) => { resolveLate = resolve; }));
    void workbench.selectConversation("c-2");
    useUserStore().userInfo.identityId = "identity-2";
    await flush();
    expect(workbench.selectedId.value).toBe("");
    expect(workbench.detail.value).toBeNull();
    expect(workbench.messages.value).toEqual([]);

    resolveLate(detail("c-2"));
    await flush();
    expect(workbench.detail.value).toBeNull();
  });

  it("会话读取失败时不保留上一会话内容", async () => {
    const workbench = setup();
    await workbench.selectConversation("c-1");
    service.conversation.mockRejectedValueOnce(new ApiError("not found", { code: "NOT_FOUND", status: 404 }));
    await workbench.selectConversation("c-9");
    expect(workbench.detail.value).toBeNull();
    expect(workbench.messages.value).toEqual([]);
    expect(workbench.threadError.value?.kind).toBe("not-found");
  });
});

describe("工作台实时刷新", () => {
  async function started() {
    const workbench = setup();
    workbench.start();
    await settle();
    await workbench.selectConversation("c-1");
    return workbench;
  }

  it("只订阅全局流，正常连接时不周期轮询；卸载后取消订阅", async () => {
    const workbench = await started();
    expect(stream.listeners.size).toBe(1);
    const list = callsOf(service.conversations);
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(callsOf(service.conversations)).toBe(list);
    expect(service.conversation).toHaveBeenCalledTimes(1);
    workbench.stop();
    expect(stream.listeners.size).toBe(0);
    emit({ type: "sync" });
    await settle();
    expect(callsOf(service.conversations)).toBe(list);
  });

  it("ready/resync 全量校准，同批重复信号合并为每个资源一次请求", async () => {
    await started();
    const list = callsOf(service.conversations);
    emit({ type: "sync" });
    emit({ type: "sync" });
    emit({ type: "conversation", conversationId: "c-1", reasons: ["message"] });
    await settle();
    expect(callsOf(service.conversations)).toBe(list + 1);
    expect(service.conversation).toHaveBeenCalledTimes(2);
    expect(service.markRead).not.toHaveBeenCalled();
  });

  it("其他会话变化只刷新列表；当前会话重取最新页以更新已有消息状态", async () => {
    const workbench = await started();
    emit({ type: "conversation", conversationId: "c-2", reasons: ["message"] });
    await settle();
    expect(service.conversation).toHaveBeenCalledTimes(1);
    service.messages.mockResolvedValue(page([message({ id: "m-2", seq: BIG_SEQ, status: "read" }), message({ id: "m-1", seq: "1" })]));
    emit({ type: "conversation", conversationId: "c-1", reasons: ["status"] });
    await settle();
    expect(service.conversation).toHaveBeenCalledTimes(2);
    expect(service.messages.mock.calls.at(-1)?.[1]).toEqual({ page: 1, pageSize: 50 });
    expect(workbench.messages.value.find((row) => row.id === "m-2")?.status).toBe("read");
  });

  it("进行中的刷新又失效时，结束后补跑一次", async () => {
    await started();
    let resolveList!: (value: unknown) => void;
    service.conversations.mockImplementationOnce(() => new Promise((resolve) => { resolveList = resolve; }));
    const list = callsOf(service.conversations);
    emit({ type: "conversation", conversationId: "c-2", reasons: ["message"] });
    await settle();
    emit({ type: "conversation", conversationId: "c-3", reasons: ["message"] });
    emit({ type: "summary" });
    await settle();
    expect(callsOf(service.conversations)).toBe(list + 1);
    resolveList(page([{ id: "c-1", unreadCount: 0 }]));
    await settle();
    expect(callsOf(service.conversations)).toBe(list + 2);
  });

  it("流正常时读取失败保留错误并有限退避重试，不恢复高频轮询", async () => {
    const workbench = await started();
    service.conversations.mockRejectedValueOnce(networkError()).mockRejectedValueOnce(networkError());
    const list = callsOf(service.conversations);
    emit({ type: "conversation", conversationId: "c-2", reasons: ["message"] });
    await settle();
    expect(workbench.listError.value).not.toBe("");
    await vi.advanceTimersByTimeAsync(2_000);
    expect(callsOf(service.conversations)).toBe(list + 2);
    await vi.advanceTimersByTimeAsync(4_000);
    expect(callsOf(service.conversations)).toBe(list + 3);
    expect(workbench.listError.value).toBe("");
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(callsOf(service.conversations)).toBe(list + 3);
  });

  it("权限范围变化先停止展示旧详情；仍有权限时恢复，403 时清空", async () => {
    const workbench = await started();
    let resolveDetail!: (value: unknown) => void;
    service.conversation.mockImplementationOnce(() => new Promise((resolve) => { resolveDetail = resolve; }));
    emit({ type: "access" });
    await flush();
    expect(workbench.detail.value).toBeNull();
    expect(workbench.messages.value).toEqual([]);
    expect(workbench.selectedId.value).toBe("c-1");
    resolveDetail(detail("c-1"));
    await settle();
    expect(workbench.detail.value?.id).toBe("c-1");
    expect(workbench.messages.value).toHaveLength(2);

    service.conversation.mockRejectedValueOnce(new ApiError("forbidden", { code: "AUTH_FORBIDDEN", status: 403 }));
    emit({ type: "access" });
    await settle();
    expect(workbench.detail.value).toBeNull();
    expect(workbench.messages.value).toEqual([]);
    expect(workbench.threadError.value?.kind).toBe("forbidden");
  });

  it("权限变化前发出的旧详情响应不能覆盖重新确认的结果", async () => {
    const workbench = await started();
    let resolveOld!: (value: unknown) => void;
    service.conversation.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }));
    emit({ type: "conversation", conversationId: "c-1", reasons: ["message"] });
    await settle();
    service.conversation.mockRejectedValueOnce(new ApiError("not found", { code: "NOT_FOUND", status: 404 }));
    emit({ type: "access" });
    await settle();
    resolveOld(detail("c-1"));
    await settle();
    expect(workbench.detail.value).toBeNull();
    expect(workbench.threadError.value?.kind).toBe("not-found");
  });

  it("共享已读推送引起的重取在序号未前进时不再次标记已读", async () => {
    const workbench = await started();
    await workbench.markDisplayed("c-1", true);
    expect(service.markRead).toHaveBeenCalledTimes(1);
    emit({ type: "conversation", conversationId: "c-1", reasons: ["read"] });
    await settle();
    await workbench.markDisplayed("c-1", false);
    expect(service.markRead).toHaveBeenCalledTimes(1);
  });

  it("翻页与筛选显式读取列表，旧筛选的响应不覆盖新页面", async () => {
    const workbench = await started();
    workbench.page.value = 2;
    await settle();
    expect(service.conversations.mock.calls.at(-1)?.[0]).toMatchObject({ page: 2 });

    let resolveOld!: (value: unknown) => void;
    service.conversations.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }));
    emit({ type: "sync" });
    await settle();
    service.conversations.mockResolvedValue(page([{ id: "c-9", unreadCount: 0 }]));
    workbench.view.value = "unassigned";
    await settle();
    resolveOld(page([{ id: "stale", unreadCount: 0 }]));
    await settle();
    expect(service.conversations.mock.calls.at(-1)?.[0]).toMatchObject({ page: 1, view: "unassigned" });
    expect(workbench.conversations.value.map((row) => row.id)).toEqual(["c-9"]);
  });

  it("重新可见时校准当前会话一次", async () => {
    await started();
    const handler = doc.addEventListener.mock.calls.findLast(([name]) => name === "visibilitychange")?.[1] as () => void;
    doc.visibilityState = "hidden";
    handler();
    await settle();
    expect(service.conversation).toHaveBeenCalledTimes(1);
    doc.visibilityState = "visible";
    handler();
    await settle();
    expect(service.conversation).toHaveBeenCalledTimes(2);
  });
});

describe("消息气泡与交互", () => {
  it("新回应更新已加载的旧消息，保留原始分页行而不重复显示", () => {
    const original = message({ id: "original", presentation: { text: "hi", editedAt: null, hidden: false, interaction: null, targetMessageId: null, emoji: null, reactions: [] } });
    const reaction = message({ id: "reaction", seq: "99", kind: "reaction", direction: "outbound", presentation: { text: "", editedAt: null, hidden: true, interaction: "reaction", targetMessageId: "original", emoji: "👍", reactions: [] } });
    expect(threadMessages([reaction])).toHaveLength(1);
    const visible = threadMessages([original, reaction]);
    expect(visible).toHaveLength(1);
    expect(visible[0]!.presentation!.reactions[0]!.emoji).toBe("👍");
    expect(original.presentation!.reactions).toEqual([]);
    const stale = message({ ...original, presentation: visible[0]!.presentation });
    expect(threadMessages([stale, { ...reaction, status: "failed", presentation: { ...reaction.presentation!, hidden: false } }])[0]!.presentation!.reactions).toEqual([]);
    const removal = message({ ...reaction, id: "removal", seq: "100", presentation: { ...reaction.presentation!, emoji: "" } });
    expect(threadMessages([original, reaction, removal])[0]!.presentation!.reactions).toEqual([]);
  });
});

describe("useCustomerNotes", () => {
  const notes = (patch: Partial<WhatsappCustomerNotes> = {}): WhatsappCustomerNotes => ({
    conversationId: "c-1", version: 1, customerName: "Tom", countryItemId: null, plannedDays: null, startDate: null, pax: null,
    contactInfo: "bsuid-1", destinations: [], requirements: "hi", internalRemark: "", updatedAt: null, ...patch,
  });
  function setupNotes() {
    scope = effectScope();
    return scope.run(() => useCustomerNotes())!;
  }

  it("按会话隔离草稿，切换回来保留未保存输入，晚到的旧响应不覆盖", async () => {
    let resolveFirst!: (value: WhatsappCustomerNotes) => void;
    service.customerNotes.mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }));
    service.customerNotes.mockImplementation(async (id: string) => notes({ conversationId: id, customerName: id }));
    const state = setupNotes();
    state.select("c-1", 1);
    void state.load("c-1", true);
    await flush();
    resolveFirst(notes({ customerName: "stale" }));
    await flush();
    expect(state.entry.value!.form.customerName).toBe("c-1");

    state.entry.value!.form.internalRemark = "draft";
    state.select("c-2", 1);
    await flush();
    expect(state.entry.value!.form).toMatchObject({ customerName: "c-2", internalRemark: "" });
    state.select("c-1", 2);
    await flush();
    expect(state.entry.value!.form.internalRemark).toBe("draft");
  });

  it("全量提交版本和空白字段；409 保留输入且不自动重试", async () => {
    service.customerNotes.mockResolvedValue(notes());
    service.saveCustomerNotes.mockRejectedValueOnce(conflict());
    const state = setupNotes();
    state.select("c-1", 1);
    await flush();
    state.entry.value!.form.customerName = "";
    const result = await state.save();
    expect(service.saveCustomerNotes).toHaveBeenCalledExactlyOnceWith("c-1", {
      version: 1, customerName: "", countryItemId: null, plannedDays: null, startDate: null, pax: null,
      contactInfo: "bsuid-1", destinations: [], requirements: "hi", internalRemark: "",
    });
    expect(result?.kind).toBe("conflict");
    expect(state.entry.value).toMatchObject({ conflict: true, form: { customerName: "" } });
    await state.load("c-1");
    expect(service.customerNotes).toHaveBeenCalledTimes(1);
    expect(await state.save()).toBeUndefined();

    await state.load("c-1", true);
    expect(state.entry.value).toMatchObject({ conflict: false, form: { customerName: "Tom" } });
  });

  it("未保存修改写入缓存，刷新页面后恢复；保存成功后清除", async () => {
    service.customerNotes.mockResolvedValue(notes());
    service.saveCustomerNotes.mockResolvedValue(notes({ version: 2, internalRemark: "draft" }));
    const first = setupNotes();
    first.select("c-1", 1);
    await flush();
    first.entry.value!.form.internalRemark = "draft";
    await flush();
    scope.stop();

    const reloaded = setupNotes();
    reloaded.select("c-1", 1);
    await flush();
    expect(reloaded.entry.value).toMatchObject({ conflict: false, version: 1, form: { internalRemark: "draft" } });
    await reloaded.save();
    await flush();
    scope.stop();

    const afterSave = setupNotes();
    afterSave.select("c-1", 2);
    await flush();
    expect(afterSave.dirty.value).toBe(false);
  });

  it("缓存草稿版本已过期时按冲突恢复，确认刷新后清除；其他身份读不到", async () => {
    const user = useUserStore();
    user.userInfo.identityId = "identity-1";
    service.customerNotes.mockResolvedValue(notes());
    const first = setupNotes();
    first.select("c-1", 1);
    await flush();
    first.entry.value!.form.internalRemark = "draft";
    await flush();
    scope.stop();

    user.userInfo.identityId = "identity-2";
    const other = setupNotes();
    other.select("c-1", 1);
    await flush();
    expect(other.dirty.value).toBe(false);
    scope.stop();
    user.userInfo.identityId = "identity-1";

    service.customerNotes.mockResolvedValue(notes({ version: 3 }));
    const stale = setupNotes();
    stale.select("c-1", 3);
    await flush();
    expect(stale.entry.value).toMatchObject({ conflict: true, form: { internalRemark: "draft" } });
    await stale.load("c-1", true);
    await flush();
    scope.stop();

    const cleared = setupNotes();
    cleared.select("c-1", 3);
    await flush();
    expect(cleared.dirty.value).toBe(false);
  });

  it("保存成功以服务端返回的称呼和版本为准", async () => {
    service.customerNotes.mockResolvedValue(notes());
    service.saveCustomerNotes.mockResolvedValue(notes({ version: 2, customerName: "WhatsApp Tom" }));
    const state = setupNotes();
    state.select("c-1", 1);
    await flush();
    state.entry.value!.form.customerName = "";
    expect((await state.save())?.kind).toBe("saved");
    expect(state.entry.value).toMatchObject({ version: 2, form: { customerName: "WhatsApp Tom" } });
    expect(state.dirty.value).toBe(false);
  });
});

describe("linkedConversationId", () => {
  it("locates a new Feishu conversation on a mounted or cached workbench only once", () => {
    expect(linkedConversationId(true, "c-2", "c-1")).toBe("c-2");
    expect(linkedConversationId(true, "c-2", "c-2")).toBe("");
    expect(linkedConversationId(false, "c-2", "c-1")).toBe("");
    expect(linkedConversationId(true, ["c-2"], "c-1")).toBe("");
    expect(linkedConversationId(true, undefined, "c-1")).toBe("");
  });
});
