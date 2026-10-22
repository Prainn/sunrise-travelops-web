import { ApiError, request } from "@/api/request";
import type { PageResult } from "@/types/common";
import type {
  WebsiteBusinessUnit,
  WebsiteConfig,
  WebsiteInquiry,
  WebsiteInquiryInput,
  WebsiteInquiryLog,
  WebsiteInquiryLogOperator,
  WebsiteInquiryLogReport,
  WebsiteItinerary,
  WebsiteItineraryInput,
  WebsitePreview,
  WebsiteQuotation,
} from "@/types/website";

export function websiteErrorMessage(cause: unknown): string {
  return cause instanceof ApiError && cause.serverMessage
    ? cause.serverMessage
    : cause instanceof Error
      ? cause.message
      : String(cause);
}

export interface WebsiteOwnerOption {
  id: string;
  name: string;
  username: string;
}
export interface WebsiteResourceOption {
  id: string;
  name: string;
  city?: string;
  seats?: number;
}
export type WebsiteResourceKind = "city" | "attraction" | "hotel" | "restaurant" | "transport";
/** 公共资源详情：按公共资源 UUID 精确读取，含已停用主体，供已有引用核对。 */
export interface WebsiteResourceDetail {
  id: string;
  name: string;
  status: "enabled" | "disabled";
  /** hotel/restaurant 所在城市名称，attraction 为 area；可能为空 */
  city?: string | null;
  seats?: number;
}
/** 公共资源查询；city 为公共城市名称，只适用于 hotel / restaurant / attraction。 */
export interface WebsiteResourceQuery {
  page: number;
  pageSize: number;
  keyword?: string;
  city?: string;
}
export interface WebsiteInquiryQuery {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: WebsiteInquiry["status"] | "";
  ownerId?: string;
  businessUnit?: WebsiteBusinessUnit;
}

/** 独立站询盘汇总查询；可选条件为空时由页面省略，不接受 keyword。 */
export interface WebsiteInquiryLogQuery {
  page: number;
  pageSize: number;
  businessUnit?: WebsiteBusinessUnit;
  inquiryId?: string;
  inquiryCode?: string;
  operatorId?: string;
  action?: string;
  from?: string;
  to?: string;
}

export function websiteInquiryInput(record: WebsiteInquiryInput): WebsiteInquiryInput {
  return {
    businessUnit: record.businessUnit,
    countryItemId: record.countryItemId,
    customerName: record.customerName,
    plannedDays: record.plannedDays,
    requirements: record.requirements,
    ownerId: record.ownerId,
    contactInfo: record.contactInfo,
    receivedAt: record.receivedAt,
    contactChannel: record.contactChannel,
    whatsappSourceId: record.whatsappSourceId,
    websiteInquiryNo: record.websiteInquiryNo,
    landingPage: record.landingPage,
    acquisitionSource: record.acquisitionSource,
    startDate: record.startDate,
    pax: record.pax,
    destinations: [...record.destinations],
    internalRemark: record.internalRemark,
    status: record.status,
    lostReason: record.lostReason,
  };
}

export function websiteItineraryInput(record: WebsiteItineraryInput): WebsiteItineraryInput {
  return {
    title: record.title,
    duration: record.duration,
    startDate: record.startDate,
    pax: record.pax,
    arrivalTime: record.arrivalTime,
    departureTime: record.departureTime,
    configVersion: record.configVersion,
    days: record.days,
    deletedDays: record.deletedDays ?? [],
    vehiclePrices: record.vehiclePrices,
  };
}

