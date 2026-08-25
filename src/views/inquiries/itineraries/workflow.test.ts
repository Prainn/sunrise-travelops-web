import { describe, expect, it } from "vitest";
import { getDayCountMismatch, validateItineraryForPdf } from "./workflow";

describe("itinerary day-count workflow", () => {
  it("accepts an itinerary matching the inquiry planned days", () => {
    expect(getDayCountMismatch(7, 7)).toBeNull();
  });

  it("detects shorter and longer itineraries before PDF generation", () => {
    expect(getDayCountMismatch(6, 7)).toBe("shorter");
    expect(getDayCountMismatch(8, 7)).toBe("longer");
  });

  it("requires at least one item per day and a customer price for every item", () => {
    const result = validateItineraryForPdf([
      { dayNumber: 1, items: [{ resourceName: "酒店", unitPrice: 500 }] },
      { dayNumber: 2, items: [{ resourceName: "门票", unitPrice: null }] },
      { dayNumber: 3, items: [] },
    ]);

    expect(result.emptyDayNumbers).toEqual([3]);
    expect(result.missingPriceItems).toEqual([{ dayNumber: 2, resourceName: "门票" }]);
  });
});
