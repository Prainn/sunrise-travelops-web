import { request } from "@/api/request";
import type { PageResult } from "@/types/common";
import type { InquiryRecord, InquiryStatus } from "@/types/inquiry";
import type { ItineraryRecord, ItineraryQuoteCalculation } from "@/types/itinerary";
import type { AgencyContactRecord } from "@/types/resource";
export interface PersonOption { id: string; name: string; username: string }
export interface InquiryQuery { page: number; pageSize: number; keyword?: string; code?: string; status?: InquiryStatus | ""; ownerId?: string; sourceChannel?: string }
export interface PdfData { inquiry: InquiryRecord; itinerary: ItineraryRecord; inquiryVersion: number; generatedAt: string; quoteCode: string; quoteVersion: number; calculation: ItineraryQuoteCalculation }
const MONEY_FIELDS = new Set(["unitCost","referenceUnitCost","totalCost","dailyPrice","adultUnitPrice","unitPrice","chineseTip","englishTip","childUnitPrice","hotelCost","vehicleCost","commonGroupCost","baseGroupCost","baseCostPerPerson","singleSupplementUnitCost","totalPrice","profit","dailyResourceCost","guideCost","otherExpenses"]);
export function normalizeInquiryMoney<T>(value: unknown, field = ""): T {
  if (typeof value === "string" && MONEY_FIELDS.has(field)) return Number(value) as T;
  if (Array.isArray(value)) return value.map(item => normalizeInquiryMoney(item)) as T;
  if (value !== null && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([name,item]) => [name,normalizeInquiryMoney(item,name)])) as T;
  return value as T;
}
function inquiryInput(record: InquiryRecord) {
  return { agencyId: record.agencyId, contactId: record.contactId, ownerId: record.ownerId || undefined, sourceChannel: record.sourceChannel, originalMessage: record.originalMessage, internalRemark: record.internalRemark, plannedDays: record.plannedDays, nextFollowUpAt: record.nextFollowUpAt ? new Date(record.nextFollowUpAt).toISOString() : null, status: record.status, lostReason: record.lostReason };
}
export function itineraryInput(record: ItineraryRecord) {
  return { title: record.title, startDate: record.startDate, adults: record.adults, childrenCount: record.childrenCount, leaderCount: record.leaderCount, destinations: record.destinations, dailyPlans: record.dailyPlans, hotelPlans: record.hotelPlans, vehiclePlans: record.vehiclePlans, guidePlans: record.guidePlans, quote: record.quote };
}
export const inquiryService = {
  list(query: InquiryQuery) { return request.get<PageResult<InquiryRecord>>("/inquiries", { params: { ...query } }); },
  detail(id: string) { return request.get<InquiryRecord>(`/inquiries/${encodeURIComponent(id)}`); },
  owners() { return request.get<PersonOption[]>("/inquiries/owners"); },
  create(record: InquiryRecord) { return request.post<InquiryRecord>("/inquiries", inquiryInput(record)); },
  update(record: InquiryRecord) { return request.put<InquiryRecord>(`/inquiries/${record.id}`, { ...inquiryInput(record), version: record.version }); },
  archive(record: InquiryRecord) { return request.post<InquiryRecord>(`/inquiries/${record.id}/archive`, { version: record.version }); },
  createContact(agencyId: string, name: string, phone: string) { return request.post<AgencyContactRecord>(`/inquiries/contacts/${agencyId}`, { name, phone }); },
  async listItineraries(inquiryId: string) { return normalizeInquiryMoney<ItineraryRecord[]>(await request.get(`/inquiries/${inquiryId}/itineraries`)); },
  async itinerary(id: string) { return normalizeInquiryMoney<ItineraryRecord>(await request.get(`/itineraries/${id}`)); },
  async createItinerary(record: ItineraryRecord) { return normalizeInquiryMoney<ItineraryRecord>(await request.post(`/inquiries/${record.inquiryId}/itineraries`, itineraryInput(record))); },
  async saveItinerary(record: ItineraryRecord) { return normalizeInquiryMoney<ItineraryRecord>(await request.put(`/itineraries/${record.id}`, { ...itineraryInput(record), version: record.version })); },
  async copyItinerary(record: ItineraryRecord, title: string) { return normalizeInquiryMoney<ItineraryRecord>(await request.post(`/itineraries/${record.id}/copy`, { version: record.version, title })); },
  async pdfData(id: string) { return normalizeInquiryMoney<PdfData>(await request.get(`/itineraries/${id}/pdf-data`)); },
  async confirmPdf(data: PdfData) { return normalizeInquiryMoney<PdfData>(await request.post(`/itineraries/${data.itinerary.id}/confirm-pdf`, { version: data.itinerary.version, inquiryVersion: data.inquiryVersion })); },
};
