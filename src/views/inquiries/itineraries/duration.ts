import type { ItineraryDayRecord } from "@/types/itinerary";
export function plannedDuration(days: number) {
  return { days, nights: Math.max(days - 1, 0) };
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
