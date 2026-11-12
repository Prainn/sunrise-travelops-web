import { ApiError } from "@/api/request";
import { ApiErrorCode } from "@/api/error-code";
import type { OssResource } from "@/types/oss";
import type {
  WhatsappConversationDetail,
  WhatsappConversationState,
  WhatsappMessage,
  WhatsappMessageStatus,
  WhatsappReply,
} from "@/types/whatsapp";

/** 本地发送中的消息；服务端未确认前不进入正式消息列表。 */
export interface PendingMessage {
  clientRequestId: string;
  text: string;
  reaction?: { targetMessageId: string; emoji: string };
  /**
   * 多图发送快照：clientRequestId 为第一张图的编号；text 为末尾独立文字，有正文时才带 textRequestId。
   * 结果未知时原样重提全部编号；本地文件仅用于资源过期后重新上传。
   */
  batch?: { images: PendingImage[]; textRequestId?: string };
  replyTo?: WhatsappReply;
  /** sending：请求中；uncertain：结果未知，只能用同一请求编号再次提交；rejected：服务端明确拒绝。 */
  state: "sending" | "uncertain" | "rejected";
  error: string;
  /** 被拒绝的原因是图片资源已清理（404），重新编辑时需重新上传。 */
  isExpired?: boolean;
  createdAt: string;
}

export interface PendingImage {
  clientRequestId: string;
  mediaAssetId: string;
  name: string;
  mimeType: string | null;
  /** 仅供待发送气泡展示。 */
  thumbnailUrl: string | null;
  file?: File;
}

/** 本地发送记录对应的全部请求编号；批量整组同一事务入队，任一编号入库即整组已确认。 */
export function pendingRequestIds(item: PendingMessage): string[] {
  if (!item.batch) return [item.clientRequestId];
  const ids = item.batch.images.map((image) => image.clientRequestId);
  return item.batch.textRequestId ? [...ids, item.batch.textRequestId] : ids;
}

export function messageReply(message: WhatsappMessage): WhatsappReply | undefined {
  const value = message.attachment?.replyTo;
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const reply = value as Record<string, unknown>;
  if (typeof reply.id !== "string" || typeof reply.text !== "string" || typeof reply.kind !== "string" ||
    (reply.direction !== "inbound" && reply.direction !== "outbound") ||
    (reply.source !== "customer" && reply.source !== "mobile" && reply.source !== "system")) return undefined;
  const result: WhatsappReply = { id: reply.id, text: reply.text, kind: reply.kind, direction: reply.direction, source: reply.source };
  if (reply.kind === "image") result.thumbnailUrl = typeof reply.thumbnailUrl === "string" ? reply.thumbnailUrl : null;
  return result;
}

/**
 * 编辑区引用预览：图片取被引用原消息已归档的缩略图，不使用原图或供应商旧链接。
 *
 * @param message - 被引用的原消息。
 * @returns 引用快照。
 */
export function replyFromMessage(message: WhatsappMessage): WhatsappReply {
  const reply: WhatsappReply = {
    id: message.id,
    text: (message.presentation?.text ?? message.text).slice(0, 280),
    kind: message.kind,
    direction: message.direction,
    source: message.source,
  };
  if (message.kind === "image") {
    const media = messageMedia(message);
    reply.thumbnailUrl = media?.state === "ready" && media.previewable ? media.thumbnailUrl : null;
  }
  return reply;
}

