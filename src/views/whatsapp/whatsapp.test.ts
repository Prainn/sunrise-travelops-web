import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick } from "vue";
import { ApiError } from "@/api/request";
import type { WhatsappConversationDetail, WhatsappMessage } from "@/types/whatsapp";
import type { WebsiteInquiryInput } from "@/types/website";

const service = vi.hoisted(() => ({
  conversations: vi.fn(),
  conversation: vi.fn(),
  messages: vi.fn(),
  markRead: vi.fn(),
  sendText: vi.fn(),
  retryMessage: vi.fn(),
}));
vi.mock("@/services/whatsapp.service", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  whatsappService: service,
}));
vi.mock("@/lang/utils", () => ({ translate: (key: string) => key, translateIfExists: () => undefined }));
vi.mock("@/stores/user", async () => {
  const { reactive } = await import("vue");
  const store = reactive({ userInfo: { userId: "user-1", identityId: "identity-1", scope: "website", roles: [], perms: [] } });
  return { useUserStore: () => store };
});

import { useUserStore } from "@/stores/user";
import { whatsappInquiryInput } from "@/services/whatsapp.service";
import { canRetryMessage, compareSeq, mergeLatestPage, messageSourceLabel, sortMessages, maxSeq, threadAccess } from "./message-utils";
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

let scope: ReturnType<typeof effectScope>;
function setup() {
  scope = effectScope();
  return scope.run(() => useWhatsappWorkbench())!;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("document", doc);
  doc.visibilityState = "visible";
  doc.hasFocus.mockReturnValue(true);
  for (const fn of Object.values(service)) fn.mockReset();
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
});

describe("历史咨询只读", () => {
  const capabilities = { canReply: true, canAssign: false, canCreateInquiry: false, canStartConsultation: false };

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
