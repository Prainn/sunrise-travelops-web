export type DayCountMismatch = "shorter" | "longer" | null;

export function getDayCountMismatch(actualDays: number, plannedDays: number): DayCountMismatch {
  if (actualDays < plannedDays) return "shorter";
  if (actualDays > plannedDays) return "longer";
  return null;
}

export interface PdfValidationDay {
  dayNumber: number;
  items: Array<{ resourceName: string; unitPrice: number | null }>;
}

export interface PdfValidationResult {
  emptyDayNumbers: number[];
  missingPriceItems: Array<{ dayNumber: number; resourceName: string }>;
}

export function validateItineraryForPdf(days: PdfValidationDay[]): PdfValidationResult {
  return {
    emptyDayNumbers: days.filter((day) => day.items.length === 0).map((day) => day.dayNumber),
    missingPriceItems: days.flatMap((day) => day.items
      .filter((item) => item.unitPrice === null)
      .map((item) => ({ dayNumber: day.dayNumber, resourceName: item.resourceName }))),
  };
}
