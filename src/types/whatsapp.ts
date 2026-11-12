import type { BaseQueryParams } from "@/types/common";
import type { WebsiteInquiryInput } from "@/types/website";

export type WhatsappConversationState = "open" | "closed" | "archived";
export type WhatsappConversationView = "mine" | "unassigned" | "all";
export type WhatsappMessageDirection = "inbound" | "outbound";
export type WhatsappMessageSource = "customer" | "mobile" | "system";
export type WhatsappMessageStatus =
  | "received"
  | "queued"
  | "sending"
  | "accepted"
  | "sent"
  | "delivered"
  | "read"
  | "failed"
  | "unknown";

export interface WhatsappConversationQueryParams extends BaseQueryParams {
  keyword?: string;
  view?: WhatsappConversationView;
  state?: WhatsappConversationState;
  ownerId?: string;
  /** 按当前员工内部未读筛选，字符串 true/false。 */
  unread?: "true" | "false";
}

export interface WhatsappConversationItem {
  id: string;
  accountId: string;
  contactId: string;
  ownerId: string | null;
  ownerName: string | null;
  inquiryId: string | null;
  state: WhatsappConversationState;
  version: number;
  /** 生成台账或成团后写入，永久禁止改派。 */
  assignmentLockedAt: string | null;
  previousId: string | null;
  createdAt: string;
  archivedAt: string | null;
  updatedAt: string;
  name: string;
  phone: string | null;
  bsuid: string | null;
  lastInboundAt: string | null;
  /** 当前员工未读的客户入站消息数，与客户端已读回执无关。 */
  unreadCount?: number;
  lastMessageText?: string | null;
  /** 最新消息的 occurredAt，无消息时为空。 */
  lastMessageAt?: string | null;
}

export interface WhatsappConversationTour {
  id: string;
  tourNo: string;
  title: string;
  status: string;
  conversationId: string;
}

/** 服务端展示能力；每次操作仍由后端校验。 */
export interface WhatsappConversationCapabilities {
  canReply: boolean;
  canAssign: boolean;
  canCreateInquiry: boolean;
  canStartConsultation: boolean;
  /** 当前非归档咨询的负责人、主管或特权 ROOT 具备更新权限时可改客户资料。 */
  canUpdateCustomer: boolean;
  /** 主管或特权 ROOT 可将结果待核实的系统消息人工确认为未送达。 */
  canConfirmFailed: boolean;
}

export interface WhatsappConversationDetail extends WhatsappConversationItem {
  tours: WhatsappConversationTour[];
  currentConversationId: string | null;
  ledger: { id: string; orderNo: string } | null;
  hasFormedTours: boolean;
  replyWindowExpiresAt: string | null;
  sendBlockedReason: "not_configured" | "send_disabled" | "test_recipient" | null;
  capabilities: WhatsappConversationCapabilities;
}

export interface WhatsappMessageQueryParams extends BaseQueryParams {
  beforeSeq?: string;
  afterSeq?: string;
}

export interface WhatsappMessagePresentation {
  text: string;
  editedAt: string | null;
  hidden: boolean;
  interaction: "reaction" | "edit" | null;
  targetMessageId: string | null;
  emoji: string | null;
  reactions: { id: string; seq: string; direction: "inbound" | "outbound"; emoji: string | null; source: WhatsappMessage["source"]; status: WhatsappMessageStatus }[];
}

export interface WhatsappReply {
  id: string;
  text: string;
  kind: string;
  direction: WhatsappMessageDirection;
  source: WhatsappMessageSource;
  /** 仅图片引用：目标资源可用时的缩略图，尚不可用为 null；其他引用没有该字段。 */
  thumbnailUrl?: string | null;
}

/** 多图发送请求：图片按数组顺序入队，可选文字最后独立入队；引用只挂在第一张图。 */
export interface WhatsappImageBatchInput {
  images: { clientRequestId: string; mediaAssetId: string }[];
  textMessage?: { clientRequestId: string; text: string };
  replyToMessageId?: string;
}

export interface WhatsappQuickReply {
  id: string;
  stage: string;
  scenario: string;
  content: string;
  enabled: boolean;
  sortOrder: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}
export type WhatsappQuickReplyInput = Pick<WhatsappQuickReply, "stage" | "scenario" | "content" | "enabled" | "sortOrder"> & { version?: number };
export interface WhatsappQuickReplyQuery extends BaseQueryParams {
  keyword?: string;
  stage?: string;
  scenario?: string;
  status?: "enabled" | "disabled";
}

export interface WhatsappMessage {
  id: string;
  /** 十进制字符串序号，超出 Number 安全范围，只能用 BigInt 比较。 */
  seq: string;
  accountId: string;
  conversationId: string;
  providerId: string | null;
  taskId: string | null;
  clientRequestId: string | null;
  retryOf: string | null;
  direction: WhatsappMessageDirection;
  source: WhatsappMessageSource;
  kind: string;
  text: string;
  /** 供应商附件元数据，仅展示，不下载远端资源。 */
  attachment: Record<string, unknown> | null;
  presentation?: WhatsappMessagePresentation;
  status: WhatsappMessageStatus;
  actorId: string | null;
  actorIdentityId: string | null;
  actorName?: string | null;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
  errorCode: string | null;
}

