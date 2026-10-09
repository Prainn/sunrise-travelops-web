export type TourBusinessUnit = "shengxu" | "linxi" | "website";
export type TourSourceModule = "standard" | "website";

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
  inquiryId: string;
  quoteId: string;
  itineraryId: string;
  inquiryCode: string;
  itineraryCode: string;
  quoteCode: string;
  agencyName: string;
  contactName: string;
  days: number;
  startDate: string;
  pickupAt: string;
  dropAt: string;
  occupyFrom: string;
  occupyTo: string;
  countryCode: string;
  countryName: string;
  collectCoordinatorName: string;
  operatorId: string;
  operatorName: string;
  adults: number;
  children: number;
  leaders: number;
  totalPeople: number;
  language: string;
  shopping: boolean;
  pickupFlightId: string;
  dropFlightId: string;
  pickupFlight: TourFlightSnapshot;
  dropFlight: TourFlightSnapshot;
  guideId: string | null;
  guideName: string | null;
  remark: string;
  status: "active" | "cancelled";
  cancelReason: string | null;
  version: number;
}

export interface TourInput {
  operatorId: string;
  adults: number;
  children: number;
  leaders: number;
  language: string;
  shopping: boolean;
  pickupFlightId: string;
  dropFlightId: string;
  guideId: string | null;
  remark: string;
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
  library: "shengxu" | "shared";
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
