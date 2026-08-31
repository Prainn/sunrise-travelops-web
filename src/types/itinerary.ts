export type ItineraryStatus = "draft" | "ready_for_costing" | "quoted" | "archived";

export type ItineraryItemType = "hotel" | "attraction" | "restaurant" | "vehicle" | "guide";
export type ItineraryPriceUnit = string;

export interface ItineraryQuoteSettings {
  adultUnitPrice: number | null;
}

export type ItineraryQuoteLineType = "adult" | "child";

export interface ItineraryQuoteLine {
  type: ItineraryQuoteLineType;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ItineraryQuoteCalculation {
  hotelGuestCount: number;
  hotelRoomCount: number;
  baseGroupCost: number;
  baseCostPerPerson: number;
  adultUnitPrice: number;
  childUnitPrice: number;
  singleSupplementUnitCost: number;
  totalPrice: number;
  profit: number;
  actualMarginRate: number;
  lines: ItineraryQuoteLine[];
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
  operationsCoordinator: string;
  quote: ItineraryQuoteSettings;
  dailyPlans: ItineraryDayRecord[];
  status: ItineraryStatus;
  quoteGeneratedAt: string;
  creator: string;
  createdAt: string;
  updatedAt: string;
}
