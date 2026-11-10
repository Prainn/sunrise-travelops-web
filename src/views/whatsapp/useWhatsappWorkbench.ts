import { computed, onScopeDispose, ref, shallowRef, watch } from "vue";
import { useDebounceFn } from "@vueuse/core";
import { ApiError } from "@/api/request";
import { websiteErrorMessage } from "@/services/website.service";
import { whatsappService } from "@/services/whatsapp.service";
import { useUserStore } from "@/stores/user";
import type {
  WhatsappConversationDetail,
  WhatsappConversationItem,
  WhatsappConversationState,
  WhatsappConversationView,
  WhatsappMessage,
  WhatsappReply,
} from "@/types/whatsapp";
import {
  compareSeq,
  isUncertainSendError,
  maxSeq,
  mergeLatestPage,
  mergeMessages,
  minSeq,
  settlePending,
  type PendingMessage,
} from "./message-utils";

export const POLL_INTERVAL_MS = 2_000;
const MAX_BACKOFF_MS = 30_000;
const MESSAGE_PAGE_SIZE = 50;
/** 新增行超过一页时用 afterSeq 补齐的最大页数，避免单轮请求过多。 */
const MAX_GAP_PAGES = 5;

export type ThreadErrorKind = "not-found" | "forbidden" | "failed";

interface WorkbenchOptions {
  defaultView?: WhatsappConversationView;
}

export interface SendFeedback {
  kind: "queued" | "uncertain" | "rejected";
  message: string;
}

/**
 * WhatsApp 工作台状态：会话列表、当前会话、消息、轮询与发送。
 *
 * 身份变化、重置或卸载时丢弃全部缓存与在途响应，防止跨身份或跨会话显示数据。
 */
