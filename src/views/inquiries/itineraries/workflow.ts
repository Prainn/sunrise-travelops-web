import type { ItineraryRecord } from "@/types/itinerary";
import { getEnabledHotelPlans, getIncompleteHotelPlanTiers } from "./hotel-plans";
import { getEnabledVehiclePlans, getIncompleteVehiclePlanTiers } from "./vehicle-plans";
export type DayCountMismatch = "shorter" | "longer" | null;

interface ItinerarySelectionItem {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export function getDefaultItineraryId(records: ItinerarySelectionItem[], requestedId = "") {
  if (records.some((record) => record.id === requestedId)) return requestedId;
  const ordered = [...records].sort((left, right) =>
    (right.updatedAt || right.createdAt).localeCompare(left.updatedAt || left.createdAt));
  return ordered.find((record) => record.status === "draft")?.id ?? ordered[0]?.id ?? "";
}

export function getDayCountMismatch(actualDays: number, plannedDays: number): DayCountMismatch {
  if (actualDays < plannedDays) return "shorter";
  if (actualDays > plannedDays) return "longer";
  return null;
}

export interface PdfValidationIssue {
  key: string;
  target: string;
  params?: Record<string, string | number>;
}

type ItineraryValidationInput = Pick<ItineraryRecord,
  "dailyPlans" | "hotelPlans" | "vehiclePlans" | "paxTiers" | "guidePlans" | "quote">;

export function getItineraryValidationIssues(plan: ItineraryValidationInput): PdfValidationIssue[] {
  const issues: PdfValidationIssue[] = [];
  const days = plan.dailyPlans;
  if (!days.length) issues.push({ key: "itinerary.validation.noDays", target: "itinerary-daily" });
  for (const day of days) {
    const target = `day-${day.id}`;
    const params = { day: day.dayNumber };
    if (!day.description?.trim()) {
      issues.push({ key: "itinerary.validation.schedule", target, params });
    }
    if (day.overnightDestination === null) issues.push({ key: "itinerary.validation.overnight", target, params });
    for (const slot of ["lunch", "dinner"] as const) {
      if (day.meals[slot] && !day.items.some((item) => item.type === "restaurant" && item.mealSlot === slot)) {
        issues.push({ key: `itinerary.validation.${slot}`, target, params });
      }
    }
  }
  if (!getEnabledHotelPlans(plan).length) {
    issues.push({ key: "itinerary.pdfHotelPlanRequired", target: "itinerary-hotels" });
  } else if (getIncompleteHotelPlanTiers(plan).length) {
    issues.push({ key: "itinerary.validation.hotels", target: "itinerary-hotels" });
  }
  if (!getEnabledVehiclePlans(plan).length || getIncompleteVehiclePlanTiers(plan).length) {
    issues.push({ key: "itinerary.validation.vehicles", target: "itinerary-vehicles" });
  }
  if (plan.guidePlans.some((guide) => !guide.serviceDays)) {
    issues.push({ key: "itinerary.guideDatesRequired", target: "itinerary-guides" });
  }
  plan.quote.transportFees.forEach((fee, index) => {
    if ((!fee.departureCity.trim() || !fee.arrivalCity.trim() || fee.departureCity === fee.arrivalCity)
      || fee.unitPrice === null || !Number.isFinite(fee.unitPrice) || fee.unitPrice < 0) {
      issues.push({ key: "itinerary.validation.transportFee", target: "quote", params: { index: index + 1 } });
    }
  });
  return issues;
}
