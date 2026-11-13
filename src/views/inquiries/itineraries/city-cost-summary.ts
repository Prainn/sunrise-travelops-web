import type { ItineraryQuoteCalculation } from "@/types/itinerary";
import { sumMoney } from "@/utils/money";

export function summarizeResourceCostsByCity(
  details: NonNullable<ItineraryQuoteCalculation["mealDetails"]>,
) {
  // Older API responses and frozen quotes do not carry resource city information.
  if (details.some((detail) => detail.city === undefined)) return null;
  const summaries = new Map<string, { city: string; totalCost: number | null }>();
  for (const detail of details) {
    const city = detail.city?.trim() ?? "";
    const summary = summaries.get(city) ?? { city, totalCost: 0 };
    summary.totalCost = summary.totalCost === null || detail.totalCost === null
      ? null
      : sumMoney([summary.totalCost, detail.totalCost]);
    summaries.set(city, summary);
  }
  return [...summaries.values()];
}
