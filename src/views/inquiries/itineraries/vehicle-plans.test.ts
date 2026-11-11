import { describe, expect, it } from "vitest";
import type { ItineraryVehiclePlan } from "@/types/itinerary";
import { missingPriceReasons, vehiclePaxPriceNeedsReason } from "./price-adjustments";
import {
  createVehicleDraft,
  hasVehicleSeatShortage,
  legacyStageTotalDifferences,
  needsVehicleModeChangeConfirm,
  setVehiclePaxTotal,
  setVehicleSegmentPaxPrice,
  syncVehiclePaxTiers,
  withVehicleArrangements,
} from "./vehicle-plans";

const PAX = [15, 20, 25];

function stagePlan(prices: Array<number | null>): ItineraryVehiclePlan {
  return {
    tier: "standard",
    quotationMode: "stage",
    totalPrice: null,
    pricingMode: null,
    segmentTotal: null,
    adjustmentReason: "",
    paxPrices: PAX.map((pax, index) => ({
      pax,
      totalPrice: prices[index] ?? null,
      pricingMode: "automatic",
    })),
    arrangements: [
      {
        id: "range-1",
        startDate: "2026-12-12",
        endDate: "2026-12-22",
        vehicles: [],
        totalPrice: null,
        paxPrices: PAX.map((pax, index) => ({ pax, totalPrice: prices[index] ?? null })),
      },
    ],
  };
}

function legacyItineraryPlan(
  pricingMode: ItineraryVehiclePlan["pricingMode"],
  totalPrice: number | null,
): ItineraryVehiclePlan {
  return {
    tier: "standard",
    pricingMode,
    totalPrice,
    segmentTotal: 1000,
    adjustmentReason: "",
    arrangements: [
      {
        id: "legacy-range",
        startDate: "2026-12-12",
        endDate: "2026-12-13",
        vehicles: [{ vehicleId: "bus", vehicleName: "Bus", seats: 30, quantity: 1 }],
        totalPrice: 1000,
      },
    ],
  };
}

describe("vehicle PAX drafts", () => {
  it("deep-copies the saved plans so draft edits never reach the record", () => {
    const saved = [stagePlan([13200, 14000, 15500])];
    const draft = createVehicleDraft(saved, PAX, "stage");
    const edited = setVehicleSegmentPaxPrice(draft[0]!, "range-1", 20, 0);
    expect(saved[0]!.arrangements[0]!.paxPrices![1]!.totalPrice).toBe(14000);
    expect(draft[0]!.arrangements[0]!.paxPrices![1]!.totalPrice).toBe(14000);
    // 0 is an explicit free price; other PAX tiers keep their own totals.
    expect(edited.paxPrices!.map((price) => price.totalPrice)).toEqual([13200, 0, 15500]);
  });

  it("starts a confirmed mode switch from a blank draft with no inherited ranges or prices", () => {
    const saved = [stagePlan([13200, 14000, 15500])];
    expect(needsVehicleModeChangeConfirm(saved, "itinerary")).toBe(true);
    expect(needsVehicleModeChangeConfirm(saved, "stage")).toBe(false);
    const draft = createVehicleDraft(saved, PAX, "itinerary", true);
    expect(draft.map((plan) => plan.quotationMode)).toEqual(["itinerary", "itinerary"]);
    expect(draft[0]!.arrangements).toEqual([]);
    expect(draft[0]!.paxPrices!.every((price) => price.totalPrice === null)).toBe(true);
    expect(saved[0]!.arrangements).toHaveLength(1);
  });

  it("asks for confirmation when any legacy tier was kept in another mode", () => {
    const legacy = (tier: "standard" | "vip", withVehicles: boolean): ItineraryVehiclePlan => ({
      tier,
      totalPrice: 5000,
      pricingMode: "manual",
      arrangements: [{
        id: `${tier}-range`,
        startDate: "2026-12-12",
        endDate: "2026-12-22",
        totalPrice: 5000,
        vehicles: withVehicles ? [{ vehicleId: "car-1", vehicleName: "考斯特", seats: 22, quantity: 1 }] : [],
      }],
    });
    const saved = [legacy("standard", true), legacy("vip", false)];
    expect(needsVehicleModeChangeConfirm(saved, "itinerary")).toBe(true);
    expect(needsVehicleModeChangeConfirm(saved, "stage")).toBe(true);
    expect(needsVehicleModeChangeConfirm([legacy("standard", true)], "itinerary")).toBe(false);
  });

  it("uses the selected mode after all arrangements were removed", () => {
    const empty = { ...stagePlan([null, null, null]), arrangements: [] };
    expect(needsVehicleModeChangeConfirm([empty], "itinerary")).toBe(false);
    const draft = createVehicleDraft([empty], PAX, "itinerary");
    expect(draft.map((plan) => plan.quotationMode)).toEqual(["itinerary", "itinerary"]);
  });

  it("clears manual totals when the last arrangement is removed", () => {
    const plan = { ...stagePlan([1000, 1100, 1200]), quotationMode: "itinerary" as const };
    const cleared = withVehicleArrangements(setVehiclePaxTotal(plan, 15, 900), []);
    expect(cleared.paxPrices!.map((price) => price.totalPrice)).toEqual([null, null, null]);
    expect(plan.arrangements).toHaveLength(1);
  });

  it("keeps existing tiers, adds empty tiers and drops removed tiers in both layers", () => {
    const synced = syncVehiclePaxTiers(stagePlan([13200, 14000, 15500]), [15, 25, 30]);
    expect(synced.paxPrices!.map((price) => [price.pax, price.totalPrice])).toEqual([
      [15, 13200],
      [25, 15500],
      [30, null],
    ]);
    expect(synced.arrangements[0]!.paxPrices!.map((price) => [price.pax, price.totalPrice])).toEqual([
      [15, 13200],
      [25, 15500],
      [30, null],
    ]);
  });

  it("restores automatic only for the cleared PAX manual total", () => {
    const plan: ItineraryVehiclePlan = {
      ...stagePlan([1000, 1100, 1200]),
      quotationMode: "itinerary",
    };
    const manual = setVehiclePaxTotal(setVehiclePaxTotal(plan, 15, 900), 20, 950);
    expect(manual.paxPrices!.map((price) => price.pricingMode)).toEqual([
      "manual",
      "manual",
      "automatic",
    ]);
    const restored = setVehiclePaxTotal(manual, 15, null);
    expect(restored.paxPrices!.map((price) => [price.pricingMode, price.totalPrice])).toEqual([
      ["automatic", 1000],
      ["manual", 950],
      ["automatic", 1200],
    ]);
  });

  it("checks seats only for dated itinerary ranges", () => {
    const plan: ItineraryVehiclePlan = {
      ...stagePlan([null, null, null]),
      quotationMode: "itinerary",
    };
    expect(hasVehicleSeatShortage([plan], 25)).toBe(true);
    expect(hasVehicleSeatShortage([stagePlan([null, null, null])], 25)).toBe(false);
    const undated = {
      ...plan,
      arrangements: plan.arrangements.map((arrangement) => ({ ...arrangement, startDate: "", endDate: "" })),
    };
    expect(hasVehicleSeatShortage([undated], 25)).toBe(false);
  });
});

