import type { WebsiteDay } from "@/types/website";

export function nightlyMoney(cents: bigint): string {
  return `${cents / 100n}.${String(cents % 100n).padStart(2, "0")}`;
}

function cents(amount: string): bigint {
  const [whole, fraction = ""] = amount.split(".");
  return BigInt(whole!) * 100n + BigInt(fraction.padEnd(2, "0"));
}

export function nightlyRoomTotal(rate: string | null | undefined, rooms: number | null | undefined): bigint | null {
  if (rate == null || !/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/.test(rate) || !rooms || !Number.isInteger(rooms) || rooms < 1 || rooms > 10000) return null;
  return cents(rate) * BigInt(rooms);
}

export function nightlyAccommodation(days: WebsiteDay[]) {
  const hasHotels = days.some(day => day.hotels.length > 0);
  const missingDays: number[] = [];
  let total = 0n;
  for (const day of days) {
    if (!day.overnightCityId || !hasHotels) continue;
    const stays = day.hotels.filter(hotel => hotel.nightlySelected);
    let complete = stays.length > 0;
    for (const hotel of stays) {
      const subtotal = nightlyRoomTotal(hotel.nightlyRate, hotel.nightlyRooms);
      if (subtotal === null) complete = false;
      else total += subtotal;
    }
    if (!complete) missingDays.push(day.dayNumber);
  }
  return { hasHotels, missingDays, total: missingDays.length ? null : total };
}

/** Keep the exact group amount when dividing room charges leaves a fraction of a cent. */
export function nightlyPackage(hotels: ReturnType<typeof nightlyAccommodation>, otherPerPerson: string | null, pax: number | null) {
  const empty = { unitPrice: null, totalPrice: null, hotelPerPerson: null, overflow: false };
  if (!pax || hotels.total === null || (!hotels.hasHotels && otherPerPerson === null)) return empty;
  const guests = BigInt(pax);
  const hotelUnit = (hotels.total + guests / 2n) / guests;
  const other = otherPerPerson === null ? 0n : cents(otherPerPerson);
  if (hotelUnit + other > 999999999999n) return { ...empty, overflow: true };
  return {
    unitPrice: nightlyMoney(hotelUnit + other),
    totalPrice: nightlyMoney(hotels.total + other * guests),
    hotelPerPerson: hotels.hasHotels ? nightlyMoney(hotelUnit) : null,
    overflow: false,
  };
}
