import { restoreWebsiteBoard } from "./reorder-board";
import { reactive } from "vue";
import { describe, expect, it } from "vitest";
import type { ItineraryDayRecord, ItineraryResourceItem } from "@/types/itinerary";
import type { WebsiteConfig, WebsiteDay } from "@/types/website";
import { emptyDay, isMealArranged } from "@/views/website-inquiries/options";
import {
  reorderWebsiteDays,
  websiteGuideBoardId,
  websiteTransferIssues,
  type ResourceLookup,
  type WebsiteTransferContext,
} from "@/views/website-inquiries/itineraries/day-order";
import {
  boardPlacements,
  boardTransferIssues,
  copyBoardItem,
  planBoardTransfer,
  removeBoardCopy,
  removeBoardItem,
  restoredDayIndex,
  type BoardState,
  type DayOrderChange,
  type ReorderBoardDay,
  type ReorderBoardItem,
} from "./reorder-board";
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

describe("website cross-day transfer and copy", () => {
  const config = {
    version: 3,
    cities: [
      { id: "km", nameZh: "昆明", nameEn: "Kunming", resourceId: "pc-km", status: "enabled" },
      { id: "dl", nameZh: "大理", nameEn: "Dali", resourceId: "pc-dl", status: "enabled" },
      { id: "lj", nameZh: "丽江", nameEn: "Lijiang", resourceId: null, status: "enabled" },
    ],
    attractions: [
      { id: "att-km", cityId: "km" },
      { id: "att-dl", cityId: "dl" },
    ],
  } as unknown as WebsiteConfig;
  const ready = <T,>(value: T): ResourceLookup<T> => ({ status: "ready", value });
  const restaurantCities: Record<string, ResourceLookup<string | null>> = { "r-km": ready("昆明") };
  const context: WebsiteTransferContext = {
    config,
    publicCityName: (id) => ready(({ "pc-km": "昆明", "pc-dl": "大理" } as Record<string, string>)[id] ?? null),
    restaurantCity: (id) => restaurantCities[id] ?? ready(null),
  };

  function websiteDays(): WebsiteDay[] {
    const d1 = { ...emptyDay(1), id: "d1", departCityId: "km", endCityId: "km", overnightCityId: "km", guideLanguage: "English" };
    d1.items = [{ id: "i-km", attractionId: "att-km", nameZh: "石林", nameEn: "Stone Forest", descriptionZh: "中文", descriptionEn: "EN", appears: false, feeState: "OPTIONAL" }];
    d1.hotels = [{ id: "h-km", tier: "A", cityId: "km", configHotelId: null, resourceId: "pub-h", nameZh: "昆明酒店", nameEn: "KM Hotel", roomType: "大床", breakfastIncluded: false }];
    d1.meals[1] = { ...d1.meals[1]!, id: "lunch-km", resourceId: "r-km", restaurantZh: "昆明餐厅", feeState: "INCLUDED" };
    d1.services = [{ id: "s1", nameZh: "接机", nameEn: "Pickup", appears: true, feeState: "INCLUDED" }];
    const d2 = { ...emptyDay(2), id: "d2", departCityId: "km", endCityId: "dl", overnightCityId: "dl", guideLanguage: "日语" };
    d2.items = [{ id: "i-dl", attractionId: "att-dl", nameZh: "洱海", nameEn: "Erhai", descriptionZh: "", descriptionEn: "", appears: true, feeState: "INCLUDED" }];
    d2.legs = [{ id: "leg", routeId: null, fromCityId: "km", toCityId: "dl", mode: "hsr", nameZh: "", nameEn: "", feeState: "INCLUDED" }];
    d2.hotels = [{ id: "h-dl", tier: "A", cityId: "dl", configHotelId: null, resourceId: null, nameZh: "大理酒店", nameEn: "DL Hotel", roomType: "", breakfastIncluded: true }];
    d2.meals[1] = { ...d2.meals[1]!, id: "lunch-manual", restaurantZh: "手填餐馆", feeState: "INCLUDED" };
    const d3 = { ...emptyDay(3), id: "d3", departCityId: "dl", endCityId: "dl", overnightCityId: null };
    return [d1, d2, d3];
  }

  /** 与独立站页面看板相同的 ID/slot/占位约定 */
  function board(days: WebsiteDay[]): ReorderBoardDay[] {
    return days.map((day) => ({
      id: day.id,
      title: day.id,
      groups: [
        { key: "attractions", label: "景点", sortable: true, transferable: true, items: day.items.map((value) => ({ id: value.id, label: value.nameZh })) },
        { key: "legs", label: "交通", transferable: true, items: day.legs.map((value) => ({ id: value.id, label: value.id })) },
        {
          key: "hotels", label: "酒店", transferable: true,
          items: [
            ...(day.overnightCityId ? [] : [{ id: `${day.id}-no-stay`, label: "不住宿", placeholder: true }]),
            ...day.hotels.map((value) => ({ id: value.id, label: value.nameZh, slot: value.tier })),
          ],
        },
        { key: "meals", label: "餐食", transferable: true, items: day.meals.map((value) => ({ id: value.id, label: value.slot, slot: value.slot, placeholder: !isMealArranged(value) })) },
        {
          key: "services", label: "导游与服务", transferable: true,
          items: [
            ...(day.guideLanguage ? [{ id: websiteGuideBoardId(day.id), label: day.guideLanguage, slot: "guide" }] : []),
            ...day.services.map((value) => ({ id: value.id, label: value.nameZh })),
          ],
        },
      ],
    }));
  }

  function setup() {
    const days = websiteDays();
    const boardDays = board(days);
    const items = new Map(boardDays.flatMap((day) => day.groups.flatMap((group) => group.items.map((value) => [value.id, value] as const))));
    let state: BoardState = { placements: boardPlacements(boardDays), copies: {} };
    const item = (id: string): ReorderBoardItem | undefined => {
      const copy = state.copies[id];
      const source = items.get(copy?.sourceId ?? id);
      return source && { ...source, id };
    };
    const group = (key: string) => boardDays[0]!.groups.find((value) => value.key === key)!;
    const change = (): DayOrderChange => ({
      dayIds: days.map((day) => day.id),
      itemIds: {},
      placements: state.placements,
      copies: Object.fromEntries(Object.entries(state.copies).map(([id, copy]) => [id, copy.sourceId])),
    });
    return {
      days,
      get state() { return state; },
      move(key: string, from: string, id: string, to: string, index?: number) {
        const plan = planBoardTransfer(state, group(key), { dayId: from, itemId: id }, { dayId: to, index }, item);
        if (plan) state = plan.next;
        return plan;
      },
      copy(key: string, dayId: string, id: string, copyId: string) {
        state = copyBoardItem(state, dayId, key, id, copyId);
      },
      remove(copyId: string) {
        state = removeBoardCopy(state, copyId);
      },
      boardIssues: () => boardTransferIssues(state, boardDays, item),
      result: () => reorderWebsiteDays(days, change()),
      blocking: () => websiteTransferIssues(days, change(), [], context).filter((issue) => issue.blocking).map((issue) => [issue.dayId, issue.key.split(".").pop(), issue.itemId]),
      hints: () => websiteTransferIssues(days, change(), [], context).filter((issue) => !issue.blocking).map((issue) => [issue.dayId, issue.key.split(".").pop(), issue.itemId]),
    };
  }

  it("locks only the corresponding original until its pending copies leave, and allows re-copy after placement", () => {
    const board = setup();
    board.days[0]!.items.push({ ...board.days[0]!.items[0]!, id: "other" });
    board.copy("services", "d1", "s1", "s-copy");
    expect(board.move("services", "d1", "s1", "d2")).toBeNull();
    expect(board.move("attractions", "d1", "i-km", "d2")).not.toBeNull();
    expect(board.move("services", "d1", "s-copy", "d3")).not.toBeNull();
    expect(board.state.copies["s-copy"]?.placed).toBe(true);
    board.copy("services", "d3", "s-copy", "s-copy2");
    expect(board.move("services", "d3", "s-copy", "d2")).toBeNull();
    expect(board.move("services", "d3", "s-copy2", "d2")).not.toBeNull();
    expect(board.move("services", "d1", "s1", "d2")).not.toBeNull();
  });

  it("preserves a mixed sequence and new days without mutating the submitted board", () => {
    const days = websiteDays();
    const change: DayOrderChange = {
      dayIds: ["d1", "d2", "d3", "d4"], addedDayIds: ["d4"], itemIds: {}, deletedDays: [],
      placements: { d1: { events: ["lunch-km", "i-km", "h-km", "s1"] }, d4: { events: ["leg-copy"] } },
      copies: { "leg-copy": "leg" }, overnight: { d3: "dl" },
    };
    const before = JSON.stringify(change);
    const result = reorderWebsiteDays(days, change);
    expect(JSON.stringify(change)).toBe(before);
    expect(result.days[0]!.eventOrder).toEqual(["lunch-km", "i-km", "h-km", "s1"]);
    expect(result.days[3]!.legs[0]!.id).toBe("leg-copy");
    expect(result.days[3]!.dayNumber).toBe(4);
    expect(result.days[2]!.overnightCityId).toBe("dl");
  });

  it("moves a card into another day's empty category, keeping its ID and full content", () => {
    const board = setup();
    const service = structuredClone(board.days[0]!.services[0]);
    expect(board.move("services", "d1", "s1", "d3")?.replaced).toEqual([]);
    expect(board.move("attractions", "d1", "i-km", "d2", 0)).not.toBeNull();
    const [d1, d2, d3] = board.result().days;
    expect(d1!.services).toEqual([]);
    expect(d3!.services).toEqual([service]);
    expect(d2!.items.map((value) => value.id)).toEqual(["i-km", "i-dl"]);
    expect(d2!.items[0]).toMatchObject({ descriptionEn: "EN", appears: false, feeState: "OPTIONAL" });
    // 昆明景点在 D2 出发城市内，可通过。
    expect(board.blocking()).toEqual([]);
    // 草稿未被修改，取消弹窗时直接丢弃。
    expect(board.days[0]!.services).toHaveLength(1);
  });

  it("keeps the shared board day-only for non-transferable groups such as Shengxu inquiries", () => {
    const board = setup();
    const state = board.state;
    const plan = planBoardTransfer(state, { key: "attractions" }, { dayId: "d1", itemId: "i-km" }, { dayId: "d2" }, () => ({ id: "i-km", label: "" }));
    expect(plan).toBeNull();
    expect(planBoardTransfer(state, { key: "hotels", transferable: true }, { dayId: "d3", itemId: "d3-no-stay" }, { dayId: "d1" }, () => ({ id: "d3-no-stay", label: "", placeholder: true }))).toBeNull();
  });

  it("blocks attractions outside the day's cities and rechecks when transport legs move", () => {
    const board = setup();
    board.move("attractions", "d2", "i-dl", "d1");
    expect(board.blocking()).toEqual([["d1", "cityMismatch", "i-dl"]]);
    // 交通段带来大理后城市匹配，但 D1 交通链断开，D2 失去交通段也断链。
    board.move("legs", "d2", "leg", "d1");
    expect(board.blocking()).toEqual([["d1", "legChainBroken", undefined], ["d2", "legChainBroken", undefined]]);
    board.move("legs", "d1", "leg", "d2");
    expect(board.blocking()).toEqual([["d1", "cityMismatch", "i-dl"]]);
  });

  it("asks before replacing a same-tier hotel and reports missing or mismatched stays", () => {
    const board = setup();
    const before = board.state;
    const conflict = planBoardTransfer(before, { key: "hotels", transferable: true }, { dayId: "d1", itemId: "h-km" }, { dayId: "d2" }, (id) => ({ id, label: id, slot: "A" }));
    expect(conflict?.replaced).toEqual(["h-dl"]);
    // 取消：不采用 next，排布保持拖动前。
    expect(board.state).toBe(before);
    board.move("hotels", "d1", "h-km", "d3");
    expect(board.blocking()).toEqual([["d1", "missingHotel", undefined], ["d3", "hotelNoOvernight", "h-km"]]);
    board.move("hotels", "d3", "h-km", "d1");
    expect(board.blocking()).toEqual([]);
    board.move("hotels", "d1", "h-km", "d2");
    expect(board.result().days[1]!.hotels.map((value) => value.id)).toEqual(["h-km"]);
    expect(board.blocking()).toEqual([["d1", "missingHotel", undefined], ["d2", "hotelCityMismatch", "h-km"]]);
  });

  it("copies into an independent record that must be placed or deleted before applying", () => {
    const board = setup();
    const initial = board.state;
    board.copy("services", "d1", "s1", "copy-s1");
    expect(board.boardIssues().map((issue) => [issue.dayId, issue.key.split(".").pop()])).toEqual([["d1", "unplacedCopy"]]);
    board.move("services", "d1", "copy-s1", "d2");
    expect(board.boardIssues()).toEqual([]);
    const [d1, d2] = board.result().days;
    expect(d1!.services.map((value) => value.id)).toEqual(["s1"]);
    expect(d2!.services).toEqual([{ ...board.days[0]!.services[0], id: "copy-s1" }]);
    d2!.services[0]!.nameZh = "改名";
    expect(board.days[0]!.services[0]!.nameZh).toBe("接机");
    board.remove("copy-s1");
    expect(board.state.placements).toEqual(initial.placements);
    expect(board.state.copies).toEqual(initial.copies);
  });

  it("moves, copies and replaces day guide arrangements with language and scope", () => {
    const board = setup();
    board.copy("services", "d1", websiteGuideBoardId("d1"), "copy-guide");
    expect(board.boardIssues().map((issue) => issue.key.split(".").pop())).toEqual(["unplacedCopy", "duplicateSlot"]);
    expect(board.move("services", "d1", "copy-guide", "d3")?.replaced).toEqual([]);
    expect(board.boardIssues()).toEqual([]);
    expect(board.move("services", "d1", websiteGuideBoardId("d1"), "d2")?.replaced).toEqual([websiteGuideBoardId("d2")]);
    const [d1, d2, d3] = board.result().days;
    expect([d1, d2, d3].map((day) => day!.guideLanguage)).toEqual(["", "English", "English"]);
  });

  it("keeps the meal slot, refills the vacated slot and checks restaurant cities", () => {
    const board = setup();
    // D3 午餐为默认自理占位，直接让位，不提示替换。
    expect(board.move("meals", "d1", "lunch-km", "d3")?.replaced).toEqual([]);
    const [d1, , d3] = board.result().days;
    expect(d3!.meals.find((meal) => meal.slot === "lunch")).toMatchObject({ id: "lunch-km", resourceId: "r-km" });
    expect(d1!.meals.find((meal) => meal.slot === "lunch")).toMatchObject({ feeState: "SELF_PAY", resourceId: null });
    expect(d1!.meals.find((meal) => meal.slot === "lunch")!.id).not.toBe("lunch-km");
    expect(board.blocking()).toEqual([["d3", "restaurantCityMismatch", "lunch-km"]]);
    restaurantCities["r-km"] = { status: "loading" };
    expect(board.blocking()).toEqual([["d3", "checking", "lunch-km"]]);
    const retry = () => undefined;
    restaurantCities["r-km"] = { status: "error", message: "network", retry };
    expect(websiteTransferIssues(board.days, { dayIds: ["d1", "d2", "d3"], itemIds: {}, placements: board.state.placements }, [], context)
      .find((issue) => issue.blocking)).toMatchObject({ key: "itineraryWorkspace.transfer.lookupFailed", retry });
    restaurantCities["r-km"] = ready("昆明");
  });

  it("hints manual content and includes historical issues in explicit full validation", () => {
    const board = setup();
    // D2 手填午餐移入 D1，与 D1 已安排午餐冲突 → 替换后仅提示人工核对。
    expect(board.move("meals", "d2", "lunch-manual", "d1")?.replaced).toEqual(["lunch-km"]);
    expect(board.hints()).toEqual([["d1", "manualCheck", "lunch-manual"]]);
    expect(board.blocking()).toEqual([]);
    // D3 原本就没有交通段（dl→dl 无需交通），改为历史断链：既有问题不因收到服务而阻断。
    board.days[2]!.endCityId = "lj";
    board.move("services", "d1", "s1", "d3");
    expect(board.blocking()).toContainEqual(["d3", "legChainBroken", undefined]);
  });

  it("keeps moved cards with a recycled day", () => {
    const board = setup();
    board.move("services", "d1", "s1", "d3");
    const result = reorderWebsiteDays(board.days, {
      dayIds: ["d1", "d2"], itemIds: {}, placements: board.state.placements, deletedDays: [{ id: "d3", dayNumber: 3, date: null }],
    });
    expect(result.days.map((day) => day.id)).toEqual(["d1", "d2"]);
    expect(result.deletedDays[0]!.day.services.map((value) => value.id)).toEqual(["s1"]);
  });
});

