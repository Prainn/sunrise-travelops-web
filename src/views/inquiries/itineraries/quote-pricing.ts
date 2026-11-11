import type {
  ItineraryQuoteOption,
  ItineraryQuoteSettings,
  ItineraryHotelTier,
  ItineraryVehicleTier,
} from "@/types/itinerary";

export function createDefaultQuoteOption(
  hotelTier: ItineraryHotelTier | null,
  vehicleTier: ItineraryVehicleTier,
  id = `quote-option-${hotelTier ?? "none"}-${vehicleTier}`,
): ItineraryQuoteOption {
  return {
    id,
    hotelTier,
    vehicleTier,
    paxPrices: [],
  };
}
export function createDefaultQuoteSettings(): ItineraryQuoteSettings {
  return {
    mealOtherCost: null,
    mealOtherReason: "",
    attractionOtherCost: null,
    attractionOtherReason: "",
    paxOtherCosts: [],
    staffRoomCosts: [],
    options: [],
    chineseTip: null,
    englishTip: null,
    transportFees: [],
    customerNotes: "",
    holidayRestrictions: "",
    hotelReplacementTerms: "如所列酒店满房，将调整为同级酒店。",
    customerNotesEn: "",
    holidayRestrictionsEn: "",
    hotelReplacementTermsEn: "",
  };
}

/** 客户文件返程展示日的默认文案，与后端默认值一致。 */
export const DEFAULT_RETURN_ARRIVAL_TEXT = "返回温馨的家";
export const DEFAULT_RETURN_ARRIVAL_TEXT_EN = "Arrive home";
