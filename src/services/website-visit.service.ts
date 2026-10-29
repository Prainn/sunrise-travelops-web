import { LONG_REQUEST_TIMEOUT_MS, request } from "@/api/request";
import type { PageResult } from "@/types/common";
import type { WebsiteInquiry, WebsiteInquiryInput } from "@/types/website";
import type { WebsiteVisit, WebsiteVisitQuery } from "@/types/website-visit";
import { websiteInquiryInput } from "./website.service";

const base = "/ledgers/website-visits";
export const websiteVisitService = {
  list(query: WebsiteVisitQuery) {
    return request.get<PageResult<WebsiteVisit>>(base, { params: { ...query } });
  },
  draft(id: string) {
    return request.get<Partial<WebsiteInquiryInput>>(`${base}/${encodeURIComponent(id)}/inquiry-draft`);
  },
  createInquiry(id: string, input: WebsiteInquiryInput) {
    return request.post<WebsiteInquiry>(`${base}/${encodeURIComponent(id)}/inquiry`, websiteInquiryInput(input));
  },
  export(query: { start: string; end: string; keyword?: string }) {
    return request.getBlob(`${base}/export`, { params: { ...query }, timeoutMs: LONG_REQUEST_TIMEOUT_MS });
  },
};
