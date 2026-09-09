import type { ItineraryRecord, ItineraryVehiclePlan, ItineraryVehicleTier } from '@/types/itinerary';
export const VEHICLE_PLAN_TIER_LABELS = { standard: "普通车型", vip: "VIP车型" };
export const VEHICLE_PLAN_TIERS: ItineraryVehicleTier[] = ['standard', 'vip'];
export function createDefaultVehiclePlans(): ItineraryVehiclePlan[] { return VEHICLE_PLAN_TIERS.map(tier => ({ tier, arrangements: [], totalPrice: null })); }
export function getVehiclePlan(itinerary: Pick<ItineraryRecord, 'vehiclePlans'>, tier: ItineraryVehicleTier) { return itinerary.vehiclePlans.find(plan => plan.tier === tier); }
export function getEnabledVehiclePlans(itinerary: Pick<ItineraryRecord, 'vehiclePlans'>) { return itinerary.vehiclePlans.filter(plan => plan.arrangements.length); }
export function calculateVehiclePlanCost(plan: ItineraryVehiclePlan | undefined) { return plan?.totalPrice ?? 0; }
export function getIncompleteVehiclePlanTiers(itinerary: Pick<ItineraryRecord, 'adults' | 'childrenCount' | 'leaderCount' | 'vehiclePlans'>) {
  const passengers = itinerary.adults + itinerary.childrenCount + itinerary.leaderCount;
  return getEnabledVehiclePlans(itinerary).filter(plan => {
    if (plan.totalPrice === null || plan.arrangements.some(a => !a.dayIds.length || !a.vehicles.length)) return true;
    const seats = new Map<string, number>();
    for (const a of plan.arrangements) for (const id of a.dayIds) seats.set(id, (seats.get(id) ?? 0) + a.vehicles.reduce((sum, v) => sum + v.seats * v.quantity, 0));
    return [...seats.values()].some(count => count < passengers);
  }).map(plan => plan.tier);
}
