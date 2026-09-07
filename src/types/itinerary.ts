export type ItineraryStatus = "draft" | "ready_for_costing" | "quoted" | "archived";

export type ItineraryItemType = "hotel" | "attraction" | "restaurant" | "vehicle" | "guide";
export type ItineraryDailyItemType = Extract<ItineraryItemType, "attraction" | "restaurant">;
export type ItineraryPriceUnit = string;
export type ItineraryHotelTier = "international_five_star" | "preferred_non_five_star";
export type ItineraryVehicleTier = VehicleServiceLevel;

export interface ItineraryHotelSelection {
  destination: string;
  hotelId: string;
  hotelName: string;
  rating: string;
  roomType: string;
  breakfast: string;
  unit: ItineraryPriceUnit;
  unitCost: number;
}

export interface ItineraryHotelPlan {
  tier: ItineraryHotelTier;
  hotels: ItineraryHotelSelection[];
}

export interface ItineraryVehicleSelection {
  vehicleId: string;
  vehicleName: string;
  plateNumber: string;
  seats: number;
  serviceDays: number;
  unit: ItineraryPriceUnit;
  referenceUnitCost: number;
  unitCost: number;
}

export interface ItineraryVehiclePlan {
  tier: ItineraryVehicleTier;
  vehicle: ItineraryVehicleSelection | null;
}

export interface ItineraryQuoteOption {
  id: string;
  hotelTier: ItineraryHotelTier;
  vehicleTier: ItineraryVehicleTier;
  adultUnitPrice: number | null;
  leaderFocEnabled: boolean;
}

export interface ItineraryQuoteSettings {
  options: ItineraryQuoteOption[];
}

export type ItineraryQuoteLineType = "adult" | "child";

export interface ItineraryQuoteLine {
  type: ItineraryQuoteLineType;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ItineraryQuoteOptionCalculation {
  optionId: string;
  hotelTier: ItineraryHotelTier;
  vehicleTier: ItineraryVehicleTier;
  hotelCost: number;
  vehicleCost: number;
  commonGroupCost: number;
  baseGroupCost: number;
  baseCostPerPerson: number;
  singleSupplementUnitCost: number;
  adultUnitPrice: number;
  childUnitPrice: number;
  totalPrice: number;
  profit: number;
  actualMarginRate: number;
  lines: ItineraryQuoteLine[];
}

export interface ItineraryQuoteCalculation {
  hotelGuestCount: number;
  hotelRoomCount: number;
  dailyResourceCost: number;
  options: ItineraryQuoteOptionCalculation[];
}

export interface ItineraryResourceItem {
  id: string;
  type: ItineraryItemType;
  resourceId: string;
  resourcePriceId: string;
  resourceName: string;
  priceName: string;
  providerName: string;
  quantity: number;
  unit: ItineraryPriceUnit;
  referenceUnitCost?: number;
  unitCost: number;
  totalCost: number;
  remark: string;
}

export interface ItineraryDayRecord {
  id: string;
  dayNumber: number;
  date: string;
  departure: string;
  destination: string;
  overnightDestination: string;
  transport: string;
  description?: string;
  items: ItineraryResourceItem[];
}

export interface ItineraryRecord {
  id: string;
  inquiryId: string;
  code: string;
  title: string;
  startDate: string;
  endDate: string;
  days: number;
  adults: number;
  childrenCount: number;
  destinations: string[];
  hotelPlans: ItineraryHotelPlan[];
  vehiclePlans: ItineraryVehiclePlan[];
  operationsCoordinator: string;
  quote: ItineraryQuoteSettings;
  dailyPlans: ItineraryDayRecord[];
  status: ItineraryStatus;
  quoteGeneratedAt: string;
  creator: string;
  createdAt: string;
  updatedAt: string;
}
import type { VehicleServiceLevel } from "./resource";
