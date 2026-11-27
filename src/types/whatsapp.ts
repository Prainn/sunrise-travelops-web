import type { BaseQueryParams } from "@/types/common";
import type { IntegrationActivity, IntegrationRuntime } from "@/types/integration";
import type { InboxCustomerNotes, WebsiteInquiryInput } from "@/types/website";

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
  title: string;
  phone: string | null;
  bsuid: string | null;
  lastInboundAt: string | null;
  /** 按会话共享阅读位置统计的客户入站未读数。 */
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

export interface WhatsappCustomerNotes extends InboxCustomerNotes {
  title: string;
}

/** 服务端展示能力；每次操作仍由后端校验。 */
export interface WhatsappConversationCapabilities {
  canReply: boolean;
  canAssign: boolean;
  canCreateInquiry: boolean;
  canCreateLedger: boolean;
  canStartConsultation: boolean;
  /** 当前非归档咨询的负责人、主管或特权 ROOT 具备更新权限时可改客户资料。 */
  canUpdateCustomer: boolean;
  /** 主管或特权 ROOT 可将结果待核实的系统消息人工确认为未送达。 */
  canConfirmFailed: boolean;
  /** 文档存储启用且可普通回复时为 true；旧服务端缺少该字段按不可用处理。 */
  canSendDocuments?: boolean;
}

export interface WhatsappConversationDetail extends WhatsappConversationItem {
  unreadCount: number;
  tours: WhatsappConversationTour[];
  currentConversationId: string | null;
  ledger: { id: string; orderNo: string } | null;
  hasFormedTours: boolean;
  replyWindowExpiresAt: string | null;
  sendBlockedReason: "not_configured" | "send_disabled" | "send_paused" | "test_recipient" | null;
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

/** 已上传未发送的文档草稿；未被消息认领满 24 小时由服务端清理。 */
export interface WhatsappDocumentUpload {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  expiresAt: string;
}

/** 文档消息附件中的文件元数据（工作台出站或已归档的客户入站），不含下载地址。 */
export type WhatsappDocumentMeta = Pick<WhatsappDocumentUpload, "id" | "fileName" | "mimeType" | "sizeBytes">;

/** 客户入站文档的私有 OSS 归档状态；available 时附件同时含 document，skipped 为不归档的非 PDF/Word 文件。 */
export type WhatsappDocumentArchiveState = "pending" | "processing" | "available" | "failed" | "skipped";

/** 文档发送请求：先入队文档，有正文时再入队独立文字；两条请求编号必须不同。 */
export interface WhatsappDocumentMessageInput {
  documentId: string;
  clientRequestId: string;
  textMessage?: { clientRequestId: string; text: string };
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

export interface WhatsappIntegrationStatus {
  enabled: boolean;
  workerEnabled: boolean;
  worker: { scope: "current_process"; events: IntegrationActivity; outbound: IntegrationActivity };
  outbound: { queued: number; sending: number; unknown: number; failed: number; oldestPendingAt: string | null };
  receiveMode: "disabled" | "queue" | "http";
  sendEnabled: boolean;
  lastReceivedAt: string | null;
  lastProcessedAt: string | null;
  pending: number;
  failed: number;
  /** 当前 API 对应环境的入站/出站开关；旧服务端可能缺失。 */
  runtime?: IntegrationRuntime;
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
