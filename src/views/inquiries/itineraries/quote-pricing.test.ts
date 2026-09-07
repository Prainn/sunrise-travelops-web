import { describe, expect, it } from "vitest";
import type { ItineraryDayRecord, ItineraryHotelPlan, ItineraryHotelTier, ItineraryRecord } from "@/types/itinerary";
import { createDefaultHotelPlans } from "./hotel-plans";
import { calculateHotelRoomCount, calculateItineraryQuote, createDefaultQuoteOption } from "./quote-pricing";

function createHotelPlan(
  tier: ItineraryHotelTier,
  hotels: Array<{ destination: string; unitCost: number }>
): ItineraryHotelPlan {
  return {
    tier,
    hotels: hotels.map((hotel, index) => ({
      destination: hotel.destination,
      hotelId: `${tier}-hotel-${index + 1}`,
      hotelName: `${hotel.destination} Hotel`,
      rating: tier === "international_five_star" ? "international_five_star" : "ctrip_preferred",
      roomType: "标准间",
      breakfast: "含早餐",
      unit: "roomNight",
      unitCost: hotel.unitCost,
    })),
  };
}

function createDay(id: string, overnightDestination = ""): ItineraryDayRecord {
  return {
    id,
    dayNumber: 1,
    date: "2026-10-01",
    departure: "",
    destination: "",
    overnightDestination,
    transport: "",
    description: "",
    items: [],
  };
}

