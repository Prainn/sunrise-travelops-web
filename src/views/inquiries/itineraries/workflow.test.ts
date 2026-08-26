import { describe, expect, it } from "vitest";
import { getDayCountMismatch, getDefaultItineraryId, validateItineraryForPdf } from "./workflow";

describe("itinerary day-count workflow", () => {
  it("accepts an itinerary matching the inquiry planned days", () => {
    expect(getDayCountMismatch(7, 7)).toBeNull();
  });

  it("detects shorter and longer itineraries before PDF generation", () => {
    expect(getDayCountMismatch(6, 7)).toBe("shorter");
    expect(getDayCountMismatch(8, 7)).toBe("longer");
  });

  it("opens the latest draft before a more recently edited quoted itinerary", () => {
    const records = [
      { id: "quoted", status: "quoted", createdAt: "2026-08-25 09:00", updatedAt: "2026-08-26 10:00" },
      { id: "draft", status: "draft", createdAt: "2026-08-24 09:00", updatedAt: "2026-08-25 10:00" },
    ];

    expect(getDefaultItineraryId(records)).toBe("draft");
    expect(getDefaultItineraryId(records, "quoted")).toBe("quoted");
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
