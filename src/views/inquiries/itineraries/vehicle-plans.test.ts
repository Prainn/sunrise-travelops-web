import { describe, expect, it } from "vitest";
import {
  calculateVehiclePlanCost,
  calculateVehicleSubtotal,
  isVehiclePlanComplete,
} from "./vehicle-plans";

const vehicle = {
  vehicleId: "vehicle-1",
  vehicleName: "考斯特",
  plateNumber: "云A00001",
  seats: 38,
  serviceDays: 3,
  unit: "vehicleDay",
  referenceUnitCost: 1800,
  unitCost: 2000,
};

describe("itinerary vehicle plans", () => {
  it("requires one selected vehicle with positive service days and enough seats", () => {
    const plan = { tier: "standard" as const, vehicle };

    expect(isVehiclePlanComplete(plan, 12)).toBe(true);
    expect(isVehiclePlanComplete(plan, 40)).toBe(false);
    expect(isVehiclePlanComplete({ ...plan, vehicle: { ...vehicle, serviceDays: 0 } }, 12)).toBe(false);
  });

  it("calculates one vehicle cost for the whole itinerary", () => {
    expect(calculateVehicleSubtotal(vehicle)).toBe(6000);
    expect(calculateVehiclePlanCost({ tier: "standard", vehicle })).toBe(6000);
  });
});
