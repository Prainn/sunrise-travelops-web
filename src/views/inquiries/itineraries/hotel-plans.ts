import type {
  ItineraryDayRecord,
  ItineraryHotelPlan,
  ItineraryHotelSelection,
  ItineraryHotelTier,
  ItineraryRecord,
} from "@/types/itinerary";
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

/** 酒店按档次、按住宿日选择；旧冻结快照没有 dayId，按住宿城市匹配。 */
export function hotelForDay<T extends Pick<ItineraryHotelSelection, "destination" | "dayId">>(
  hotels: T[],
  day: Pick<ItineraryDayRecord, "id" | "overnightDestination">,
): T | undefined {
  if (!day.overnightDestination) return undefined;
  return hotels.find((hotel) =>
    hotel.dayId ? hotel.dayId === day.id : hotel.destination === day.overnightDestination,
  );
}

/** 有住宿城市的活动日。 */
export function getOvernightDays(itinerary: Pick<ItineraryRecord, "dailyPlans">) {
  return itinerary.dailyPlans.filter((day) => day.overnightDestination);
}

export function isHotelPlanComplete(
  plan: ItineraryHotelPlan,
  dailyPlans: ItineraryRecord["dailyPlans"],
) {
  const days = getOvernightDays({ dailyPlans });
  return days.length > 0 && days.every((day) => hotelForDay(plan.hotels, day)?.hotelId);
}

/** 删除不再属于活动住宿日或城市已变化的酒店。 */
export function pruneDayHotels(itinerary: Pick<ItineraryRecord, "dailyPlans" | "hotelPlans">) {
  let changed = false;
  for (const plan of itinerary.hotelPlans) {
    const hotels = plan.hotels.filter((hotel) =>
      itinerary.dailyPlans.some(
        (day) => day.id === hotel.dayId && day.overnightDestination === hotel.destination,
      ),
    );
    if (hotels.length !== plan.hotels.length) {
      plan.hotels = hotels;
      changed = true;
    }
  }
  return changed;
}

export function getIncompleteHotelPlanTiers(
  itinerary: Pick<ItineraryRecord, "dailyPlans" | "hotelPlans">,
) {
  return getEnabledHotelPlans(itinerary)
    .filter((plan) => !isHotelPlanComplete(plan, itinerary.dailyPlans))
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
    plans.some((plan) => !hotelForDay(plan.hotels, previous))
  )
    return "pending";
  return "included";
}
