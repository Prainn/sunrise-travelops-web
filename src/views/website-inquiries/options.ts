import { toRaw } from "vue";
import type {
  FeeState,
  VehicleType,
  WebsiteDay,
  WebsiteInquiryInput,
  WebsiteItineraryInput,
  WebsiteMeal,
} from "@/types/website";

export const FEE_OPTIONS: Array<{ value: FeeState; labelKey: string }> = [
  { value: "INCLUDED", labelKey: "websiteInquiry.feeStates.INCLUDED" },
  { value: "EXCLUDED", labelKey: "websiteInquiry.feeStates.EXCLUDED" },
  { value: "OPTIONAL", labelKey: "websiteInquiry.feeStates.OPTIONAL" },
  { value: "RECOMMENDED", labelKey: "websiteInquiry.feeStates.RECOMMENDED" },
  { value: "SELF_PAY", labelKey: "websiteInquiry.feeStates.SELF_PAY" },
  { value: "UNKNOWN", labelKey: "websiteInquiry.feeStates.UNKNOWN" },
];
export const VEHICLE_OPTIONS: Array<{ value: VehicleType; labelKey: string; seats: number }> = [
  { value: "5_seat", labelKey: "websiteInquiry.vehicleTypes.5_seat", seats: 5 },
  { value: "7_seat", labelKey: "websiteInquiry.vehicleTypes.7_seat", seats: 7 },
  { value: "9_seat", labelKey: "websiteInquiry.vehicleTypes.9_seat", seats: 9 },
  { value: "14_seat", labelKey: "websiteInquiry.vehicleTypes.14_seat", seats: 14 },
  { value: "18_seat", labelKey: "websiteInquiry.vehicleTypes.18_seat", seats: 18 },
];
export const TRANSPORT_OPTIONS = [
  { value: "hsr", labelKey: "websiteInquiry.transportModes.hsr" },
  { value: "private_vehicle", labelKey: "websiteInquiry.transportModes.private_vehicle" },
  { value: "flight", labelKey: "websiteInquiry.transportModes.flight" },
  { value: "other", labelKey: "websiteInquiry.transportModes.other" },
];
export function cloneWebsiteDraft<T>(value: T): T {
  return structuredClone(toRaw(value));
}
export function emptyInquiry(): WebsiteInquiryInput {
  return {
    countryItemId: "",
    customerName: "",
    plannedDays: 1,
    requirements: "",
    contactInfo: "",
    receivedAt: null,
    contactChannel: "",
    whatsappSourceId: "",
    websiteInquiryNo: "",
    landingPage: "",
    acquisitionSource: "",
    startDate: null,
    pax: null,
    destinations: [],
    internalRemark: "",
    status: "new",
    lostReason: "",
  };
}
export function emptyDay(dayNumber: number): WebsiteDay {
  return {
    id: crypto.randomUUID(),
    dayNumber,
    departCityId: "",
    endCityId: "",
    overnightCityId: null,
    items: [],
    legs: [],
    hotels: [],
    meals: ["breakfast", "lunch", "dinner"].map((slot) => ({
      id: crypto.randomUUID(),
      slot: slot as "breakfast" | "lunch" | "dinner",
      resourceId: null,
      restaurantZh: "",
      restaurantEn: "",
      feeState: "SELF_PAY",
    })),
    guideLanguage: "",
    services: [],
  };
}
/** 餐次已安排：指定了餐厅，或费用状态不再是新增一天时的默认“自理”；未安排的餐次不在日卡中展示。 */
export function isMealArranged(meal: WebsiteMeal) {
  return Boolean(meal.resourceId || meal.restaurantZh || meal.restaurantEn) || meal.feeState !== "SELF_PAY";
}
export function emptyItinerary(
  inquiry: WebsiteInquiryInput,
  configVersion: number,
  title: string,
): WebsiteItineraryInput {
  return {
    title,
    duration: inquiry.plannedDays,
    startDate: inquiry.startDate,
    pax: inquiry.pax,
    configVersion,
    days: [],
    // 报价组合由当前日程的车型×酒店档次派生，新行程不预置价格行。
    vehiclePrices: [],
  };
}
