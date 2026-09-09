import { expect, it } from 'vitest';
import { getIncompleteVehiclePlanTiers, calculateVehiclePlanCost } from './vehicle-plans';
import type { ItineraryVehiclePlan } from '@/types/itinerary';
it('aggregates seats by date including leaders, and does not multiply the whole-trip price', () => {
  const vehiclePlans: ItineraryVehiclePlan[] = [{ tier: 'standard', totalPrice: 9000, arrangements: [{ id: 'a', dayIds: ['d1', 'd2'], vehicles: [39,14,7].map(seats => ({ vehicleId: String(seats), vehicleName: 'Bus', seats, quantity: 1 })) }] }];
  const p = { adults: 60, childrenCount: 0, leaderCount: 1, vehiclePlans };
  expect(getIncompleteVehiclePlanTiers(p)).toEqual(['standard']);
  vehiclePlans[0].arrangements[0].vehicles[2].quantity = 2;
  expect(getIncompleteVehiclePlanTiers(p)).toEqual([]);
  expect(calculateVehiclePlanCost(vehiclePlans[0])).toBe(9000);
});
