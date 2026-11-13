import type {
  ItineraryRecord,
  ItineraryVehicleArrangement,
  ItineraryVehiclePaxPrice,
  ItineraryVehiclePlan,
  ItineraryVehicleQuotationMode,
  ItineraryVehicleTier,
} from "@/types/itinerary";
import { roundMoney, sumMoney } from "@/utils";
export const VEHICLE_PLAN_TIERS: ItineraryVehicleTier[] = ["standard", "vip"];
export type VehicleMaintenanceMode = ItineraryVehicleQuotationMode;
export function createDefaultVehiclePlans(): ItineraryVehiclePlan[] {
  return VEHICLE_PLAN_TIERS.map((tier) => ({
    tier,
    quotationMode: "itinerary",
    arrangements: [],
    totalPrice: null,
    paxPrices: [],
  }));
}
export function getVehiclePlan(
  itinerary: Pick<ItineraryRecord, "vehiclePlans">,
  tier: ItineraryVehicleTier,
) {
  return itinerary.vehiclePlans.find((plan) => plan.tier === tier);
}
export function getEnabledVehiclePlans(itinerary: Pick<ItineraryRecord, "vehiclePlans">) {
  return itinerary.vehiclePlans.filter((plan) => plan.arrangements.length);
}

export function cloneVehiclePlans(plans: ItineraryVehiclePlan[]): ItineraryVehiclePlan[] {
  return plans.map((plan) => ({
    ...plan,
    paxPrices: plan.paxPrices?.map((price) => ({ ...price })),
    arrangements: plan.arrangements.map((arrangement) => ({
      ...arrangement,
      vehicles: arrangement.vehicles.map((vehicle) => ({ ...vehicle })),
      paxPrices: arrangement.paxPrices?.map((price) => ({ ...price })),
    })),
  }));
}

/** Mode of the arranged plans; plans without arrangements have nothing to keep. */
export function getVehicleQuotationMode(
  plans: ItineraryVehiclePlan[],
): VehicleMaintenanceMode | null {
  return plans.find((plan) => plan.arrangements.length)?.quotationMode ?? null;
}

/** Mirrors backend validateVehicleModeChange: each tier with arrangements is judged on its own. */
export function needsVehicleModeChangeConfirm(
  plans: ItineraryVehiclePlan[],
  mode: VehicleMaintenanceMode,
) {
  return plans.some((plan) => {
    return plan.arrangements.length > 0 && plan.quotationMode !== mode;
  });
}

function createPaxRows(paxTiers: number[]): ItineraryVehiclePaxPrice[] {
  return paxTiers.map((pax) => ({ pax, totalPrice: null, pricingMode: "automatic" }));
}

/** Keeps unchanged tiers, adds empty rows for new tiers and drops removed ones in both layers. */
export function syncVehiclePaxTiers(
  plan: ItineraryVehiclePlan,
  paxTiers: number[],
): ItineraryVehiclePlan {
  return {
    ...plan,
    paxPrices: paxTiers.map(
      (pax) =>
        plan.paxPrices?.find((price) => price.pax === pax) ?? {
          pax,
          totalPrice: null,
          pricingMode: "automatic",
        },
    ),
    arrangements: plan.arrangements.map((arrangement) => ({
      ...arrangement,
      paxPrices: paxTiers.map((pax) => ({
        pax,
        totalPrice: arrangement.paxPrices?.find((price) => price.pax === pax)?.totalPrice ?? null,
      })),
    })),
  };
}

function createEmptyPaxPlan(
  tier: ItineraryVehicleTier,
  mode: VehicleMaintenanceMode,
  paxTiers: number[],
): ItineraryVehiclePlan {
  return {
    tier,
    quotationMode: mode,
    arrangements: [],
    totalPrice: null,
    pricingMode: null,
    segmentTotal: null,
    adjustmentReason: "",
    paxPrices: createPaxRows(paxTiers),
  };
}

/**
 * Builds the dialog draft as a deep copy; the saved record changes only after a successful save.
 * `reset` starts a blank draft for a confirmed mode change.
 */
export function createVehicleDraft(
  plans: ItineraryVehiclePlan[],
  paxTiers: number[],
  mode: VehicleMaintenanceMode,
  reset = false,
): ItineraryVehiclePlan[] {
  return VEHICLE_PLAN_TIERS.map((tier) => {
    const plan = plans.find((record) => record.tier === tier);
    if (!plan || reset || !plan.arrangements.length) return createEmptyPaxPlan(tier, mode, paxTiers);
    return refreshAutomaticVehicleTotals(syncVehiclePaxTiers(cloneVehiclePlans([plan])[0]!, paxTiers));
  });
}