export function useWhatsappWorkbench(options: WorkbenchOptions = {}) {
  const user = useUserStore();

  const keyword = ref("");
  const view = ref<WhatsappConversationView | undefined>(options.defaultView);
  const state = ref<WhatsappConversationState | undefined>();
  const page = ref(1);
  const pageSize = ref(20);
  const conversations = ref<WhatsappConversationItem[]>([]);
  const total = ref(0);
  const listLoading = ref(false);
  const listError = ref("");

  const selectedId = ref("");
  const detail = shallowRef<WhatsappConversationDetail | null>(null);
  const messages = shallowRef<WhatsappMessage[]>([]);
  const messageTotal = ref(0);
  const threadLoading = ref(false);
  const olderLoading = ref(false);
  const threadError = ref<{ kind: ThreadErrorKind; message: string } | null>(null);
  /** 按会话保存本地发送记录，切换会话后结果未知的请求仍可用原编号核实。 */
  const pendingByConversation = ref(new Map<string, PendingMessage[]>());
  const retryingIds = ref(new Set<string>());

  let session = 0;
  let threadToken = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let ticking = false;
  let rerunRequested = false;
  let failures = 0;
  let disposed = false;
  const lastReadSent = new Map<string, string>();
  const retryRequestIds = new Map<string, string>();

  const pending = computed(() => pendingByConversation.value.get(selectedId.value) ?? []);
  const hasOlder = computed(() => messages.value.length < messageTotal.value);

  function listQuery() {
    return {
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value.trim() || undefined,
      view: view.value,
      state: state.value,
    };
  }

  async function fetchList(currentSession = session) {
    listLoading.value = conversations.value.length === 0;
    try {
      const result = await whatsappService.conversations(listQuery());
      if (currentSession !== session) return;
      conversations.value = result.list;
      total.value = result.total;
      listError.value = "";
    } catch (cause) {
      if (currentSession !== session) return;
      // 读取失败不保留上一轮列表，避免误认为数据仍有效。
      conversations.value = [];
      total.value = 0;
      listError.value = websiteErrorMessage(cause);
      throw cause;
    } finally {
      if (currentSession === session) listLoading.value = false;
    }
  }

  function clearThread() {
    threadToken++;
    detail.value = null;
    messages.value = [];
    messageTotal.value = 0;
    threadError.value = null;
    threadLoading.value = false;
    olderLoading.value = false;
  }

  function threadFailure(cause: unknown) {
    clearThread();
    const status = cause instanceof ApiError ? cause.status : undefined;
    const kind: ThreadErrorKind = status === 404 ? "not-found" : status === 403 ? "forbidden" : "failed";
    threadError.value = { kind, message: websiteErrorMessage(cause) };
  }

  /**
   * 拉取当前会话最新页；结果未完整覆盖新增行时用 afterSeq 补齐，再整体替换覆盖区间以同步状态和镜像合并。
   *
   * @param id - 当前会话 ID。
   * @param token - 发起时的会话令牌，失效后丢弃结果。
   */
  async function syncMessages(id: string, token: number) {
    const known = maxSeq(messages.value);
    const latest = await whatsappService.messages(id, { page: 1, pageSize: MESSAGE_PAGE_SIZE });
    if (token !== threadToken) return;
    let merged = messages.value;
    const floor = minSeq(latest.list);
    if (known && floor && compareSeq(floor, known) > 0 && latest.list.length >= MESSAGE_PAGE_SIZE) {
      for (let pageNo = 1; pageNo <= MAX_GAP_PAGES; pageNo++) {
        const gap = await whatsappService.messages(id, { page: pageNo, pageSize: MESSAGE_PAGE_SIZE, afterSeq: known });
        if (token !== threadToken) return;
        merged = mergeMessages(merged, gap.list);
        if (pageNo * MESSAGE_PAGE_SIZE >= gap.total) break;
      }
    }
    merged = mergeLatestPage(merged, latest.list, latest.total <= latest.list.length);
    messages.value = merged;
    messageTotal.value = Math.max(latest.total, merged.length);
    const list = pendingByConversation.value.get(id);
    if (list?.length) setPending(id, settlePending(list, merged));
  }

  async function fetchThread(id: string, token = threadToken) {
    const nextDetail = await whatsappService.conversation(id);
    if (token !== threadToken) return;
    detail.value = nextDetail;
    await syncMessages(id, token);
  }

  /** 打开会话：先清空上一会话再读取，读取失败不回显旧数据。 */
  async function selectConversation(id: string) {
    if (!id) {
      selectedId.value = "";
      clearThread();
      return;
    }
    selectedId.value = id;
    clearThread();
    const token = threadToken;
    threadLoading.value = true;
    try {
      await fetchThread(id, token);
    } catch (cause) {
      if (token === threadToken) threadFailure(cause);
    } finally {
      if (token === threadToken) threadLoading.value = false;
    }
  }

  /** 操作后原地刷新当前会话，不清空已展示内容；无权或已不存在时清空。 */
  async function reloadSelected() {
    const id = selectedId.value;
    if (!id) return;
    const token = threadToken;
    try {
      await fetchThread(id, token);
    } catch (cause) {
      if (token === threadToken) threadFailure(cause);
    }
  }

  async function loadOlder() {
    const id = selectedId.value;
    const floor = minSeq(messages.value);
    if (!id || !floor || olderLoading.value) return;
    const token = threadToken;
    olderLoading.value = true;
    try {
      const older = await whatsappService.messages(id, { page: 1, pageSize: MESSAGE_PAGE_SIZE, beforeSeq: floor });
      if (token !== threadToken) return;
      messages.value = mergeMessages(messages.value, older.list);
      if (older.list.length < MESSAGE_PAGE_SIZE) messageTotal.value = messages.value.length;
    } catch (cause) {
      if (token === threadToken) throw cause;
    } finally {
      if (token === threadToken) olderLoading.value = false;
    }
  }

  async function tick() {
    if (ticking) {
      rerunRequested = true;
      return;
    }
    ticking = true;
    const currentSession = session;
    try {
      await fetchList(currentSession);
      const id = selectedId.value;
      const token = threadToken;
      if (id && detail.value && currentSession === session) {
        try {
          await fetchThread(id, token);
        } catch (cause) {
          // 网络抖动保留当前会话；权限或记录变化时立即清空，不显示越权数据。
          if (token !== threadToken) return;
          if (cause instanceof ApiError && (cause.status === 403 || cause.status === 404)) threadFailure(cause);
          else throw cause;
        }
      }
      failures = 0;
    } catch {
      failures++;
    } finally {
      ticking = false;
      if (currentSession === session) {
        if (rerunRequested) {
          rerunRequested = false;
          void tick();
        } else {
          schedule();
        }
      }
    }
  }

  function schedule() {
    if (timer) clearTimeout(timer);
    timer = undefined;
    if (disposed || document.visibilityState === "hidden") return;
    const delay = failures ? Math.min(MAX_BACKOFF_MS, POLL_INTERVAL_MS * 2 ** failures) : POLL_INTERVAL_MS;
    timer = setTimeout(() => void tick(), delay);
  }

  /** 用户操作后立即刷新；已有轮询进行中时在其结束后补跑一次。 */
  function refreshNow() {
    if (timer) clearTimeout(timer);
    timer = undefined;
    void tick();
  }

  function handleVisibilityChange() {
    if (document.visibilityState === "hidden") {
      if (timer) clearTimeout(timer);
      timer = undefined;
    } else if (!ticking) {
      failures = 0;
      refreshNow();
    }
  }

  /**
   * 消息实际渲染后由视图调用；仅可见页面提交本会话已展示的最大序号，后台刷新不标记。
   *
   * @param id - 渲染消息所属会话。
   * @param isUserOpened - 用户刚打开会话时为 true；轮询更新还要求窗口聚焦。
   */
  async function markDisplayed(id: string, isUserOpened: boolean) {
    if (id !== selectedId.value || detail.value?.id !== id) return;
    if (document.visibilityState !== "visible" || (!isUserOpened && !document.hasFocus())) return;
    const seq = maxSeq(messages.value.filter((message) => message.conversationId === id));
    if (!seq) return;
    const sent = lastReadSent.get(id);
    if (sent && compareSeq(seq, sent) <= 0) return;
    lastReadSent.set(id, seq);
    const currentSession = session;
    try {
      await whatsappService.markRead(id, seq);
      if (currentSession !== session) return;
      const row = conversations.value.find((item) => item.id === id);
      if (row) row.unreadCount = 0;
    } catch {
      // 失败时允许下次展示再提交；不影响阅读本身。
      if (lastReadSent.get(id) === seq) {
        if (sent) lastReadSent.set(id, sent);
        else lastReadSent.delete(id);
      }
    }
  }

  function setPending(id: string, list: PendingMessage[]) {
    const next = new Map(pendingByConversation.value);
    if (list.length) next.set(id, list);
    else next.delete(id);
    pendingByConversation.value = next;
  }

  function updatePending(id: string, clientRequestId: string, patch: Partial<PendingMessage>) {
    const list = pendingByConversation.value.get(id) ?? [];
    setPending(id, list.map((item) => (item.clientRequestId === clientRequestId ? { ...item, ...patch } : item)));
  }

  async function submitPending(id: string, item: PendingMessage): Promise<SendFeedback> {
    const currentSession = session;
    updatePending(id, item.clientRequestId, { state: "sending", error: "" });
    try {
      const saved = item.reaction
        ? await whatsappService.sendReaction(id, item.reaction.targetMessageId, item.clientRequestId, item.reaction.emoji)
        : await whatsappService.sendText(id, item.clientRequestId, item.text, item.replyTo?.id);
      if (currentSession !== session) return { kind: "queued", message: "" };
      setPending(id, (pendingByConversation.value.get(id) ?? []).filter((entry) => entry.clientRequestId !== item.clientRequestId));
      if (id === selectedId.value) messages.value = mergeMessages(messages.value, [saved]);
      refreshNow();
      return { kind: "queued", message: "" };
    } catch (cause) {
      if (currentSession !== session) return { kind: "rejected", message: "" };
      const message = websiteErrorMessage(cause);
      if (isUncertainSendError(cause)) {
        updatePending(id, item.clientRequestId, { state: "uncertain", error: message });
        return { kind: "uncertain", message };
      }
      updatePending(id, item.clientRequestId, { state: "rejected", error: message });
      return { kind: "rejected", message };
    }
  }

  /** 新发送生成一个请求编号；同一条记录再次提交时复用原编号，防止重复发送。 */
  function sendText(text: string, replyTo?: WhatsappReply) {
    const id = selectedId.value;
    const item: PendingMessage = {
      clientRequestId: crypto.randomUUID(),
      text,
      replyTo,
      state: "sending",
      error: "",
      createdAt: new Date().toISOString(),
    };
    setPending(id, [...(pendingByConversation.value.get(id) ?? []), item]);
    return submitPending(id, item);
  }

  function sendReaction(message: WhatsappMessage, emoji: string) {
    const id = selectedId.value;
    if (pending.value.some((item) => item.reaction?.targetMessageId === message.id && item.state !== "rejected")) return undefined;
    const item: PendingMessage = {
      clientRequestId: crypto.randomUUID(), text: emoji,
      reaction: { targetMessageId: message.id, emoji },
      state: "sending", error: "", createdAt: new Date().toISOString(),
    };
    setPending(id, [...(pendingByConversation.value.get(id) ?? []), item]);
    return submitPending(id, item);
  }

  function resubmitPending(clientRequestId: string) {
    const id = selectedId.value;
    const item = pendingByConversation.value.get(id)?.find((entry) => entry.clientRequestId === clientRequestId);
    if (!item || item.state !== "uncertain") return undefined;
    return submitPending(id, item);
  }

  function discardPending(clientRequestId: string) {
    const id = selectedId.value;
    const list = pendingByConversation.value.get(id) ?? [];
    setPending(id, list.filter((entry) => entry.clientRequestId !== clientRequestId || entry.state !== "rejected"));
  }

  /**
   * 人工重试明确失败的消息：首次点击生成新的请求编号，结果未知时再次点击复用同一编号。
   *
   * @param message - 状态为 failed 的系统发送消息。
   * @returns 重试反馈。
   */
  async function retryMessage(message: WhatsappMessage): Promise<SendFeedback> {
    const id = selectedId.value;
    if (message.status !== "failed" || retryingIds.value.has(message.id)) return { kind: "rejected", message: "" };
    const currentSession = session;
    const clientRequestId = retryRequestIds.get(message.id) ?? crypto.randomUUID();
    retryRequestIds.set(message.id, clientRequestId);
    retryingIds.value = new Set(retryingIds.value).add(message.id);
    try {
      const saved = await whatsappService.retryMessage(id, message.id, clientRequestId);
      if (currentSession !== session) return { kind: "queued", message: "" };
      retryRequestIds.delete(message.id);
      if (id === selectedId.value) messages.value = mergeMessages(messages.value, [saved]);
      refreshNow();
      return { kind: "queued", message: "" };
    } catch (cause) {
      const text = websiteErrorMessage(cause);
      if (isUncertainSendError(cause)) return { kind: "uncertain", message: text };
      retryRequestIds.delete(message.id);
      refreshNow();
      return { kind: "rejected", message: text };
    } finally {
      if (currentSession === session) {
        const next = new Set(retryingIds.value);
        next.delete(message.id);
        retryingIds.value = next;
      }
    }
  }

  /** 丢弃全部缓存、在途响应和定时器；身份切换或卸载时调用。 */
  function reset() {
    session++;
    if (timer) clearTimeout(timer);
    timer = undefined;
    rerunRequested = false;
    failures = 0;
    selectedId.value = "";
    clearThread();
    conversations.value = [];
    total.value = 0;
    listError.value = "";
    pendingByConversation.value = new Map();
    retryingIds.value = new Set();
    lastReadSent.clear();
    retryRequestIds.clear();
  }

  function start() {
    disposed = false;
    document.addEventListener("visibilitychange", handleVisibilityChange);
    refreshNow();
  }

  function stop() {
    disposed = true;
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    reset();
  }

  watch(
    () => [user.userInfo.userId, user.userInfo.identityId, user.userInfo.scope] as const,
    (next, previous) => {
      if (next.every((value, index) => value === previous[index])) return;
      reset();
      if (!disposed && next[0]) refreshNow();
    },
  );
  const reloadFirstPage = () => {
    page.value = 1;
    refreshNow();
  };
  watch(keyword, useDebounceFn(reloadFirstPage, 300));
  watch([view, state], reloadFirstPage);
  onScopeDispose(stop);

  return {
    keyword,
    view,
    state,
    page,
    pageSize,
    conversations,
    total,
    listLoading,
    listError,
    selectedId,
    detail,
    messages,
    hasOlder,
    threadLoading,
    olderLoading,
    threadError,
    pending,
    retryingIds,
    start,
    stop,
    reset,
    refreshNow,
    selectConversation,
    reloadSelected,
    loadOlder,
    markDisplayed,
    sendText,
    sendReaction,
    resubmitPending,
    discardPending,
    retryMessage,
  };
}
