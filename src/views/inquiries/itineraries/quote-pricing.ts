import type { ItineraryQuoteOption, ItineraryQuoteSettings, ItineraryHotelTier, ItineraryVehicleTier } from "@/types/itinerary";

export function createDefaultQuoteOption(
  hotelTier: ItineraryHotelTier,
  vehicleTier: ItineraryVehicleTier,
  id = `quote-option-${hotelTier}-${vehicleTier}`
): ItineraryQuoteOption {
  return {
    id,
    hotelTier,
    vehicleTier,
    adultUnitPrice: null,
    leaderFocEnabled: false,
  };
}
export function createDefaultQuoteSettings(): ItineraryQuoteSettings {
  return {
    options: [], chineseTip: null, englishTip: null, transportFees: [], otherExpenses: null,
    customerNotes: "", holidayRestrictions: "",
    hotelReplacementTerms: "如所列酒店满房，将调整为同级酒店。",
  };
}