export function vehicleSegmentPaxTotal(plan: ItineraryVehiclePlan, pax: number) {
  const prices = plan.arrangements.map(
    (arrangement) => arrangement.paxPrices?.find((price) => price.pax === pax)?.totalPrice ?? null,
  );
  if (!prices.length || prices.some((price) => price === null)) return null;
  return sumMoney(prices as number[]);
}

/** Display only: the backend recomputes automatic totals on save and preview. */
export function refreshAutomaticVehicleTotals(plan: ItineraryVehiclePlan): ItineraryVehiclePlan {
  return {
    ...plan,
    paxPrices: plan.paxPrices?.map((price) =>
      !plan.arrangements.length || price.pricingMode === "automatic"
        ? { ...price, totalPrice: vehicleSegmentPaxTotal(plan, price.pax), adjustmentReason: "" }
        : price,
    ),
  };
}

export function withVehicleArrangements(
  plan: ItineraryVehiclePlan,
  arrangements: ItineraryVehicleArrangement[],
) {
  return refreshAutomaticVehicleTotals({ ...plan, arrangements });
}

export function setVehicleSegmentPaxPrice(
  plan: ItineraryVehiclePlan,
  arrangementId: string,
  pax: number,
  totalPrice: number | null,
) {
  return withVehicleArrangements(
    plan,
    plan.arrangements.map((arrangement) =>
      arrangement.id === arrangementId
        ? {
          ...arrangement,
          paxPrices: arrangement.paxPrices?.map((price) =>
            price.pax === pax ? { ...price, totalPrice } : price,
          ),
        }
        : arrangement,
    ),
  );
}

/** Itinerary mode only: a value makes this tier manual; clearing it restores automatic for this tier. */
export function setVehiclePaxTotal(
  plan: ItineraryVehiclePlan,
  pax: number,
  totalPrice: number | null,
  savedReason = "",
) {
  return refreshAutomaticVehicleTotals({
    ...plan,
    paxPrices: plan.paxPrices?.map((price) =>
      price.pax !== pax
        ? price
        : totalPrice === null
          ? { ...price, pricingMode: "automatic" }
          : { ...price, pricingMode: "manual", totalPrice, adjustmentReason: savedReason },
    ),
  });
}

export function isVehiclePaxTotalOverridden(plan: ItineraryVehiclePlan, pax: number) {
  const price = plan.paxPrices?.find((row) => row.pax === pax);
  const automatic = vehicleSegmentPaxTotal(plan, pax);
  return (
    price?.pricingMode === "manual" &&
    price.totalPrice != null &&
    automatic !== null &&
    roundMoney(price.totalPrice) !== automatic
  );
}

export function arrangementSeats(arrangement: ItineraryVehicleArrangement) {
  return arrangement.vehicles.reduce((sum, vehicle) => sum + vehicle.seats * vehicle.quantity, 0);
}

/** Itinerary mode ranges with dates must seat the largest PAX tier, even in an unfinished Draft. */
export function hasVehicleSeatShortage(plans: ItineraryVehiclePlan[], passengers: number) {
  return plans.some(
    (plan) =>
      plan.quotationMode === "itinerary" &&
      plan.arrangements.some(
        (arrangement) =>
          arrangement.startDate &&
          arrangement.endDate &&
          arrangementSeats(arrangement) < passengers,
      ),
  );
}

export function getIncompleteVehiclePlanTiers(
  itinerary: Pick<ItineraryRecord, "paxTiers" | "vehiclePlans">,
) {
  const passengers = Math.max(0, ...itinerary.paxTiers);
  return getEnabledVehiclePlans(itinerary)
    .filter((plan) => {
      if (
        plan.paxPrices?.length !== itinerary.paxTiers.length ||
        plan.paxPrices.some((price) => price.totalPrice == null) ||
        plan.arrangements.some(
          (arrangement) =>
            !arrangement.startDate ||
            !arrangement.endDate ||
            (plan.quotationMode === "itinerary" && !arrangement.vehicles.length),
        )
      )
        return true;
      const sorted = [...plan.arrangements].sort((a, b) => a.startDate.localeCompare(b.startDate));
      if (
        sorted.some(
          (arrangement, index) => index > 0 && arrangement.startDate <= (sorted[index - 1]?.endDate ?? ""),
        )
      )
        return true;
      return plan.arrangements.some(
        (arrangement) =>
          plan.quotationMode === "itinerary" &&
          arrangementSeats(arrangement) < passengers,
      );
    })
    .map((plan) => plan.tier);
}
