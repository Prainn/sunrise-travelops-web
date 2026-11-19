import type { ItineraryDayRecord } from "@/types/itinerary";
import { addDays } from "@/utils";

export function plannedEndDate(startDate: string, days: number) {
  return startDate && days > 0 ? addDays(startDate, days - 1) : "";
}

/** 普通行程可暂不定日期；未定时逐日日期为空字符串，日序仍从 D1 起。 */
export function itineraryDayDate(startDate: string | null | undefined, index: number) {
  return startDate ? addDays(startDate, index) : "";
}

/** ISO 日期按 UTC 比较，日序不受夏令时影响。 */
export function itineraryDayNumber(startDate: string, date: string): number | undefined {
  if (!startDate || !date) return undefined;
  const day = (Date.parse(date) - Date.parse(startDate)) / 86_400_000 + 1;
  return Number.isInteger(day) && day > 0 ? day : undefined;
}

export function itineraryDuration(days: ItineraryDayRecord[]) {
  return {
    days: days.length,
    nights: days.filter((day) => Boolean(day.overnightDestination)).length,
  };
}
export function destinationDuration(days: ItineraryDayRecord[], destination: string) {
  return {
    days: days.filter((day) =>
      [day.departure, day.destination, day.overnightDestination].includes(destination),
    ).length,
    nights: days.filter((day) => day.overnightDestination === destination).length,
  };
}