it("permits unrelated original B of the same type while A has a pending copy", () => {
  const items = new Map(["a", "b", "a-copy"].map(id => [id, { id, label: id }]));
  let state: BoardState = { placements: { d1: { events: ["a", "b"] }, d2: { events: [] } }, copies: {} };
  state = copyBoardItem(state, "d1", "events", "a", "a-copy");
  expect(planBoardTransfer(state, { key: "events", transferable: true }, { dayId: "d1", itemId: "a" }, { dayId: "d2" }, id => items.get(id))).toBeNull();
  expect(planBoardTransfer(state, { key: "events", transferable: true }, { dayId: "d1", itemId: "b" }, { dayId: "d2" }, id => items.get(id))).not.toBeNull();
});

it("restores pending placements while retaining newly added content and dropping removed sources", () => {
  const days = [
    { id: "d1", title: "", groups: [{ key: "events", label: "", items: [{ id: "a", label: "A" }, { id: "new", label: "New" }] }] },
    { id: "d2", title: "", groups: [{ key: "events", label: "", items: [{ id: "d2-no-stay", label: "No stay", placeholder: true }] }] },
  ];
  const result = restoreWebsiteBoard(days, {
    dayIds: ["d1", "d2"], addedDayIds: [], deletedDays: [],
    placements: [{ dayId: "d1", itemIds: ["copy", "removed"] }, { dayId: "d2", itemIds: ["a"] }],
    copies: [{ id: "copy", sourceId: "a", parentId: "a", dayId: "d1", placed: false }, { id: "lost", sourceId: "removed", parentId: "removed", dayId: "d1", placed: false }],
    overnight: [{ dayId: "d2", cityId: "city" }],
  });
  expect(result.placements).toEqual({ d1: { events: ["copy", "new"] }, d2: { events: ["a"] } });
  expect(Object.keys(result.copies)).toEqual(["copy"]);
});

