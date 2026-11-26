import { LONG_REQUEST_TIMEOUT_MS, request } from "@/api/request";
import type { PageResult } from "@/types/common";
import type { MailboxOptions, MailDetail, MailDraftInput, MailMessage, MailThread, MailView } from "@/types/mail";
import type { InboxCustomerNotes, InboxCustomerNotesInput, WebsiteInquiryInput } from "@/types/website";
import type { WebsiteOwnerOption } from "./website.service";
import { whatsappInquiryInput } from "./whatsapp.service";

const threadUrl = (id: string) => `/mail/threads/${encodeURIComponent(id)}`;
const draftUrl = (id: string, draft: string) => `${threadUrl(id)}/drafts/${encodeURIComponent(draft)}`;
const action = { userAction: true };
export const mailService = {
  summary() { return request.get<{ unreadCount: number }>("/mail/summary"); },
  mailboxes() { return request.get<MailboxOptions>("/mail/mailboxes"); },
  list(query: { page: number; pageSize: number; keyword?: string; view?: MailView; mailbox?: string }) {
    return request.get<PageResult<MailThread>>("/mail/threads", { params: query });
  },
  detail(id: string) { return request.get<MailDetail>(threadUrl(id)); },
  read(id: string, messageIds: string[]) { return request.post(`${threadUrl(id)}/read`, { messageIds }, action); },
  owners() { return request.get<WebsiteOwnerOption[]>("/mail/owners"); },
  assign(id: string, input: { version: number; ownerId: string; reason: string }) {
    return request.post<MailThread>(`${threadUrl(id)}/assign`, input, action);
  },
  customerNotes(id: string, source: string) {
    return request.get<InboxCustomerNotes>(`${threadUrl(id)}/messages/${encodeURIComponent(source)}/customer-notes`, { cache: "no-store" });
  },
  saveCustomerNotes(id: string, source: string, notes: InboxCustomerNotesInput) {
    const { version, customerName, countryItemId, plannedDays, startDate, pax, destinations, requirements, internalRemark } = notes;
    const input = { version, customerName, countryItemId, plannedDays, startDate, pax, destinations, requirements, internalRemark };
    return request.put<InboxCustomerNotes>(`${threadUrl(id)}/messages/${encodeURIComponent(source)}/customer-notes`, input, action);
  },
  inquiry(id: string, source: string, input: WebsiteInquiryInput, version: number) {
    return request.post<{ inquiryId: string; created: boolean }>(
      `${threadUrl(id)}/messages/${encodeURIComponent(source)}/inquiry`, whatsappInquiryInput(input, version), action,
    );
  },
  openDraft(id: string, source: string) {
    return request.post<MailMessage>(`${threadUrl(id)}/messages/${encodeURIComponent(source)}/reply`, undefined, action);
  },
  save(id: string, draft: string, input: MailDraftInput) {
    return request.put<MailMessage>(draftUrl(id, draft), input, action);
  },
  attach(id: string, draft: string, file: File) {
    const data = new FormData();
    data.append("file", file, file.name);
    return request.post<MailMessage>(`${draftUrl(id, draft)}/attachments`, data, { ...action, timeoutMs: LONG_REQUEST_TIMEOUT_MS });
  },
  remove(id: string, draft: string, file: string) {
    return request.delete<MailMessage>(`${draftUrl(id, draft)}/attachments/${encodeURIComponent(file)}`, action);
  },
  send(id: string, draft: string, version: number) {
    return request.post<MailMessage>(`${draftUrl(id, draft)}/send`, { version }, { ...action, timeoutMs: LONG_REQUEST_TIMEOUT_MS });
  },
  download(id: string, file: string) {
    return request.get<{ url: string }>(`${threadUrl(id)}/attachments/${encodeURIComponent(file)}/download`, action);
  },
};
