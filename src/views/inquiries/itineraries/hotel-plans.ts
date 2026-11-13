import type { ItineraryHotelPlan, ItineraryHotelTier, ItineraryRecord } from "@/types/itinerary";
import type { HotelRecord } from "@/types/resource";

export const HOTEL_PLAN_TIERS: ItineraryHotelTier[] = [3, 4, 5];

/** 全部活动日都明确不住宿（overnightDestination 为空字符串）；任一 null 仍是待填写。 */
export function isNoAccommodationItinerary(itinerary: Pick<ItineraryRecord, "dailyPlans">) {
  return (
    itinerary.dailyPlans.length > 0 &&
    itinerary.dailyPlans.every((day) => day.overnightDestination === "")
  );
}

export function createDefaultHotelPlans(): ItineraryHotelPlan[] {
  return HOTEL_PLAN_TIERS.map((tier) => ({ tier, hotels: [] }));
}

export function isHotelEligibleForTier(
  hotel: Pick<HotelRecord, "rating">,
  tier: ItineraryHotelTier,
) {
  return hotel.rating === tier;
}

export function getHotelPlan(
  itinerary: Pick<ItineraryRecord, "hotelPlans">,
  tier: ItineraryHotelTier,
) {
  return itinerary.hotelPlans.find((plan) => plan.tier === tier);
}

export function getEnabledHotelPlans(itinerary: Pick<ItineraryRecord, "hotelPlans">) {
  return HOTEL_PLAN_TIERS.flatMap((tier) => {
    const plan = getHotelPlan(itinerary, tier);
    return plan?.hotels.length ? [plan] : [];
  });
}

export function isHotelPlanComplete(plan: ItineraryHotelPlan, destinations: string[]) {
  return (
    destinations.length > 0 &&
    destinations.every((destination) =>
      plan.hotels.some((hotel) => hotel.destination === destination && hotel.hotelId),
    )
  );
}

export function getIncompleteHotelPlanTiers(
  itinerary: Pick<ItineraryRecord, "dailyPlans" | "hotelPlans">,
) {
  return getEnabledHotelPlans(itinerary)
    .filter(
      (plan) => !isHotelPlanComplete(plan, Object.keys(calculateDestinationNights(itinerary))),
    )
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

export function getDayBreakfastStatus(
  itinerary: Pick<ItineraryRecord, "dailyPlans" | "hotelPlans">,
  dayIndex: number,
): "included" | "excluded" | "pending" {
  const previous = itinerary.dailyPlans[dayIndex - 1];
  if (!previous || previous.overnightDestination === "") return "excluded";
  if (previous.overnightDestination === null) return "pending";
  // 冻结报价可能保留旧档位，早餐按保存的酒店计划判断，不受当前可选档位限制。
  const plans = itinerary.hotelPlans.filter((plan) => plan.hotels.length);
  if (
    !plans.length ||
    plans.some(
      (plan) => !plan.hotels.some((hotel) => hotel.destination === previous.overnightDestination),
    )
  )
    return "pending";
  return "included";
}