describe("legacy vehicle adoption", () => {
  it("copies shared prices into every PAX tier and keeps manual or unknown totals manual", () => {
    for (const mode of ["manual", "unknown", null] as const) {
      const [draft] = createVehicleDraft([legacyItineraryPlan(mode, 1200)], PAX, "itinerary");
      expect(draft!.quotationMode).toBe("itinerary");
      expect(draft!.totalPrice).toBeNull();
      expect(draft!.arrangements[0]!.totalPrice).toBeNull();
      expect(draft!.arrangements[0]!.paxPrices!.map((price) => price.totalPrice)).toEqual([
        1000, 1000, 1000,
      ]);
      expect(draft!.paxPrices!.map((price) => [price.pricingMode, price.totalPrice])).toEqual(
        PAX.map(() => ["manual", 1200]),
      );
    }
    const [automatic] = createVehicleDraft([legacyItineraryPlan("automatic", 1000)], PAX, "itinerary");
    expect(automatic!.paxPrices!.every((price) => price.pricingMode === "automatic")).toBe(true);
  });

  it("keeps a free 0 segment instead of treating it as missing", () => {
    const legacy = legacyItineraryPlan("automatic", 0);
    legacy.arrangements[0]!.totalPrice = 0;
    const [draft] = createVehicleDraft([legacy], PAX, "itinerary");
    expect(draft!.paxPrices!.map((price) => price.totalPrice)).toEqual([0, 0, 0]);
  });

  it("shows a legacy stage total that differs from the segment sum instead of rewriting it", () => {
    const saved: ItineraryVehiclePlan = {
      tier: "standard",
      totalPrice: 1500,
      pricingMode: "manual",
      arrangements: [
        { id: "s1", startDate: "2026-12-12", endDate: "2026-12-12", vehicles: [], totalPrice: 1000 },
      ],
    };
    const [draft] = createVehicleDraft([saved], PAX, "stage");
    expect(draft!.paxPrices!.every((price) => price.pricingMode === "automatic")).toBe(true);
    expect(legacyStageTotalDifferences(draft!, saved)).toEqual(
      PAX.map((pax) => ({ pax, original: 1500, total: 1000 })),
    );
  });

  it("compares the first PAX adjustment with the original shared total", () => {
    const saved = legacyItineraryPlan("manual", 1200);
    const [draft] = createVehicleDraft([saved], PAX, "itinerary");
    expect(vehiclePaxPriceNeedsReason(draft!, 15, saved)).toBe(false);
    const changed = setVehiclePaxTotal(draft!, 20, 1300);
    expect(vehiclePaxPriceNeedsReason(changed, 20, saved)).toBe(true);
    expect(vehiclePaxPriceNeedsReason(changed, 15, saved)).toBe(false);
  });
});

describe("vehicle PAX reasons", () => {
  const saved: ItineraryVehiclePlan = {
    ...stagePlan([1000, 1100, 1200]),
    quotationMode: "itinerary",
  };

  it("needs no reason for a first price or a restored automatic total", () => {
    const blank = { ...saved, paxPrices: saved.paxPrices!.map((price) => ({ ...price, totalPrice: null })) };
    expect(vehiclePaxPriceNeedsReason(setVehiclePaxTotal(saved, 15, 900), 15, blank)).toBe(false);
    const manual = { ...setVehiclePaxTotal(saved, 15, 900) };
    expect(vehiclePaxPriceNeedsReason(setVehiclePaxTotal(manual, 15, null), 15, manual)).toBe(false);
  });

  it("requires a reason per changed PAX tier only", () => {
    const record = {
      vehiclePlans: [setVehiclePaxTotal(saved, 20, 999)],
    } as Parameters<typeof missingPriceReasons>[0];
    const previous = { vehiclePlans: [saved] } as Parameters<typeof missingPriceReasons>[1];
    // Item rows are empty here; only the vehicle tier needs a reason.
    Object.assign(record, { dailyPlans: [], hotelPlans: [], guidePlans: [] });
    Object.assign(previous!, { dailyPlans: [], hotelPlans: [], guidePlans: [] });
    expect(missingPriceReasons(record, previous)).toEqual(["standard:20"]);
  });
});
