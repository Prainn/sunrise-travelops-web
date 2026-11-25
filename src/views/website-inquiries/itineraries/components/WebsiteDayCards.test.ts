import zhMessages from "@/lang/package/zh-cn.json";
/* eslint vue/one-component-per-file: off -- The renderer uses explicit UI stubs. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRenderer, defineComponent, h, nextTick, reactive, ref, type Component, type ComponentPublicInstance } from "vue";
import type { FeeState, WebsiteAttraction, WebsiteConfig, WebsiteDay, WebsiteLeg, WebsiteRoute } from "@/types/website";
import BusinessDictionarySelect from "@/components/BusinessDictionarySelect/index.vue";
import type { ReorderBoardItem } from "@/views/inquiries/itineraries/reorder-board";
import { ElMessageBox } from "element-plus";
import ItineraryReorderDialog from "@/views/inquiries/itineraries/components/ItineraryReorderDialog.vue";
import { emptyDay } from "../../options";

vi.mock("vue-i18n", () => ({ useI18n: () => ({
  locale: ref("zh-cn"),
  t: (key: string, params?: { seats: string }) => key === "websiteInquiry.vehicleSeatLabel" && params
    ? zhMessages.websiteInquiry.vehicleSeatLabel.replace("{seats}", params.seats) : key,
}) }));
vi.mock("@/services/business-dictionary.service", () => ({
  businessDictionaryService: {
    getItems: async () => [49, 19, 9, 5].map(seats => ({
      id: `seat${seats}`,
      code: seats === 5 ? "seat5" : `${seats}_seat`,
      name: `${seats}座`,
      englishName: `${seats}-seat vehicle`,
      status: "enabled",
    })),
  },
}));
vi.mock("@/components/AppDialog/index.vue", () => ({ default: {
  props: ["modelValue"],
  render(this: ComponentPublicInstance<{ modelValue: boolean }>) {
    return this.modelValue ? h("dialog", [...(this.$slots.header?.() ?? []), ...(this.$slots.default?.() ?? []), ...(this.$slots.footer?.() ?? [])]) : null;
  },
} }));
vi.mock("@/components/FeedbackState/index.vue", () => ({ default: { render: () => null } }));
vi.mock("@/components/DataTable/index.vue", () => ({ default: {
  inheritAttrs: false,
  props: ["data"],
  render(this: ComponentPublicInstance<{ data: unknown[] }>) {
    return h("data-table", { ...this.$attrs, data: this.data });
  },
} }));
vi.mock("../../components/WebsitePublicResourcePicker.vue", () => ({ default: { render: () => null } }));
vi.mock("@/views/inquiries/itineraries/components/ItineraryDayCardFrame.vue", () => ({ default: {
  render(this: ComponentPublicInstance) {
    return h("section", [...(this.$slots["title-extra"]?.() ?? []), ...(this.$slots.default?.() ?? [])]);
  },
} }));
vi.mock("@/views/inquiries/itineraries/components/ItineraryDayResourceBar.vue", () => ({ default: { render: () => null } }));
vi.mock("../../components/FeeStateSelect.vue", () => ({ default: {
  inheritAttrs: false,
  render(this: ComponentPublicInstance) { return h("fee-state-select", this.$attrs); },
} }));
import WebsiteDayCard from "./WebsiteDayCard.vue";
import WebsiteDayAttractions from "./WebsiteDayAttractions.vue";
import WebsiteAttractionDialog from "./WebsiteAttractionDialog.vue";
import WebsiteDayTransport from "./WebsiteDayTransport.vue";
import WebsiteTransportDialog from "./WebsiteTransportDialog.vue";
import { airportTransferOptions } from "../airport-transfers";
import { quotationCandidates } from "../vehicle-price";
import type { WebsiteItinerary } from "@/types/website";
import WebsiteDayMealsServices from "./WebsiteDayMealsServices.vue";
import WebsiteDayHotels from "./WebsiteDayHotels.vue";
import WebsiteHotelDialog from "./WebsiteHotelDialog.vue";

type HostNode = { type: string; props: Record<string, unknown>; children: HostNode[]; parent?: HostNode; text?: string };
const node = (type: string): HostNode => ({ type, props: {}, children: [] });
const renderer = createRenderer<HostNode, HostNode>({
  createElement: node, createText: text => ({ ...node("text"), text }), createComment: () => node("comment"),
  patchProp: (node, key, _, value) => { node.props[key] = value; },
  setText: (node, text) => { node.text = text; }, setElementText: (node, text) => { node.text = text; },
  parentNode: node => node.parent ?? null,
  nextSibling: node => node.parent?.children[node.parent.children.indexOf(node) + 1] ?? null,
  remove(node) { if (node.parent) node.parent.children.splice(node.parent.children.indexOf(node), 1); },
  insert(node, parent, anchor) {
    if (node.parent) node.parent.children.splice(node.parent.children.indexOf(node), 1);
    node.parent = parent;
    const index = anchor ? parent.children.indexOf(anchor) : -1;
    if (index < 0) parent.children.push(node); else parent.children.splice(index, 0, node);
  },
});
let unmount: (() => void) | undefined;
function render(component: Component, props: Record<string, unknown>) {
  const root = node("root");
  const app = renderer.createApp(component, props);
  app.config.globalProperties.$t = (key: string) => key;
  for (const name of ["ElFormItem", "ElSelect", "ElOption", "ElInput", "ElInputNumber", "ElSwitch", "ElCheckbox", "ElTag", "ElButton", "ElAlert", "ElRadio", "ElRadioGroup", "ElRadioButton", "ElTableColumn", "ElIcon", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Close", "Delete", "Edit", "CopyDocument"]) {
    app.component(name, defineComponent({ inheritAttrs: false, setup(_, { attrs, slots }) { return () => h(name, attrs, slots.default?.()); } }));
  }
  app.component("ElForm", defineComponent({ inheritAttrs: false, setup(_, { attrs, slots, expose }) { expose({ validate: async () => true }); return () => h("ElForm", attrs, slots.default?.()); } }));
  const instance = app.mount(root);
  unmount = () => app.unmount();
  function find(type: string, current = root): HostNode[] {
    return [...(current.type === type ? [current] : []), ...current.children.flatMap(child => find(type, child))];
  }
  function text(node: HostNode): string { return (node.text ?? "") + node.children.map(text).join(""); }
  return {
    instance,
    find,
    text,
    async click(label: string) {
      const button = find("ElButton").find(button => text(button) === label)!;
      await (button.props.onClick as () => void | Promise<void>)();
      await nextTick();
    },
    async changeName(value: string) {
      (find("ElInput")[0]!.props["onUpdate:modelValue"] as (value: string) => void)(value);
      await nextTick();
    },
  };
}
function mount(component: Component, day: WebsiteDay, editable = true, config = { attractions: [], cities: [], routes: [], hotels: [] } as unknown as WebsiteConfig) {
  const remove = vi.fn();
  return { ...render(component, { day, editable, config, selectableCityIds: new Set(), onRemove: remove }), remove };
}
afterEach(() => { unmount?.(); unmount = undefined; });

it("在已排满的自选日历上删除和恢复 D2，其他三天始终留在原服务日", async () => {
  const dates = ["2026-11-21", "2026-11-23", "2026-11-24", "2026-11-26"];
  const days = dates.map((date, index) => ({ id: `d${index + 1}`, dayNumber: index + 1, title: date, groups: [] }));
  const apply = vi.fn();
  const confirm = vi.spyOn(ElMessageBox, "confirm").mockResolvedValue("confirm" as Awaited<ReturnType<typeof ElMessageBox.confirm>>);
  try {
    const board = render(ItineraryReorderDialog, {
      modelValue: true, startDate: dates[0], serviceDates: dates, maxDays: 4, days, onApply: apply, transfer: true,
      createDay: (id: string) => ({ id, title: "Blank", groups: [], emptySlot: true }),
    });
    const remove = board.find("ElButton").filter(button => button.props["aria-label"] === "itineraryWorkspace.deleteDay")[1]!;
    await (remove.props.onClick as () => Promise<void>)();
    await nextTick();
    expect(board.find("section").map(section => board.find("p", section)[0]?.text)).toEqual([dates[0], "Blank", dates[2], dates[3]]);
    const recycle = board.find("ElButton").find(button => board.text(button).includes("itineraryWorkspace.deletedDays"))!;
    await (recycle.props.onClick as () => void)();
    await nextTick();
    expect(board.find("ElSelect")[0]?.props.modelValue).toBe(dates[1]);
    const restore = board.find("ElButton").find(button => board.text(button) === "itineraryWorkspace.restoreDay")!;
    expect(restore.props.disabled).toBe(false);
    await board.click("itineraryWorkspace.restoreDay");
    await board.click("itineraryWorkspace.applyOrder");
    expect(apply).toHaveBeenCalledWith(expect.objectContaining({
      dayIds: ["d1", "d2", "d3", "d4"],
      deletedDays: [], addedDayIds: [],
    }));
  } finally { confirm.mockRestore(); }
});

it("updates breakfast placeholders when a hotel moves and keeps hidden slots in the applied arrangement", async () => {
  const hotel = { id: "hotel", label: "好酒店", slot: "hotel-A", hotelCityId: "city", breakfastIncluded: true };
  const breakfast = (id: string) => ({ id, label: "早餐（自理）", slot: "meal-breakfast", placeholder: true });
  const boardDay = (id: string, items: ReorderBoardItem[]) => ({
    id, title: id, overnightCityId: "city",
    groups: [{ key: "events", label: "当日行程", sortable: true, transferable: true, items }],
  });
  const apply = vi.fn();
  const view = render(ItineraryReorderDialog, {
    modelValue: true, transfer: true, onApply: apply,
    days: [
      boardDay("d1", [hotel, breakfast("b1")]),
      boardDay("d2", [{ id: "lunch", label: "午餐" }, breakfast("b2"), { id: "dinner", label: "晚餐" }]),
      boardDay("d3", [{ ...hotel, id: "other-hotel" }, { ...breakfast("b3"), label: "已安排的早餐", placeholder: false }]),
    ],
  });
  const day = (index: number) => view.find("section")[index]!;
  const card = (index: number, label: string) =>
    view.find("div", day(index)).find(node => node.props.onDragstart && view.text(node).includes(label))!;

  expect(view.text(day(0))).not.toContain("早餐（自理）");
  expect(view.text(day(1))).toContain("早餐（自理）");
  expect(view.text(day(2))).toContain("已安排的早餐");

  const dragEvent = { preventDefault: vi.fn(), stopPropagation: vi.fn() };
  (card(0, "好酒店").props.onDragstart as (event: typeof dragEvent) => void)(dragEvent);
  (card(1, "晚餐").props.onDrop as (event: typeof dragEvent) => void)(dragEvent);
  await nextTick();
  expect(view.text(day(0))).toContain("早餐（自理）");
  expect(view.text(day(1))).not.toContain("早餐（自理）");

  const moveUp = view.find("ElButton", card(1, "好酒店"))
    .find(button => button.props["aria-label"] === "common.moveUp")!;
  (moveUp.props.onClick as () => void)();
  await nextTick();
  await view.click("itineraryWorkspace.applyOrder");
  expect(apply).toHaveBeenCalledWith(expect.objectContaining({
    placements: { d1: { events: ["b1"] }, d2: { events: ["hotel", "lunch", "b2", "dinner"] }, d3: { events: ["other-hotel", "b3"] } },
    removedItemIds: [],
  }));
});

it("warns about an arranged breakfast when turning on hotel breakfast and allows saving", async () => {
  const day = reactive(emptyDay(1));
  day.overnightCityId = "city";
  const hotel = { id: "hotel", tier: "A", cityId: "city", configHotelId: null, resourceId: null, nameZh: "好酒店", nameEn: "Good Hotel", roomType: "", breakfastIncluded: false };
  const submit = vi.fn();
  const view = render(WebsiteHotelDialog, {
    modelValue: true, day, dayLabel: "D1", hotel, config: { cities: [], hotels: [] },
    selectableCityIds: new Set(["city"]), onSubmit: submit,
  });
  const setBreakfast = async (included: boolean) => {
    (view.find("ElSwitch")[0]!.props["onUpdate:modelValue"] as (value: boolean) => void)(included);
    await nextTick();
  };
  await setBreakfast(true);
  expect(view.find("ElAlert")).toHaveLength(0);

  await setBreakfast(false);
  day.meals[0]!.restaurantZh = "已安排的早餐";
  await nextTick();
  expect(view.find("ElAlert")).toHaveLength(0);
  await setBreakfast(true);
  expect(view.find("ElAlert").map(alert => alert.props.title)).toEqual(["websiteItineraryUi.breakfastArrangementNotice"]);
  await view.click("common.confirm");
  expect(submit).toHaveBeenCalledExactlyOnceWith({ ...hotel, breakfastIncluded: true });
  expect(hotel.breakfastIncluded).toBe(false);
});

const cases = [
  { label: "attraction", component: WebsiteDayAttractions, collection: "items" as const, value: { id: "original", attractionId: null, nameZh: "景点", nameEn: "Attraction", descriptionZh: "正文", descriptionEn: "Copy", appears: true, feeState: "SELF_PAY" as const } },
  { label: "transport", component: WebsiteDayTransport, collection: "legs" as const, value: { id: "original", routeId: "route", fromCityId: "from", toCityId: "to", mode: "hsr" as const, vehicleType: null, nameZh: "交通", nameEn: "Transport", feeState: "SELF_PAY" as const } },
  { label: "service", component: WebsiteDayMealsServices, collection: "services" as const, value: { id: "original", nameZh: "服务", nameEn: "Service", appears: true, feeState: "SELF_PAY" as const } },
];
it("opens the reported leg, keeps day-wide issues on the day and requests the quoted hotel tier", async () => {
  const day = reactive(emptyDay(1));
  day.departCityId = "from";
  day.endCityId = "to";
  day.overnightCityId = "to";
  const leg = { id: "first", routeId: null, fromCityId: "from", toCityId: "to", mode: "private_vehicle" as const, vehicleType: "23_seat", nameZh: "第一段", nameEn: "First", feeState: "INCLUDED" as const };
  day.legs = [
    leg,
    { ...leg, id: "second", vehicleType: null, nameZh: "酒店接客" },
    { ...leg, id: "third", vehicleType: null, nameZh: "机场送客" },
  ];
  day.eventOrder = ["third", "first", "second"];
  const openResource = vi.fn();
  const view = render(WebsiteDayCard, {
    day, editable: true, config: { cities: [], routes: [] }, selectableCityIds: new Set(), date: null, businessUnit: "website",
    last: true, onOpenResource: openResource,
  });
  const card = view.instance as InstanceType<typeof WebsiteDayCard>;
  for (const [id, name] of [["second", "酒店接客"], ["third", "机场送客"]] as const) {
    card.openValidationIssue({ kind: "event", id });
    await nextTick();
    expect(view.find("dialog")).toHaveLength(1);
    expect(view.find("ElInput", view.find("dialog")[0]!)[0]?.props.modelValue).toBe(name);
    await view.click("common.cancel");
  }
  day.legs = [];
  card.openValidationIssue(undefined);
  expect(openResource).not.toHaveBeenCalled();
  card.openValidationIssue({ kind: "hotel", tier: "C" });
  expect(openResource).toHaveBeenCalledWith({ kind: "hotel", tier: "C" });
  card.openValidationIssue({ kind: "addTransport" });
  expect(openResource).toHaveBeenLastCalledWith({ kind: "transport" });
});
it("keeps the transport editor closed for read-only and saving day cards", async () => {
  const day = reactive(emptyDay(1));
  day.legs = [{ id: "leg", fromCityId: "from", toCityId: "to", routeId: null, mode: "private_vehicle", vehicleType: null, nameZh: "", nameEn: "", feeState: "INCLUDED" }];
  for (const editable of [false, true]) {
    const view = render(WebsiteDayCard, {
      day, editable, saving: editable, config: { cities: [], routes: [] }, selectableCityIds: new Set(), date: null, last: true, businessUnit: "website",
    });
    const card = view.instance as InstanceType<typeof WebsiteDayCard>;
    card.openValidationIssue({ kind: "event", id: "leg" });
    await nextTick();
    expect(view.find("dialog")).toHaveLength(0);
    unmount?.();
    unmount = undefined;
  }
});
it("commits an airport pickup switch only on confirmation, retaining the independent drop-off", async () => {
  const day = reactive(emptyDay(1));
  const leg = { id: "new", routeId: null, fromCityId: "city", toCityId: "city", mode: "other" as const, nameZh: "", nameEn: "", feeState: "SELF_PAY" as const };
  day.legs = [leg, { ...leg, id: "previous", isAirportPickup: true, isAirportDropoff: true }];
  const plan = { businessUnit: "website", days: [day] } as WebsiteItinerary;
  const view = render(WebsiteDayTransport, { day, legId: leg.id, editable: true, selectableCityIds: new Set(), config: { cities: [], routes: [] }, airportTransfers: airportTransferOptions(plan, day) });
  const selectPickup = async () => {
    await view.click("common.edit");
    const checkbox = view.find("ElCheckbox").find(control => view.text(control) === "websiteItineraryUi.airportPickup")!;
    (checkbox.props["onUpdate:modelValue"] as (value: boolean) => void)(true);
    await nextTick();
  };
  await selectPickup();
  await view.click("common.cancel");
  expect(day.legs.map(item => Boolean(item.isAirportPickup))).toEqual([false, true]);
  await selectPickup();
  await view.click("common.confirm");
  expect(day.legs.map(item => Boolean(item.isAirportPickup))).toEqual([true, false]);
  expect(day.legs[1]?.isAirportDropoff).toBe(true);
  const calendar = { ...plan, serviceDates: ["2026-11-17", "2026-11-20", "2026-11-21"] };
  expect(airportTransferOptions(calendar, day)).toEqual({ pickup: true, dropoff: false });
  expect(airportTransferOptions(calendar, { ...day, dayNumber: 2 })).toBeUndefined();
  expect(airportTransferOptions(calendar, { ...day, dayNumber: 3 })).toEqual({ pickup: false, dropoff: true });
  expect(airportTransferOptions({ ...plan, businessUnit: "linxi" }, day)).toBeUndefined();
});
describe.each(cases)("$label card editing", ({ component, collection, value }) => {
  function fixture() {
    const day = reactive(emptyDay(1));
    Object.assign(day, { [collection]: [{ ...value }] });
    day.eventOrder = [value.id];
    return day;
  }
  it("discards cancellation and reopens the original values", async () => {
    const day = fixture();
    const before = JSON.stringify(day);
    const view = mount(component as Component, day);
    await view.click("common.edit");
    await view.changeName("未确认修改");
    expect(JSON.stringify(day)).toBe(before);
    await view.click("common.cancel");
    expect(JSON.stringify(day)).toBe(before);
    await view.click("common.edit");
    expect(view.find("ElInput")[0]!.props.modelValue).toBe(value.nameZh);
  });
  it("updates the original ID after its array position changes, preserving other fields and order", async () => {
    const day = fixture();
    const view = mount(component as Component, day);
    await view.click("common.edit");
    await view.changeName("已确认修改");
    Object.assign(day, { [collection]: [{ ...value, id: "other", nameZh: "其他" }, ...day[collection]] });
    await nextTick();
    await view.click("common.confirm");
    expect(day[collection]).toEqual([{ ...value, id: "other", nameZh: "其他" }, { ...value, nameZh: "已确认修改" }]);
    expect(day.eventOrder).toEqual([value.id]);
  });
  it("provides no edit form in readonly mode", () => {
    const view = mount(component as Component, fixture(), false);
    expect(view.find("ElButton")).toHaveLength(0);
    expect(view.find("ElInput")).toHaveLength(0);
  });
});

describe.each([
  ...cases,
  { label: "hotel", component: WebsiteDayHotels, collection: "hotels" as const, value: { id: "hotel", tier: "A" as const, cityId: "city", configHotelId: null, resourceId: "public-hotel", nameZh: "酒店", nameEn: "Hotel", roomType: "Twin", breakfastIncluded: true } },
  { label: "meal", component: WebsiteDayMealsServices, collection: "meals" as const, value: { id: "meal", slot: "lunch" as const, resourceId: "public-restaurant", restaurantZh: "午餐", restaurantEn: "Lunch", feeState: "INCLUDED" as const } },
])("$label card removal entry", ({ component, collection, value }) => {
  it("requests removal by stable ID without changing the draft before confirmation", async () => {
    const day = reactive(emptyDay(1));
    Object.assign(day, { [collection]: [{ ...value }] });
    const before = JSON.stringify(day);
    const view = mount(component as Component, day);
    await view.click("common.delete");
    expect(view.remove).toHaveBeenCalledWith(value.id, expect.any(String));
    expect(JSON.stringify(day)).toBe(before);
  });
  it("hides deletion for a readonly itinerary", () => {
    const day = reactive(emptyDay(1));
    Object.assign(day, { [collection]: [{ ...value }] });
    const view = mount(component as Component, day, false);
    expect(view.find("ElButton")).toHaveLength(0);
  });
});

it("shows transport fields when a route is selected and uses its vehicles or the full dictionary", async () => {
  const day = emptyDay(1);
  day.departCityId = day.endCityId = "city";
  const route: WebsiteRoute = {
    id: "route", status: "enabled", fromCityId: "city", toCityId: "city", mode: "private_vehicle",
    nameZh: "昆明包车", nameEn: "Private vehicle", feeState: "INCLUDED", distanceKm: "50",
    vehicleOptions: [{ vehicleType: "49_seat", durationMinutes: null }, { vehicleType: "9_seat", durationMinutes: 120 }],
  };
  const emptyRoute = { ...route, id: "empty", vehicleOptions: [] };
  const config = {
    cities: [{ id: "city", nameZh: "昆明", nameEn: "Kunming", status: "enabled" }],
    routes: [route, emptyRoute],
  };
  const view = render(WebsiteTransportDialog, {
    modelValue: true, day, dayLabel: "D1", config, selectableCityIds: new Set(["city"]),
  });
  const hasDetails = () => view.find("p").some(p => view.text(p) === "websiteReport.transportDetailsHelp");
  const vehicleSelect = () => view.find("ElSelect").find(select => select.props.onVisibleChange);
  const choices = () => view.find("ElOption", vehicleSelect()!).map(option => option.props.value);
  const selectRoute = async (value: WebsiteRoute) => {
    (view.find("data-table")[0]!.props.onRowClick as (record: WebsiteRoute) => void)(value);
    await nextTick();
  };
  const setSource = async (source: "route" | "manual") => {
    (view.find("ElRadioGroup")[0]!.props["onUpdate:modelValue"] as (value: string) => void)(source);
    await nextTick();
    await nextTick();
  };

  expect(hasDetails()).toBe(false);
  expect(vehicleSelect()).toBeUndefined();
  expect(view.find("ElInputNumber")).toHaveLength(0);
  expect(view.find("ElSwitch")).toHaveLength(0);
  await selectRoute(route);
  expect(hasDetails()).toBe(true);
  expect(choices()).toEqual(["9_seat", "49_seat"]);
  expect(vehicleSelect()?.props["allow-create"]).toBe(false);
  (vehicleSelect()!.props["onUpdate:modelValue"] as (value: string) => void)("9_seat");
  await nextTick();
  expect(view.find("ElInputNumber")[0]?.props["model-value"]).toBe(120);

  await setSource("manual");
  (vehicleSelect()!.props["onUpdate:modelValue"] as (value: string) => void)("19_seat");
  await nextTick();
  expect(vehicleSelect()?.props["model-value"]).toBe("19_seat");
  await setSource("route");
  expect(choices()).toEqual(["9_seat", "49_seat"]);
  expect(vehicleSelect()?.props["model-value"]).toBeNull();

  await selectRoute(emptyRoute);
  expect(choices()).toEqual(["5_seat", "9_seat", "19_seat", "49_seat"]);
  expect(vehicleSelect()?.props["allow-create"]).toBe(true);

  const fromCity = view.find("ElSelect")[0]!;
  (fromCity.props["onUpdate:modelValue"] as (value: string) => void)("different-city");
  await nextTick();
  expect(hasDetails()).toBe(false);
  expect(vehicleSelect()).toBeUndefined();

  await setSource("manual");
  expect(hasDetails()).toBe(true);
  expect(choices()).toEqual(["5_seat", "9_seat", "19_seat", "49_seat"]);
  expect(vehicleSelect()?.props["allow-create"]).toBe(true);
});

it.each([
  { source: "route", durationMinutes: null },
  { source: "manual", durationMinutes: 45 },
] as const)("saves the dictionary vehicle code for a $source leg", async ({ source, durationMinutes }) => {
  const day = { ...emptyDay(1), departCityId: "city", endCityId: "city" };
  const route: WebsiteRoute = {
    id: "route", status: "enabled", fromCityId: "city", toCityId: "city", mode: "private_vehicle",
    nameZh: "昆明包车", nameEn: "Private vehicle", feeState: "INCLUDED",
    vehicleOptions: source === "route" ? [] : [{ vehicleType: "5座", durationMinutes: 45 }],
  };
  const config = { cities: [{ id: "city", nameZh: "昆明", nameEn: "Kunming", status: "enabled" }], routes: [route] };
  const submit = vi.fn<(leg: WebsiteLeg) => void>();
  const view = render(WebsiteTransportDialog, {
    modelValue: true, day, dayLabel: "D1", config, selectableCityIds: new Set(["city"]), onSubmit: submit,
  });
  if (source === "route") {
    (view.find("data-table")[0]!.props.onRowClick as (record: WebsiteRoute) => void)(route);
  } else {
    (view.find("ElRadioGroup")[0]!.props["onUpdate:modelValue"] as (value: string) => void)(source);
  }
  await nextTick();
  await nextTick();
  const selector = view.find("ElSelect").find(select => select.props.onVisibleChange)!;
  const options = view.find("ElOption", selector).filter(option => option.props.label === "5座");
  expect(options.map(option => option.props.value)).toEqual(["5_seat"]);
  (selector.props["onUpdate:modelValue"] as (value: unknown) => void)(options[0]!.props.value);
  await nextTick();
  await view.click("common.confirm");
  expect(submit).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
    routeId: source === "route" ? route.id : null, vehicleType: "5_seat", durationMinutes,
  }));
  const [leg] = submit.mock.calls[0]!;
  const configuredLeg = { ...leg, id: "configured-leg", routeId: "configured-route", vehicleType: "5_seat" };
  expect(quotationCandidates([{ ...day, legs: [configuredLeg, leg] }]).vehicleTypes).toEqual(["5_seat"]);
});

it("disables vehicles used by other rows, including dictionary aliases and hand-entered values", async () => {
  const update = vi.fn();
  const view = render(BusinessDictionarySelect, {
    modelValue: "5座", typeCode: "vehicle-type", disabledValues: ["9_seat", "49座", "商务车"], "onUpdate:modelValue": update,
  });
  await nextTick();
  await nextTick();
  expect(view.find("ElOption").filter(option => option.props.disabled).map(option => option.props.label))
    .toEqual(["49座", "9座", "商务车"]);
  expect(view.find("ElOption").find(option => option.props.value === "5_seat")?.props.disabled).toBe(false);
  const selector = view.find("ElSelect")[0]!;
  expect(selector.props["model-value"]).toBe("5座");
  const select = selector.props["onUpdate:modelValue"] as (value: string) => void;
  select("9-seat vehicle");
  select("商务车 ");
  expect(update).not.toHaveBeenCalled();
  select("5_seat");
  select("19座");
  select("定制越野车");
  expect(update.mock.calls.map(([value]) => value)).toEqual(["5_seat", "19_seat", "定制越野车"]);
});

it("keeps the saved vehicle while limiting new choices to the resource and applying its duration", async () => {
  const day = reactive(emptyDay(1));
  const leg = { id: "leg", routeId: "route", fromCityId: "from", toCityId: "to", mode: "private_vehicle" as const, vehicleType: "5座", durationMinutes: 75, nameZh: "专车", nameEn: "Private vehicle", feeState: "INCLUDED" as const };
  day.legs = [leg];
  const vehicleOptions = [
    { vehicleType: "商务车", durationMinutes: null },
    { vehicleType: "小巴 14座", durationMinutes: 160 },
    { vehicleType: "9_seat", durationMinutes: 180 },
  ];
  const config = { attractions: [], cities: [], routes: [{ id: "route", vehicleOptions }] } as unknown as WebsiteConfig;
  const view = mount(WebsiteDayTransport as Component, day, true, config);
  await view.click("common.edit");
  await nextTick();
  const selector = view.find("ElSelect").find(select => select.props.onVisibleChange)!;
  const choices = view.find("ElOption", selector).map(option => [option.props.label, option.props.value]);
  expect(choices).toEqual([
    ["9座", "9_seat"],
    ["小巴 14座", "小巴 14座"],
    ["商务车", "商务车"],
  ]);
  expect(selector.props["model-value"]).toBe("5座");
  expect(view.find("ElInputNumber")[0]?.props["model-value"]).toBe(75);
  expect(vehicleOptions.map(option => option.vehicleType)).toEqual(["商务车", "小巴 14座", "9_seat"]);
  const select = selector.props["onUpdate:modelValue"] as (value: string) => void;
  select("19座");
  await nextTick();
  expect(selector.props["model-value"]).toBe("5座");
  select("9_seat");
  await nextTick();
  await view.click("common.confirm");
  expect(day.legs[0]).toMatchObject({ vehicleType: "9_seat", durationMinutes: 180 });
});

it("renders, edits, clears, and hides the day internal remark by business unit and editability", async () => {
  const day = reactive({ ...emptyDay(1), internalRemark: "先去西山" });
  const config = { attractions: [], cities: [], routes: [], hotels: [] } as unknown as WebsiteConfig;
  const props = { day, config, selectableCityIds: new Set<string>(), editable: true, date: null, last: true, businessUnit: "website" };

  const editableView = render(WebsiteDayCard, props);
  const input = editableView.find("ElInput")[0]!;
  expect(input.props.modelValue).toBe("先去西山");
  expect(input.props.maxlength).toBe("200");
  expect(input.props.clearable).toBe("");
  (input.props["onUpdate:modelValue"] as (value: string) => void)("");
  await nextTick();
  expect(day.internalRemark).toBe("");
  unmount?.();

  day.internalRemark = "只读展示备注";
  const readonlyView = render(WebsiteDayCard, { ...props, editable: false });
  expect(readonlyView.find("ElInput")).toHaveLength(0);
  expect(readonlyView.text(readonlyView.find("section")[0]!)).toContain("只读展示备注");
  unmount?.();

  day.internalRemark = "";
  const emptyReadonlyView = render(WebsiteDayCard, { ...props, editable: false });
  expect(emptyReadonlyView.find("p")).toHaveLength(0);
  unmount?.();

  day.internalRemark = "霖熹不显示";
  const linxiView = render(WebsiteDayCard, { ...props, businessUnit: "linxi" });
  expect(linxiView.find("ElInput")).toHaveLength(0);
  expect(linxiView.text(linxiView.find("section")[0]!)).not.toContain("霖熹不显示");
});

it("selects and orders website stops, adds an attraction from the second stop, and clears only the route", async () => {
  const day = reactive({ ...emptyDay(1), departCityId: "km", endCityId: "lj", overnightCityId: "lj" });
  const cities = ["km", "cx", "dl", "lj", "outside"].map(id => ({ id, nameZh: id, nameEn: id, status: "enabled", resourceId: null }));
  const attractions = ["cx", "dl"].map(cityId => ({
    id: `at-${cityId}`, cityId, nameZh: cityId, nameEn: cityId, kind: "attraction", parentId: null,
    descriptionZh: "游览", descriptionEn: "Visit", status: "enabled", recommendedMonths: [], chargeable: false, price: "0",
  }));
  const config = { cities, attractions, routes: [], hotels: [] };
  const props = { day, config, selectableCityIds: new Set(["km", "cx", "dl", "lj"]), businessUnit: "website", editable: true, date: null, last: false };
  const card = render(WebsiteDayCard, props);
  const toggle = card.find("ElCheckbox").find(box => card.text(box) === "itinerary.viaDestinations")!;
  (toggle.props["onUpdate:modelValue"] as (value: boolean) => void)(true);
  await nextTick();
  const picker = card.find("ElSelect").find(select => select.props.multiple !== undefined)!;
  expect(card.find("ElOption", picker).map(option => option.props.value)).toEqual(["cx", "dl"]);
  (picker.props["onUpdate:modelValue"] as (ids: string[]) => void)(["cx", "dl"]);
  await nextTick();
  const later = card.find("ElButton").find(button => button.props["aria-label"] === "itinerary.moveViaLater")!;
  (later.props.onClick as () => void)();
  await nextTick();
  expect(day.viaCityIds).toEqual(["dl", "cx"]);
  expect(day.items).toHaveLength(0);
  unmount?.();

  const submit = vi.fn((items: WebsiteDay["items"]) => day.items.push(...items));
  const dialog = render(WebsiteAttractionDialog, {
    ...props, days: [day], modelValue: true, dayLabel: "D1", onSubmit: submit,
    selectableCityIds: new Set(["km", "lj"]),
  });
  const filter = dialog.find("ElSelect")[0]!;
  expect(filter.props.modelValue).toBe("dl");
  (filter.props["onUpdate:modelValue"] as (value: string) => void)("cx");
  await nextTick();
  const table = dialog.find("data-table")[0]!;
  const rows = table.props.data as { attraction: { id: string } }[];
  expect(rows.map(row => row.attraction.id)).toEqual(["at-cx"]);
  (table.props.onRowClick as (row: typeof rows[number]) => void)(rows[0]!);
  await nextTick();
  await dialog.click("common.confirm");
  expect(submit).toHaveBeenCalledOnce();
  expect(day.items[0]).toMatchObject({ attractionId: "at-cx", feeState: "INCLUDED" });
  unmount?.();

  const reopened = render(WebsiteDayCard, props);
  const end = reopened.find("ElSelect")[1]!;
  (end.props["onUpdate:modelValue"] as (value: string) => void)("dl");
  await nextTick();
  expect(day.viaCityIds).toEqual(["cx"]);
  const clear = reopened.find("ElCheckbox").find(box => reopened.text(box) === "itinerary.viaDestinations")!;
  (clear.props["onUpdate:modelValue"] as (value: boolean) => void)(false);
  expect(day.viaCityIds).toEqual([]);
  expect(day.items[0]?.attractionId).toBe("at-cx");
  expect(day.overnightCityId).toBe("lj");
  expect(day.legs).toHaveLength(0);
  unmount?.();
  const linxi = render(WebsiteDayCard, { ...props, businessUnit: "linxi" });
  expect(linxi.find("ElCheckbox").some(box => linxi.text(box) === "itinerary.viaDestinations")).toBe(false);
});

it("sets the fee state for a batch of attractions and resets to included for the next manual item", async () => {
  const visible = ref(true);
  const submit = vi.fn();
  const parent: WebsiteAttraction = {
    id: "mountain", cityId: "city", parentId: null, resourceId: null, kind: "attraction",
    nameZh: "苍山", nameEn: "Cangshan Mountain", descriptionZh: "游览苍山", descriptionEn: "Visit Cangshan Mountain",
    status: "enabled", recommendedMonths: [], chargeable: true, price: "35.00",
  };
  const component: WebsiteAttraction = {
    ...parent, id: "temple", parentId: parent.id, kind: "component", nameZh: "感通寺", nameEn: "Gantong Temple",
  };
  const day = { ...emptyDay(1), departCityId: "city", endCityId: "city" };
  const config: WebsiteConfig = {
    version: 1, hotels: [], routes: [], patterns: [], skeletons: [], templates: [],
    cities: [{ id: "city", nameZh: "大理", nameEn: "Dali", status: "enabled", resourceId: null }],
    attractions: [parent, component],
  };
  const dialog = render(defineComponent({
    setup() {
      return () => h(WebsiteAttractionDialog, {
        day, dayLabel: "D1", days: [day], config,
        selectableCityIds: new Set(["city"]), modelValue: visible.value,
        "onUpdate:modelValue": (value: boolean) => { visible.value = value; },
        onSubmit: submit,
      });
    },
  }), {});
  const feeSelect = () => dialog.find("fee-state-select")[0]!.props;
  expect(feeSelect().modelValue).toBe("INCLUDED");
  const table = dialog.find("data-table")[0]!;
  const rows = table.props.data as { attraction: WebsiteAttraction }[];
  for (const row of rows) (table.props.onRowClick as (value: typeof row) => void)(row);
  (feeSelect()["onUpdate:modelValue"] as (value: FeeState) => void)("SELF_PAY");
  await nextTick();
  await dialog.click("common.confirm");
  expect(submit).toHaveBeenNthCalledWith(1, [
    expect.objectContaining({ attractionId: parent.id, feeState: "SELF_PAY" }),
    expect.objectContaining({ attractionId: component.id, feeState: "SELF_PAY" }),
  ]);

  visible.value = true;
  await nextTick();
  const source = dialog.find("ElRadioGroup")[0]!;
  (source.props["onUpdate:modelValue"] as (value: string) => void)("manual");
  await nextTick();
  await dialog.changeName("手填景点");
  expect(feeSelect().modelValue).toBe("INCLUDED");
  await dialog.click("common.confirm");
  expect(submit).toHaveBeenNthCalledWith(2, [
    expect.objectContaining({ attractionId: null, nameZh: "手填景点", feeState: "INCLUDED" }),
  ]);
});

it("zooms the compact website board, disables at bounds, displays day remarks, and reorders D1 after D4 and cross-day items while zoomed", async () => {
  const makeDay = (id: string, title: string, items: ReorderBoardItem[], remark?: string) => ({
    id, title, remark,
    groups: [{ key: "events", label: "当日行程", sortable: true, transferable: true, items }],
  });
  const apply = vi.fn();
  const visible = ref(true);
  const days = [
    makeDay("d1", "昆明 → 大理", [{ id: "a1", label: "石林", detail: "景点" }], "优先安排早出发"),
    makeDay("d2", "大理 → 丽江", [{ id: "a2", label: "洱海" }]),
    makeDay("d3", "丽江", [{ id: "a3", label: "玉龙雪山" }, { id: "a4", label: "蓝月谷" }]),
    makeDay("d4", "丽江 → 昆明", [{ id: "a5", label: "返程" }]),
  ];
  const view = render(defineComponent({
    setup() {
      return () => h(ItineraryReorderDialog, {
        modelValue: visible.value,
        "onUpdate:modelValue": (value: boolean) => { visible.value = value; },
        compact: true,
        transfer: true,
        days,
        onApply: apply,
      });
    },
  }), {});

  const zoomOut = () => view.find("ElButton").find(button => view.text(button) === "itineraryWorkspace.zoomOut")!;
  const zoomIn = () => view.find("ElButton").find(button => view.text(button) === "itineraryWorkspace.zoomIn")!;
  const zoomText = () => view.text(view.find("output")[0]!);
  const sections = () => view.find("section");

  // 初始 100%，D1 备注展示在路线之前，空备注不占位置。
  expect(zoomText()).toBe("100%");
  expect(view.find("p", sections()[0]!).map(p => view.text(p))).toEqual(["优先安排早出发", "昆明 → 大理"]);
  expect(view.find("p", sections()[1]!).map(p => view.text(p))).toEqual(["大理 → 丽江"]);

  // 缩放到上下限禁用对应按钮。
  for (let i = 0; i < 6; i++) await view.click("itineraryWorkspace.zoomOut");
  expect(zoomText()).toBe("50%");
  expect(zoomOut().props.disabled).toBe(true);
  expect(zoomIn().props.disabled).toBe(false);
  for (let i = 0; i < 12; i++) await view.click("itineraryWorkspace.zoomIn");
  expect(zoomText()).toBe("150%");
  expect(zoomIn().props.disabled).toBe(true);
  expect(zoomOut().props.disabled).toBe(false);

  // 重开弹窗恢复默认 100%。
  visible.value = false;
  await nextTick();
  visible.value = true;
  await nextTick();
  expect(zoomText()).toBe("100%");

  // 缩小到 70% 后把 D1 拖到 D4 后，再把 D1 的“石林”跨日放到 D3 的“蓝月谷”位置。
  for (let i = 0; i < 3; i++) await view.click("itineraryWorkspace.zoomOut");
  expect(zoomText()).toBe("70%");
  const canvas = view.find("div").find(div => div.props.role === "list")!;
  expect(canvas.props.style).toEqual({ transform: "scale(0.7)", transformOrigin: "top left" });

  const dragEvent = { preventDefault: vi.fn(), stopPropagation: vi.fn() };
  const d1Header = view.find("header", sections()[0]!)[0]!;
  (d1Header.props.onDragstart as (event: typeof dragEvent) => void)(dragEvent);
  (sections()[3]!.props.onDrop as (event: typeof dragEvent) => void)(dragEvent);
  await nextTick();
  expect(sections().map(section => view.text(section))).toEqual([
    expect.stringContaining("大理 → 丽江"),
    expect.stringContaining("丽江"),
    expect.stringContaining("丽江 → 昆明"),
    expect.stringContaining("优先安排早出发"),
  ]);

  const card = (dayIndex: number, label: string) =>
    view.find("div", sections()[dayIndex]!).find(node => node.props.onDragstart && view.text(node).includes(label))!;
  (card(3, "石林").props.onDragstart as (event: typeof dragEvent) => void)(dragEvent);
  (card(1, "蓝月谷").props.onDrop as (event: typeof dragEvent) => void)(dragEvent);
  await nextTick();

  await view.click("itineraryWorkspace.applyOrder");
  expect(apply).toHaveBeenCalledWith(expect.objectContaining({
    dayIds: ["d2", "d3", "d4", "d1"],
    placements: expect.objectContaining({
      d1: { events: [] },
      d3: { events: ["a3", "a1", "a4"] },
    }),
  }));
});

it("pins guide cards at the top of a website day and blocks dragging or moving items above them", async () => {
  const makeDay = (id: string, items: ReorderBoardItem[]) => ({
    id, title: id,
    groups: [{ key: "events", label: "当日行程", sortable: true, transferable: true, items }],
  });
  const apply = vi.fn();
  const view = render(ItineraryReorderDialog, {
    modelValue: true,
    transfer: true,
    onApply: apply,
    days: [
      makeDay("d1", [
        { id: "a1", label: "石林" },
        { id: "d1-guide", label: "导游 (韩语)", slot: "guide", pinned: true },
        { id: "a2", label: "滇池" },
      ]),
      makeDay("d2", [{ id: "a3", label: "洱海" }]),
    ],
  });
  const sections = () => view.find("section");
  const itemCards = (dayIndex: number) =>
    view.find("div", sections()[dayIndex]!).filter(node => node.props.onDragstart);

  // 导游固定排在最顶部，不可拖动且不显示复制与上下移动按钮。
  expect(itemCards(0).map(node => view.text(node).trim())).toEqual(["导游 (韩语)", "石林", "滇池"]);
  const guideCard = itemCards(0)[0]!;
  expect(guideCard.props.draggable).toBe(false);
  expect(view.find("ElButton", guideCard).map(button => button.props["aria-label"])).toEqual(["common.remove"]);

  // 导游下方第一张普通卡片禁用上移按钮。
  const firstSortableCard = itemCards(0)[1]!;
  const moveUp = view.find("ElButton", firstSortableCard).find(button => button.props["aria-label"] === "common.moveUp")!;
  expect(moveUp.props.disabled).toBe(true);

  // 尝试把导游拖到 D2 不会生效，跨天拖入的卡片落在导游之后。
  const dragEvent = { preventDefault: vi.fn(), stopPropagation: vi.fn() };
  (guideCard.props.onDragstart as (event: typeof dragEvent) => void)(dragEvent);
  (sections()[1]!.props.onDrop as (event: typeof dragEvent) => void)(dragEvent);
  await nextTick();
  expect(itemCards(0).map(node => view.text(node).trim())[0]).toBe("导游 (韩语)");

  const d2Card = itemCards(1)[0]!;
  (d2Card.props.onDragstart as (event: typeof dragEvent) => void)(dragEvent);
  (guideCard.props.onDrop as (event: typeof dragEvent) => void)(dragEvent);
  await nextTick();
  expect(itemCards(0).map(node => view.text(node).trim())).toEqual(["导游 (韩语)", "石林", "滇池", "洱海"]);
});