export interface WhatsappAction {
  id: string;
  actorId: string | null;
  action: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface WhatsappAssignInput {
  version: number;
  ownerId: string;
  reason?: string;
}

export interface WhatsappNewConsultationResult {
  id: string;
  previousId: string;
  state: "open";
  ownerId: null;
  /** 计调创建者无权查看新的未分配咨询。 */
  canView: boolean;
}

/** 客户资料按咨询保存；国家、天数、日期和人数未知时为 null。 */
export interface WhatsappCustomerNotes {
  conversationId: string;
  /** 当前会话版本。 */
  version: number;
  /** 有效称呼：人工称呼优先，清空后为 WhatsApp 原名。 */
  customerName: string;
  countryItemId: string | null;
  plannedDays: number | null;
  startDate: string | null;
  pax: number | null;
  contactInfo: string;
  /** 独立站启用城市 ID，有序且不重复。 */
  destinations: string[];
  /** 客户原始消息。 */
  requirements: string;
  internalRemark: string;
  /** 资料最后保存时间，未保存为 null。 */
  updatedAt: string | null;
}
export type WhatsappCustomerNotesForm = Omit<WhatsappCustomerNotes, "conversationId" | "version" | "updatedAt">;
/** 全量保存请求体。 */
export type WhatsappCustomerNotesInput = WhatsappCustomerNotesForm & { version: number };

export type WhatsappInquiryPrefillInput = Pick<
  WebsiteInquiryInput,
  | "customerName"
  | "contactInfo"
  | "contactChannel"
  | "receivedAt"
  | "requirements"
  | "whatsappSourceId"
  | "websiteInquiryNo"
  | "landingPage"
  | "acquisitionSource"
  | "startDate"
  | "pax"
  | "destinations"
  | "internalRemark"
> & {
  /** 已保存的客户资料；未填时为 null，由建询盘必填校验处理。 */
  countryItemId: string | null;
  plannedDays: number | null;
};

export interface WhatsappInquiryPrefill {
  version: number;
  inquiryId: string | null;
  ownerId: string | null;
  input: WhatsappInquiryPrefillInput;
  requiredFields: string[];
}

/** 会话建询盘请求体：负责人、状态、流失原因和业务由服务端决定。 */
export type WhatsappInquiryInput = Omit<WebsiteInquiryInput, "ownerId" | "status" | "lostReason" | "businessUnit"> & {
  version: number;
};

export interface WhatsappInquiryResult {
  inquiryId: string;
  /** false 表示会话已有关联询盘，同样视为成功。 */
  created: boolean;
}

export interface WhatsappWorkerStatus {
  state: "disabled" | "starting" | "running" | "stalled" | "error" | "stopped";
  lastStartedAt: string | null;
  lastCompletedAt: string | null;
  lastErrorAt: string | null;
}

export interface WhatsappIntegrationStatus {
  enabled: boolean;
  workerEnabled: boolean;
  worker: { scope: "current_process"; events: WhatsappWorkerStatus; outbound: WhatsappWorkerStatus };
  outbound: { queued: number; sending: number; unknown: number; failed: number; oldestPendingAt: string | null };
  receiveMode: "disabled" | "queue" | "http";
  sendEnabled: boolean;
  lastReceivedAt: string | null;
  lastProcessedAt: string | null;
  pending: number;
  failed: number;
}

export interface WhatsappFailedEvent {
  id: string;
  kind: string;
  attempts: number;
  errorCode: string | null;
  receivedAt: string;
}

export interface WhatsappSummary {
  unreadCount: number;
  /** null 表示当前身份不可查看未分配计数。 */
  unassignedCount: number | null;
}

/** conversation.changed 的原因枚举，不含消息、负责人或客户字段。 */
export type WhatsappChangeReason = "message" | "status" | "state" | "assign" | "notes" | "inquiry" | "read" | "consultation";

/**
 * 实时流交给工作台与角标的刷新信号：sync 为 ready/resync 或兜底轮询的全量校准；
 * 其余对应服务端失效事件。连接控制事件由流管理器自行处理。
 */
export type WhatsappStreamSignal =
  | { type: "sync" }
  | { type: "conversation"; conversationId: string; reasons: WhatsappChangeReason[] }
  | { type: "summary" }
  | { type: "access" };

/** disabled 表示当前环境未启用流，只低频轮询；fallback 为断流后的轮询兜底与退避重连。 */
export type WhatsappStreamStatus = "stopped" | "disabled" | "connecting" | "live" | "fallback" | "limited" | "forbidden";
