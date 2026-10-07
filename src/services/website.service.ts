import { ApiError, request } from "@/api/request";
import type { PageResult } from "@/types/common";
import type {
  WebsiteConfig,
  WebsiteInquiry,
  WebsiteInquiryInput,
  WebsiteItinerary,
  WebsiteItineraryInput,
  WebsiteLog,
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
export interface WebsiteInquiryQuery {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: WebsiteInquiry["status"] | "";
  ownerId?: string;
}

export function websiteInquiryInput(record: WebsiteInquiryInput): WebsiteInquiryInput {
  return {
    customerName: record.customerName,
    plannedDays: record.plannedDays,
    requirements: record.requirements,
    ownerId: record.ownerId,
    phone: record.phone,
    email: record.email,
    startDate: record.startDate,
    pax: record.pax,
    arrivalTime: record.arrivalTime,
    departureTime: record.departureTime,
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
      version,
    });
  },
  owners() {
    return request.get<WebsiteOwnerOption[]>("/website/owners");
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
  logs(id: string, page: number, pageSize: number) {
    return request.get<PageResult<WebsiteLog>>(
      `/website/inquiries/${encodeURIComponent(id)}/logs`,
      { params: { page, pageSize } },
    );
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
  quotation(id: string) {
    return request.get<WebsiteQuotation>(
      `/website/itineraries/${encodeURIComponent(id)}/quotation`,
    );
  },
  config(version?: number) {
    return request.get<WebsiteConfig>("/website/config", { params: { version } });
  },
  saveConfig(config: WebsiteConfig) {
    return request.put<WebsiteConfig>("/website/config", config);
  },
  resources(kind: WebsiteResourceKind, keyword = "", page = 1) {
    return request.get<PageResult<WebsiteResourceOption>>(`/website/resources/${kind}`, {
      params: { page, pageSize: 50, keyword },
    });
  },
};