it("does not bring back items displaced by a confirmed same-slot replacement", () => {
  const days = [
    { id: "d1", title: "", groups: [{ key: "events", label: "", items: [{ id: "h1", label: "H1", slot: "hotel:A" }, { id: "lunch1", label: "Lunch", slot: "meal:lunch" }] }] },
    { id: "d2", title: "", groups: [{ key: "events", label: "", items: [
      { id: "h2", label: "H2", slot: "hotel:A" }, { id: "lunch-none", label: "Self", slot: "meal:lunch", placeholder: true }, { id: "fresh", label: "Fresh" },
    ] }] },
  ];
  const result = restoreWebsiteBoard(days, {
    dayIds: ["d1", "d2"], addedDayIds: [], deletedDays: [],
    placements: [{ dayId: "d1", itemIds: [] }, { dayId: "d2", itemIds: ["h1", "lunch1"] }],
    copies: [], overnight: [],
  });
  expect(result.placements).toEqual({ d1: { events: [] }, d2: { events: ["h1", "lunch1", "fresh"] } });
});

it("deletes originals and placed copies across stash/reopen without losing independent copies or new content", () => {
  const days: ReorderBoardDay[] = [
    { id: "d1", title: "", groups: [{ key: "events", label: "", items: [{ id: "original", label: "Original" }, { id: "new", label: "New" }] }] },
    { id: "d2", title: "", groups: [{ key: "events", label: "", items: [] }] },
  ];
  let state: BoardState = { placements: { d1: { events: ["original"] }, d2: { events: [] } }, copies: {} };
  state = copyBoardItem(state, "d1", "events", "original", "copy");
  state = planBoardTransfer(state, { key: "events", transferable: true }, { dayId: "d1", itemId: "copy" }, { dayId: "d2" }, id => ({ id, label: id }))!.next;
  state = removeBoardItem(state, "original");
  const draft = {
    dayIds: ["d1", "d2"], addedDayIds: [], deletedDays: [], overnight: [],
    placements: Object.entries(state.placements).map(([dayId, groups]) => ({ dayId, itemIds: groups.events! })),
    copies: Object.entries(state.copies).map(([id, copy]) => ({ id, ...copy, parentId: copy.parentId!, placed: copy.placed! })),
    removedItemIds: state.removedItemIds,
  };
  const restored = restoreWebsiteBoard(days, JSON.parse(JSON.stringify(draft)));
  expect(restored.placements).toEqual({ d1: { events: ["new"] }, d2: { events: ["copy"] } });
  expect(restored.copies.copy?.sourceId).toBe("original");
  const deleted = removeBoardItem(restored, "copy");
  expect(deleted.placements.d2?.events).toEqual([]);
  expect(deleted.copies).toEqual({});
});

