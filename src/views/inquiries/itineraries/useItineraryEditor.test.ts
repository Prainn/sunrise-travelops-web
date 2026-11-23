import { computed, ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import type { InquiryRecord } from "@/types/inquiry";
import type { ItineraryRecord } from "@/types/itinerary";
import { itineraryInput } from "@/services/inquiry.service";
import { itineraryDayNumber } from "./duration";
import { useItineraryEditor } from "./useItineraryEditor";

vi.mock("@/api/request", () => ({ request: {} }));
vi.mock("@/lang/utils", () => ({ translate: (key: string) => key }));

function editorFor(isSeries: boolean) {
  const inquiry = ref({ isSeries, plannedDays: isSeries ? null : 2, status: "new" } as InquiryRecord);
  const editor = useItineraryEditor({
    inquiry,
    inquiryId: computed(() => "inquiry-id"),
    selectedItinerary: computed<ItineraryRecord | undefined>(() => undefined),
    canCreate: () => true,
    canEditContent: () => true,
    canEditPrice: () => true,
    getCreator: () => "coordinator",
    findHotel: () => undefined,
  });
  return editor;
}

describe("new itinerary dates", () => {
  it("builds a series payload without a user date and maps vehicle dates back to trip day numbers", () => {
    const editor = editorFor(true);
    const record = editor.createItinerary({ ...editor.createEmptyItinerary(), days: 61 })!;
    const input = itineraryInput(record);
    expect(input.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(input.dailyPlans).toHaveLength(61);
    expect(input.dailyPlans[0]?.date).toBe(input.startDate);
    expect(input.dailyPlans.at(-1)?.date).toBe(record.endDate);
    expect(input.dailyPlans.map((day) => itineraryDayNumber(input.startDate, day.date))).toEqual(
      input.dailyPlans.map((day) => day.dayNumber),
    );
  });

  it("keeps the selected calendar start and the inquiry day count for ordinary itineraries", () => {
    const editor = editorFor(false);
    const record = editor.createItinerary({
      ...editor.createEmptyItinerary(),
      startDate: "2026-12-31",
      paxTiers: [10, 18],
    })!;
    const input = itineraryInput(record);
    expect(input.startDate).toBe("2026-12-31");
    expect(input.dailyPlans.map((day) => day.date)).toEqual(["2026-12-31", "2027-01-01"]);
    expect(input.vehiclePlans.map(({ tier, quotationMode, paxPrices }) => ({
      tier,
      quotationMode,
      paxPrices,
    }))).toEqual(["standard", "vip"].map((tier) => ({
      tier,
      quotationMode: "itinerary",
      paxPrices: [
        { pax: 10, totalPrice: null, pricingMode: "automatic", adjustmentReason: "" },
        { pax: 18, totalPrice: null, pricingMode: "automatic", adjustmentReason: "" },
      ],
    })));
  });
});

describe("initial route planning", () => {
  it("saves ordered optional stops with their day and leaves the overnight city and next departure alone", () => {
    const editor = editorFor(false);
    const plan = editor.createItinerary({
      ...editor.createEmptyItinerary(), destinations: ["昆明", "大理", "丽江", "楚雄", "保山"],
    })!;
    editor.updatePlanDayField(plan, 0, "departure", "昆明");
    editor.updatePlanDayField(plan, 0, "destination", "大理");
    editor.updatePlanDayField(plan, 0, "overnightDestination", "保山");
    editor.updatePlanViaDestinations(plan, 0, ["楚雄", "大理", "丽江", "上海", "昆明", "楚雄"]);
    expect(plan.dailyPlans[0]!.viaDestinations).toEqual(["楚雄", "丽江"]);
    editor.updatePlanViaDestinations(plan, 0, ["丽江", "楚雄"]);
    expect(plan.dailyPlans[0]!.overnightDestination).toBe("保山");
    expect(plan.dailyPlans[1]!.departure).toBe("保山");

    const dayId = plan.dailyPlans[0]!.id;
    editor.moveInitialDay(plan, 0, 1);
    const days = itineraryInput(plan).dailyPlans;
    expect(days[0]!.viaDestinations).toEqual([]);
    expect(days[1]).toMatchObject({ id: dayId, viaDestinations: ["丽江", "楚雄"], overnightDestination: "保山" });
    editor.updatePlanViaDestinations(plan, 1, []);
    expect(itineraryInput(plan).dailyPlans[1]!.viaDestinations).toEqual([]);
  });

  it("removes a stop when it becomes an endpoint, including an inherited next-day departure", () => {
    const editor = editorFor(false);
    const plan = editor.createItinerary({ ...editor.createEmptyItinerary(), destinations: ["昆明", "大理", "丽江"] })!;
    editor.updatePlanViaDestinations(plan, 0, ["大理", "丽江"]);
    editor.updatePlanViaDestinations(plan, 1, ["昆明", "大理"]);
    editor.updatePlanDayField(plan, 0, "destination", "大理");
    expect(plan.dailyPlans[0]!.viaDestinations).toEqual(["丽江"]);
    expect(plan.dailyPlans[1]).toMatchObject({ departure: "大理", viaDestinations: ["昆明"] });
    editor.updatePlanDayField(plan, 0, "departure", "丽江");
    expect(plan.dailyPlans[0]!.viaDestinations).toEqual([]);
  });

  it("keeps explicit stays and route edits with the day while dates follow the new order", () => {
    const editor = editorFor(false);
    const plan = editor.createItinerary({
      ...editor.createEmptyItinerary(), startDate: "2026-12-31", destinations: ["昆明", "大理", "丽江"],
    })!;
    editor.updatePlanDayField(plan, 0, "departure", "昆明");
    editor.updatePlanDayField(plan, 0, "destination", "大理");
    expect(plan.dailyPlans[1]!.departure).toBe("大理");
    editor.updatePlanDayField(plan, 1, "departure", "丽江");
    editor.updatePlanDayField(plan, 0, "overnightDestination", "");
    editor.updatePlanDayField(plan, 0, "destination", "昆明");
    editor.updatePlanDayField(plan, 1, "destination", "返程机场");
    editor.updatePlanDayField(plan, 1, "overnightDestination", "大理");
    const ids = plan.dailyPlans.map(day => day.id);
    editor.moveInitialDay(plan, 1, 0);

    expect(itineraryInput(plan).dailyPlans.map(day => [
      day.id, day.dayNumber, day.date, day.departure, day.destination, day.overnightDestination,
    ])).toEqual([
      [ids[1], 1, "2026-12-31", "丽江", "返程机场", "大理"],
      [ids[0], 2, "2027-01-01", "昆明", "昆明", ""],
    ]);
  });
});

describe("optional ordinary start date", () => {
  it("creates D1–Dn without dates, fills dates later and clears them explicitly", () => {
    const editor = editorFor(false);
    const plan = editor.createItinerary({ ...editor.createEmptyItinerary(), paxTiers: [10] })!;
    expect(plan.dailyPlans.map((day) => [day.dayNumber, day.date])).toEqual([[1, ""], [2, ""]]);
    expect(plan.endDate).toBe("");
    expect(itineraryInput(plan).startDate).toBe("");

    const selected = useItineraryEditor({
      inquiry: ref({ isSeries: false, plannedDays: 2, status: "planning" } as InquiryRecord),
      inquiryId: computed(() => "inquiry-id"),
      selectedItinerary: computed(() => plan),
      canCreate: () => true,
      canEditContent: () => true,
      canEditPrice: () => true,
      getCreator: () => "coordinator",
      findHotel: () => undefined,
    });
    selected.updateItineraryBasics({ ...plan, startDate: "2026-12-31" });
    expect(plan.dailyPlans.map((day) => day.date)).toEqual(["2026-12-31", "2027-01-01"]);
    expect(plan.endDate).toBe("2027-01-01");
    selected.updateItineraryBasics({ ...plan, startDate: "" });
    expect(plan.dailyPlans.map((day) => day.date)).toEqual(["", ""]);
    // 清除须显式提交空值，后端据此清空原日期。
    expect(itineraryInput(plan)).toHaveProperty("startDate", "");
  });
});

describe("per-day hotels and other-cost totals", () => {
  function editorWith(plan: ItineraryRecord) {
    const findHotel = (id: string) =>
      ({ id, name: `酒店${id}`, city: "昆明", rating: 4, status: "enabled", individualPrice: 200, groupPrice: null, breakfast: "", unit: "roomNight" }) as never;
    return useItineraryEditor({
      inquiry: ref({ isSeries: false, plannedDays: 3, status: "new" } as InquiryRecord),
      inquiryId: computed(() => "inquiry-id"),
      selectedItinerary: computed(() => plan),
      canCreate: () => true,
      canEditContent: () => true,
      canEditPrice: () => true,
      getCreator: () => "coordinator",
      findHotel,
    });
  }
  function planWithDays() {
    const editor = editorFor(false);
    const plan = editor.createItinerary({
      ...editor.createEmptyItinerary(),
      startDate: "2026-12-01",
      destinations: ["昆明"],
      paxTiers: [2, 4],
    })!;
    plan.dailyPlans.forEach((day) => (day.overnightDestination = "昆明"));
    return plan;
  }

  it("selects a different hotel for each night in one city and drops a night's hotel when its stay changes", () => {
    const plan = planWithDays();
    const editor = editorWith(plan);
    const [first, second] = plan.dailyPlans;
    editor.updateHotelPlanSelection(4, first!.id, "a");
    editor.updateHotelPlanSelection(4, second!.id, "b");
    const hotels = () => plan.hotelPlans.find((p) => p.tier === 4)!.hotels;
    expect(hotels().map((h) => [h.dayId, h.hotelId])).toEqual([
      [first!.id, "a"],
      [second!.id, "b"],
    ]);
    editor.updateDayField(1, "overnightDestination", "");
    expect(hotels().map((h) => h.dayId)).toEqual([first!.id]);
  });

  it("keeps single supplement quotes per PAX when tiers change and sends the shared quote costs", () => {
    const plan = planWithDays();
    const editor = editorWith(plan);
    plan.vehiclePlans.find((vehicle) => vehicle.tier === "standard")!.arrangements = [
      { id: "v", startDate: "2026-12-01", endDate: "2026-12-02", vehicles: [], totalPrice: null, paxPrices: [] },
    ];
    editor.updateHotelPlanSelection(4, plan.dailyPlans[0]!.id, "a");
    expect(plan.quote.options.map((option) => [option.hotelTier, option.vehicleTier])).toEqual([[4, "standard"]]);
    plan.quote.options[0]!.paxPrices = [
      { pax: 2, adultUnitPrice: 100, singleSupplementQuote: 1685 },
      { pax: 4, adultUnitPrice: 90, singleSupplementQuote: 0 },
    ];
    Object.assign(plan.quote, { leaderRoomTotal: 600, driverTipTotal: 300, guideLeaderTransportTotal: 150, groundHandlingUnitCost: 20 });
    editor.updateItineraryBasics({ ...plan, paxTiers: [4, 6] });
    expect(plan.quote.options[0]!.paxPrices).toEqual([
      { pax: 4, adultUnitPrice: 90, singleSupplementQuote: 0 },
      { pax: 6, adultUnitPrice: null, singleSupplementQuote: null },
    ]);
    expect(itineraryInput(plan).quote).toMatchObject({
      leaderRoomTotal: 600, driverTipTotal: 300, guideLeaderTransportTotal: 150, groundHandlingUnitCost: 20,
    });
  });

  it("shifts each PAX price by the per-person change of an other-cost total", () => {
    const plan = planWithDays();
    plan.quote.options = [
      {
        id: "o",
        hotelTier: 4,
        vehicleTier: "standard",
        paxPrices: [
          { pax: 2, adultUnitPrice: 100 },
          { pax: 4, adultUnitPrice: 100 },
        ],
      },
    ];
    const editor = editorWith(plan);
    editor.updateQuoteSettings({ mealOtherCost: 40, mealOtherReason: "包车餐" });
    expect(plan.quote.options[0]!.paxPrices.map((p) => p.adultUnitPrice)).toEqual([120, 110]);
    editor.updateQuoteSettings({
      paxOtherCosts: [
        { pax: 2, guideOtherCost: 0, guideOtherReason: "", staffRoomOtherCost: 0, staffRoomOtherReason: "" },
        { pax: 4, guideOtherCost: 8, guideOtherReason: "门票", staffRoomOtherCost: null, staffRoomOtherReason: "" },
      ],
    });
    expect(plan.quote.options[0]!.paxPrices.map((p) => p.adultUnitPrice)).toEqual([120, 112]);
  });
});