export const websiteService = {
  inquiries(query: WebsiteInquiryQuery) {
    return request.get<PageResult<WebsiteInquiry>>("/website/inquiries", { params: { ...query } });
  },
  inquiry(id: string) {
    return request.get<WebsiteInquiry>(`/website/inquiries/${encodeURIComponent(id)}`);
  },
  createInquiry(input: WebsiteInquiryInput) {
    return request.post<WebsiteInquiry>("/website/inquiries", websiteInquiryInput(input));
  },
  updateInquiry(id: string, input: WebsiteInquiryInput, version: number) {
    return request.put<WebsiteInquiry>(`/website/inquiries/${encodeURIComponent(id)}`, {
      ...websiteInquiryInput(input),
      ownerId: undefined,
      businessUnit: undefined,
      version,
    });
  },
  owners(businessUnit?: WebsiteBusinessUnit) {
    return request.get<WebsiteOwnerOption[]>("/website/owners", {params: {businessUnit}});
  },
  transfer(id: string, version: number, ownerId: string, reason: string) {
    return request.post<WebsiteInquiry>(`/website/inquiries/${encodeURIComponent(id)}/transfer`, {
      version,
      ownerId,
      reason,
    });
  },
  archive(id: string, version: number) {
    return request.post<WebsiteInquiry>(`/website/inquiries/${encodeURIComponent(id)}/archive`, {
      version,
    });
  },
  inquiryLogs(query: WebsiteInquiryLogQuery) {
    return request.get<PageResult<WebsiteInquiryLog>>("/website/inquiry-logs", {
      params: { ...query },
    });
  },
  inquiryLogReport(query: WebsiteInquiryLogQuery) {
    return request.get<WebsiteInquiryLogReport>("/website/inquiry-logs/report", {
      params: { ...query },
    });
  },
  inquiryLogOperators(query: WebsiteInquiryLogQuery) {
    return request.get<WebsiteInquiryLogOperator[]>("/website/inquiry-logs/operators", {
      params: { ...query, operatorId: undefined },
    });
  },
  itineraries(inquiryId: string) {
    return request.get<WebsiteItinerary[]>(
      `/website/inquiries/${encodeURIComponent(inquiryId)}/itineraries`,
    );
  },
  itinerary(id: string) {
    return request.get<WebsiteItinerary>(`/website/itineraries/${encodeURIComponent(id)}`);
  },
  createItinerary(inquiryId: string, input: WebsiteItineraryInput & { inquiryVersion: number }) {
    return request.post<WebsiteItinerary>(
      `/website/inquiries/${encodeURIComponent(inquiryId)}/itineraries`,
      input,
    );
  },
  saveItinerary(record: WebsiteItinerary) {
    return request.put<WebsiteItinerary>(`/website/itineraries/${encodeURIComponent(record.id)}`, {
      ...websiteItineraryInput(record),
      version: record.version,
    });
  },
  copyItinerary(id: string, version: number) {
    return request.post<WebsiteItinerary>(`/website/itineraries/${encodeURIComponent(id)}/copy`, {
      version,
    });
  },
  generateItinerary(id: string, version: number, skeletonId: string) {
    return request.post<WebsiteItinerary>(
      `/website/itineraries/${encodeURIComponent(id)}/generate`,
      { version, skeletonId },
    );
  },
  preview(id: string) {
    return request.get<WebsitePreview>(`/website/itineraries/${encodeURIComponent(id)}/preview`);
  },
  confirm(preview: WebsitePreview, acknowledgedWarnings: string[]) {
    return request.post<WebsiteQuotation>(
      `/website/itineraries/${encodeURIComponent(preview.itineraryId)}/confirm`,
      {
        version: preview.sourceVersion,
        inquiryVersion: preview.inquiryVersion,
        acknowledgedWarnings,
      },
    );
  },
  async recordDownload(id: string) {
    await request.post(`/website/itineraries/${encodeURIComponent(id)}/download-click`);
  },
  quotation(id: string) {
    return request.get<WebsiteQuotation>(
      `/website/itineraries/${encodeURIComponent(id)}/quotation`,
    );
  },
  config(version?: number, businessUnit?: WebsiteBusinessUnit) {
    return request.get<WebsiteConfig>("/website/config", { params: { version, businessUnit } });
  },
  saveConfig(config: WebsiteConfig, businessUnit?: WebsiteBusinessUnit) {
    return request.put<WebsiteConfig>("/website/config", config, {params: {businessUnit}});
  },
  resource(kind: WebsiteResourceKind, id: string) {
    return request.get<WebsiteResourceDetail>(`/website/resources/${kind}/${encodeURIComponent(id)}`);
  },
  resources(kind: WebsiteResourceKind, query: WebsiteResourceQuery) {
    const city = kind === "city" || kind === "transport" ? undefined : query.city?.trim();
    return request.get<PageResult<WebsiteResourceOption>>(`/website/resources/${kind}`, {
      params: {
        page: query.page,
        pageSize: query.pageSize,
        keyword: query.keyword?.trim() || undefined,
        city: city || undefined,
      },
    });
  },
};
