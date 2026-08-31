import { describe, expect, it } from "vitest";
import type { ItineraryDayRecord, ItineraryRecord } from "@/types/itinerary";
import { calculateHotelRoomCount, calculateItineraryQuote, calculateSingleSupplementUnitCost, createDefaultQuoteSettings } from "./quote-pricing";

function createPricingInput(overrides: Partial<ItineraryRecord> = {}) {
  return {
    adults: 4,
    childrenCount: 0,
    quote: createDefaultQuoteSettings(),
    dailyPlans: [],
    ...overrides,
  } as ItineraryRecord;
}

function createHotelDay(id: string, unitCost: number, roomCount = 3): ItineraryDayRecord {
  return {
    id, dayNumber: 1, date: "2026-10-01", departure: "", destination: "", transport: "", title: "",
    description: "", mealSummary: "", accommodationSummary: "",
    items: [{
      id: `hotel-${id}`, type: "hotel", resourceId: "hotel", resourcePriceId: "price", resourceName: "Hotel",
      priceName: "Room", providerName: "Direct", quantity: roomCount, unit: "roomNight", unitCost,
      totalCost: unitCost * roomCount, remark: "",
    }],
  };
}

describe("itinerary quote pricing", () => {
  it("calculates rooms using double occupancy without collecting a single guest count", () => {
    expect(calculateHotelRoomCount(createPricingInput())).toBe(2);
  });

  it("includes children in room count", () => {
    expect(calculateHotelRoomCount(createPricingInput({ adults: 2, childrenCount: 1 }))).toBe(2);
    expect(calculateHotelRoomCount(createPricingInput({ adults: 2, childrenCount: 2 }))).toBe(2);
  });

  it("calculates child tour price from the adult price per person", () => {
    const itinerary = createPricingInput({
      childrenCount: 1,
      quote: { adultUnitPrice: 1000 },
    });

    const result = calculateItineraryQuote(itinerary, 3260);

    expect(result.childUnitPrice).toBe(700);
    expect(result.lines).toEqual([
      { type: "adult", quantity: 4, unitPrice: 1000, totalPrice: 4000 },
      { type: "child", quantity: 1, unitPrice: 700, totalPrice: 700 },
    ]);
    expect(result.totalPrice).toBe(4700);
  });

  it("suggests an adult price with a 10 percent total margin until it is manually changed", () => {
    const result = calculateItineraryQuote(createPricingInput(), 3260);

    expect(result.adultUnitPrice).toBe(905.56);
    expect(result.actualMarginRate).toBeCloseTo(10, 1);
  });

  it("treats one hotel room night as 0.5 and two nights as 1 for one guest", () => {
    const itinerary = createPricingInput({
      dailyPlans: [createHotelDay("lijiang", 1980), createHotelDay("shangrila-1", 1080), createHotelDay("shangrila-2", 1080)],
    });

    expect(calculateSingleSupplementUnitCost(itinerary)).toBe(2070);
  });

  it("shows the single supplement without adding it to the group quote", () => {
    const itinerary = createPricingInput({
      quote: { adultUnitPrice: 6864 },
      dailyPlans: [createHotelDay("lijiang", 1980), createHotelDay("shangrila-1", 1080), createHotelDay("shangrila-2", 1080)],
    });

    const result = calculateItineraryQuote(itinerary, 18_852);

    expect(result.hotelRoomCount).toBe(2);
    expect(result.baseGroupCost).toBe(18_852);
    expect(result.baseCostPerPerson).toBe(4713);
    expect(result.singleSupplementUnitCost).toBe(2070);
    expect(result.lines[0]).toEqual({ type: "adult", quantity: 4, unitPrice: 6864, totalPrice: 27_456 });
    expect(result.totalPrice).toBe(27_456);
  });

  it("keeps the suggested total margin at 10 percent while exposing the single supplement separately", () => {
    const itinerary = createPricingInput({
      dailyPlans: [createHotelDay("lijiang", 1980), createHotelDay("shangrila-1", 1080), createHotelDay("shangrila-2", 1080)],
    });

    const result = calculateItineraryQuote(itinerary, 18_852);

    expect(result.adultUnitPrice).toBe(5236.67);
    expect(result.singleSupplementUnitCost).toBe(2070);
    expect(result.actualMarginRate).toBeCloseTo(10, 1);
  });
});
