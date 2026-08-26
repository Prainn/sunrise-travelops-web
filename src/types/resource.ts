import type { ItineraryItemType, ItineraryPriceUnit } from "./itinerary";

export type ResourceStatus = "enabled" | "disabled";
export type TourismResourceType = "agency" | "supplier" | "transport";

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

export interface TourismResourceRecord {
  [key: string]: string | number;
  id: string;
  code: string;
  name: string;
  city: string;
  countryOrRegion: string;
  contact: string;
  email: string;
  phone: string;
  status: ResourceStatus;
  remark: string;
}

export interface HotelPricePlanRecord {
  id: string;
  periodName: string;
  startDate: string;
  endDate: string;
  individualPrice: number;
  groupPrice: number;
  unit: ItineraryPriceUnit;
  minimumRooms: number;
  isGroundOperatorProvided: boolean;
  groundOperatorId: string;
}

export interface HotelRoomTypeRecord {
  id: string;
  name: string;
  rackRate: number;
  pricePlans: HotelPricePlanRecord[];
}

export interface HotelRecord {
  id: string;
  code: string;
  name: string;
  province: string;
  city: string;
  rating: string;
  facilities: string;
  breakfast: string;
  address: string;
  phone: string;
  nearby: string;
  unit: ItineraryPriceUnit;
  status: ResourceStatus;
  roomTypes: HotelRoomTypeRecord[];
}

export type AttractionCategory = "scenic" | "performance" | "experience" | "transport" | "package";
export type AttractionPriceItemType = "ticket" | "transport" | "guide" | "activity" | "package";

export interface AttractionPriceRecord {
  id: string;
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
  isGroundOperatorProvided: boolean;
  groundOperatorId: string;
}

export interface AttractionRecord {
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
}

export type GuideGender = "male" | "female";
export type GuideEmploymentType = "full-time" | "part-time";

export interface GuideRecord {
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
  isGroundOperatorProvided: boolean;
  groundOperatorId: string;
  licensePhotoUrl: string;
  remark: string;
  status: ResourceStatus;
}

export type RestaurantPriceUnit = string;

export interface RestaurantPriceRecord {
  id: string;
  menuName: string;
  dishDetails?: string;
  unit: RestaurantPriceUnit;
  price: number;
  dinerCount: number;
  remark: string;
  isGroundOperatorProvided: boolean;
  groundOperatorId: string;
}

export interface RestaurantRecord {
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
}