/** 消息序号可能超出 Number 安全范围，统一按 BigInt 比较。 */
export function compareSeq(a: string, b: string): number {
  const left = BigInt(a);
  const right = BigInt(b);
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

export function maxSeq(messages: WhatsappMessage[]): string | null {
  let result: string | null = null;
  for (const message of messages) {
    if (result === null || compareSeq(message.seq, result) > 0) result = message.seq;
  }
  return result;
}

export function minSeq(messages: WhatsappMessage[]): string | null {
  let result: string | null = null;
  for (const message of messages) {
    if (result === null || compareSeq(message.seq, result) < 0) result = message.seq;
  }
  return result;
}

export function sortMessages(messages: WhatsappMessage[]): WhatsappMessage[] {
  return [...messages].sort((a, b) => {
    const timeDifference = Date.parse(a.occurredAt) - Date.parse(b.occurredAt);
    return timeDifference || compareSeq(a.seq, b.seq);
  });
}

/**
 * 用重新获取的最新页替换覆盖区间内的旧行，同步回执状态并移除服务端已合并的镜像行。
 *
 * @param current - 当前已展示的消息。
 * @param page - 最新页（seq 倒序或任意顺序）。
 * @param isComplete - 最新页已包含会话全部消息时，所有缺失的旧行都应移除。
 * @returns 按消息发生时间排列的合并结果，增量游标仍使用 seq。
 */
export function mergeLatestPage(current: WhatsappMessage[], page: WhatsappMessage[], isComplete: boolean): WhatsappMessage[] {
  const floor = minSeq(page);
  const ids = new Set(page.map((message) => message.id));
  const kept = current.filter((message) => {
    if (ids.has(message.id)) return false;
    if (isComplete) return false;
    // 最新页覆盖区间内消失的行已被服务端合并（如手机镜像临时行），不再保留。
    return floor !== null && compareSeq(message.seq, floor) < 0;
  });
  return sortMessages([...kept, ...page]);
}

/** 追加历史页或新增行，按消息 ID 去重，以新返回的行为准。 */
export function mergeMessages(current: WhatsappMessage[], incoming: WhatsappMessage[]): WhatsappMessage[] {
  const byId = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) byId.set(message.id, message);
  return sortMessages([...byId.values()]);
}

/** 已有服务端消息对应的本地发送记录可以移除。 */
export function settlePending(pending: PendingMessage[], messages: WhatsappMessage[]): PendingMessage[] {
  const confirmed = new Set(messages.map((message) => message.clientRequestId).filter(Boolean));
  return pending.filter((item) => !pendingRequestIds(item).some((id) => confirmed.has(id)));
}

/**
 * 判断发送请求的结果是否不明：网络中断、超时或服务端 5xx 都可能已经入队。
 *
 * @param cause - 请求抛出的错误。
 * @returns 为 true 时只能用同一请求编号再次提交，不能换新编号重发。
 */
export function isUncertainSendError(cause: unknown): boolean {
  if (!(cause instanceof ApiError)) return true;
  if (cause.code === ApiErrorCode.NETWORK_ERROR || cause.code === ApiErrorCode.REQUEST_TIMEOUT) return true;
  return cause.status === undefined || cause.status >= 500;
}

export type ReplyWindowState = { kind: "none" } | { kind: "expired" } | { kind: "open"; remainingMs: number };

export function replyWindowState(expiresAt: string | null, now = Date.now()): ReplyWindowState {
  if (!expiresAt) return { kind: "none" };
  const remainingMs = new Date(expiresAt).getTime() - now;
  return remainingMs > 0 ? { kind: "open", remainingMs } : { kind: "expired" };
}

export const MESSAGE_STATUS_TAG_TYPES: Record<WhatsappMessageStatus, "info" | "primary" | "success" | "warning" | "danger"> = {
  received: "info",
  queued: "info",
  sending: "info",
  accepted: "primary",
  sent: "primary",
  delivered: "success",
  read: "success",
  failed: "danger",
  unknown: "warning",
};

export const STATE_TAG_TYPES: Record<WhatsappConversationState, "success" | "info" | "warning"> = {
  open: "success",
  closed: "info",
  archived: "warning",
};

/**
 * 消息来源文案：手机端只标“手机端发送”，不推断具体员工；系统发送有操作人时附上姓名。
 *
 * @param message - 消息。
 * @param t - 翻译函数。
 * @returns 已翻译的来源文案。
 */
export function messageSourceLabel(message: WhatsappMessage, t: (key: string, values?: Record<string, unknown>) => string): string {
  if (message.source === "mobile") return t("whatsapp.sources.mobile");
  if (message.source === "customer") return t("whatsapp.sources.customer");
  return message.actorName ? t("whatsapp.systemBy", { name: message.actorName }) : t("whatsapp.sources.system");
}

/** 只有明确失败、尚未重试过的系统消息可人工重试；unknown 等待回执核实，不提供重发。 */
export function canRetryMessage(message: WhatsappMessage, retriedIds: Set<string | null>, canReply: boolean): boolean {
  return message.status === "failed" && message.source === "system" && canReply && !retriedIds.has(message.id);
}

const CONFIRM_FAILED_WAIT_MS = 10 * 60_000;

/** 结果待核实满 10 分钟仍无回执的系统消息，可由主管人工确认未送达；等待时间以服务端校验为准。 */
export function canConfirmFailedMessage(message: WhatsappMessage, canConfirm: boolean, now: number): boolean {
  return canConfirm && message.status === "unknown" && message.source === "system" &&
    now - Date.parse(message.updatedAt) >= CONFIRM_FAILED_WAIT_MS;
}

