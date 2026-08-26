import { describe, expect, it } from "vitest";
import { itineraries, tourismResources } from "@/data/data";
import { resourcePriceOptions } from "./pricing";

describe("resource price source labels", () => {
  it("uses one label for every direct quote", () => {
    const supplierNames = new Set(tourismResources.supplier.map((supplier) => supplier.name));
    const providerNames = resourcePriceOptions.map((option) => option.providerName);
    const itineraryProviderNames = itineraries.flatMap((itinerary) =>
      itinerary.dailyPlans.flatMap((day) => day.items.map((item) => item.providerName))
    );

    expect(providerNames).toContain("直营报价");
    expect(providerNames.every((name) => name === "直营报价" || supplierNames.has(name))).toBe(true);
    expect(itineraryProviderNames.every((name) => name === "直营报价" || supplierNames.has(name))).toBe(true);
  });
});
