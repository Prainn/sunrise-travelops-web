import type { ItineraryDayRecord } from "@/types/itinerary";
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

export function validateItineraryForPdf(days: ItineraryDayRecord[], destinations: string[]): PdfValidationIssue[] {
  const issues: PdfValidationIssue[] = [];
  if (!days.length) issues.push({ key: "itinerary.validation.noDays", target: "itinerary-plans" });
  for (const [index, day] of days.entries()) {
    const target = `day-${day.id}`;
    const params = { day: day.dayNumber };
    if (!day.departure.trim() || !day.destination.trim() || !day.description?.trim()) {
      issues.push({ key: "itinerary.validation.schedule", target, params });
    }
    if ((day.destination && !destinations.includes(day.destination)) || (index > 0 && day.departure && !destinations.includes(day.departure))) issues.push({ key: "itinerary.validation.routeCity", target, params });
    if (day.overnightDestination === null) issues.push({ key: "itinerary.validation.overnight", target, params });
    for (const slot of ["lunch", "dinner"] as const) {
      if (day.meals[slot] && !day.items.some((item) => item.type === "restaurant" && item.mealSlot === slot)) {
        issues.push({ key: `itinerary.validation.${slot}`, target, params });
      }
    }
  }
  return issues;
}
