import type { ItineraryHotelPlan, ItineraryHotelTier, ItineraryRecord } from "@/types/itinerary";
import type { HotelRecord } from "@/types/resource";

export const HOTEL_PLAN_TIERS: ItineraryHotelTier[] = ["international_five_star", "preferred_non_five_star"];

export const HOTEL_PLAN_TIER_LABELS: Record<ItineraryHotelTier, string> = {
  international_five_star: "国际五星",
  preferred_non_five_star: "携程优选",
};

export function createDefaultHotelPlans(): ItineraryHotelPlan[] {
  return HOTEL_PLAN_TIERS.map((tier) => ({ tier, hotels: [] }));
}

export function isHotelEligibleForTier(hotel: Pick<HotelRecord, "rating">, tier: ItineraryHotelTier) {
  return tier === "international_five_star"
    ? hotel.rating === "international_five_star"
    : hotel.rating === "ctrip_preferred";
}

export function getHotelPlan(itinerary: Pick<ItineraryRecord, "hotelPlans">, tier: ItineraryHotelTier) {
  return itinerary.hotelPlans.find((plan) => plan.tier === tier);
}

export function getHotelPlanSelection(
  itinerary: Pick<ItineraryRecord, "hotelPlans">,
  tier: ItineraryHotelTier,
  destination: string
) {
  return getHotelPlan(itinerary, tier)?.hotels.find((hotel) => hotel.destination === destination);
}

export function getEnabledHotelPlans(itinerary: Pick<ItineraryRecord, "hotelPlans">) {
  return HOTEL_PLAN_TIERS.flatMap((tier) => {
    const plan = getHotelPlan(itinerary, tier);
    return plan?.hotels.length ? [plan] : [];
  });
}

export function isHotelPlanComplete(plan: ItineraryHotelPlan, destinations: string[]) {
  return destinations.length > 0
    && destinations.every((destination) => plan.hotels.some((hotel) => hotel.destination === destination && hotel.hotelId));
}

export function getIncompleteHotelPlanTiers(itinerary: Pick<ItineraryRecord, "dailyPlans" | "hotelPlans">) {
  return getEnabledHotelPlans(itinerary)
    .filter((plan) => !isHotelPlanComplete(plan, Object.keys(calculateDestinationNights(itinerary))))
    .map((plan) => plan.tier);
}

export function calculateDestinationNights(itinerary: Pick<ItineraryRecord, "dailyPlans">) {
  return itinerary.dailyPlans.reduce<Record<string, number>>((result, day) => {
    if (day.overnightDestination) {
      result[day.overnightDestination] = (result[day.overnightDestination] ?? 0) + 1;
    }
    return result;
  }, {});
}

export function getDayBreakfastStatus(itinerary: Pick<ItineraryRecord, "dailyPlans" | "hotelPlans">, dayIndex: number): "included" | "excluded" | "pending" {
  const previous = itinerary.dailyPlans[dayIndex - 1];
  if (!previous || previous.overnightDestination === "") return "excluded";
  if (previous.overnightDestination === null) return "pending";
  const plans = getEnabledHotelPlans(itinerary);
  if (!plans.length || plans.some((plan) => !plan.hotels.some((hotel) => hotel.destination === previous.overnightDestination))) return "pending";
  return "included";
}
