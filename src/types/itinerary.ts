export type ItineraryStatus = "draft" | "ready_for_costing" | "quoted" | "archived";

export type ItineraryItemType = "hotel" | "attraction" | "restaurant" | "vehicle" | "guide";
export type ItineraryPriceUnit = string;

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
  unitCost: number;
  unitPrice: number | null;
  totalCost: number;
  totalPrice: number;
  remark: string;
}

export interface ItineraryDayRecord {
  id: string;
  dayNumber: number;
  date: string;
  departure: string;
  destination: string;
  transport: string;
  title: string;
  description: string;
  mealSummary: string;
  accommodationSummary: string;
  items: ItineraryResourceItem[];
}

export interface ItineraryRecord {
  id: string;
  inquiryId: string;
  code: string;
  title: string;
  destinations: string;
  startDate: string;
  endDate: string;
  days: number;
  adults: number;
  childrenCount: number;
  otherGuests: number;
  hotelLevel: string;
  roomPreference: string;
  transportPreference: string;
  guideRequired: boolean;
  guideLanguage: string;
  pace: string;
  mealRequirements: string;
  budget: number;
  specialRequirements: string;
  inquiryCoordinatorNotes: string;
  operationsCoordinator: string;
  dailyPlans: ItineraryDayRecord[];
  status: ItineraryStatus;
  creator: string;
  createdAt: string;
  updatedAt: string;
}