it("applies manually chosen transport endpoints and persists edited copies through stash/reopen", () => {
  const source = emptyDay(1), target = emptyDay(2);
  source.legs = [{ id: "leg", mode: "hsr", routeId: "old-route", fromCityId: "a", toCityId: "b", nameZh: "旧路线", nameEn: "Old route", feeState: "EXCLUDED" }];
  const copy = { id: "copy", mode: source.legs[0]!.mode, routeId: null, fromCityId: "c", toCityId: "d", nameZh: "", nameEn: "", feeState: "INCLUDED" as const };
  const draft = JSON.parse(JSON.stringify({
    dayIds: [source.id, target.id], addedDayIds: [], deletedDays: [], overnight: [],
    placements: [{ dayId: source.id, itemIds: ["leg"] }, { dayId: target.id, itemIds: ["copy"] }],
    copies: [{ id: "copy", sourceId: "leg", parentId: "leg", dayId: source.id, placed: true }],
    transportCopies: [copy],
  }));
  const state = restoreWebsiteBoard([source, target].map(day => ({ id: day.id, title: "", groups: [{ key: "events", label: "", items: day.legs.map(leg => ({ id: leg.id, label: leg.id })) }] })), draft);
  const result = reorderWebsiteDays([source, target], {
    dayIds: draft.dayIds, itemIds: {}, placements: state.placements, copies: { copy: "leg" }, transportCopies: reactive(state.transportCopies ?? []),
  });
  expect(result.days[0]!.legs).toEqual(source.legs);
  expect(result.days[1]!.legs).toEqual([copy]);
  expect(removeBoardItem(state, "copy").transportCopies).toEqual([]);
});

