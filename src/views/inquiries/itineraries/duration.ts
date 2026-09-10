import type { ItineraryDayRecord } from "@/types/itinerary";
import { addDays } from "@/utils";

export function plannedDuration(days: number) {
  return { days, nights: Math.max(days - 1, 0) };
}

export function plannedEndDate(startDate: string, days: number) {
  return startDate && days > 0 ? addDays(startDate, days - 1) : "";
}

export function itineraryDuration(days: ItineraryDayRecord[]) {
  return { days: days.length, nights: days.filter((day) => Boolean(day.overnightDestination)).length };
}
export function destinationDuration(days: ItineraryDayRecord[], destination: string) {
  return {
    days: days.filter((day) => [day.departure, day.destination, day.overnightDestination].includes(destination)).length,
    nights: days.filter((day) => day.overnightDestination === destination).length,
  };
}
