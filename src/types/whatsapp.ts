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
}

export interface WhatsappConversationDetail extends WhatsappConversationItem {
  tours: WhatsappConversationTour[];
  currentConversationId: string | null;
  ledger: { id: string; orderNo: string } | null;
  hasFormedTours: boolean;
  replyWindowExpiresAt: string | null;
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
  reason: string;
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
>;

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
