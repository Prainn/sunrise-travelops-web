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

export interface TourRecord {
  id: string;
  tourNo: string;
  sourceModule: TourSourceModule;
  businessUnit: TourBusinessUnit;
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
  guideId: string | null;
  guideCode: string | null;
  guideName: string | null;
  remark: string;
  status: "active" | "cancelled";
  cancelReason: string | null;
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
  guideId: string | null;
  remark: string;
} & TourSchedule;

export type TourCreateRequest = TourInput &
  (
    | { sourceModule: TourLinkedSourceModule; inquiryId: string; quoteId: string }
    | { sourceModule: "manual"; manualSource: TourManualSource }
  );

export type TourUpdateRequest = TourInput & {
  version: number;
  /** 仅手工团；省略保留原资料。 */
  manualSource?: TourManualSource;
};

export type TourGuideQuery = {
  language: string;
  businessUnit: TourBusinessUnit;
  startDate: string;
  days: number;
  excludeTourId?: string;
} & TourSchedule;

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