function createPricingInput(overrides: Partial<ItineraryRecord> = {}) {
  return {
    adults: 4,
    childrenCount: 0,
    destinations: [],
    hotelPlans: createDefaultHotelPlans(),
    vehiclePlans: [{ tier: "standard", vehicle: null }],
    quote: { options: [createDefaultQuoteOption("international_five_star", "standard", "five-star-standard")] },
    dailyPlans: [],
    ...overrides,
  } as ItineraryRecord;
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
      quote: { options: [{ ...createDefaultQuoteOption("international_five_star", "standard", "five-star"), adultUnitPrice: 1000 }] },
    });

    const option = calculateItineraryQuote(itinerary, 3260).options[0];

    expect(option.childUnitPrice).toBe(700);
    expect(option.lines).toEqual([
      { type: "adult", quantity: 4, unitPrice: 1000, totalPrice: 4000 },
      { type: "child", quantity: 1, unitPrice: 700, totalPrice: 700 },
    ]);
    expect(option.totalPrice).toBe(4700);
  });

  it("suggests an adult price with a 10 percent total margin until it is manually changed", () => {
    const option = calculateItineraryQuote(createPricingInput(), 3260).options[0];

    expect(option.adultUnitPrice).toBe(905.56);
    expect(option.actualMarginRate).toBeCloseTo(10, 1);
  });

  it("calculates hotel cost independently for each enabled hotel tier", () => {
    const itinerary = createPricingInput({
      destinations: ["昆明市"],
      hotelPlans: [
        createHotelPlan("international_five_star", [{ destination: "昆明市", unitCost: 600 }]),
        createHotelPlan("preferred_non_five_star", [{ destination: "昆明市", unitCost: 400 }]),
      ],
      quote: {
        options: [
          { ...createDefaultQuoteOption("international_five_star", "standard", "five-star"), adultUnitPrice: 1000 },
          { ...createDefaultQuoteOption("preferred_non_five_star", "standard", "preferred"), adultUnitPrice: 1200 },
        ],
      },
      dailyPlans: [createDay("day-1", "昆明市"), createDay("day-2", "昆明市")],
    });

    const result = calculateItineraryQuote(itinerary, 3260);

    expect(result.options.map((option) => option.hotelCost)).toEqual([2400, 1600]);
    expect(result.options.map((option) => option.baseGroupCost)).toEqual([5660, 4860]);
    expect(result.options.map((option) => option.totalPrice)).toEqual([4000, 4800]);
  });

  it("adds the itinerary vehicle cost to the common group cost", () => {
    const itinerary = createPricingInput({
      vehiclePlans: [{ tier: "standard", vehicle: {
          vehicleId: "vehicle-1", vehicleName: "考斯特",
          seats: 38, serviceDays: 3, unit: "vehicleDay", referenceUnitCost: 1800, unitCost: 2000,
        } }],
    });

    const result = calculateItineraryQuote(itinerary, 3260);

    expect(result.dailyResourceCost).toBe(3260);
    expect(result.options[0].vehicleCost).toBe(6000);
    expect(result.options[0].commonGroupCost).toBe(9260);
  });

  it("calculates every hotel and vehicle tier combination independently", () => {
    const standardVehicle = {
      vehicleId: "standard-1", vehicleName: "普通巴士",
      seats: 38, serviceDays: 2, unit: "vehicleDay", referenceUnitCost: 1000, unitCost: 1000,
    };
    const vipVehicle = {
      ...standardVehicle, vehicleId: "vip-1", vehicleName: "VIP巴士", unitCost: 1500,
    };
    const itinerary = createPricingInput({
      destinations: ["昆明市"],
      hotelPlans: [
        createHotelPlan("international_five_star", [{ destination: "昆明市", unitCost: 600 }]),
        createHotelPlan("preferred_non_five_star", [{ destination: "昆明市", unitCost: 400 }]),
      ],
      vehiclePlans: [
        { tier: "standard", vehicle: standardVehicle },
        { tier: "vip", vehicle: vipVehicle },
      ],
      quote: { options: [
        createDefaultQuoteOption("international_five_star", "standard", "five-standard"),
        createDefaultQuoteOption("international_five_star", "vip", "five-vip"),
        createDefaultQuoteOption("preferred_non_five_star", "standard", "preferred-standard"),
        createDefaultQuoteOption("preferred_non_five_star", "vip", "preferred-vip"),
      ] },
      dailyPlans: [createDay("day-1", "昆明市")],
    });

    const result = calculateItineraryQuote(itinerary, 1000);

    expect(result.options.map((option) => option.vehicleCost)).toEqual([2000, 3000, 2000, 3000]);
    expect(result.options.map((option) => option.hotelCost)).toEqual([1200, 1200, 800, 800]);
    expect(result.options.map((option) => option.baseGroupCost)).toEqual([4200, 5200, 3800, 4800]);
  });

  it("does not add a free tour leader to the chargeable guest quantity", () => {
    const itinerary = createPricingInput({
      adults: 16,
      quote: {
        options: [{
          ...createDefaultQuoteOption("international_five_star", "standard", "foc"), adultUnitPrice: 3000, leaderFocEnabled: true,
        }],
      },
    });

    const option = calculateItineraryQuote(itinerary, 40_000).options[0];

    expect(option.lines[0]).toEqual({ type: "adult", quantity: 16, unitPrice: 3000, totalPrice: 48_000 });
    expect(option.totalPrice).toBe(48_000);
  });

  it("calculates single supplement from the selected tier and destination nights", () => {
    const itinerary = createPricingInput({
      destinations: ["丽江市", "香格里拉市"],
      hotelPlans: [createHotelPlan("international_five_star", [
        { destination: "丽江市", unitCost: 1980 },
        { destination: "香格里拉市", unitCost: 1080 },
      ])],
      quote: { options: [{ ...createDefaultQuoteOption("international_five_star", "standard", "five-star"), adultUnitPrice: 6864 }] },
      dailyPlans: [
        createDay("lijiang", "丽江市"),
        createDay("shangrila-1", "香格里拉市"),
        createDay("shangrila-2", "香格里拉市"),
      ],
    });

    const option = calculateItineraryQuote(itinerary, 18_852).options[0];

    expect(option.hotelCost).toBe(8280);
    expect(option.baseGroupCost).toBe(27_132);
    expect(option.baseCostPerPerson).toBe(6783);
    expect(option.singleSupplementUnitCost).toBe(2070);
    expect(option.totalPrice).toBe(27_456);
  });
});
