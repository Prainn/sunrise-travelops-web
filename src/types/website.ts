export type WebsiteBusinessUnit = "linxi" | "website";
export type FeeState =
  "INCLUDED" | "EXCLUDED" | "OPTIONAL" | "RECOMMENDED" | "SELF_PAY" | "UNKNOWN";
export type TransportMode = "hsr" | "private_vehicle" | "flight" | "other";
export type VehicleType = "5_seat" | "7_seat" | "9_seat" | "14_seat" | "18_seat";
export type ConfigStatus = "enabled" | "disabled";
export interface ConfigBase {
  id: string;
  status: ConfigStatus;
}
export interface WebsiteCity extends ConfigBase {
  nameZh: string;
  nameEn: string;
  resourceId: string | null;
}
export interface WebsiteConfigHotel extends ConfigBase {
  cityId: string;
  nameZh: string;
  nameEn: string;
  resourceId: string | null;
  price: string;
}
export interface WebsiteAttraction extends ConfigBase {
  cityId: string;
  parentId: string | null;
  nameZh: string;
  nameEn: string;
  resourceId: string | null;
  kind: "attraction" | "component";
  chargeable: boolean;
  copyKey: string;
  recommendedMonths: number[];
}
export interface WebsiteRoute extends ConfigBase {
  fromCityId: string;
  toCityId: string;
  mode: TransportMode;
  nameZh: string;
  nameEn: string;
  feeState: FeeState;
}
export interface WebsitePattern extends ConfigBase {
  cityId: string;
  nameZh: string;
  nameEn: string;
  attractionIds: string[];
}
export interface WebsiteSkeleton extends ConfigBase {
  nameZh: string;
  nameEn: string;
  days: Array<{ cityId: string; patternId: string | null }>;
}
export interface WebsiteTemplate extends ConfigBase {
  name: string;
  code: string;
  zh: string;
  en: string;
}
export interface WebsiteConfig {
  version: number;
  cities: WebsiteCity[];
  attractions: WebsiteAttraction[];
  hotels: WebsiteConfigHotel[];
  routes: WebsiteRoute[];
  patterns: WebsitePattern[];
  skeletons: WebsiteSkeleton[];
  templates: WebsiteTemplate[];
}
export type WebsiteConfigGroup = Exclude<keyof WebsiteConfig, "version">;
export type WebsiteConfigRecord = WebsiteConfig[WebsiteConfigGroup][number];
export interface WebsiteConfigOption {
  id: string;
  value: string;
  label: string;
}

export interface WebsiteConfigPage {
  version: number;
  list: WebsiteConfigRecord[];
  total: number;
  page: number;
  pageSize: number;
  references: Record<string, string>;
}
export interface WebsiteConfigListQuery {
  businessUnit: WebsiteBusinessUnit;
  version?: number;
  page: number;
  pageSize: number;
  keyword?: string;
  cityId?: string;
  excludeId?: string;
}
export interface WebsiteConfigEditorProps {
  version: number;
  businessUnit: WebsiteBusinessUnit;
  references: Record<string, string>;
  editable: boolean;
  saving: boolean;
  saveRecord: (record: WebsiteConfigRecord, isNew: boolean) => Promise<boolean>;
  deleteRecord: (id: string) => Promise<boolean>;
}

