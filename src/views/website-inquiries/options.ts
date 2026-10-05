import type {
  FeeState,
  VehicleType,
  WebsiteDay,
  WebsiteInquiryInput,
  WebsiteItineraryInput,
} from "@/types/website";

export const FEE_OPTIONS: Array<{ value: FeeState; label: string }> = [
  { value: "INCLUDED", label: "包含" },
  { value: "EXCLUDED", label: "不含" },
  { value: "OPTIONAL", label: "可选自费" },
  { value: "RECOMMENDED", label: "仅推荐" },
  { value: "ARRANGED", label: "已安排（不代表包含）" },
  { value: "SELF_PAY", label: "自理" },
  { value: "UNKNOWN", label: "待确认" },
];
export const VEHICLE_OPTIONS: Array<{ value: VehicleType; label: string; seats: number }> = [
  { value: "5_seat", label: "5-seat vehicle", seats: 5 },
  { value: "7_seat", label: "7-seat vehicle", seats: 7 },
  { value: "9_seat", label: "9-seat vehicle", seats: 9 },
  { value: "14_seat", label: "14-seat vehicle", seats: 14 },
  { value: "18_seat", label: "18-seat vehicle", seats: 18 },
];
export const TRANSPORT_OPTIONS = [
  { value: "hsr", label: "高铁" },
  { value: "private_vehicle", label: "专车" },
  { value: "flight", label: "飞机" },
  { value: "other", label: "其他" },
];
export const INQUIRY_STATUS_LABELS = {
  new: "新询盘",
  planning: "规划中",
  quoted: "已报价",
  lost: "已流失",
  archived: "已归档",
};
export function cloneWebsiteDraft<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
export function emptyInquiry(): WebsiteInquiryInput {
  return {
    customerName: "",
    plannedDays: 1,
    requirements: "",
    phone: "",
    email: "",
    startDate: null,
    pax: null,
    arrivalTime: "",
    departureTime: "",
    destinations: [],
    internalRemark: "",
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
    guideScope: "",
    services: [],
  };
}
export function emptyItinerary(
  inquiry: WebsiteInquiryInput,
  configVersion: number,
): WebsiteItineraryInput {
  return {
    title: `${inquiry.customerName}行程`,
    duration: inquiry.plannedDays,
    startDate: inquiry.startDate,
    pax: inquiry.pax,
    arrivalTime: inquiry.arrivalTime,
    departureTime: inquiry.departureTime,
    configVersion,
    days: [],
    vehiclePrices: VEHICLE_OPTIONS.map((option) => ({
      vehicleType: option.value,
      unitPrice: null,
    })),
  };
}
