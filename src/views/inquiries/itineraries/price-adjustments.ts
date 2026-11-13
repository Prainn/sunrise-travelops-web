import type { ItineraryRecord, ItineraryVehiclePlan, PriceReference } from "@/types/itinerary";
import { roundMoney } from "@/utils";
import { recalculateItem } from "./pricing";
import { vehicleSegmentPaxTotal } from "./vehicle-plans";
export function itineraryPriceRows(plan: ItineraryRecord) {
  const row = (
    key: string,
    name: string,
    fields: PriceReference,
    get: () => number | null,
    set: (price: number | null) => void,
    custom = false,
    source = "",
  ) => ({ key, name, fields, get, set, custom, source });
  return [
    ...plan.dailyPlans.flatMap((d) =>
      d.items.map((i) =>
        row(
          `item:${i.id}`,
          `D${d.dayNumber} · ${i.resourceName}`,
          i,
          () => i.unitCost,
          (v) => {
            i.unitCost = v;
            recalculateItem(i);
          },
          i.resourceId === null,
          `${i.resourceId}`,
        ),
      ),
    ),
    ...plan.hotelPlans.flatMap((p) =>
      p.hotels.map((h) =>
        row(
          `hotel:${p.tier}:${h.destination}`,
          h.hotelName,
          h,
          () => h.unitCost,
          (v) => {
            h.unitCost = v;
          },
          false,
          `${h.hotelId}:${h.referenceBasis}`,
        ),
      ),
    ),
    ...plan.guidePlans.map((g) =>
      row(
        `guide:${g.destination}`,
        g.guideName,
        g,
        () => g.dailyPrice,
        (v) => {
          g.dailyPrice = v;
        },
        false,
        g.guideId,
      ),
    ),
  ];
}
export function missingPriceReasons(plan: ItineraryRecord, previous?: ItineraryRecord): string[] {
  const old = new Map(previous ? itineraryPriceRows(previous).map((r) => [r.key, r]) : []);
  const missing: string[] = [];
  for (const item of itineraryPriceRows(plan)) {
    if (resourcePriceNeedsReason(item, old.get(item.key)) && !item.fields.adjustmentReason?.trim())
      missing.push(item.name);
  }
  for (const vehicle of plan.vehiclePlans) {
    const before = previous?.vehiclePlans.find((v) => v.tier === vehicle.tier);
    for (const price of vehicle.paxPrices ?? [])
      if (vehiclePaxPriceNeedsReason(vehicle, price.pax, before) && !price.adjustmentReason?.trim())
        missing.push(`${vehicle.tier}:${price.pax}`);
  }
  return missing;
}

/** Saved total of one vehicle PAX tier. */
export function savedVehiclePaxTotal(previous: ItineraryVehiclePlan | undefined, pax: number) {
  return previous?.paxPrices?.find((price) => price.pax === pax)?.totalPrice ?? null;
}

/** Mirrors backend PAX vehicle reasons: only a manual change of a saved total away from the segment sum. */
export function vehiclePaxPriceNeedsReason(
  vehicle: ItineraryVehiclePlan,
  pax: number,
  previous?: ItineraryVehiclePlan,
): boolean {
  const price = vehicle.paxPrices?.find((row) => row.pax === pax);
  if (price?.pricingMode !== "manual" || price.totalPrice == null)
    return false;
  const before = savedVehiclePaxTotal(previous, pax);
  if (before == null || roundMoney(before) === roundMoney(price.totalPrice)) return false;
  const total = vehicleSegmentPaxTotal(vehicle, pax);
  return total == null || total !== roundMoney(price.totalPrice);
}

/** Mirrors backend requirePriceReason: saved same-source items compare with the saved price; new or replaced ones with the stored reference. */
export function selectionPriceNeedsReason(
  actual: number | null,
  fields: PriceReference,
  savedPrice?: number,
  custom = false,
): boolean {
  if (actual == null) return false;
  if (savedPrice !== undefined) return roundMoney(savedPrice) !== roundMoney(actual);
  const reference = fields.referencePrice;
  return custom || reference == null || roundMoney(reference) !== roundMoney(actual);
}

export function resourcePriceNeedsReason(
  item: ReturnType<typeof itineraryPriceRows>[number],
  saved?: ReturnType<typeof itineraryPriceRows>[number],
): boolean {
  const before = saved?.source === item.source ? saved : undefined;
  return selectionPriceNeedsReason(
    item.get(),
    item.fields,
    before?.get() ?? undefined,
    item.custom,
  );
}
