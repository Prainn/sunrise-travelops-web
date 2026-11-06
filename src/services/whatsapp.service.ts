import { request } from "@/api/request";
import type { PageResult } from "@/types/common";
import type { WebsiteInquiryInput } from "@/types/website";
import type {
  WhatsappAction,
  WhatsappAssignInput,
  WhatsappConversationDetail,
  WhatsappConversationItem,
  WhatsappConversationQueryParams,
  WhatsappFailedEvent,
  WhatsappInquiryInput,
  WhatsappInquiryPrefill,
  WhatsappInquiryResult,
  WhatsappIntegrationStatus,
  WhatsappMessage,
  WhatsappMessageQueryParams,
  WhatsappNewConsultationResult,
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
    pax: input.pax,
    destinations: [...input.destinations],
    internalRemark: input.internalRemark,
    version,
  };
}

export const whatsappService = {
  conversations(query: WhatsappConversationQueryParams) {
    return request.get<PageResult<WhatsappConversationItem>>(`${BASE_URL}/conversations`, { params: { ...query } });
  },
  conversation(id: string) {
    return request.get<WhatsappConversationDetail>(conversationUrl(id));
  },
  /** 默认最新页按 seq 倒序；afterSeq 升序，只返回新增行。 */
  messages(id: string, query: WhatsappMessageQueryParams) {
    return request.get<PageResult<WhatsappMessage>>(`${conversationUrl(id)}/messages`, { params: { ...query } });
  },
  actions(id: string, query: { page: number; pageSize: number }) {
    return request.get<PageResult<WhatsappAction>>(`${conversationUrl(id)}/actions`, { params: { ...query } });
  },
  owners() {
    return request.get<WebsiteOwnerOption[]>(`${BASE_URL}/owners`);
  },
  assign(id: string, input: WhatsappAssignInput) {
    return request.post<WhatsappConversationItem>(`${conversationUrl(id)}/assign`, input);
  },
  setState(id: string, version: number, state: "open" | "closed") {
    return request.post<WhatsappConversationItem>(`${conversationUrl(id)}/state`, { version, state });
  },
  startConsultation(id: string, version: number) {
    return request.post<WhatsappNewConsultationResult>(`${conversationUrl(id)}/new-consultation`, { version });
  },
  markRead(id: string, lastSeq: string) {
    return request.post<{ lastSeq: string }>(`${conversationUrl(id)}/read`, { lastSeq });
  },
  inquiryPrefill(id: string) {
    return request.get<WhatsappInquiryPrefill>(`${conversationUrl(id)}/inquiry-prefill`);
  },
  createInquiry(id: string, input: WebsiteInquiryInput, version: number) {
    return request.post<WhatsappInquiryResult>(`${conversationUrl(id)}/inquiry`, whatsappInquiryInput(input, version));
  },
  /** clientRequestId 由调用方生成；结果不明时须以同一 ID 重新提交。 */
  sendText(id: string, clientRequestId: string, text: string) {
    return request.post<WhatsappMessage>(`${conversationUrl(id)}/messages`, { clientRequestId, text });
  },
  retryMessage(id: string, messageId: string, clientRequestId: string) {
    return request.post<WhatsappMessage>(
      `${conversationUrl(id)}/messages/${encodeURIComponent(messageId)}/retry`,
      { clientRequestId },
    );
  },
  integration() {
    return request.get<WhatsappIntegrationStatus>(`${BASE_URL}/integration`);
  },
  failedEvents(query: { page: number; pageSize: number }) {
    return request.get<PageResult<WhatsappFailedEvent>>(`${BASE_URL}/integration/failed-events`, { params: { ...query } });
  },
  retryEvent(id: string) {
    return request.post<{ id: string }>(`${BASE_URL}/integration/events/${encodeURIComponent(id)}/retry`);
  },
};