export interface WebsiteInquiryInput {
  businessUnit?: WebsiteBusinessUnit;
  countryItemId: string;
  customerName: string;
  plannedDays: number;
  requirements: string;
  ownerId?: string;
  contactInfo: string;
  receivedAt: string | null;
  contactChannel: string;
  whatsappSourceId: string;
  websiteInquiryNo: string;
  landingPage: string;
  acquisitionSource: string;
  startDate: string | null;
  pax: number | null;
  destinations: string[];
  internalRemark: string;
  status?: "new" | "planning" | "quoted" | "lost" | "archived";
  lostReason: string;
}
export interface WebsiteInquiry extends WebsiteInquiryInput {
  businessUnit: WebsiteBusinessUnit;
  hasActiveTour: boolean;
  countryCode: string | null;
  countryOrRegion: string;
  id: string;
  code: string;
  ownerId: string;
  owner: string;
  status: "new" | "planning" | "quoted" | "lost" | "archived";
  version: number;
  createdAt: string;
  updatedAt: string;
}
export interface WebsiteItem {
  id: string;
  attractionId: string | null;
  nameZh: string;
  nameEn: string;
  descriptionZh: string;
  descriptionEn: string;
  appears: boolean;
  feeState: FeeState;
}
export interface WebsiteLeg {
  id: string;
  routeId: string | null;
  fromCityId: string;
  toCityId: string;
  mode: TransportMode;
  nameZh: string;
  nameEn: string;
  feeState: FeeState;
}
export interface WebsiteHotelStay {
  id: string;
  tier: "A" | "B";
  cityId: string;
  configHotelId: string | null;
  resourceId: string | null;
  nameZh: string;
  nameEn: string;
  roomType: string;
  breakfastIncluded: boolean;
}
export interface WebsiteMeal {
  id: string;
  slot: "breakfast" | "lunch" | "dinner";
  resourceId: string | null;
  restaurantZh: string;
  restaurantEn: string;
  feeState: FeeState;
}
export interface WebsiteService {
  id: string;
  nameZh: string;
  nameEn: string;
  appears: boolean;
  feeState: FeeState;
}
export interface WebsiteDay {
  eventOrder?: string[];
  id: string;
  dayNumber: number;
  departCityId: string;
  endCityId: string;
  overnightCityId: string | null;
  items: WebsiteItem[];
  legs: WebsiteLeg[];
  hotels: WebsiteHotelStay[];
  meals: WebsiteMeal[];
  guideLanguage: string;
  services: WebsiteService[];
}
export interface WebsiteVehiclePrice {
  vehicleType: VehicleType;
  unitPrice: string | null;
}
export interface WebsiteItineraryInput {
  reorderDraft?: WebsiteReorderDraft | null;
  title: string;
  duration: number;
  startDate: string | null;
  pax: number | null;
  arrivalTime: string;
  departureTime: string;
  configVersion: number;
  days: WebsiteDay[];
  deletedDays?: { day: WebsiteDay; originalDate: string | null }[];
  vehiclePrices: WebsiteVehiclePrice[];
}
export interface WebsiteItinerary extends WebsiteItineraryInput {
  businessUnit: WebsiteBusinessUnit;
  id: string;
  inquiryId: string;
  code: string;
  status: "draft" | "quoted";
  version: number;
  createdAt: string;
  updatedAt: string;
}
export interface WebsiteValidation {
  code: string;
  severity: "ERROR" | "WARNING";
  message: string;
  dayNumber?: number;
}
export interface WebsiteOutputDay {
  day: string;
  depart: string;
  transportation: string;
  sightseeing: string;
  hotel: string;
  meal: string;
}
export interface WebsiteOutput {
  title: string;
  itinerary: WebsiteOutputDay[];
  inclusions: string[];
  exclusions: string[];
  hotelOptions: Array<{ tier: "A" | "B"; city: string; hotel: string; roomType: string }>;
  quotation: Array<{ vehicle: string; price: string }>;
  notes: string[];
}
export interface WebsitePreview {
  itineraryId: string;
  sourceVersion: number;
  inquiryVersion: number;
  configVersion: number;
  schemaVersion: 1;
  validationVersion: 1;
  issues: WebsiteValidation[];
  english: WebsiteOutput;
  chinese: WebsiteOutput;
}
export interface WebsiteQuotation extends WebsitePreview {
  id: string;
  code: string;
  confirmedAt: string;
  confirmedBy: string;
  acknowledgedWarnings: string[];
}
export type WebsiteInquiryLogAction =
  | "inquiry_created"
  | "inquiry_updated"
  | "inquiry_transferred"
  | "inquiry_archived"
  | "inquiry_lost"
  | "itinerary_created"
  | "itinerary_saved"
  | "itinerary_copied"
  | "itinerary_generated"
  | "quotation_confirmed";
export interface WebsiteInquiryLogChange {
  path: string;
  kind: "added" | "removed" | "changed";
  before: unknown;
  after: unknown;
  context?: {
    dayNumber?: number;
    nameZh?: string;
    nameEn?: string;
    hotelTier?: "A" | "B";
    mealSlot?: string;
    vehicleType?: string;
  };
}
export interface WebsiteInquiryLog {
  id: string;
  inquiryId: string;
  inquiryCode: string;
  businessUnit: WebsiteBusinessUnit;
  /** 十类已知动作外，历史未知值保留原编码 */
  action: string;
  occurredAt: string;
  operatorId: string;
  operatorName: string;
  operatorUsername: string | null;
  targetType: "inquiry" | "itinerary";
  targetId: string;
  targetCode: string | null;
  summary: string | null;
  detail: string;
  metadata: {
    creationMode?: "copy";
    sourceId?: string;
    sourceCode?: string;
    transferReason?: string;
    lostReason?: string;
    quotationCode?: string;
  };
  /** null 表示历史日志未记录字段差异，[] 表示确无字段差异 */
  changes: WebsiteInquiryLogChange[] | null;
}
export interface WebsiteInquiryLogReport {
  totalOperations: number;
  inquiryCount: number;
  operatorCount: number;
  changedFields: number;
  logsWithoutChanges: number;
  byAction: { action: string; count: number }[];
}
export interface WebsiteInquiryLogOperator {
  id: string;
  name: string;
  username: string | null;
}

/** Unapplied board edits; canonical details stay in their structured tables. */
export interface WebsiteReorderDraft {
  dayIds: string[];
  addedDayIds: string[];
  deletedDays: { id: string; dayNumber: number; date: string | null }[];
  placements: { dayId: string; itemIds: string[] }[];
  copies: { id: string; sourceId: string; parentId: string; dayId: string; placed: boolean }[];
  overnight: { dayId: string; cityId: string }[];
}
