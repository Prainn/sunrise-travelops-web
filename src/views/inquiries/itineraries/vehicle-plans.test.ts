import { expect, it } from 'vitest';
import { calculateVehiclePlanAutomaticTotal, getIncompleteVehiclePlanTiers, calculateVehiclePlanCost, isVehiclePlanTotalOverridden, withVehiclePlanArrangements } from './vehicle-plans';
import type { ItineraryVehiclePlan } from '@/types/itinerary';
it('aggregates seats by date including leaders, and does not multiply the whole-trip price', () => {
  const vehiclePlans: ItineraryVehiclePlan[] = [{ tier: 'standard', totalPrice: 9000, arrangements: [{ id: 'a', startDate: '2026-09-10', endDate: '2026-09-11', vehicles: [39,14,7].map(seats => ({ vehicleId: String(seats), vehicleName: 'Bus', seats, quantity: 1 })) }] }];
  const p = { adults: 60, childrenCount: 0, leaderCount: 1, vehiclePlans };
  expect(getIncompleteVehiclePlanTiers(p)).toEqual(['standard']);
  vehiclePlans[0].arrangements[0].vehicles[2].quantity = 2;
  expect(getIncompleteVehiclePlanTiers(p)).toEqual([]);
  expect(calculateVehiclePlanCost(vehiclePlans[0])).toBe(9000);
});

it('automatically totals optional range prices while preserving a manual whole-trip price', () => {
  const plan: ItineraryVehiclePlan = {
    tier: 'standard',
    totalPrice: null,
    arrangements: [
      { id: 'first', startDate: '2026-09-10', endDate: '2026-09-13', vehicles: [], totalPrice: 1000 },
      { id: 'second', startDate: '2026-09-14', endDate: '2026-09-19', vehicles: [], totalPrice: 3000 },
    ],
  };
  expect(calculateVehiclePlanAutomaticTotal(plan)).toBe(4000);
  plan.totalPrice = 4000;
  expect(isVehiclePlanTotalOverridden(plan)).toBe(false);
  plan.totalPrice = 4500;
  expect(isVehiclePlanTotalOverridden(plan)).toBe(true);
  const changed = withVehiclePlanArrangements(plan, plan.arrangements.map(arrangement => arrangement.id === 'second' ? { ...arrangement, totalPrice: 3500 } : arrangement));
  expect(changed.totalPrice).toBe(4500);
  plan.totalPrice = 4000;
  expect(withVehiclePlanArrangements(plan, [...plan.arrangements, { id: 'third', startDate: '', endDate: '', vehicles: [], totalPrice: null }]).totalPrice).toBeNull();
  expect(withVehiclePlanArrangements(plan, []).totalPrice).toBeNull();
});

it('treats overlapping vehicle arrangements as incomplete', () => {
  const vehiclePlans: ItineraryVehiclePlan[] = [{
    tier: 'standard',
    totalPrice: 1000,
    arrangements: [
      { id: 'first', startDate: '2026-09-10', endDate: '2026-09-13', vehicles: [{ vehicleId: 'bus', vehicleName: 'Bus', seats: 10, quantity: 1 }] },
      { id: 'second', startDate: '2026-09-13', endDate: '2026-09-15', vehicles: [{ vehicleId: 'bus', vehicleName: 'Bus', seats: 10, quantity: 1 }] },
    ],
  }];
  expect(getIncompleteVehiclePlanTiers({ adults: 2, childrenCount: 0, leaderCount: 0, vehiclePlans })).toEqual(['standard']);
});