/**
 * 会话输入区与历史导航：归档咨询始终只读，并指向当前咨询；能否回复以服务端能力为准。
 *
 * @param detail - 会话详情。
 * @returns 是否只读、是否可输入及“查看新咨询”目标。
 */
export function threadAccess(detail: Pick<WhatsappConversationDetail, "id" | "state" | "currentConversationId" | "capabilities">) {
  const isReadOnly = detail.state === "archived";
  return {
    isReadOnly,
    canCompose: !isReadOnly && detail.capabilities.canReply,
    currentConversationId: isReadOnly && detail.currentConversationId !== detail.id ? detail.currentConversationId : null,
  };
}

/** 附件只展示元数据中的名称、类型和大小，不渲染其中任何内容。 */
export function attachmentSummary(attachment: Record<string, unknown> | null): string[] {
  if (!attachment) return [];
  const pick = (...keys: string[]) => {
    for (const key of keys) {
      const value = attachment[key];
      if (typeof value === "string" || typeof value === "number") return String(value);
    }
    return "";
  };
  return [pick("fileName", "filename", "name", "caption"), pick("mimeType", "mime_type", "type"), pick("fileSize", "size")]
    .filter(Boolean);
}

/** 图片/贴纸消息展示归档媒体；表情回应和 Unicode 表情不属于贴纸。 */
export function isMediaMessage(message: Pick<WhatsappMessage, "kind" | "presentation">): boolean {
  return (message.kind === "image" || message.kind === "sticker") && !message.presentation?.interaction;
}

/**
 * 读取消息附件中的归档资源；只接受合同字段齐全的记录，不回退到供应商旧签名地址。
 *
 * @param message - 消息。
 * @returns 归档资源；尚未发现记录时为 undefined。
 */
export function messageMedia(message: Pick<WhatsappMessage, "attachment">): OssResource | undefined {
  const value = message.attachment?.media;
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const media = value as Partial<OssResource>;
  if (typeof media.id !== "string" || typeof media.state !== "string" || typeof media.kind !== "string") return undefined;
  return media as OssResource;
}

/** 归档仍在进行，完成后需要重取该消息所在页。 */
export function hasPendingMedia(message: WhatsappMessage): boolean {
  const state = messageMedia(message)?.state;
  return isMediaMessage(message) && (state === "pending" || state === "processing");
}

/** Merge newly loaded interactions into older bubbles without changing sequence cursors. */
export function threadMessages(messages: WhatsappMessage[]): WhatsappMessage[] {
  const items = sortMessages(messages).map((message) => ({
    ...message,
    presentation: message.presentation ? { ...message.presentation, reactions: [...message.presentation.reactions] } : undefined,
  }));
  const byId = new Map(items.map((message) => [message.id, message]));
  for (const message of items) {
    const change = message.presentation;
    const target = change?.targetMessageId ? byId.get(change.targetMessageId) : undefined;
    if (!change || !target?.presentation) continue;
    if (["failed", "unknown"].includes(message.status)) {
      target.presentation.reactions = target.presentation.reactions.filter((item) => item.id !== message.id);
      continue;
    }
    if (change.interaction === "edit" && (!target.presentation.editedAt || message.occurredAt >= target.presentation.editedAt)) {
      target.presentation.text = change.text;
      target.presentation.editedAt = message.occurredAt;
    }
    if (change.interaction === "reaction") {
      const previous = target.presentation.reactions.find((item) => item.direction === message.direction);
      if (previous && compareSeq(previous.seq, message.seq) > 0) continue;
      target.presentation.reactions = target.presentation.reactions.filter((item) => item.direction !== message.direction);
      if (change.emoji !== "") target.presentation.reactions.push({
        id: message.id, seq: message.seq, direction: message.direction, emoji: change.emoji, source: message.source, status: message.status,
      });
    }
  }
  return items.filter((message) => !message.presentation?.hidden ||
    !message.presentation.targetMessageId || !byId.has(message.presentation.targetMessageId));
}

/** 地址中需要定位的会话；同页已选中或非本工作台路由时返回空，避免选中状态回写地址后重复请求。 */
export function linkedConversationId(isOwnRoute: boolean, queryId: unknown, selectedId: string): string {
  if (!isOwnRoute || typeof queryId !== "string" || !queryId || queryId === selectedId) return "";
  return queryId;
}
