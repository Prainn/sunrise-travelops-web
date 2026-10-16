import { describe, expect, it } from "vitest";
import { selectionPriceNeedsReason } from "./price-adjustments";
import { recalculateItem } from "./pricing";
import type { ItineraryResourceItem } from "@/types/itinerary";

describe("empty actual prices", () => {
  it("needs no reason while empty and treats filling as first pricing", () => {
    expect(selectionPriceNeedsReason(null, { referencePrice: 100 }, 100)).toBe(false);
    expect(selectionPriceNeedsReason(100, { referencePrice: 100 }, undefined)).toBe(false);
    expect(selectionPriceNeedsReason(120, { referencePrice: 100 }, undefined)).toBe(true);
  });

  it("keeps the line total empty instead of coercing to zero", () => {
    const item = {
      unit: "personMeal",
      dinerCount: null,
      quantity: 2,
      unitCost: null,
      totalCost: 99,
    } as ItineraryResourceItem;
    recalculateItem(item);
    expect(item.totalCost).toBeNull();
    item.unitCost = 12.5;
    recalculateItem(item);
    expect(item.totalCost).toBe(25);
  });
});
