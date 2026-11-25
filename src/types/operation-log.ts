import type { LoginScope } from "@/types/auth";
import type { PageResult } from "@/types/common";

export const OPERATION_CATEGORIES = [
  "login",
  "user",
  "system-category",
  "business-category",
  "resource",
  "inquiry",
  "itinerary",
  "quotation",
  "tour",
  "guide-leave",
  "guide-rating",
  "website-config",
  "ledger",
  "website-visit",
  "whatsapp",
  "client",
] as const;

export type OperationCategory = (typeof OPERATION_CATEGORIES)[number];

export const OPERATION_RESULTS = [
  "success",
  "failure",
  "denied",
  "cancelled",
  "unknown",
  "pending",
] as const;

export type OperationResult = (typeof OPERATION_RESULTS)[number];

export const OPERATION_SCOPES = [
  "headquarters",
  "shengxu",
  "linxi",
  "website",
  "unknown",
] as const;

export type OperationScope = LoginScope | "unknown";

export interface OperationLog {
  id: string;
  time: string;
  category: OperationCategory;
  action: string;
  result?: OperationResult | null;
  success: boolean;
  actorId: string | null;
  actorName: string | null;
  scope: OperationScope | string | null;
  detail: string | null;
  ip: string | null;
}

export interface OperationLogPageResult extends PageResult<OperationLog> {
  snapshotAt?: string;
}

export type OperationLogQueryParams = {
  page: number;
  pageSize: number;
  category?: OperationCategory;
  scope?: OperationScope;
  start?: string;
  end?: string;
  actorName?: string;
  snapshotAt?: string;
};

export const PUBLIC_CLIENT_PAGES = [
  "Login",
  "Unavailable",
  "Forbidden",
  "NotFound",
  "Redirect",
] as const;

export type PublicClientOperationPage = (typeof PUBLIC_CLIENT_PAGES)[number];

export const CLIENT_PAGES = [
  ...PUBLIC_CLIENT_PAGES,
  "App",
  "Dashboard",
  "Profile",
  "WhatsappWorkbench",
  "WhatsappInbox",
  "WhatsappQuickReplies",
  "WhatsappIntegration",
  "System",
  "MenuPermissions",
  "Dict",
  "DictItem",
  "BusinessCategory",
  "User",
  "BusinessGroups",
  "AccountLinks",
  "NotificationManagement",
  "OssManagement",
  "OperationLogs",
  "Inquiries",
  "InquiryList",
  "InquiryItineraries",
  "InquiryLogReport",
  "InquiryLogs",
  "WebsiteInquiries",
  "WebsiteInquiryList",
  "WebsiteInquiryLogReport",
  "WebsiteInquiryLogs",
  "TourismResources",
  "WebsiteResources",
  "Agency",
  "CityResource",
  "Hotel",
  "Restaurant",
  "Attraction",
  "TransportResource",
  "FlightResource",
  "GuideManagement",
  "Guide",
  "GuideLeaves",
  "GuideRatings",
  "DataLedgers",
  "TourList",
  "ShengxuLedger",
  "DirectLedger",
  "WebsiteLedger",
  "ShengxuAgencySummary",
  "ShengxuCoordinatorSummary",
  "LinxiQuoteSummary",
  "LinxiPlatformSummary",
  "WebsiteQuoteSummary",
  "WebsitePlatformSummary",
  "WebsiteVisits",
] as const;

export type ClientOperationPage = (typeof CLIENT_PAGES)[number];

export const CLIENT_ACTIONS = [
  "navigate",
  "refresh",
  "retry",
  "filter",
  "sort",
  "paginate",
  "tab",
  "open",
  "close",
  "select",
  "draft",
  "reorder",
  "validate",
  "copy",
  "language",
  "theme",
  "print",
  "download",
  "cancel",
  "expand",
  "layout",
  "preview",
] as const;

export type ClientOperationAction = (typeof CLIENT_ACTIONS)[number];

export const ANONYMOUS_CLIENT_ACTIONS = [
  "navigate",
  "retry",
  "select",
  "language",
  "theme",
  "validate",
  "cancel",
  "open",
  "close",
] as const;

export type AnonymousClientOperationAction = (typeof ANONYMOUS_CLIENT_ACTIONS)[number];

export const CLIENT_RESULTS = ["success", "failure", "cancelled", "unknown"] as const;

export type ClientOperationResult = (typeof CLIENT_RESULTS)[number];

export const CLIENT_VALUES = [
  "zh-cn",
  "en",
  "light",
  "dark",
  "system",
  "pdf",
  "word",
  "csv",
  "headquarters",
  "shengxu",
  "linxi",
  "website",
] as const;

export type ClientOperationValue = (typeof CLIENT_VALUES)[number];

export interface ClientOperationEvent {
  eventId: string;
  page: ClientOperationPage;
  action: ClientOperationAction;
  result: ClientOperationResult;
  occurredAt: string;
  recordId?: string;
  value?: ClientOperationValue;
}
