import { describe, expect, it } from "vitest";
import type { ItineraryDayRecord, ItineraryRecord } from "@/types/itinerary";
import { calculateHotelRoomCount, calculateItineraryQuote, calculateSingleSupplementUnitCost, createDefaultQuoteSettings } from "./quote-pricing";

function createPricingInput(overrides: Partial<ItineraryRecord> = {}) {
  return {
    adults: 4,
    childrenCount: 0,
    singleRoomCount: 0,
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
  it("calculates three rooms for four guests when two guests stay alone", () => {
    const itinerary = createPricingInput({ singleRoomCount: 2 });

    expect(calculateHotelRoomCount(itinerary)).toBe(3);
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
      { type: "single_supplement", quantity: 0, unitPrice: 0, totalPrice: 0 },
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

  it("matches the 3678 base cost, 6864 quote, and two 2070 supplements scenario", () => {
    const itinerary = createPricingInput({
      singleRoomCount: 2,
      quote: { adultUnitPrice: 6864 },
      dailyPlans: [createHotelDay("lijiang", 1980), createHotelDay("shangrila-1", 1080), createHotelDay("shangrila-2", 1080)],
    });

    const result = calculateItineraryQuote(itinerary, 18_852);

    expect(result.hotelRoomCount).toBe(3);
    expect(result.baseGroupCost).toBe(14_712);
    expect(result.baseCostPerPerson).toBe(3678);
    expect(result.singleSupplementUnitCost).toBe(2070);
    expect(result.singleSupplementTotal).toBe(4140);
    expect(result.lines[0]).toEqual({ type: "adult", quantity: 4, unitPrice: 6864, totalPrice: 27_456 });
    expect(result.lines[2]).toEqual({ type: "single_supplement", quantity: 2, unitPrice: 2070, totalPrice: 4140 });
    expect(result.totalPrice).toBe(31_596);
  });

  it("keeps the suggested total margin at 10 percent when single supplements exist", () => {
    const itinerary = createPricingInput({
      singleRoomCount: 2,
      dailyPlans: [createHotelDay("lijiang", 1980), createHotelDay("shangrila-1", 1080), createHotelDay("shangrila-2", 1080)],
    });

    const result = calculateItineraryQuote(itinerary, 18_852);

    expect(result.adultUnitPrice).toBe(4201.67);
    expect(result.actualMarginRate).toBeCloseTo(10, 1);
  });
});
