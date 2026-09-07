import type {
  ItineraryRecord,
  ItineraryVehicleSelection,
  ItineraryVehiclePlan,
  ItineraryVehicleTier,
} from "@/types/itinerary";
import { multiplyMoney } from "@/utils";

export const VEHICLE_PLAN_TIERS: ItineraryVehicleTier[] = ["standard", "vip"];

export const VEHICLE_PLAN_TIER_LABELS: Record<ItineraryVehicleTier, string> = {
  standard: "普通车型",
  vip: "VIP 车型",
};

export function createDefaultVehiclePlans(): ItineraryVehiclePlan[] {
  return VEHICLE_PLAN_TIERS.map((tier) => ({ tier, vehicle: null }));
}

export function getVehiclePlan(
  itinerary: Pick<ItineraryRecord, "vehiclePlans">,
  tier: ItineraryVehicleTier
) {
  return itinerary.vehiclePlans.find((plan) => plan.tier === tier);
}

export function getEnabledVehiclePlans(itinerary: Pick<ItineraryRecord, "vehiclePlans">) {
  return VEHICLE_PLAN_TIERS.flatMap((tier) => {
    const plan = getVehiclePlan(itinerary, tier);
    return plan?.vehicle?.vehicleId ? [plan] : [];
  });
}

export function isVehiclePlanComplete(
  plan: ItineraryVehiclePlan,
  guestCount: number
) {
  const vehicle = plan.vehicle;
  return Boolean(vehicle?.vehicleId && vehicle.serviceDays >= 1 && vehicle.seats >= guestCount);
}

export function getIncompleteVehiclePlanTiers(
  itinerary: Pick<ItineraryRecord, "adults" | "childrenCount" | "vehiclePlans">
) {
  const guestCount = itinerary.adults + itinerary.childrenCount;
  return getEnabledVehiclePlans(itinerary)
    .filter((plan) => !isVehiclePlanComplete(plan, guestCount))
    .map((plan) => plan.tier);
}

export function calculateVehiclePlanCost(plan: ItineraryVehiclePlan | undefined) {
  return plan?.vehicle ? calculateVehicleSubtotal(plan.vehicle) : 0;
}

export function calculateVehicleSubtotal(vehicle: ItineraryVehicleSelection) {
  return multiplyMoney(vehicle.unitCost, vehicle.serviceDays);
}
