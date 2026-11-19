export type ItineraryStatus = "draft" | "quoted";

export type ItineraryItemType = "hotel" | "attraction" | "restaurant" | "vehicle" | "guide";
export type ItineraryDailyItemType = Extract<ItineraryItemType, "attraction" | "restaurant">;
export type ItineraryPriceUnit = string;
export type ItineraryHotelTier = 3 | 4 | 5;
export type ItineraryVehicleTier = VehicleServiceLevel;

export interface ItineraryHotelSelection extends PriceReference {
  /** Overnight day of this hotel night; absent only in older frozen snapshots. */
  dayId?: string;
  /** Overnight city of that day. */
  destination: string;
  hotelId: string;
  hotelName: string;
  rating: number;
  breakfast: string;
  unit: ItineraryPriceUnit;
  /** null: actual price not entered yet (Draft only). */
  unitCost: number | null;
}

export interface ItineraryHotelPlan {
  tier: ItineraryHotelTier;
  hotels: ItineraryHotelSelection[];
}

export interface ItineraryVehicleSelection {
  vehicleId: string;
  vehicleName: string;
  seats: number;
  quantity: number;
}
export type ItineraryVehicleQuotationMode = "itinerary" | "stage";
export type ItineraryVehiclePaxPricingMode = "automatic" | "manual";
/** Whole-group price of one arrangement for one PAX tier; null = not entered, 0 = free. */
export interface ItineraryVehicleSegmentPaxPrice {
  pax: number;
  totalPrice: number | null;
}
export interface ItineraryVehiclePaxPrice {
  pax: number;
  totalPrice: number | null;
  pricingMode: ItineraryVehiclePaxPricingMode;
  /** Derived by the backend; never sent as a saved fact. */
  segmentTotal?: number | null;
  adjustmentReason?: string | null;
}
export interface ItineraryVehicleArrangement {
  id: string;
  startDate: string;
  endDate: string;
  vehicles: ItineraryVehicleSelection[];
  /** Legacy shared segment price; null in the PAX format. */
  totalPrice?: number | null;
  paxPrices?: ItineraryVehicleSegmentPaxPrice[];
}
export interface ItineraryVehiclePlan {
  quotationMode: ItineraryVehicleQuotationMode;
  paxPrices?: ItineraryVehiclePaxPrice[];
  pricingMode?: "automatic" | "manual" | "unknown" | null;
  segmentTotal?: number | null;
  adjustmentReason?: string | null;
  tier: ItineraryVehicleTier;
  arrangements: ItineraryVehicleArrangement[];
  totalPrice: number | null;
}

export interface ItineraryPaxPrice {
  pax: number;
  adultUnitPrice: number | null;
  /** Customer single supplement; null follows the calculated cost, 0 is an explicit zero quote. */
  singleSupplementQuote?: number | null;
}

export interface ItineraryStaffRoomCost {
  destination: string;
  total: number | null;
}

/** Other costs are group totals; per-person cost is total / PAX of the tier. */
export interface ItineraryPaxOtherCost {
  pax: number;
  guideOtherCost: number | null;
  guideOtherReason: string;
  staffRoomOtherCost: number | null;
  staffRoomOtherReason: string;
}

export interface ItineraryQuoteOption {
  id: string;
  /** null only when every active day is explicitly without accommodation. */
  hotelTier: ItineraryHotelTier | null;
  vehicleTier: ItineraryVehicleTier;
  paxPrices: ItineraryPaxPrice[];
}

export interface ItineraryQuoteSettings {
  /** Whole-group totals split per PAX tier; null counts as 0. */
  leaderRoomTotal?: number | null;
  driverTipTotal?: number | null;
  guideLeaderTransportTotal?: number | null;
  /** Per-person ground handling cost; null counts as 0. */
  groundHandlingUnitCost?: number | null;
  mealOtherCost: number | null;
  mealOtherReason: string;
  attractionOtherCost: number | null;
  attractionOtherReason: string;
  paxOtherCosts: ItineraryPaxOtherCost[];
  staffRoomCosts: ItineraryStaffRoomCost[];
  options: ItineraryQuoteOption[];
  /** Full-tour tip per adult/child, charged separately and included in profit. */
  chineseTip: number | null;
  /** Full-tour tip per adult/child, charged separately and included in profit. */
  englishTip: number | null;
  transportFees: ItineraryTransportFee[];
  customerNotes: string;
  holidayRestrictions: string;
  hotelReplacementTerms: string;
  /** English customer texts; empty until filled, required only for English export. */
  customerNotesEn: string;
  holidayRestrictionsEn: string;
  hotelReplacementTermsEn: string;
}

