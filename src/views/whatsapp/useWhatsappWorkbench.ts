import { computed, onScopeDispose, ref, shallowRef, watch } from "vue";
import { useDebounceFn } from "@vueuse/core";
import { ApiError } from "@/api/request";
import { translate } from "@/lang/utils";
import { websiteErrorMessage } from "@/services/website.service";
import { whatsappService } from "@/services/whatsapp.service";
import { useUserStore } from "@/stores/user";
import { useWhatsappStreamStore } from "@/stores/whatsapp-stream";
import type {
  WhatsappConversationDetail,
  WhatsappConversationItem,
  WhatsappConversationState,
  WhatsappConversationView,
  WhatsappMessage,
  WhatsappReply,
  WhatsappStreamSignal,
} from "@/types/whatsapp";
import { createCoalescedTask } from "@/utils/coalesced-task";
import {
  compareSeq,
  hasPendingMedia,
  isUncertainSendError,
  maxSeq,
  mergeLatestPage,
  mergeMessages,
  minSeq,
  settlePending,
  type PendingImage,
  type PendingMessage,
} from "./message-utils";

const MESSAGE_PAGE_SIZE = 50;
/** 新增行超过一页时用 afterSeq 补齐的最大页数，避免单轮请求过多。 */
const MAX_GAP_PAGES = 5;
/** 最新页以下归档中的媒体每次刷新最多重取的页数。 */
const MAX_MEDIA_PAGES = 3;

export type ThreadErrorKind = "not-found" | "forbidden" | "failed";

interface WorkbenchOptions {
  defaultView?: WhatsappConversationView;
}

export interface SendFeedback {
  kind: "queued" | "uncertain" | "rejected";
  message: string;
}

/**
 * WhatsApp 工作台状态：会话列表、当前会话、消息、实时刷新与发送。
 *
 * 只订阅全局实时流的刷新信号，不自建连接或周期轮询；流断开时由流管理器低频发出校准信号。
 * 列表与当前会话各自合并刷新，进行中再失效时结束后补跑一次。
 * 身份变化、重置或卸载时丢弃全部缓存与在途响应，防止跨身份或跨会话显示数据。
 */