it("removes every category including default meal cards without recreating deleted meals on later applies", () => {
  const day = emptyDay(1);
  day.items = [{ id: "attraction", attractionId: null, nameZh: "", nameEn: "", descriptionZh: "", descriptionEn: "", appears: true, feeState: "INCLUDED" }];
  day.legs = [{ id: "leg", routeId: null, fromCityId: "a", toCityId: "b", mode: "hsr", nameZh: "", nameEn: "", feeState: "INCLUDED" }];
  day.hotels = [{ id: "hotel", tier: "D", cityId: "a", configHotelId: null, resourceId: null, nameZh: "酒店", nameEn: "Hotel", roomType: "", breakfastIncluded: true }];
  day.services = [{ id: "service", nameZh: "", nameEn: "", appears: true, feeState: "INCLUDED" }];
  day.guideLanguage = "English";
  const ids = [...day.items, ...day.legs, ...day.hotels, ...day.meals, ...day.services].map(item => item.id).concat(websiteGuideBoardId(day.id));
  let state: BoardState = { placements: { [day.id]: { events: ids } }, copies: {} };
  for (const id of ids) state = removeBoardItem(state, id);
  const change = { dayIds: [day.id], itemIds: {}, placements: state.placements, removedItemIds: state.removedItemIds };
  const result = reorderWebsiteDays([day], change).days;
  expect(result[0]).toMatchObject({ items: [], legs: [], hotels: [], meals: [], services: [], guideLanguage: "", eventOrder: [] });
  expect(reorderWebsiteDays(result, { ...change, removedItemIds: [] }).days[0]!.meals).toEqual([]);
  expect(day.meals).toHaveLength(3);
});
