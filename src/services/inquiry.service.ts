import { parseMoney } from "@/utils/format";
import { LONG_REQUEST_TIMEOUT_MS, request } from "@/api/request";
import type { PageResult } from "@/types/common";
import type {
  FollowUpDelivery,
  InquiryFollowUpInput,
  InquiryFollowUpPage,
  InquiryRecord,
  InquiryStatus,
} from "@/types/inquiry";
import type {
  CustomerExportLanguage,
  CustomerPresentation,
  PriceAdjustment,
  ItineraryRecord,
  ItineraryQuoteCalculation,
} from "@/types/itinerary";
import type { AgencyContactRecord } from "@/types/resource";
export interface PersonOption {
  id: string;
  name: string;
  username: string;
}
export interface InquiryQuery {
  businessUnit?: InquiryRecord["businessUnit"];
  page: number;
  pageSize: number;
  keyword?: string;
  code?: string;
  status?: InquiryStatus | "";
  ownerId?: string;
  sourceChannel?: string;
}
export interface PdfData {
  inquiry: InquiryRecord;
  itinerary: ItineraryRecord;
  inquiryVersion: number;
  generatedAt: string;
  quoteCode: string;
  quoteVersion: number;
  calculation: ItineraryQuoteCalculation;
  /** 盛旭新预览/冻结的中英文客户内容；旧冻结与其他业务没有。 */
  customerPresentation?: CustomerPresentation | null;
  exportLanguage?: CustomerExportLanguage;
}
const MONEY_FIELDS = new Set([
  "tableMealTotal",
  "groupTotal",
  "hotelUnitCost",
  "vehicleTotal",
  "guideServiceTotal",
  "staffRoomTotal",
  "vehicleUnitCost",
  "guideServiceUnitCost",
  "staffRoomUnitCost",
  "leaderUnitPrice",
  "tipUnitPrice",
  "profitPerPerson",
  "referencePrice",
  "segmentTotal",
  "beforePrice",
  "afterPrice",
  "unitCost",
  "totalCost",
  "total",
  "dailyPrice",
  "adultUnitPrice",
  "unitPrice",
  "chineseTip",
  "englishTip",
  "childUnitPrice",
  "childWithoutBedUnitPrice",
  "hotelCost",
  "vehicleCost",
  "commonGroupCost",
  "baseGroupCost",
  "baseCostPerPerson",
  "singleSupplementUnitCost",
  "totalPrice",
  "profit",
  "dailyResourceCost",
  "mealOtherCost",
  "attractionOtherCost",
  "guideOtherCost",
  "staffRoomOtherCost",
  "mealCost",
  "attractionCost",
  "guideCost",
  "otherExpenses",
]);
export function normalizeInquiryMoney<T>(value: unknown, field = ""): T {
  if (typeof value === "string" && MONEY_FIELDS.has(field)) return parseMoney(value) as T;
  if (Array.isArray(value)) return value.map((item) => normalizeInquiryMoney(item)) as T;
  if (value !== null && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([name, item]) => [name, normalizeInquiryMoney(item, name)]),
    ) as T;
  return value as T;
}
function inquiryInput(record: InquiryRecord) {
  // 系列询盘只提交国家/地区与原始消息，不提交隐藏的客户资料、来源或计划天数。
  if (record.isSeries)
    return {
      isSeries: true,
      businessUnit: record.businessUnit,
      countryItemId: record.countryItemId,
      ownerId: record.ownerId || undefined,
      originalMessage: record.originalMessage,
      internalRemark: record.internalRemark,
      nextFollowUpAt: record.nextFollowUpAt ? new Date(record.nextFollowUpAt).toISOString() : null,
      status: record.status,
      lostReason: record.lostReason,
    };
  return {
    businessUnit: record.businessUnit,
    agencyId: record.agencyId,
    countryItemId: record.countryItemId,
    contactId: record.contactId,
    ownerId: record.ownerId || undefined,
    sourceChannel: record.sourceChannel,
    originalMessage: record.originalMessage,
    internalRemark: record.internalRemark,
    plannedDays: record.plannedDays,
    nextFollowUpAt: record.nextFollowUpAt ? new Date(record.nextFollowUpAt).toISOString() : null,
    status: record.status,
    lostReason: record.lostReason,
  };
}
/** PAX-format plans never send shared prices or the backend-derived segmentTotal. */
function vehiclePlanInput(plan: ItineraryRecord["vehiclePlans"][number]) {
  if (!plan.quotationMode) return plan;
  return {
    ...plan,
    totalPrice: null,
    pricingMode: null,
    segmentTotal: null,
    adjustmentReason: "",
    paxPrices: plan.paxPrices?.map((price) => ({
      pax: price.pax,
      totalPrice: price.totalPrice,
      pricingMode: price.pricingMode,
      adjustmentReason: price.adjustmentReason ?? "",
    })),
    arrangements: plan.arrangements.map((arrangement) => ({ ...arrangement, totalPrice: null })),
  };
}
export function itineraryInput(
  record: Pick<
    ItineraryRecord,
    | "title"
    | "titleEn"
    | "customerDisplayMode"
    | "returnArrivalText"
    | "returnArrivalTextEn"
    | "startDate"
    | "paxTiers"
    | "childRate"
    | "childWithoutBedRate"
    | "destinations"
    | "dailyPlans"
    | "deletedDays"
    | "hotelPlans"
    | "vehiclePlans"
    | "guidePlans"
    | "quote"
  >,
) {
  return {
    title: record.title,
    titleEn: record.titleEn,
    customerDisplayMode: record.customerDisplayMode,
    returnArrivalText: record.returnArrivalText,
    returnArrivalTextEn: record.returnArrivalTextEn,
    startDate: record.startDate,
    paxTiers: record.paxTiers,
    childRate: record.childRate,
    childWithoutBedRate: record.childWithoutBedRate,
    destinations: record.destinations,
    dailyPlans: record.dailyPlans.map((day) => ({
      ...day,
      items: day.items.map((item) => ({ ...item, quantity: 1 })),
    })),
    deletedDays: record.deletedDays ?? [],
    hotelPlans: record.hotelPlans,
    vehiclePlans: record.vehiclePlans.map(vehiclePlanInput),
    guidePlans: record.guidePlans,
    quote: record.quote,
  };
}
export const inquiryService = {
  parseDocument(file: File) {
    const body = new FormData();
    body.append("file", file);
    return request.post<{ text: string }>("/inquiries/parse-document", body, {
      timeoutMs: LONG_REQUEST_TIMEOUT_MS,
    });
  },
  list(query: InquiryQuery) {
    return request.get<PageResult<InquiryRecord>>("/inquiries", { params: { ...query } });
  },
  detail(id: string) {
    return request.get<InquiryRecord>(`/inquiries/${encodeURIComponent(id)}`);
  },
  owners(businessUnit?: string) {
    return request.get<PersonOption[]>("/inquiries/owners", { params: { businessUnit } });
  },
  transfer(record: InquiryRecord, ownerId: string, reason: string) {
    return request.post<InquiryRecord>(`/inquiries/${record.id}/transfer`, {
      version: record.version,
      ownerId,
      reason,
    });
  },
  async priceAdjustments(id: string) {
    return normalizeInquiryMoney<PriceAdjustment[]>(
      await request.get(`/itineraries/${id}/price-adjustments`),
    );
  },
  create(record: InquiryRecord) {
    return request.post<InquiryRecord>("/inquiries", inquiryInput(record));
  },
  update(record: InquiryRecord) {
    return request.put<InquiryRecord>(`/inquiries/${record.id}`, {
      ...inquiryInput(record),
      version: record.version,
    });
  },
  delete(record: InquiryRecord) {
    return request.delete<void>(`/inquiries/${encodeURIComponent(record.id)}`, { body: { version: record.version } });
  },
  followUps(inquiryId: string, query: { page: number; pageSize: number }) {
    return request.get<InquiryFollowUpPage>(
      `/inquiries/${encodeURIComponent(inquiryId)}/follow-ups`,
      { params: query },
    );
  },
  addFollowUp(inquiryId: string, input: InquiryFollowUpInput) {
    return request.post<{ id: string; inquiryVersion: number; delivery: FollowUpDelivery }>(
      `/inquiries/${encodeURIComponent(inquiryId)}/follow-ups`,
      input,
    );
  },
  archive(record: InquiryRecord) {
    return request.post<InquiryRecord>(`/inquiries/${record.id}/archive`, {
      version: record.version,
    });
  },
  createContact(agencyId: string, name: string, phone: string, inquiryId?: string) {
    return request.post<AgencyContactRecord>(`/inquiries/contacts/${agencyId}`, { name, phone, inquiryId });
  },
  async listItineraries(inquiryId: string) {
    return normalizeInquiryMoney<ItineraryRecord[]>(
      await request.get(`/inquiries/${inquiryId}/itineraries`),
    );
  },
  async itinerary(id: string) {
    return normalizeInquiryMoney<ItineraryRecord>(await request.get(`/itineraries/${id}`));
  },
  async createItinerary(record: ItineraryRecord) {
    return normalizeInquiryMoney<ItineraryRecord>(
      await request.post(`/inquiries/${record.inquiryId}/itineraries`, itineraryInput(record)),
    );
  },
  /** `confirmVehicleModeChange` is only sent for the save that applies a confirmed vehicle mode switch. */
  async saveItinerary(record: ItineraryRecord, options: { confirmVehicleModeChange?: boolean } = {}) {
    return normalizeInquiryMoney<ItineraryRecord>(
      await request.put(`/itineraries/${record.id}`, {
        ...itineraryInput(record),
        ...(options.confirmVehicleModeChange ? { confirmVehicleModeChange: true } : {}),
        version: record.version,
      }),
    );
  },
  async quoteCalculation(id: string) {
    return normalizeInquiryMoney<ItineraryQuoteCalculation>(
      await request.get(`/itineraries/${id}/quote-calculation`),
    );
  },
  async previewQuote(record: ReturnType<typeof itineraryInput> & Pick<ItineraryRecord, "id">) {
    return normalizeInquiryMoney<ItineraryQuoteCalculation>(
      await request.post(`/itineraries/${record.id}/quote-calculation`, itineraryInput(record)),
    );
  },
  async copyItinerary(record: ItineraryRecord, title: string) {
    return normalizeInquiryMoney<ItineraryRecord>(
      await request.post(`/itineraries/${record.id}/copy`, { version: record.version, title }),
    );
  },
  /** 导出语言独立于界面语言，默认 zh；en 仅盛旭支持。 */
  async pdfData(id: string, language: CustomerExportLanguage = "zh") {
    return normalizeInquiryMoney<PdfData>(
      await request.get(`/itineraries/${id}/pdf-data`, { params: { language } }),
    );
  },
  async recordDownload(id: string) {
    await request.post(`/itineraries/${encodeURIComponent(id)}/download-click`);
  },
  async confirmPdf(data: PdfData) {
    return normalizeInquiryMoney<PdfData>(
      await request.post(`/itineraries/${data.itinerary.id}/confirm-pdf`, {
        version: data.itinerary.version,
        inquiryVersion: data.inquiryVersion,
        language: data.exportLanguage ?? "zh",
      }),
    );
  },
};
