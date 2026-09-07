import { describe, expect, it } from "vitest";
import type { HotelRecord } from "@/types/resource";
import {
  calculateDestinationNights,
  createDefaultHotelPlans,
  getEnabledHotelPlans,
  getIncompleteHotelPlanTiers,
  isHotelEligibleForTier,
} from "./hotel-plans";

const hotel = { rating: "五星" } as HotelRecord;

describe("itinerary hotel plans", () => {
  it("separates five-star hotels from the preferred non-five-star tier", () => {
    expect(isHotelEligibleForTier(hotel, "international_five_star")).toBe(true);
    expect(isHotelEligibleForTier(hotel, "preferred_non_five_star")).toBe(false);
    expect(isHotelEligibleForTier({ ...hotel, rating: "四星" }, "preferred_non_five_star")).toBe(true);
  });

  it("activates a hotel tier by selection and requires every destination", () => {
    const hotelPlans = createDefaultHotelPlans();
    hotelPlans[0].hotels.push({
      destination: "昆明市", hotelId: "hotel-1", hotelName: "昆明酒店", rating: "五星", roomType: "标准间",
      breakfast: "含早", unit: "roomNight", unitCost: 500,
    });
    const itinerary = { destinations: ["昆明市", "大理市"], hotelPlans };

    expect(getEnabledHotelPlans(itinerary)).toHaveLength(1);
    expect(getIncompleteHotelPlanTiers(itinerary)).toEqual(["international_five_star"]);

    hotelPlans[0].hotels.push({
      destination: "大理市", hotelId: "hotel-2", hotelName: "大理酒店", rating: "五星", roomType: "标准间",
      breakfast: "含早", unit: "roomNight", unitCost: 600,
    });
    expect(getIncompleteHotelPlanTiers(itinerary)).toEqual([]);
  });

  it("counts repeated stays in one destination without selecting a hotel per day", () => {
    expect(calculateDestinationNights({
      dailyPlans: [
        { overnightDestination: "昆明市" },
        { overnightDestination: "昆明市" },
        { overnightDestination: "大理市" },
        { overnightDestination: "" },
      ],
    } as never)).toEqual({ 昆明市: 2, 大理市: 1 });
  });
});
