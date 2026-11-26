import type {
  ItineraryRecord,
  ItineraryVehicleArrangement,
  ItineraryVehiclePaxPrice,
  ItineraryVehiclePlan,
  ItineraryVehicleQuotationMode,
  ItineraryVehicleTier,
  ItineraryVehicleSegmentPaxPrice,
  ItineraryVehicleSelection,
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
      paxPrices: arrangement.paxPrices?.map((price) => ({
        ...price,
        ...(price.vehicles && { vehicles: price.vehicles.map((vehicle) => ({ ...vehicle })) }),
      })),
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
      vehicles: [],
      paxPrices: paxTiers.map((pax) => {
        const previous = arrangement.paxPrices?.find((price) => price.pax === pax);
        return {
          pax,
          totalPrice: previous?.totalPrice ?? null,
          ...(plan.quotationMode === "itinerary" && {
            vehicles: previous ? previous.vehicles ?? arrangement.vehicles : [],
          }),
        };
      }),
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

export function updateVehicleSegmentPax(
  plan: ItineraryVehiclePlan,
  arrangementId: string,
  pax: number,
  changes: Partial<Pick<ItineraryVehicleSegmentPaxPrice, "totalPrice" | "vehicles">>,
) {
  return withVehicleArrangements(
    plan,
    plan.arrangements.map((arrangement) =>
      arrangement.id === arrangementId
        ? {
          ...arrangement,
          paxPrices: arrangement.paxPrices?.map((price) =>
            price.pax === pax ? { ...price, ...changes } : price,
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

export function vehiclesForPax(arrangement: ItineraryVehicleArrangement, pax: number) {
  return arrangement.paxPrices?.find((price) => price.pax === pax)?.vehicles ?? arrangement.vehicles;
}

export function vehicleSeats(vehicles: ItineraryVehicleSelection[]) {
  return vehicles.reduce((sum, vehicle) => sum + vehicle.seats * vehicle.quantity, 0);
}

/** 后端不允许未定行程日期时保存具体起止日期的用车段。 */
export function hasDatedVehicleArrangements(plans: ItineraryVehiclePlan[]) {
  return plans.some((plan) =>
    plan.arrangements.some((arrangement) => arrangement.startDate || arrangement.endDate),
  );
}

export function hasVehicleSeatShortage(plans: ItineraryVehiclePlan[], paxTiers: number[]) {
  return plans.some(
    (plan) =>
      plan.quotationMode === "itinerary" &&
      plan.arrangements.some(
        (arrangement) =>
          arrangement.startDate &&
          arrangement.endDate &&
          paxTiers.some((pax) => vehicleSeats(vehiclesForPax(arrangement, pax)) < pax),
      ),
  );
}

export function getIncompleteVehiclePlanTiers(
  itinerary: Pick<ItineraryRecord, "paxTiers" | "vehiclePlans">,
) {
  return getEnabledVehiclePlans(itinerary)
    .filter((plan) => {
      if (
        plan.paxPrices?.length !== itinerary.paxTiers.length ||
        plan.paxPrices.some((price) => price.totalPrice == null) ||
        plan.arrangements.some(
          (arrangement) =>
            !arrangement.startDate ||
            !arrangement.endDate,
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
      return hasVehicleSeatShortage([plan], itinerary.paxTiers);
    })
    .map((plan) => plan.tier);
}
