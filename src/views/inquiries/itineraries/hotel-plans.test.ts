import { describe, expect, it } from "vitest";
import type { ItineraryDayRecord } from "@/types/itinerary";
import type { HotelRecord } from "@/types/resource";
import {
  calculateDestinationNights,
  createDefaultHotelPlans,
  getEnabledHotelPlans,
  getIncompleteHotelPlanTiers,
  isHotelEligibleForTier,
} from "./hotel-plans";

const hotel = { rating: "international_five_star" } as HotelRecord;

describe("itinerary hotel plans", () => {
  it("separates five-star hotels from the preferred non-five-star tier", () => {
    expect(isHotelEligibleForTier(hotel, "international_five_star")).toBe(true);
    expect(isHotelEligibleForTier(hotel, "preferred_non_five_star")).toBe(false);
    expect(isHotelEligibleForTier({ ...hotel, rating: "ctrip_preferred" }, "preferred_non_five_star")).toBe(true);
  });

  it("activates a hotel tier by selection and requires every destination", () => {
    const hotelPlans = createDefaultHotelPlans();
    hotelPlans[0].hotels.push({
      destination: "昆明", hotelId: "hotel-1", hotelName: "昆明酒店", rating: "international_five_star",
      breakfastIncluded: true, breakfast: "含早", unit: "roomNight", unitCost: 500,
    });
    const itinerary = { destinations: ["昆明", "大理", "丽江"], hotelPlans, dailyPlans: [{ overnightDestination: "昆明" }, { overnightDestination: "大理" }] as ItineraryDayRecord[] };

    expect(getEnabledHotelPlans(itinerary)).toHaveLength(1);
    expect(getIncompleteHotelPlanTiers(itinerary)).toEqual(["international_five_star"]);

    hotelPlans[0].hotels.push({
      destination: "大理", hotelId: "hotel-2", hotelName: "大理酒店", rating: "international_five_star",
      breakfastIncluded: true, breakfast: "含早", unit: "roomNight", unitCost: 600,
    });
    expect(getIncompleteHotelPlanTiers(itinerary)).toEqual([]);
  });

  it("counts repeated stays in one destination without selecting a hotel per day", () => {
    expect(calculateDestinationNights({
      dailyPlans: [
        { overnightDestination: "昆明" },
        { overnightDestination: "昆明" },
        { overnightDestination: "大理" },
        { overnightDestination: "" },
      ],
    } as never)).toEqual({ 昆明: 2, 大理: 1 });
  });
});
