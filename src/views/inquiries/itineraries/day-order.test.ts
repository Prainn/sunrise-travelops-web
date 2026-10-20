import { reactive } from "vue";
import { describe, expect, it } from "vitest";
import type { ItineraryDayRecord, ItineraryResourceItem } from "@/types/itinerary";
import type { WebsiteDay } from "@/types/website";
import { emptyDay } from "@/views/website-inquiries/options";
import { reorderWebsiteDays } from "@/views/website-inquiries/itineraries/day-order";
import { restoredDayIndex } from "./reorder-board";
import { reorderItineraryDays } from "./day-order";

function item(id: string, type: "attraction" | "restaurant", mealSlot?: "lunch" | "dinner"): ItineraryResourceItem {
  return {
    id,
    type,
    mealSlot,
    resourceId: `r-${id}`,
    resourceName: id,
    priceName: "",
    quantity: 1,
    dinerCount: null,
    unit: "person",
    unitCost: 10,
    totalCost: 10,
    remark: "",
    referencePrice: 10,
    referenceBasis: "resource_price",
    adjustmentReason: "",
  } as ItineraryResourceItem;
}

function day(id: string, index: number, departure: string, destination: string, overnight: string | null, items: ItineraryResourceItem[] = []): ItineraryDayRecord {
  return {
    id,
    dayNumber: index + 1,
    date: `2027-01-0${index + 1}`,
    departure,
    destination,
    overnightDestination: overnight,
    meals: { breakfast: index > 0, lunch: false, dinner: false },
    transport: "",
    description: "人工文案",
    items,
  };
}

describe("normal itinerary day reorder", () => {
  const plan = {
    startDate: "2027-01-01",
    vehiclePlans: [{ tier: "standard" as const, arrangements: [{ id: "a", startDate: "2027-01-01", endDate: "2027-01-03", vehicles: [] }], totalPrice: null }],
    dailyPlans: [
      day("d1", 0, "吉隆坡", "昆明", "昆明", [item("a1", "attraction"), item("m1", "restaurant", "lunch"), item("a2", "attraction")]),
      day("d2", 1, "昆明", "大理", "大理"),
      day("d3", 2, "大理", "丽江", ""),
    ],
  };

  it("keeps stable IDs, renumbers dates and swaps attractions only in attraction slots", () => {
    const result = reorderItineraryDays(plan, { dayIds: ["d1", "d3", "d2"], itemIds: { d1: ["a2", "a1"] } });
    expect(result.dailyPlans.map((record) => [record.id, record.dayNumber, record.date])).toEqual([
      ["d1", 1, "2027-01-01"],
      ["d3", 2, "2027-01-02"],
      ["d2", 3, "2027-01-03"],
    ]);
    expect(result.dailyPlans[0]!.items.map((record) => record.id)).toEqual(["a2", "m1", "a1"]);
    expect(result.dailyPlans[0]!.description).toBe("人工文案");
    // 原草稿未被修改，取消时可直接丢弃结果。
    expect(plan.dailyPlans[0]!.items.map((record) => record.id)).toEqual(["a1", "m1", "a2"]);
  });

  it("applies the middle-day overnight rule and reports the affected days", () => {
    const result = reorderItineraryDays(plan, { dayIds: ["d1", "d3", "d2"], itemIds: {} });
    expect(result.dailyPlans[1]!.overnightDestination).toBe("丽江");
    expect(result.issues.map((issue) => [issue.dayId, issue.key.split(".").pop()])).toEqual([
      ["d3", "formerLastDay"],
      ["d3", "routeBreak"],
      ["d2", "newLastDay"],
      ["d2", "routeBreak"],
      ["", "vehicleCheck"],
    ]);
  });

  it("reports nothing when the order is unchanged", () => {
    expect(reorderItineraryDays(plan, { dayIds: ["d1", "d2", "d3"], itemIds: { d1: ["a1", "a2"] } }).issues).toEqual([]);
  });
});

describe("website itinerary day reorder", () => {
  function websiteDay(number: number, depart: string, end: string, overnight: string | null): WebsiteDay {
    return { ...emptyDay(number), departCityId: depart, endCityId: end, overnightCityId: overnight };
  }

  it("keeps day/item identity, keeps overnight null and flags the moved last day", () => {
    const days = [websiteDay(1, "km", "km", "km"), websiteDay(2, "km", "dl", "dl"), websiteDay(3, "dl", "lj", null)];
    days[2]!.items.push({ id: "i1", attractionId: "att", nameZh: "古城", nameEn: "Old Town", descriptionZh: "", descriptionEn: "", appears: false, feeState: "OPTIONAL" });
    const ids = days.map((record) => record.id);
    const result = reorderWebsiteDays(days, { dayIds: [ids[0]!, ids[2]!, ids[1]!], itemIds: {} });
    expect(result.days.map((record) => [record.id, record.dayNumber])).toEqual([[ids[0], 1], [ids[2], 2], [ids[1], 3]]);
    expect(result.days[1]!.overnightCityId).toBeNull();
    expect(result.days[1]!.items[0]).toMatchObject({ id: "i1", appears: false, feeState: "OPTIONAL" });
    expect(result.issues.map((issue) => issue.key.split(".").pop())).toEqual(["middleNoOvernight", "cityBreak", "newLastDay", "cityBreak"]);
  });
});

describe("day recycle transactions", () => {
  it("keeps deleted resources and original dates through delete and restore", () => {
    const original = day("d1", 0, "A", "B", "B", [item("ticket", "attraction")]);
    const next = day("d2", 1, "B", "C", "");
    const plan = reactive({ startDate: "2027-01-01", vehiclePlans: [], dailyPlans: [original, next] });
    const removed = reorderItineraryDays(plan, {
      dayIds: ["d2"], itemIds: {}, deletedDays: [{ id: "d1", dayNumber: 1, date: "2027-01-01" }],
    });
    expect(removed.dailyPlans.map((value) => value.id)).toEqual(["d2"]);
    expect(removed.deletedDays[0]).toEqual({ day: original, originalDate: "2027-01-01" });
    const restored = reorderItineraryDays({ ...plan, ...removed }, {
      dayIds: ["d1", "d2"], itemIds: {}, deletedDays: [],
    });
    expect(restored.deletedDays).toEqual([]);
    expect(restored.dailyPlans[0]!.items).toEqual(original.items);
    expect(restored.dailyPlans.map((value) => value.date)).toEqual(["2027-01-01", "2027-01-02"]);
    expect(plan.dailyPlans).toHaveLength(2);
  });

  it("restores before a date occupant, uses original dates after a start-date change, and falls back to day order without dates", () => {
    expect(restoredDayIndex(["2027-01-01", "2027-01-02", "2027-01-03"], "2027-01-02", 2)).toBe(1);
    expect(restoredDayIndex(["2027-01-02", "2027-01-03"], "2027-01-01", 3)).toBe(0);
    expect(restoredDayIndex(["2027-01-01"], "2027-01-04", 4)).toBe(1);
    expect(restoredDayIndex([null, null, null], null, 2)).toBe(1);
  });

  it("restores website days with every detail and stable ID", () => {
    const original = emptyDay(2);
    original.guideLanguage = "English";
    const active = emptyDay(1);
    const removed = { day: original, originalDate: null };
    const restored = reorderWebsiteDays([active], { dayIds: [active.id, original.id], itemIds: {}, deletedDays: [] }, [removed]);
    expect(restored.days[1]).toEqual(original);
    expect(restored.deletedDays).toEqual([]);
    expect(removed.day).toEqual(original);
  });
});
