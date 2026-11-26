import { describe, expect, it } from "vitest";
import type { ItineraryRecord } from "@/types/itinerary";
import { getItineraryValidationIssues, serverStartDateIssue, START_DATE_ISSUE } from "./workflow";

type ValidationPlan = Pick<
  ItineraryRecord,
  "dailyPlans" | "hotelPlans" | "vehiclePlans" | "paxTiers" | "guidePlans" | "quote"
>;

function createPlan({ hotel = true, vehicle = true } = {}): ValidationPlan {
  return {
    dailyPlans: [
      {
        id: "day-1",
        dayNumber: 1,
        date: "2026-12-23",
        departure: "",
        destination: "",
        viaDestinations: [],
        overnightDestination: "大理",
        meals: { breakfast: false, lunch: false, dinner: false },
        transport: "",
        description: "抵达大理",
        departureEn: "",
        destinationEn: "",
        transportEn: "",
        descriptionEn: "",
        items: [],
      },
    ],
    hotelPlans: [
      {
        tier: 5,
        hotels: hotel
          ? [
            {
              destination: "大理",
              hotelId: "hotel-1",
              hotelName: "测试酒店",
              rating: 5,
              breakfast: "含早",
              unit: "room_night",
              unitCost: 500,
            },
          ]
          : [],
      },
      { tier: 4, hotels: [] },
    ],
    vehiclePlans: [
      {
        tier: "standard",
        quotationMode: "itinerary",
        arrangements: vehicle
          ? [
            {
              id: "arrangement-1",
              startDate: "2026-12-23",
              endDate: "2026-12-23",
              vehicles: [],
              paxPrices: [{ pax: 10, totalPrice: 1000, vehicles: [{ vehicleId: "vehicle-1", vehicleName: "巴士", seats: 20, quantity: 1 }] }],
            },
          ]
          : [],
        totalPrice: null,
        paxPrices: [{ pax: 10, totalPrice: vehicle ? 1000 : null, pricingMode: "automatic" }],
      },
      { tier: "vip", quotationMode: "itinerary", arrangements: [], totalPrice: null, paxPrices: [{ pax: 10, totalPrice: null, pricingMode: "automatic" }] },
    ],
    paxTiers: [10],
    guidePlans: [],
    quote: {
      mealOtherCost: null,
      mealOtherReason: "",
      attractionOtherCost: null,
      attractionOtherReason: "",
      paxOtherCosts: [],
      staffRoomCosts: [],
      options: [],
      chineseTip: null,
      englishTip: null,
      transportFees: [],
      customerNotes: "",
      holidayRestrictions: "",
      hotelReplacementTerms: "",
      customerNotesEn: "",
      holidayRestrictionsEn: "",
      hotelReplacementTermsEn: "",
    },
  };
}

describe("getItineraryValidationIssues", () => {
  it.each([
    [{ hotel: true, vehicle: false }, ["itinerary.validation.vehicles"]],
    [{ hotel: false, vehicle: true }, ["itinerary.pdfHotelPlanRequired"]],
    [
      { hotel: false, vehicle: false },
      ["itinerary.pdfHotelPlanRequired", "itinerary.validation.vehicles"],
    ],
  ])("reports hotel and vehicle validation independently", (settings, expectedKeys) => {
    expect(getItineraryValidationIssues(createPlan(settings)).map((issue) => issue.key)).toEqual(
      expectedKeys,
    );
  });

  it("blocks freezing while any selected actual price is still empty", () => {
    const plan = createPlan();
    plan.hotelPlans[0]!.hotels[0]!.unitCost = null;
    plan.guidePlans = [
      {
        destination: "大理",
        guideId: "guide-1",
        guideName: "导游",
        secondLanguage: "none",
        shopping: false,
        dailyPrice: null,
        serviceDays: 1,
      } as ValidationPlan["guidePlans"][number],
    ];
    const issues = getItineraryValidationIssues(plan).filter(
      (issue) => issue.key === "itinerary.validation.actualPrice",
    );
    expect(issues.map((issue) => issue.params?.name)).toEqual(["测试酒店", "导游"]);
  });
});

describe("ordinary itinerary start date", () => {
  it("is optional for drafts but required before customer files, locating the basics", () => {
    const plan = { ...createPlan(), startDate: "" };
    expect(getItineraryValidationIssues(plan)).not.toContainEqual(START_DATE_ISSUE);
    expect(getItineraryValidationIssues(plan, { requireStartDate: true })[0]).toEqual({
      key: "itinerary.validation.startDate",
      target: "itinerary-basics",
    });
    expect(getItineraryValidationIssues({ ...plan, startDate: "2026-12-23" }, { requireStartDate: true }))
      .not.toContainEqual(START_DATE_ISSUE);
  });

  it("maps a server PDF_NOT_READY startDate issue to the same locator", () => {
    expect(serverStartDateIssue({ issues: ["dailyPlans[0].items[0].unitCost", "startDate"] })).toEqual(START_DATE_ISSUE);
    expect(serverStartDateIssue({ issues: ["hotelPlans[0].hotels[0].unitCost"] })).toBeNull();
    expect(serverStartDateIssue(undefined)).toBeNull();
  });
});
