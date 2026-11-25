import { LONG_REQUEST_TIMEOUT_MS, request } from "@/api/request";
import { imageFormData } from "@/services/oss.service";
import type { PageResult } from "@/types/common";
import type { OssResource } from "@/types/oss";
import type { WebsiteInquiryInput } from "@/types/website";
import type {
  WhatsappSummary,
  WhatsappAction,
  WhatsappAssignInput,
  WhatsappConversationDetail,
  WhatsappConversationItem,
  WhatsappConversationQueryParams,
  WhatsappCustomerNotes,
  WhatsappCustomerNotesInput,
  WhatsappDocumentMessageInput,
  WhatsappDocumentUpload,
  WhatsappFailedEvent,
  WhatsappImageBatchInput,
  WhatsappInquiryInput,
  WhatsappInquiryPrefill,
  WhatsappInquiryResult,
  WhatsappIntegrationStatus,
  WhatsappMessage,
  WhatsappMessageQueryParams,
  WhatsappNewConsultationResult,
  WhatsappRuntime,
  WhatsappRuntimeInput,
  WhatsappQuickReply, WhatsappQuickReplyInput, WhatsappQuickReplyQuery,
} from "@/types/whatsapp";
import type { WebsiteOwnerOption } from "@/services/website.service";

const BASE_URL = "/whatsapp";
const conversationUrl = (id: string) => `${BASE_URL}/conversations/${encodeURIComponent(id)}`;

/**
 * 生成会话建询盘请求体：去掉负责人、状态、流失原因和业务，这些由会话及服务端决定。
 *
 * @param input - 询盘表单提交值。
 * @param version - 预填时读取的会话版本。
 * @returns 符合 WhatsApp 建询盘合同的请求体。
 */
export function whatsappInquiryInput(input: WebsiteInquiryInput, version: number): WhatsappInquiryInput {
  return {
    countryItemId: input.countryItemId,
    customerName: input.customerName,
    plannedDays: input.plannedDays,
    requirements: input.requirements,
    contactInfo: input.contactInfo,
    receivedAt: input.receivedAt,
    contactChannel: input.contactChannel,
    whatsappSourceId: input.whatsappSourceId,
    websiteInquiryNo: input.websiteInquiryNo,
    landingPage: input.landingPage,
    acquisitionSource: input.acquisitionSource,
    startDate: input.startDate,
    serviceDates: input.serviceDates,
    pax: input.pax,
    destinations: [...input.destinations],
    internalRemark: input.internalRemark,
    version,
  };
}

