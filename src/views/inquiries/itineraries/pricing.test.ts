import { describe, expect, it, vi } from "vitest";
import { calculateItem, recalculateItem, getItemPerPersonCost, getDayResourceCost, getResourcePriceOptions, type PricingResources } from "./pricing";

vi.mock("@/lang/utils", () => ({
  translate: (key: string) => key,
  translateIfExists: () => undefined,
}));

describe("new itinerary resource choices", () => {
  it.each(["attractions", "restaurants"] as const)("checks %s eligibility while keeping free resources", (kind) => {
    const resources: PricingResources = { hotels: [], attractions: [], restaurants: [], transports: [], guides: [] };
    const records = [
      { id: "empty", description: "", price: 0 },
      { id: "whitespace", description: " \t\n", price: 100 },
      { id: "unpriced", description: "有描述", price: null },
      { id: "free", description: "免费参观", price: 0 },
      { id: "complete", description: " 有效描述 ", price: 100 },
    ].map((record) => ({ ...record, name: record.id, status: "enabled" }));
    expect(getResourcePriceOptions({ ...resources, [kind]: records } as PricingResources).map((option) => [option.resourceId, option.unitCost])).toEqual(
      kind === "attractions"
        ? [["empty", 0], ["whitespace", 100], ["free", 0], ["complete", 100]]
        : [["free", 0], ["complete", 100]],
    );
  });
});

describe("meal cent rounding", () => {
  it("uses exact per-diner rounding and normalizes price before a repeat calculation", () => {
    const option = {type:"restaurant",resourceId:"r",resourceName:"餐",priceName:"",unit:"table",unitCost:20.15,dinerCount:2} as Parameters<typeof calculateItem>[0];
    const item=calculateItem(option,1);
    expect(item.totalCost).toBe(10.08);
    item.unit="personMeal";
    item.unitCost=1.005;
    recalculateItem(item);
    expect(item.unitCost).toBe(1.01);
    expect(item.totalCost).toBe(1.01);
  });
});

it("calculates table meals as a shared group total and preserves an unfilled price", () => {
  const option = { type: "restaurant", resourceId: "r", resourceName: "餐", priceName: "", unit: "table", unitCost: 650, dinerCount: 10 } as Parameters<typeof calculateItem>[0];
  const item = { ...calculateItem(option, 1), tableCount: 2 };
  recalculateItem(item);
  expect(item.totalCost).toBe(1300);
  item.unitCost = null;
  recalculateItem(item);
  expect(item.totalCost).toBeNull();
});

it("shows each PAX share and combines table meals with per-person resources without changing saved totals", () => {
  const option = { type: "restaurant", resourceId: "r", resourceName: "餐", priceName: "", unit: "table", unitCost: 650, dinerCount: 10 } as Parameters<typeof calculateItem>[0];
  const meal = { ...calculateItem(option, 1), tableCount: 2 };
  recalculateItem(meal);
  const attraction = { ...meal, tableCount: undefined, totalCost: 125 };
  expect([10, 15, 25].map(pax => getItemPerPersonCost(meal, pax))).toEqual([130, 86.67, 52]);
  expect([10, 15, 25].map(pax => getDayResourceCost([meal, attraction], pax))).toEqual([255, 211.67, 177]);
  expect(meal.totalCost).toBe(1300);
  expect(getItemPerPersonCost(calculateItem(option, 1), 15)).toBe(65);
  expect(getItemPerPersonCost({ ...meal, totalCost: null }, 15)).toBeNull();
  expect(getItemPerPersonCost({ ...meal, totalCost: 0 }, 15)).toBe(0);
  expect(getItemPerPersonCost(meal, undefined)).toBeNull();
  const smallMeal = { ...meal, totalCost: 1 };
  expect(getDayResourceCost([smallMeal, smallMeal], 3)).toBe(0.66);
});
