import type { ItineraryDayRecord, ItineraryResourceItem } from "@/types/itinerary";
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

  function day(overrides: Partial<ItineraryDayRecord> = {}): ItineraryDayRecord {
    return {
      id: "arrival", dayNumber: 1, date: "2026-11-05", departure: "新加坡", destination: "昆明",
      description: "接机、入住酒店休息", overnightDestination: "昆明", transport: "flight",
      meals: { breakfast: false, lunch: false, dinner: false }, items: [], ...overrides,
    };
  }

  it("allows arrival and departure days without resource items", () => {
    expect(validateItineraryForPdf([day(), day({ id: "departure", dayNumber: 8, overnightDestination: "", description: "送机", departure: "昆明" })])).toEqual([]);
  });

  it("distinguishes an unfilled overnight stay from an explicit no-stay day", () => {
    expect(validateItineraryForPdf([day({ overnightDestination: null })])).toEqual([
      { key: "itinerary.validation.overnight", target: "day-arrival", params: { day: 1 } },
    ]);
    expect(validateItineraryForPdf([day({ overnightDestination: "" })])).toEqual([]);
  });

  it("requires a separate restaurant item for each included meal", () => {
    const lunch: ItineraryResourceItem = {
      id: "lunch", type: "restaurant", mealSlot: "lunch", resourceId: "restaurant-1", resourcePriceId: "price-1",
      resourceName: "餐厅", priceName: "套餐", quantity: 12, unit: "personMeal", unitCost: 60, totalCost: 720, remark: "",
    };
    const plan = day({ meals: { breakfast: true, lunch: true, dinner: true }, items: [lunch] });
    expect(validateItineraryForPdf([plan]).map((issue) => issue.key)).toEqual(["itinerary.validation.dinner"]);
    plan.items.push({ ...lunch, id: "dinner", mealSlot: "dinner" });
    expect(validateItineraryForPdf([plan])).toEqual([]);
  });
  it("does not validate departure or arrival cities", () => {
    const first = day();
    const last = day({ id: "last", dayNumber: 2, departure: "昆明", destination: "新加坡" });
    expect(validateItineraryForPdf([first])).toEqual([]);
    expect(validateItineraryForPdf([first, last])).toEqual([]);
    expect(validateItineraryForPdf([day({ departure: "", destination: "" })])).toEqual([]);
    last.destination = "昆明";
    last.departure = "新加坡";
    expect(validateItineraryForPdf([first, last])).toEqual([]);
  });

});