export interface ItineraryTransportFee {
  id: string;
  type: "flight" | "train";
  departureCity: string;
  arrivalCity: string;
  departureCityEn: string;
  arrivalCityEn: string;
  cabin: "economy" | "business" | "first" | "second";
  unitPrice: number | null;
}

export type MealSlot = "lunch" | "dinner";
export interface ItineraryMeals {
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
}

export interface ItineraryPaxCalculation {
  pax: number;
  /** Whole-group vehicle price of this PAX tier; null when missing. Older snapshots omit it. */
  vehicleTotal?: number | null;
  vehicleUnitCost: number;
  guideServiceUnitCost: number;
  staffRoomUnitCost: number;
  baseCostPerPerson: number;
  mealCost?: number;
  /** Per-person attraction cost incl. other costs of this PAX; older snapshots omit it. */
  attractionCost?: number;
  adultUnitPrice: number;
  childUnitPrice: number;
  childWithoutBedUnitPrice?: number;
  leaderUnitPrice: number;
  /** Per-person shares of the shared quote costs; older snapshots omit them. */
  leaderRoomUnitCost?: number;
  driverTipUnitCost?: number;
  guideLeaderTransportUnitCost?: number;
  groundHandlingUnitCost?: number;
  singleSupplementUnitCost: number;
  /** Final customer single supplement (override or cost); older snapshots omit it. */
  singleSupplementQuote?: number | null;
  tipUnitPrice: number;
  profitPerPerson: number;
  actualMarginRate: number | null;
}

export interface ItineraryQuoteOptionCalculation {
  optionId: string;
  hotelTier: ItineraryHotelTier | null;
  vehicleTier: ItineraryVehicleTier;
  /** One row per overnight day since per-day hotels; older snapshots group by city. */
  hotelCityCosts?: {
    dayNumber?: number;
    hotelName?: string | null;
    destination: string;
    nights: number;
    unitCost: number | null;
    totalCost: number | null;
  }[];
  hotelUnitCost: number;
  /** null in the PAX vehicle format: use paxPrices[].vehicleTotal. */
  vehicleTotal: number | null;
  staffRoomTotal: number;
  paxPrices: ItineraryPaxCalculation[];
}

export interface ItineraryQuoteCalculation {
  pricingVersion: 2;
  tableMealTotal?: number;
  /** Only the three Draft actual-price fields; historical snapshots may omit these. */
  pricingComplete?: boolean;
  missingPrices?: string[];
  dailyResourceCost: number;
  mealDetails?: {
    groupTotal?: number | null;
    city?: string | null;
    dayNumber: number;
    resourceName: string;
    unitCost: number | null;
    quantity: number;
    totalCost: number | null;
  }[];
  attractionDetails?: {
    city?: string | null;
    dayNumber: number;
    resourceName: string;
    unitCost: number | null;
    quantity: number;
    totalCost: number | null;
  }[];
  mealCost?: number;
  attractionCost?: number;
  guideCost: number;
  options: ItineraryQuoteOptionCalculation[];
}

export interface ItineraryResourceItem extends PriceReference {
  id: string;
  type: ItineraryItemType;
  /** Both IDs are null for an itinerary-only custom restaurant. */
  resourceId: string | null;
  resourceName: string;
  priceName: string;
  quantity: number;
  dinerCount: number | null;
  tableCount?: number | null;
  unit: ItineraryPriceUnit;
  /** null: actual price not entered yet (Draft only). */
  unitCost: number | null;
  totalCost: number | null;
  remark: string;
  /** English name of a custom meal; resource items take English from the resource library. */
  resourceNameEn: string;
  remarkEn: string;
  mealSlot?: MealSlot;
}

