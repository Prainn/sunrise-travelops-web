import { describe, expect, it } from "vitest";
import { summarizeResourceCostsByCity } from "./city-cost-summary";

function detail(city: string | null | undefined, totalCost: number | null, dayNumber = 1) {
  return { city, totalCost, dayNumber, resourceName: "资源", unitCost: totalCost, quantity: 1 };
}

describe("resource cost city summaries", () => {
  it("combines repeated cities across days and separates cities on the same day", () => {
    expect(summarizeResourceCostsByCity([
      detail("昆明", 50), detail("大理", 20), detail("昆明", 45, 3),
    ])).toEqual([{ city: "昆明", totalCost: 95 }, { city: "大理", totalCost: 20 }]);
  });

  it("sums returned per-person subtotals in cents", () => {
    expect(summarizeResourceCostsByCity([
      { ...detail("昆明", 20.16), unitCost: 10.08, quantity: 2 },
      detail("昆明", 0.1), detail("昆明", 0.2),
    ])).toEqual([{ city: "昆明", totalCost: 20.46 }]);
  });

  it("keeps missing prices distinct from free resources", () => {
    expect(summarizeResourceCostsByCity([
      detail("昆明", 50), detail("昆明", null), detail("昆明", 10), detail("大理", 0),
    ])).toEqual([{ city: "昆明", totalCost: null }, { city: "大理", totalCost: 0 }]);
  });

  it("groups explicitly unknown cities without guessing from names or days", () => {
    expect(summarizeResourceCostsByCity([
      detail(null, 10), detail(" ", 30),
    ])).toEqual([{ city: "", totalCost: 40 }]);
    expect(summarizeResourceCostsByCity([])).toEqual([]);
  });

  it("does not label missing city fields as resources with an unspecified city", () => {
    expect(summarizeResourceCostsByCity([detail(undefined, 60)])).toBeNull();
    expect(summarizeResourceCostsByCity([
      detail("大理", 60), detail(undefined, 20),
    ])).toBeNull();
  });
});
