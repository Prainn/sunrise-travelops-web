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

export interface PdfValidationDay {
  dayNumber: number;
  items: unknown[];
}

export interface PdfValidationResult {
  emptyDayNumbers: number[];
}

export function validateItineraryForPdf(days: PdfValidationDay[]): PdfValidationResult {
  return {
    emptyDayNumbers: days.filter((day) => day.items.length === 0).map((day) => day.dayNumber),
  };
}