export interface ItineraryDayRecord {
  id: string;
  dayNumber: number;
  date: string;
  departure: string;
  destination: string;
  /** Ordered via cities chosen from the itinerary destinations. */
  viaDestinations: string[];
  /** null = not filled yet; "" = explicitly no accommodation that night. */
  overnightDestination: string | null;
  meals: ItineraryMeals;
  transport: string;
  description?: string;
  departureEn: string;
  destinationEn: string;
  transportEn: string;
  descriptionEn: string;
  items: ItineraryResourceItem[];
}

/** Day text fields edited inline on the day card. */
export type ItineraryEditableDayField =
  | "departure"
  | "destination"
  | "overnightDestination"
  | "transport"
  | "description"
  | "departureEn"
  | "destinationEn"
  | "transportEn"
  | "descriptionEn";

export interface ItineraryGuidePlan extends PriceReference {
  destination: string;
  guideId: string;
  guideName: string;
  secondLanguage: string;
  shopping: boolean;
  /** null: actual price not entered yet (Draft only). */
  dailyPrice: number | null;
  serviceDays: number;
}

/** Customer documents either match the ground service days or append a return-arrival day. */
export type CustomerDisplayMode = "same" | "returnArrival";
/** Customer file language, independent of the UI language; en is 盛旭 only. */
export type CustomerExportLanguage = "zh" | "en";

export interface CustomerContent {
  title: string;
  country: string;
  days: Array<{
    id: string;
    dayNumber: number;
    date: string;
    /** departure → via → destination, adjacent duplicates collapsed. */
    route: string[];
    transport: string;
    description: string;
    overnightDestination: string;
    /** That night's hotel per tier; empty without accommodation, absent in older snapshots. */
    hotels?: Array<{ tier: number; name: string }>;
    meals: ItineraryMeals;
    items: Array<{ id: string; name: string; description: string; remark: string; unit: string }>;
  }>;
  hotels: Array<{ hotelId: string; name: string; destination: string }>;
  notes: string[];
  transportFees: Array<{ id: string; departureCity: string; arrivalCity: string }>;
  returnArrival: { dayNumber: number; date: string; text: string } | null;
}

export interface CustomerPresentation {
  version: 1;
  serviceDays: number;
  displayDays: number;
  accommodationNights: number;
  noAccommodation: boolean;
  missingEnglish: string[];
  zh: CustomerContent;
  en: CustomerContent;
}

export interface ItineraryRecord {
  version: number;
  guidePlans: ItineraryGuidePlan[];
  id: string;
  inquiryId: string;
  code: string;
  title: string;
  titleEn: string;
  customerDisplayMode: CustomerDisplayMode;
  returnArrivalText: string;
  returnArrivalTextEn: string;
  startDate: string;
  endDate: string;
  days: number;
  /** Server-derived: days plus the optional return-arrival display day. */
  displayDays?: number;
  /** Server-derived from active days with accommodation, not days - 1. */
  accommodationNights?: number;
  paxTiers: number[];
  childRate: number;
  childWithoutBedRate: number;
  destinations: string[];
  hotelPlans: ItineraryHotelPlan[];
  vehiclePlans: ItineraryVehiclePlan[];
  quote: ItineraryQuoteSettings;
  dailyPlans: ItineraryDayRecord[];
  deletedDays?: { day: ItineraryDayRecord; originalDate: string | null }[];
  status: ItineraryStatus;
  quoteGeneratedAt: string;
  creator: string;
  createdAt: string;
  updatedAt: string;
}
import type { VehicleServiceLevel } from "./resource";

export interface PriceReference {
  referencePrice?: number | null;
  referenceBasis?: string | null;
  adjustmentReason?: string | null;
}
export interface PriceAdjustment {
  id: string;
  itemKey: string;
  itemName: string;
  itemType: string;
  referenceBasis: string;
  referencePrice: number | null;
  beforePrice: number | null;
  afterPrice: number;
  reason: string;
  action: string;
  operatorName: string;
  occurredAt: string;
}
