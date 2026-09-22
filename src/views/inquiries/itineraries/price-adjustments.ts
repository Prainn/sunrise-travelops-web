import type { ItineraryRecord, ItineraryVehiclePlan, PriceReference } from "@/types/itinerary";
import { roundMoney } from "@/utils";
import { recalculateItem } from "./pricing";
import { calculateVehiclePlanAutomaticTotal } from "./vehicle-plans";
export function itineraryPriceRows(plan: ItineraryRecord) {
  const row = (
    key: string,
    name: string,
    fields: PriceReference,
    get: () => number | null,
    set: (price: number) => void,
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
          `${i.resourceId}:${i.resourcePriceId}`,
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
    if (vehiclePriceNeedsReason(vehicle, before) && !vehicle.adjustmentReason?.trim())
      missing.push(vehicle.tier);
  }
  return missing;
}

export function vehiclePriceNeedsReason(
  vehicle: ItineraryVehiclePlan,
  previous?: ItineraryVehiclePlan,
): boolean {
  const total = calculateVehiclePlanAutomaticTotal(vehicle);
  return (
    previous?.totalPrice != null &&
    vehicle.totalPrice != null &&
    roundMoney(previous.totalPrice) !== roundMoney(vehicle.totalPrice) &&
    vehicle.pricingMode !== "automatic" &&
    (total == null || roundMoney(total) !== roundMoney(vehicle.totalPrice))
  );
}

export function resourcePriceNeedsReason(
  item: ReturnType<typeof itineraryPriceRows>[number],
  saved?: ReturnType<typeof itineraryPriceRows>[number],
): boolean {
  const actual = item.get();
  if (actual == null) return false;
  const before = saved?.source === item.source ? saved : undefined;
  if (before) return roundMoney(before.get() ?? 0) !== roundMoney(actual);
  const reference = item.fields.referencePrice;
  return item.custom || reference == null || roundMoney(reference) !== roundMoney(actual);
}
