export type TourBusinessUnit = "shengxu" | "linxi" | "website";
export type TourSourceModule = "standard" | "website" | "manual";
/** 关联询盘来源；`/tours/sources` 只接受这两类。 */
export type TourLinkedSourceModule = Exclude<TourSourceModule, "manual">;
export type TourScheduleMode = "flight" | "manual";

export interface TourFlightSnapshot {
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  departureAirport: { code: string; name: string; englishName: string };
  arrivalAirport: { code: string; name: string; englishName: string };
}

/** 已确认排期冲突的服务端记录；确认人为真实操作者。 */
export interface TourGuideConflictConfirmation {
  token: string;
  confirmedBy: string;
  confirmedByName: string;
  confirmedAt: string;
  reasons: TourGuideUnavailableReason[];
}

/** 服务段按 Asia/Shanghai 自然日 `YYYY-MM-DD` 管理，首尾两端均包含。 */
export interface TourGuideService {
  id: string;
  tourId: string;
  guideId: string;
  guideName: string;
  guideCode: string;
  language: string;
  serviceStartDate: string;
  serviceEndDate: string;
  remark: string;
  timeSource: "legacy" | "manual";
  invalidDuration: boolean;
  outsideTourWindow: boolean;
  /** 无确认或历史段为 null，不能推断为已人工同意。 */
  conflictConfirmation: TourGuideConflictConfirmation | null;
  createdAt: string;
  createdBy: string | null;
  updatedAt: string;
  updatedBy: string | null;
}

/** 请求白名单；旧段带服务端 ID，新段不传。 */
export interface TourGuideServiceInput {
  id?: string;
  guideId: string;
  language: string;
  serviceStartDate: string;
  serviceEndDate: string;
  remark?: string;
  confirmTime?: boolean;
  /** 仅排期冲突经“确认使用”后携带的查询令牌。 */
  scheduleConflictToken?: string;
}

export interface TourRecord {
  id: string;
  tourNo: string;
  sourceModule: TourSourceModule;
  businessUnit: TourBusinessUnit;
  /** 来源为盛旭系列询盘。 */
  isSeriesSource: boolean;
  inquiryId: string | null;
  quoteId: string | null;
  itineraryId: string | null;
  inquiryCode: string | null;
  itineraryCode: string | null;
  quoteCode: string | null;
  itinerarySummary: string;
  agencyId: string | null;
  agencyName: string;
  contactName: string;
  days: number;
  startDate: string;
  pickupAt: string;
  dropAt: string;
  occupyFrom: string;
  occupyTo: string;
  countryItemId: string | null;
  countryCode: string;
  countryName: string;
  creatorId: string;
  creatorTourCode: string;
  collectCoordinatorId: string;
  collectCoordinatorName: string;
  operatorId: string;
  operatorName: string;
  adults: number;
  children: number;
  leaders: number;
  totalPeople: number;
  language: string;
  shopping: boolean;
  scheduleMode: TourScheduleMode;
  pickupFlightId: string | null;
  dropFlightId: string | null;
  pickupFlight: TourFlightSnapshot | null;
  dropFlight: TourFlightSnapshot | null;
  guideServices: TourGuideService[];
  remark: string;
  status: "active" | "cancelled";
  cancelReason: string | null;
  /** 由直客台账生成时的来源；其他来源为 null。 */
  directLedgerId: string | null;
  directLedgerOrderNo: string | null;
  /** 服务端按当前身份与记录范围计算。 */
  canEdit: boolean;
  canCancel: boolean;
  version: number;
}

/** 手工建团资料；响应中为扁平字段，编辑时需重新组装。 */
export interface TourManualSource {
  businessUnit: TourBusinessUnit;
  countryItemId: string;
  collectCoordinatorId: string;
  agencyId?: string;
  contactName: string;
  itinerarySummary: string;
  startDate: string;
  days: number;
}

export type TourSchedule =
  | { scheduleMode: "flight"; pickupFlightId: string; dropFlightId: string }
  | { scheduleMode: "manual"; pickupAt: string; dropAt: string };

export type TourInput = {
  operatorId: string;
  adults: number;
  children: number;
  leaders: number;
  language: string;
  shopping: boolean;
  guideServices: TourGuideServiceInput[];
  remark: string;
} & TourSchedule;

export type TourCreateRequest = TourInput &
  (
    | {
      sourceModule: TourLinkedSourceModule;
      inquiryId: string;
      quoteId: string;
      /** 仅系列询盘来源必填，作为本团实际出发日。 */
      seriesStartDate?: string;
    }
    | { sourceModule: "manual"; manualSource: TourManualSource }
  );

