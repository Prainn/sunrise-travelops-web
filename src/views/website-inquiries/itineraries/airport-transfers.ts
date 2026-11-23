import type { WebsiteDay, WebsiteItinerary, WebsiteLeg } from "@/types/website";

export interface AirportTransferOptions {
  pickup: boolean;
  dropoff: boolean;
}

export function airportTransferOptions(plan: WebsiteItinerary, day?: WebsiteDay): AirportTransferOptions | undefined {
  if (plan.businessUnit !== "website" || !day) return;
  const pickup = day.dayNumber === 1;
  const dropoff = day.dayNumber === (plan.serviceDates?.length ?? plan.days.length);
  if (pickup || dropoff) return { pickup, dropoff };
}

export function setTransportLeg(day: WebsiteDay, selected: WebsiteLeg) {
  for (const other of day.legs) {
    if (other.id === selected.id) continue;
    if (selected.isAirportPickup && other.isAirportPickup) other.isAirportPickup = false;
    if (selected.isAirportDropoff && other.isAirportDropoff) other.isAirportDropoff = false;
  }
  const index = day.legs.findIndex(leg => leg.id === selected.id);
  if (index === -1) day.legs.push(selected);
  else day.legs.splice(index, 1, selected);
}

export function alignAirportTransfers(days: WebsiteDay[], lastDayNumber: number): WebsiteDay[] {
  return days.map(day => {
    const clearPickup = day.dayNumber !== 1 && day.legs.some(leg => leg.isAirportPickup);
    const clearDropoff = day.dayNumber !== lastDayNumber && day.legs.some(leg => leg.isAirportDropoff);
    if (!clearPickup && !clearDropoff) return day;
    return { ...day, legs: day.legs.map(leg => ({
      ...leg,
      ...(clearPickup && leg.isAirportPickup && { isAirportPickup: false }),
      ...(clearDropoff && leg.isAirportDropoff && { isAirportDropoff: false }),
    })) };
  });
}
