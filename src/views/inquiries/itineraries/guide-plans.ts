import type { ItineraryDayRecord, ItineraryGuidePlan } from "@/types/itinerary";

export function getAvailableGuideDays(
  dailyPlans: ItineraryDayRecord[],
  guidePlans: ItineraryGuidePlan[],
  destination: string
) {
  const occupied = new Set(guidePlans
    .filter(plan => plan.destination !== destination)
    .flatMap(plan => plan.dayIds));
  return dailyPlans.filter(day => !occupied.has(day.id));
}