export type TourUpdateRequest = TourInput & {
  version: number;
  /** 仅手工团；省略保留原资料。 */
  manualSource?: TourManualSource;
  /** 仅系列来源团；只修改本团日期。 */
  seriesStartDate?: string;
};

/** 兄弟段只带这 3 个字段。 */
export interface TourGuideSiblingService {
  guideId: string;
  serviceStartDate: string;
  serviceEndDate: string;
}

export interface TourGuideQuery {
  /** 导游姓名，去首尾空白后最多 150 字；省略时只返回可用导游。 */
  keyword?: string;
  businessUnit: TourBusinessUnit;
  language: string;
  serviceStartDate: string;
  serviceEndDate: string;
  page: number;
  pageSize: number;
  excludeTourId?: string;
  otherServices?: TourGuideSiblingService[];
}

export interface TourSource {
  inquiryId: string;
  inquiryCode: string;
  agencyName: string;
  contactName: string;
  ownerName: string;
  businessUnit: TourBusinessUnit;
  countryCode: string | null;
  countryName: string;
  quoteId: string;
  quoteCode: string;
  isSeries: boolean;
  itineraryCode: string | null;
  startDate: string | null;
  days: number | null;
  downloaded: boolean;
}

export interface TourFlightOption {
  id: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  departureCode: string;
  departureName: string;
  departureEnglishName: string;
  arrivalCode: string;
  arrivalName: string;
  arrivalEnglishName: string;
}

export interface TourGuideOption {
  id: string;
  code: string;
  name: string;
  language: string | null;
}

export type TourGuideUnavailableCode =
  | "GUIDE_DISABLED"
  | "LANGUAGE_MISMATCH"
  | "LEAVE_CONFLICT"
  | "SCHEDULE_CONFLICT"
  | "FORM_CONFLICT";

export interface TourGuideUnavailableReason {
  code: TourGuideUnavailableCode;
  message: string;
  expectedLanguage?: string;
  actualLanguage?: string | null;
  /** 日期两端均包含。 */
  leaves?: Array<{ startDate: string; endDate: string }>;
  /** 可含跨业务团的排期摘要，不含团 ID。 */
  tours?: Array<{
    tourNo: string;
    businessUnit: TourBusinessUnit;
    serviceStartDate: string;
    serviceEndDate: string;
  }>;
  /** otherServiceIndex 为请求 otherServices 的零基下标，不是完整表单下标。 */
  services?: Array<{ otherServiceIndex: number; serviceStartDate: string; serviceEndDate: string }>;
}

export interface TourGuideUnavailable extends TourGuideOption {
  reasons: TourGuideUnavailableReason[];
  /** 仅全部原因为排期冲突时为 true，服务端决定，前端不按原因文字推断。 */
  canOverride: boolean;
  /** canOverride=true 时的 64 位确认令牌。 */
  scheduleConflictToken?: string;
}

/** 导游姓名可用性预览；message 为业务提示，区别于响应外层 message。 */
export interface TourGuideAvailability {
  status: "available" | "not_found" | "unavailable";
  message: string;
  matchedCount: number;
  /** 分页前候选总数，list 与 unavailable 共用一页。 */
  total: number;
  page: number;
  pageSize: number;
  list: TourGuideOption[];
  unavailable: TourGuideUnavailable[];
}

export const RATING_FIELDS = [
  "selfScore",
  "managerScore",
  "collectScore",
  "operatorScore",
  "carPurchase",
  "recommendedSelfPay",
  "praise",
  "designated",
  "incident",
] as const;
export type RatingField = (typeof RATING_FIELDS)[number];

export type TourRatingRow = {
  tourId: string;
  canEdit: boolean;
  tourNo: string;
  status: "active" | "cancelled";
  businessUnit: TourBusinessUnit;
  startDate: string;
  guideId: string;
  guideName: string;
  guideCode: string;
  guideServices: TourGuideService[];
  collectCoordinatorName: string;
  operatorName: string;
  max: number | null;
  min: number | null;
  average: number | null;
  total: number | null;
  version: number;
} & Record<RatingField, number | null>;

export interface GuideLeaveRecord {
  id: string;
  guidePersonId: string;
  guideName: string;
  guideCode: string;
  startDate: string;
  endDate: string;
  reason: string;
  remark: string;
  version: number;
}

export interface GuideLeaveInput {
  guidePersonId: string;
  startDate: string;
  endDate: string;
  reason: string;
  remark: string;
}