export const whatsappService = {
  summary() {
    return request.get<WhatsappSummary>(`${BASE_URL}/summary`, { cache: "no-store" });
  },
  /** 工作台失效提示流；返回原始 Response，不作 SUCCESS 解包，由流管理器解析。 */
  stream(signal: AbortSignal) {
    return request.stream(`${BASE_URL}/stream`, { signal });
  },
  managedQuickReplies(query: WhatsappQuickReplyQuery) {
    return request.get<PageResult<WhatsappQuickReply>>(`${BASE_URL}/quick-replies/manage`, { params: { ...query } });
  },
  quickReplies(query: WhatsappQuickReplyQuery) {
    return request.get<PageResult<WhatsappQuickReply>>(`${BASE_URL}/quick-replies`, { params: { ...query } });
  },
  quickReplyOptions(stage?: string) {
    return request.get<{ stages: string[]; scenarios: string[] }>(`${BASE_URL}/quick-replies/options`, { params: stage ? { stage } : {} });
  },
  quickReply(id: string) {
    return request.get<WhatsappQuickReply>(`${BASE_URL}/quick-replies/${encodeURIComponent(id)}`);
  },
  saveQuickReply(input: WhatsappQuickReplyInput, id?: string) {
    return id ? request.put<WhatsappQuickReply>(`${BASE_URL}/quick-replies/${encodeURIComponent(id)}`, input, { userAction: true })
      : request.post<WhatsappQuickReply>(`${BASE_URL}/quick-replies`, input, { userAction: true });
  },
  conversations(query: WhatsappConversationQueryParams) {
    return request.get<PageResult<WhatsappConversationItem>>(`${BASE_URL}/conversations`, { params: { ...query }, cache: "no-store" });
  },
  conversation(id: string) {
    return request.get<WhatsappConversationDetail>(conversationUrl(id), { cache: "no-store" });
  },
  /** 默认最新页按 seq 倒序；afterSeq 升序，只返回新增行。 */
  messages(id: string, query: WhatsappMessageQueryParams) {
    return request.get<PageResult<WhatsappMessage>>(`${conversationUrl(id)}/messages`, { params: { ...query }, cache: "no-store" });
  },
  actions(id: string, query: { page: number; pageSize: number }) {
    return request.get<PageResult<WhatsappAction>>(`${conversationUrl(id)}/actions`, { params: { ...query }, cache: "no-store" });
  },
  customerNotes(id: string) {
    return request.get<WhatsappCustomerNotes>(`${conversationUrl(id)}/customer-notes`, { cache: "no-store" });
  },
  /** 全量保存；version 过期返回 409，由用户刷新后再决定。 */
  saveCustomerNotes(id: string, input: WhatsappCustomerNotesInput) {
    return request.put<WhatsappCustomerNotes>(`${conversationUrl(id)}/customer-notes`, input, { userAction: true });
  },
  owners() {
    return request.get<WebsiteOwnerOption[]>(`${BASE_URL}/owners`);
  },
  assign(id: string, input: WhatsappAssignInput) {
    return request.post<WhatsappConversationItem>(`${conversationUrl(id)}/assign`, input, { userAction: true });
  },
  setState(id: string, version: number, state: "open" | "closed") {
    return request.post<WhatsappConversationItem>(`${conversationUrl(id)}/state`, { version, state }, { userAction: true });
  },
  startConsultation(id: string, version: number) {
    return request.post<WhatsappNewConsultationResult>(`${conversationUrl(id)}/new-consultation`, { version }, { userAction: true });
  },
  markRead(id: string, lastSeq: string) {
    return request.post<{ lastSeq: string }>(`${conversationUrl(id)}/read`, { lastSeq });
  },
  inquiryPrefill(id: string) {
    return request.get<WhatsappInquiryPrefill>(`${conversationUrl(id)}/inquiry-prefill`);
  },
  createInquiry(id: string, input: WebsiteInquiryInput, version: number) {
    return request.post<WhatsappInquiryResult>(`${conversationUrl(id)}/inquiry`, whatsappInquiryInput(input, version), { userAction: true });
  },
  /** clientRequestId 由调用方生成；结果不明时须以同一 ID 重新提交。 */
  sendText(id: string, clientRequestId: string, text: string, replyToMessageId?: string) {
    return request.post<WhatsappMessage>(`${conversationUrl(id)}/messages`, { clientRequestId, text, ...(replyToMessageId ? { replyToMessageId } : {}) }, { userAction: true });
  },
  /** 只上传图片生成草稿资源，不发送；无幂等键，失败由用户手动重试。 */
  uploadImage(id: string, file: File) {
    return request.post<OssResource>(`${conversationUrl(id)}/images`, imageFormData(file), { userAction: true, timeoutMs: LONG_REQUEST_TIMEOUT_MS });
  },
  /** 整组同一事务入队；结果不明时须原样重用全部编号、顺序、图片、文字和引用重新提交。 */
  sendImageBatch(id: string, input: WhatsappImageBatchInput) {
    return request.post<{ messages: WhatsappMessage[] }>(`${conversationUrl(id)}/image-message-batches`, input, { userAction: true });
  },
  /** 只上传文档草稿，不发送；FormData 仅含 file，由浏览器生成 multipart 边界。 */
  uploadDocument(id: string, file: File) {
    const form = new FormData();
    form.append("file", file, file.name);
    return request.post<WhatsappDocumentUpload>(`${conversationUrl(id)}/documents`, form, { userAction: true, timeoutMs: LONG_REQUEST_TIMEOUT_MS });
  },
  /** 文档与可选文字同事务入队；结果不明时须原样重用两个编号重新提交。 */
  sendDocument(id: string, input: WhatsappDocumentMessageInput) {
    return request.post<{ messages: WhatsappMessage[] }>(`${conversationUrl(id)}/document-messages`, input, { userAction: true });
  },
  /** 60 秒有效的下载地址；每次点击重新获取，不缓存或展示。 */
  documentDownload(id: string, messageId: string) {
    return request.get<{ url: string }>(`${conversationUrl(id)}/messages/${encodeURIComponent(messageId)}/document-download`, { userAction: true });
  },
  /** 预览用文件内容（仅 PDF/DOCX），由后端从私有 OSS 读取后直接返回；关闭预览时通过 signal 取消。 */
  documentPreview(id: string, messageId: string, signal?: AbortSignal) {
    return request.getBlob(`${conversationUrl(id)}/messages/${encodeURIComponent(messageId)}/document-preview`, { timeoutMs: LONG_REQUEST_TIMEOUT_MS, signal });
  },
  sendReaction(id: string, messageId: string, clientRequestId: string, emoji: string) {
    return request.post<WhatsappMessage>(`${conversationUrl(id)}/messages/${encodeURIComponent(messageId)}/reactions`, { clientRequestId, emoji }, { userAction: true });
  },
  retryMessage(id: string, messageId: string, clientRequestId: string) {
    return request.post<WhatsappMessage>(
      `${conversationUrl(id)}/messages/${encodeURIComponent(messageId)}/retry`,
      { clientRequestId }, { userAction: true },
    );
  },
  /** 主管人工确认结果待核实的消息未送达，消息转为失败后可按失败消息重试。 */
  confirmFailed(id: string, messageId: string) {
    return request.post<{ id: string; status: "failed"; errorCode: string }>(
      `${conversationUrl(id)}/messages/${encodeURIComponent(messageId)}/confirm-failed`, undefined, { userAction: true },
    );
  },
  integration() {
    return request.get<WhatsappIntegrationStatus>(`${BASE_URL}/integration`);
  },
  /** 只更新指定开关；版本过期返回 409。 */
  updateRuntime(input: WhatsappRuntimeInput) {
    return request.put<WhatsappRuntime>(`${BASE_URL}/integration/runtime`, input, { userAction: true });
  },
  failedEvents(query: { page: number; pageSize: number }) {
    return request.get<PageResult<WhatsappFailedEvent>>(`${BASE_URL}/integration/failed-events`, { params: { ...query } });
  },
  retryEvent(id: string) {
    return request.post<{ id: string }>(`${BASE_URL}/integration/events/${encodeURIComponent(id)}/retry`, undefined, { userAction: true });
  },
};
