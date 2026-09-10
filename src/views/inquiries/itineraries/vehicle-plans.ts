import type { ItineraryRecord, ItineraryVehiclePlan, ItineraryVehicleTier } from '@/types/itinerary';
import { roundMoney, sumMoney } from '@/utils';
export const VEHICLE_PLAN_TIER_LABELS = { standard: "普通车型", vip: "VIP车型" };
export const VEHICLE_PLAN_TIERS: ItineraryVehicleTier[] = ['standard', 'vip'];
export function createDefaultVehiclePlans(): ItineraryVehiclePlan[] { return VEHICLE_PLAN_TIERS.map(tier => ({ tier, arrangements: [], totalPrice: null })); }
export function getVehiclePlan(itinerary: Pick<ItineraryRecord, 'vehiclePlans'>, tier: ItineraryVehicleTier) { return itinerary.vehiclePlans.find(plan => plan.tier === tier); }
export function getEnabledVehiclePlans(itinerary: Pick<ItineraryRecord, 'vehiclePlans'>) { return itinerary.vehiclePlans.filter(plan => plan.arrangements.length); }
export function calculateVehiclePlanCost(plan: ItineraryVehiclePlan | undefined) { return plan?.totalPrice ?? 0; }
export function calculateVehiclePlanAutomaticTotal(plan: ItineraryVehiclePlan) {
  if (!plan.arrangements.length || plan.arrangements.some(arrangement => arrangement.totalPrice == null)) return null;
  return sumMoney(plan.arrangements.map(arrangement => arrangement.totalPrice!));
}
export function isVehiclePlanTotalOverridden(plan: ItineraryVehiclePlan) {
  const automaticTotal = calculateVehiclePlanAutomaticTotal(plan);
  return automaticTotal !== null && plan.totalPrice != null && roundMoney(plan.totalPrice) !== automaticTotal;
}
export function withVehiclePlanArrangements(plan: ItineraryVehiclePlan, arrangements: ItineraryVehiclePlan['arrangements']) {
  if (!arrangements.length) return { ...plan, arrangements, totalPrice: null };
  const previousAutomaticTotal = calculateVehiclePlanAutomaticTotal(plan);
  const followsAutomaticTotal = plan.totalPrice == null
    || (previousAutomaticTotal !== null && roundMoney(plan.totalPrice) === previousAutomaticTotal);
  const nextPlan = { ...plan, arrangements };
  if (followsAutomaticTotal) nextPlan.totalPrice = calculateVehiclePlanAutomaticTotal(nextPlan);
  return nextPlan;
}
export function getIncompleteVehiclePlanTiers(itinerary: Pick<ItineraryRecord, 'adults' | 'childrenCount' | 'leaderCount' | 'vehiclePlans'>) {
  const passengers = itinerary.adults + itinerary.childrenCount + itinerary.leaderCount;
  return getEnabledVehiclePlans(itinerary).filter(plan => {
    if (plan.totalPrice === null || plan.arrangements.some(arrangement => !arrangement.startDate || !arrangement.endDate || !arrangement.vehicles.length)) return true;
    const sorted = [...plan.arrangements].sort((a, b) => a.startDate.localeCompare(b.startDate));
    if (sorted.some((arrangement, index) => index > 0 && arrangement.startDate <= sorted[index - 1].endDate)) return true;
    return plan.arrangements.some(arrangement => arrangement.vehicles.reduce((sum, vehicle) => sum + vehicle.seats * vehicle.quantity, 0) < passengers);
  }).map(plan => plan.tier);
}
