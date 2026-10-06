import type {
  FeeState,
  VehicleType,
  WebsiteDay,
  WebsiteInquiryInput,
  WebsiteItineraryInput,
} from "@/types/website";

export const FEE_OPTIONS: Array<{ value: FeeState; labelKey: string }> = [
  { value: "INCLUDED", labelKey: "websiteInquiry.feeStates.INCLUDED" },
  { value: "EXCLUDED", labelKey: "websiteInquiry.feeStates.EXCLUDED" },
  { value: "OPTIONAL", labelKey: "websiteInquiry.feeStates.OPTIONAL" },
  { value: "RECOMMENDED", labelKey: "websiteInquiry.feeStates.RECOMMENDED" },
  { value: "ARRANGED", labelKey: "websiteInquiry.feeStates.ARRANGED" },
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
export const INQUIRY_STATUS_LABEL_KEYS = {
  new: "websiteInquiry.statuses.new",
  planning: "websiteInquiry.statuses.planning",
  quoted: "websiteInquiry.statuses.quoted",
  lost: "websiteInquiry.statuses.lost",
  archived: "websiteInquiry.statuses.archived",
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
  title: string,
): WebsiteItineraryInput {
  return {
    title,
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
