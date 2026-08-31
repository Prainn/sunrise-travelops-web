import { describe, expect, it } from "vitest";
import { attractions, guides, hotels, itineraries, restaurants, tourismResources } from "@/data/data";
import { calculateItem, getResourcePriceOptions } from "./pricing";

describe("resource price source labels", () => {
  it("uses one label for every direct quote", () => {
    const resourcePriceOptions = getResourcePriceOptions();
    const supplierNames = new Set(tourismResources.supplier.map((supplier) => supplier.name));
    const providerNames = resourcePriceOptions.map((option) => option.providerName);
    const itineraryProviderNames = itineraries.flatMap((itinerary) =>
      itinerary.dailyPlans.flatMap((day) => day.items.map((item) => item.providerName))
    );

    expect(providerNames).toContain("直营报价");
    expect(providerNames.every((name) => name === "直营报价" || supplierNames.has(name))).toBe(true);
    expect(itineraryProviderNames.every((name) => name === "直营报价" || supplierNames.has(name))).toBe(true);
  });

  it("excludes disabled resources from itinerary price options", () => {
    const options = getResourcePriceOptions();
    const enabledIds = {
      hotel: new Set(hotels.filter((item) => item.status === "enabled").map((item) => item.id)),
      attraction: new Set(attractions.filter((item) => item.status === "enabled").map((item) => item.id)),
      restaurant: new Set(restaurants.filter((item) => item.status === "enabled").map((item) => item.id)),
      vehicle: new Set(tourismResources.transport.filter((item) => item.status === "enabled").map((item) => item.id)),
      guide: new Set(guides.filter((item) => item.status === "enabled").map((item) => item.id)),
    };

    expect(options.every((option) => enabledIds[option.type].has(option.resourceId))).toBe(true);
  });

  it("rebuilds provider names from the latest mock supplier data", () => {
    const supplier = tourismResources.supplier[0];
    const originalName = supplier.name;
    try {
      supplier.name = "更新后的地接社";
      expect(getResourcePriceOptions().some((option) => option.providerName === supplier.name)).toBe(true);
    } finally {
      supplier.name = originalName;
    }
  });

  it("uses a manually entered vehicle fee instead of the reference resource cost", () => {
    const option = getResourcePriceOptions().find((item) => item.type === "vehicle");
    expect(option).toBeDefined();

    const item = calculateItem(option!, 2, 1250.5);

    expect(item.referenceUnitCost).toBe(option?.unitCost);
    expect(item.unitCost).toBe(1250.5);
    expect(item.totalCost).toBe(2501);
  });
});
