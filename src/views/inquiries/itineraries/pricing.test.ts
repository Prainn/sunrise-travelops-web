import { describe, expect, it, vi } from "vitest";
import { getResourcePriceOptions, type PricingResources } from "./pricing";

vi.mock("@/lang/utils", () => ({
  translate: (key: string) => key,
  translateIfExists: () => undefined,
}));

describe("new itinerary resource choices", () => {
  it.each(["attractions", "restaurants"] as const)("excludes incomplete %s while keeping free resources", (kind) => {
    const resources: PricingResources = { hotels: [], attractions: [], restaurants: [], transports: [], guides: [] };
    const records = [
      { id: "empty", description: "", price: 100 },
      { id: "whitespace", description: " \t\n", price: 100 },
      { id: "unpriced", description: "有描述", price: null },
      { id: "free", description: "免费参观", price: 0 },
      { id: "complete", description: " 有效描述 ", price: 100 },
    ].map((record) => ({ ...record, name: record.id, status: "enabled" }));
    expect(getResourcePriceOptions({ ...resources, [kind]: records } as PricingResources).map((option) => [option.resourceId, option.unitCost])).toEqual([
      ["free", 0], ["complete", 100],
    ]);
  });
});