export function useWhatsappWorkbench(options: WorkbenchOptions = {}) {
  const user = useUserStore();
  const stream = useWhatsappStreamStore();

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

  let syncedSeq: string | null = null;
  let lastListQuery = "";
  let session = 0;
  let threadToken = 0;
  let disposed = true;
  let unsubscribe: (() => void) | undefined;
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
    const query = listQuery();
    const queryKey = JSON.stringify(query);
    if (queryKey !== lastListQuery) {
      conversations.value = [];
      total.value = 0;
      lastListQuery = queryKey;
    }
    listLoading.value = conversations.value.length === 0;
    try {
      const result = await whatsappService.conversations(query);
      if (currentSession !== session || queryKey !== JSON.stringify(listQuery())) return;
      conversations.value = result.list;
      total.value = result.total;
      listError.value = "";
    } catch (cause) {
      if (currentSession !== session || queryKey !== JSON.stringify(listQuery())) return;
      if (cause instanceof ApiError && (cause.status === 401 || cause.status === 403 || cause.status === 404)) {
        conversations.value = [];
        total.value = 0;
        clearThread();
      }
      listError.value = websiteErrorMessage(cause);
      throw cause;
    } finally {
      if (currentSession === session) listLoading.value = false;
    }
  }

  function clearThread() {
    threadToken++;
    syncedSeq = null;
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
   * @returns 达到单批上限仍未追平时为 true，调用方应立即安排下一批。
   */
  async function syncMessages(id: string, token: number): Promise<boolean> {
    const known = syncedSeq;
    const latest = await whatsappService.messages(id, { page: 1, pageSize: MESSAGE_PAGE_SIZE });
    if (token !== threadToken) return false;
    let merged = messages.value;
    const floor = minSeq(latest.list);
    let reachedLatest = true;
    let cursor = known;
    if (known && floor && compareSeq(floor, known) > 0 && latest.list.length >= MESSAGE_PAGE_SIZE) {
      reachedLatest = false;
      for (let pageNo = 1; pageNo <= MAX_GAP_PAGES; pageNo++) {
        const gap = await whatsappService.messages(id, { page: 1, pageSize: MESSAGE_PAGE_SIZE, afterSeq: cursor! });
        if (token !== threadToken) return false;
        merged = mergeMessages(merged, gap.list);
        const lastGapSeq = maxSeq(gap.list);
        if (!lastGapSeq || compareSeq(lastGapSeq, cursor!) <= 0) break;
        cursor = lastGapSeq;
        reachedLatest = compareSeq(lastGapSeq, floor) >= 0;
        if (reachedLatest) break;
      }
    }
    // 只推进到已取得的行；达到单批上限后由下一批从该游标继续，不跳过遗漏页。
    if (reachedLatest) {
      merged = mergeLatestPage(merged, latest.list, latest.total <= latest.list.length);
      syncedSeq = maxSeq(latest.list);
    } else {
      syncedSeq = cursor;
    }
    if (reachedLatest) {
      merged = await refreshOlderMedia(id, token, merged, floor);
      if (token !== threadToken) return false;
    }
    messages.value = merged;
    messageTotal.value = Math.max(latest.total, merged.length);
    const list = pendingByConversation.value.get(id);
    if (list?.length) setPending(id, settlePending(list, merged));
    return !reachedLatest;
  }

  /**
   * 最新页以下已加载、归档仍在进行的图片/贴纸：重取其所在页更新原消息；
   * 只随实时失效或校准触发，每次最多 MAX_MEDIA_PAGES 页，不另行轮询。
   *
   * @param id - 当前会话 ID。
   * @param token - 发起时的会话令牌。
   * @param current - 已与最新页合并的消息。
   * @param floor - 最新页最小 seq。
   * @returns 合并了重取结果的消息。
   */
  async function refreshOlderMedia(id: string, token: number, current: WhatsappMessage[], floor: string | null) {
    let merged = current;
    let ceiling = floor;
    for (let pageNo = 0; ceiling && pageNo < MAX_MEDIA_PAGES; pageNo++) {
      const below = ceiling;
      const target = maxSeq(merged.filter((message) => compareSeq(message.seq, below) < 0 && hasPendingMedia(message)));
      if (!target) break;
      const older = await whatsappService.messages(id, {
        page: 1, pageSize: MESSAGE_PAGE_SIZE, beforeSeq: (BigInt(target) + 1n).toString(),
      });
      if (token !== threadToken) return merged;
      merged = mergeMessages(merged, older.list);
      ceiling = older.list.length >= MESSAGE_PAGE_SIZE ? minSeq(older.list) : null;
    }
    return merged;
  }

  async function fetchThread(id: string, token = threadToken) {
    const nextDetail = await whatsappService.conversation(id);
    if (token !== threadToken) return;
    detail.value = nextDetail;
    if (await syncMessages(id, token)) threadTask.request();
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

  /** 原地刷新当前已展示的会话；网络错误交给合并任务退避重试，权限或记录变化时立即清空。 */
  async function syncSelected() {
    const id = selectedId.value;
    const token = threadToken;
    if (!id || !detail.value) return;
    try {
      await fetchThread(id, token);
    } catch (cause) {
      if (token !== threadToken) return;
      if (cause instanceof ApiError && (cause.status === 403 || cause.status === 404)) threadFailure(cause);
      else throw cause;
    }
  }

  const listTask = createCoalescedTask(async () => {
    if (!disposed) await fetchList();
  });
  const threadTask = createCoalescedTask(syncSelected);

  /** 用户操作或校准后立即刷新列表与当前会话；进行中的读取结束后补跑一次。 */
  function refreshNow() {
    listTask.request();
    threadTask.request();
  }

  /** 权限范围变化：旧详情未经重新确认前不再展示，丢弃在途响应后重新读取，403/404 由读取结果清空。 */
  function revalidateAccess() {
    listTask.request();
    const id = selectedId.value;
    if (id) void selectConversation(id);
  }

  function handleSignal(signal: WhatsappStreamSignal) {
    if (disposed) return;
    if (signal.type === "sync") refreshNow();
    else if (signal.type === "access") revalidateAccess();
    else if (signal.type === "conversation") {
      listTask.request();
      if (signal.conversationId === selectedId.value) threadTask.request();
    }
  }

  /** 恢复可见时校准当前会话一次，使后台期间收到的消息重新展示并按可见规则标记已读。 */
  function handleVisibilityChange() {
    if (document.visibilityState === "visible") threadTask.request();
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
    // A newly sent outbox row may be ahead of the incoming rows still being fetched.
    const seq = maxSeq(messages.value.filter((message) => message.conversationId === id &&
      syncedSeq !== null && compareSeq(message.seq, syncedSeq) <= 0));
    if (!seq) return;
    const sent = lastReadSent.get(id);
    if (sent && compareSeq(seq, sent) <= 0) return;
    lastReadSent.set(id, seq);
    const currentSession = session;
    try {
      // 共享已读会推送 read 变化；重取后序号未前进时上面的去重阻止再次提交，不形成循环。
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

  /** 按记录类型提交；批量快照原样提交，返回的每条消息逐条合并。 */
  async function postPending(id: string, item: PendingMessage): Promise<WhatsappMessage[]> {
    if (item.reaction)
      return [await whatsappService.sendReaction(id, item.reaction.targetMessageId, item.clientRequestId, item.reaction.emoji)];
    if (item.batch) {
      const result = await whatsappService.sendImageBatch(id, {
        images: item.batch.images.map((image) => ({ clientRequestId: image.clientRequestId, mediaAssetId: image.mediaAssetId })),
        ...(item.batch.textRequestId ? { textMessage: { clientRequestId: item.batch.textRequestId, text: item.text } } : {}),
        ...(item.replyTo ? { replyToMessageId: item.replyTo.id } : {}),
      });
      return result.messages;
    }
    return [await whatsappService.sendText(id, item.clientRequestId, item.text, item.replyTo?.id)];
  }

  async function submitPending(id: string, item: PendingMessage): Promise<SendFeedback> {
    const currentSession = session;
    updatePending(id, item.clientRequestId, { state: "sending", error: "", isExpired: false });
    try {
      const saved = await postPending(id, item);
      if (currentSession !== session) return { kind: "queued", message: "" };
      setPending(id, (pendingByConversation.value.get(id) ?? []).filter((entry) => entry.clientRequestId !== item.clientRequestId));
      if (id === selectedId.value) messages.value = mergeMessages(messages.value, saved);
      refreshNow();
      return { kind: "queued", message: "" };
    } catch (cause) {
      if (currentSession !== session) return { kind: "rejected", message: "" };
      const message = websiteErrorMessage(cause);
      if (isUncertainSendError(cause)) {
        updatePending(id, item.clientRequestId, { state: "uncertain", error: message });
        return { kind: "uncertain", message };
      }
      // 图片资源已被清理：整组未入队，重新编辑时保留文字和本地图片并要求重新上传。
      const isExpired = !!item.batch && cause instanceof ApiError && cause.status === 404;
      const error = isExpired ? translate("whatsapp.imageDraft.batchExpired") : message;
      updatePending(id, item.clientRequestId, { state: "rejected", error, isExpired });
      return { kind: "rejected", message: error };
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

  /**
   * 用户点击发送后整组发出：每张图和末尾文字各有独立请求编号，同一发送动作只生成一次。
   *
   * @param images - 已上传的图片，按选图顺序。
   * @param text - 去首尾空白后的正文，空串表示不发文字。
   * @param replyTo - 引用目标，服务端只挂在第一张图。
   * @returns 发送反馈。
   */
  function sendImages(images: Omit<PendingImage, "clientRequestId">[], text: string, replyTo?: WhatsappReply) {
    const id = selectedId.value;
    const batchImages = images.map((image) => ({ ...image, clientRequestId: crypto.randomUUID() }));
    const item: PendingMessage = {
      clientRequestId: batchImages[0]!.clientRequestId,
      text,
      batch: { images: batchImages, ...(text ? { textRequestId: crypto.randomUUID() } : {}) },
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

  /**
   * 客户资料保存后同步当前会话的称呼和版本；同联系人其他列表项由下一轮刷新取得。
   *
   * @param id - 会话 ID。
   * @param name - 服务端返回的有效称呼。
   * @param version - 保存后的会话版本。
   */
  function applyCustomerName(id: string, name: string, version: number) {
    if (detail.value?.id === id && detail.value.version <= version) detail.value = { ...detail.value, name, version };
    const row = conversations.value.find((item) => item.id === id);
    if (row && row.version <= version) {
      row.name = name;
      row.version = version;
    }
    refreshNow();
  }

  /** 丢弃全部缓存、在途响应和定时器；身份切换或卸载时调用。 */
  function reset() {
    session++;
    listTask.cancel();
    threadTask.cancel();
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
    if (!disposed) return;
    disposed = false;
    unsubscribe = stream.subscribe(handleSignal);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    refreshNow();
  }

  function stop() {
    disposed = true;
    unsubscribe?.();
    unsubscribe = undefined;
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
    listTask.request();
  };
  watch(keyword, useDebounceFn(reloadFirstPage, 300));
  watch([view, state], reloadFirstPage);
  // 原先翻页依赖下一轮轮询，事件驱动后需显式读取。
  watch([page, pageSize], () => listTask.request());
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
    sendImages,
    sendReaction,
    resubmitPending,
    discardPending,
    retryMessage,
    applyCustomerName,
  };
}
