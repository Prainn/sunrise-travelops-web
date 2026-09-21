import { describe, expect, it } from "vitest";
import type { ItineraryRecord } from "@/types/itinerary";
import { getItineraryValidationIssues } from "./workflow";

type ValidationPlan = Pick<ItineraryRecord,
  "dailyPlans" | "hotelPlans" | "vehiclePlans" | "paxTiers" | "guidePlans" | "quote">;

function createPlan({ hotel = true, vehicle = true } = {}): ValidationPlan {
  return {
    dailyPlans: [{
      id: "day-1",
      dayNumber: 1,
      date: "2026-12-23",
      departure: "",
      destination: "",
      overnightDestination: "大理",
      meals: { breakfast: false, lunch: false, dinner: false },
      transport: "",
      description: "抵达大理",
      items: [],
    }],
    hotelPlans: [
      {
        tier: "international_five_star",
        hotels: hotel ? [{
          destination: "大理",
          hotelId: "hotel-1",
          hotelName: "测试酒店",
          rating: "international_five_star",
          breakfast: "含早",
          unit: "room_night",
          unitCost: 500,
        }] : [],
      },
      { tier: "preferred_non_five_star", hotels: [] },
    ],
    vehiclePlans: [
      {
        tier: "standard",
        arrangements: vehicle ? [{
          id: "arrangement-1",
          startDate: "2026-12-23",
          endDate: "2026-12-23",
          vehicles: [{ vehicleId: "vehicle-1", vehicleName: "巴士", seats: 20, quantity: 1 }],
          totalPrice: 1000,
        }] : [],
        totalPrice: vehicle ? 1000 : null,
      },
      { tier: "vip", arrangements: [], totalPrice: null },
    ],
    paxTiers: [10],
    guidePlans: [],
    quote: {
      guideServiceTotal: null,
      staffRoomCosts: [],
      options: [],
      chineseTip: null,
      englishTip: null,
      transportFees: [],
      customerNotes: "",
      holidayRestrictions: "",
      hotelReplacementTerms: "",
    },
  };
}

describe("getItineraryValidationIssues", () => {
  it.each([
    [{ hotel: true, vehicle: false }, ["itinerary.validation.vehicles"]],
    [{ hotel: false, vehicle: true }, ["itinerary.pdfHotelPlanRequired"]],
    [{ hotel: false, vehicle: false }, ["itinerary.pdfHotelPlanRequired", "itinerary.validation.vehicles"]],
  ])("reports hotel and vehicle validation independently", (settings, expectedKeys) => {
    expect(getItineraryValidationIssues(createPlan(settings)).map(issue => issue.key)).toEqual(expectedKeys);
  });
});
