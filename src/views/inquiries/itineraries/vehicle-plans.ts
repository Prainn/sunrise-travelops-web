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
  return VEHICLE_PLAN_TIERS.map((tier) => ({ tier, arrangements: [], totalPrice: null }));
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

/** Explicit mode of PAX records; legacy records are only inferred from vehicle details for the switch prompt. */
export function getVehicleQuotationMode(
  plans: ItineraryVehiclePlan[],
): VehicleMaintenanceMode | null {
  const explicit = plans.find((plan) => plan.quotationMode)?.quotationMode;
  if (explicit) return explicit;
  if (plans.some((plan) => plan.arrangements.some((arrangement) => arrangement.vehicles.length)))
    return "itinerary";
  return plans.some((plan) => plan.arrangements.length) ? "stage" : null;
}

export function needsVehicleModeChangeConfirm(
  plans: ItineraryVehiclePlan[],
  mode: VehicleMaintenanceMode,
) {
  const current = getVehicleQuotationMode(plans);
  return plans.some((plan) => plan.arrangements.length) && current !== null && current !== mode;
}

function createPaxRows(paxTiers: number[]): ItineraryVehiclePaxPrice[] {
  return paxTiers.map((pax) => ({ pax, totalPrice: null, pricingMode: "automatic" }));
}

/** Keeps unchanged tiers, adds empty rows for new tiers and drops removed ones in both layers. */
export function syncVehiclePaxTiers(
  plan: ItineraryVehiclePlan,
  paxTiers: number[],
): ItineraryVehiclePlan {
  if (!plan.quotationMode) return plan;
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

/** Copies a legacy shared plan into every PAX tier; 0 and null stay as they are. */
function adoptLegacyPlan(
  plan: ItineraryVehiclePlan,
  mode: VehicleMaintenanceMode,
  paxTiers: number[],
): ItineraryVehiclePlan {
  // 阶段方式只能自动合计；行程方式仅已知 automatic 跟随合计，manual/unknown 保留原人工价。
  const pricingMode =
    mode === "stage" || !plan.arrangements.length || plan.pricingMode === "automatic"
      ? "automatic"
      : "manual";
  return {
    ...createEmptyPaxPlan(plan.tier, mode, paxTiers),
    arrangements: plan.arrangements.map((arrangement) => ({
      ...arrangement,
      vehicles: mode === "stage" ? [] : arrangement.vehicles.map((vehicle) => ({ ...vehicle })),
      totalPrice: null,
      paxPrices: paxTiers.map((pax) => ({ pax, totalPrice: arrangement.totalPrice ?? null })),
    })),
    paxPrices: paxTiers.map((pax) => ({
      pax,
      pricingMode,
      totalPrice: plan.arrangements.length ? plan.totalPrice : null,
    })),
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
    if (!plan.quotationMode) return refreshAutomaticVehicleTotals(adoptLegacyPlan(plan, mode, paxTiers));
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
  if (!plan.quotationMode) return plan;
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

/** PAX tiers whose saved legacy stage total differs from the segment sum the stage mode now uses. */
export function legacyStageTotalDifferences(
  plan: ItineraryVehiclePlan,
  saved: ItineraryVehiclePlan | undefined,
) {
  if (plan.quotationMode !== "stage" || !saved || saved.quotationMode || saved.totalPrice == null)
    return [];
  const original = roundMoney(saved.totalPrice);
  return (plan.paxPrices ?? []).flatMap((price) => {
    const total = vehicleSegmentPaxTotal(plan, price.pax);
    return total === original ? [] : [{ pax: price.pax, original, total }];
  });
}

export function getIncompleteVehiclePlanTiers(
  itinerary: Pick<ItineraryRecord, "paxTiers" | "vehiclePlans">,
) {
  const passengers = Math.max(0, ...itinerary.paxTiers);
  return getEnabledVehiclePlans(itinerary)
    .filter((plan) => {
      const paxFormat = Boolean(plan.quotationMode);
      if (
        (paxFormat
          ? plan.paxPrices?.length !== itinerary.paxTiers.length ||
            plan.paxPrices.some((price) => price.totalPrice == null)
          : plan.totalPrice === null) ||
        plan.arrangements.some(
          (arrangement) =>
            !arrangement.startDate ||
            !arrangement.endDate ||
            (paxFormat
              ? plan.quotationMode === "itinerary" && !arrangement.vehicles.length
              : !arrangement.vehicles.length && arrangement.totalPrice == null),
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
          (paxFormat ? plan.quotationMode === "itinerary" : arrangement.vehicles.length > 0) &&
          arrangementSeats(arrangement) < passengers,
      );
    })
    .map((plan) => plan.tier);
}
