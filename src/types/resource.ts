import type { ItineraryItemType, ItineraryPriceUnit } from "./itinerary";

export type ResourceStatus = "enabled" | "disabled";
export type HotelRating = "international_five_star" | "ctrip_preferred";
export type VehicleServiceLevel = "standard" | "vip";

export interface ResourceAuditRecord {
  version?: number;
  createdAt?: string;
  createdBy?: string | null;
  updatedAt?: string;
  updatedBy?: string | null;
}

export interface ResourceQueryParams {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: ResourceStatus;
}

export interface ResourceListQuery extends Partial<ResourceQueryParams> {
  city?: string;
  unit?: string;
  area?: string;
  category?: AttractionCategory;
  gender?: GuideGender;
  employmentType?: GuideEmploymentType;
  language?: string;
}

export interface AgencyContactRecord extends ResourceAuditRecord {
  id: string;
  agencyId?: string;
  name: string;
  phone: string;
}

export interface AgencyRecord extends ResourceAuditRecord {
  id: string;
  code: string;
  name: string;
  city: string;
  countryOrRegion: string;
  email: string;
  status: ResourceStatus;
  remark: string;
  contacts: AgencyContactRecord[];
  contactCount?: number;
}

export interface ResourceUnitRecord {
  id: string;
  code: ItineraryPriceUnit;
  name: string;
  englishName: string;
  resourceTypes: ItineraryItemType[];
  status: ResourceStatus;
  remark: string;
}

export interface TransportMethodRecord {
  id: string;
  code: string;
  name: string;
  englishName: string;
  status: ResourceStatus;
  remark: string;
}

export interface BusinessCategoryOptionRecord {
  id: string;
  code: string;
  name: string;
  englishName: string;
  resourceTypes?: ItineraryItemType[];
  status: ResourceStatus;
  remark: string;
}

export interface BusinessCategoryTypeRecord {
  id: string;
  code: string;
  name: string;
  englishName: string;
  builtIn: boolean;
  items: BusinessCategoryOptionRecord[];
}

export interface ResourceRecord extends ResourceAuditRecord {
  [key: string]: string | number | null | undefined;
  id: string;
  code: string;
  name: string;
  status: ResourceStatus;
}

export interface CityRecord extends ResourceRecord {
  province: string;
}

export interface TourismResourceRecord extends ResourceRecord {
  city: string;
  countryOrRegion: string;
  contact: string;
  email: string;
  phone: string;
  remark: string;
}

export interface SupplierRecord extends TourismResourceRecord {}

export interface SupplierOptionRecord {
  id: string;
  code: string;
  name: string;
}

export interface TransportRecord extends ResourceRecord {
  serviceLevel: VehicleServiceLevel;
  seats: number;
  dailyPrice: number;
  unit: ItineraryPriceUnit;
  city: string;
  phone: string;
  remark: string;
}

export interface HotelRecord extends ResourceAuditRecord {
  id: string;
  code: string;
  name: string;
  province: string;
  city: string;
  rating: HotelRating;
  facilities: string;
  breakfastIncluded: boolean;
  breakfast: string;
  address: string;
  phone: string;
  nearby: string;
  individualPrice: number;
  groupPrice: number | null;
  minimumGroupSize: number | null;
  unit: ItineraryPriceUnit;
  status: ResourceStatus;
}

export type AttractionCategory = "scenic" | "performance" | "experience" | "transport" | "package";
export type AttractionPriceItemType = "ticket" | "transport" | "guide" | "activity" | "package";

export interface AttractionPriceRecord extends ResourceAuditRecord {
  id: string;
  attractionId?: string;
  itemType: AttractionPriceItemType;
  itemName: string;
  audience: string;
  periodName: string;
  startDate: string;
  endDate: string;
  rackPrice: number;
  settlementPrice: number;
  unit: ItineraryPriceUnit;
  isFree: boolean;
  priceNote: string;
}

export interface AttractionRecord extends ResourceAuditRecord {
  id: string;
  code: string;
  name: string;
  area: string;
  category: AttractionCategory;
  restroomLocation: string;
  remark: string;
  unit: ItineraryPriceUnit;
  status: ResourceStatus;
  prices: AttractionPriceRecord[];
  priceCount?: number;
}

export type GuideGender = "male" | "female";
export type GuideEmploymentType = "full-time" | "part-time";

export interface GuideRecord extends ResourceAuditRecord {
  id: string;
  code: string;
  certificateNo: string;
  name: string;
  gender: GuideGender;
  age: number;
  languages: string[];
  employmentType: GuideEmploymentType;
  identityNumber: string;
  phone: string;
  dailyPrice: number;
  unit: ItineraryPriceUnit;
  hasLaborContract: boolean;
  groundOperatorId: string;
  licensePhotoUrl: string;
  remark: string;
  status: ResourceStatus;
}

export type RestaurantPriceUnit = string;

export interface RestaurantPriceRecord extends ResourceAuditRecord {
  id: string;
  restaurantId?: string;
  menuName: string;
  dishDetails?: string;
  unit: RestaurantPriceUnit;
  price: number;
  dinerCount: number;
  remark: string;
}

export interface RestaurantRecord extends ResourceAuditRecord {
  id: string;
  code: string;
  name: string;
  city: string;
  cuisine: string;
  contact: string;
  phone: string;
  address: string;
  remark: string;
  unit: RestaurantPriceUnit;
  status: ResourceStatus;
  prices: RestaurantPriceRecord[];
  priceCount?: number;
}
