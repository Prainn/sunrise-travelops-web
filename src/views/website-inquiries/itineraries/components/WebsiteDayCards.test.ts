/* eslint vue/one-component-per-file: off -- The renderer uses explicit UI stubs. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRenderer, defineComponent, h, nextTick, reactive, ref, type Component, type ComponentPublicInstance } from "vue";
import type { WebsiteConfig, WebsiteDay, WebsiteRoute } from "@/types/website";
import BusinessDictionarySelect from "@/components/BusinessDictionarySelect/index.vue";
import type { ReorderBoardItem } from "@/views/inquiries/itineraries/reorder-board";
import { ElMessageBox } from "element-plus";
import ItineraryReorderDialog from "@/views/inquiries/itineraries/components/ItineraryReorderDialog.vue";
import { emptyDay } from "../../options";

vi.mock("vue-i18n", () => ({ useI18n: () => ({ locale: ref("zh-cn"), t: (key: string) => key }) }));
vi.mock("@/services/business-dictionary.service", () => ({
  businessDictionaryService: {
    getItems: async () => [49, 19, 9, 5].map(seats => ({
      id: `seat${seats}`,
      code: `seat${seats}`,
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
  render(this: ComponentPublicInstance) { return h("section", this.$slots.default?.()); },
} }));
vi.mock("@/views/inquiries/itineraries/components/ItineraryDayResourceBar.vue", () => ({ default: { render: () => null } }));
vi.mock("../../components/FeeStateSelect.vue", () => ({ default: { render: () => null } }));
import WebsiteDayCard from "./WebsiteDayCard.vue";
import WebsiteDayAttractions from "./WebsiteDayAttractions.vue";
import WebsiteDayTransport from "./WebsiteDayTransport.vue";
import WebsiteTransportDialog from "./WebsiteTransportDialog.vue";
import { airportTransferOptions } from "../airport-transfers";
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
    day, editable: true, config: { cities: [], routes: [] }, selectableCityIds: new Set(), date: null,
    last: true, onOpenResource: openResource,
  });
  const card = view.instance as InstanceType<typeof WebsiteDayCard>;
  for (const [id, name] of [["second", "酒店接客"], ["third", "机场送客"]] as const) {
    card.openValidationIssue({ kind: "event", id });
    await nextTick();
    expect(view.find("dialog")).toHaveLength(1);
    expect(view.find("ElInput")[0]?.props.modelValue).toBe(name);
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
      day, editable, saving: editable, config: { cities: [], routes: [] }, selectableCityIds: new Set(), date: null, last: true,
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
    vehicleOptions: [{ vehicleType: "49座", durationMinutes: null }, { vehicleType: "9座", durationMinutes: 120 }],
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
  expect(choices()).toEqual(["9座", "49座"]);
  expect(vehicleSelect()?.props["allow-create"]).toBe(false);
  (vehicleSelect()!.props["onUpdate:modelValue"] as (value: string) => void)("9座");
  await nextTick();
  expect(view.find("ElInputNumber")[0]?.props["model-value"]).toBe(120);

  await setSource("manual");
  (vehicleSelect()!.props["onUpdate:modelValue"] as (value: string) => void)("19座");
  await nextTick();
  expect(vehicleSelect()?.props["model-value"]).toBe("19座");
  await setSource("route");
  expect(choices()).toEqual(["9座", "49座"]);
  expect(vehicleSelect()?.props["model-value"]).toBeNull();

  await selectRoute(emptyRoute);
  expect(choices()).toEqual(["5座", "9座", "19座", "49座"]);
  expect(vehicleSelect()?.props["allow-create"]).toBe(true);

  const fromCity = view.find("ElSelect")[0]!;
  (fromCity.props["onUpdate:modelValue"] as (value: string) => void)("different-city");
  await nextTick();
  expect(hasDetails()).toBe(false);
  expect(vehicleSelect()).toBeUndefined();

  await setSource("manual");
  expect(hasDetails()).toBe(true);
  expect(choices()).toEqual(["5座", "9座", "19座", "49座"]);
  expect(vehicleSelect()?.props["allow-create"]).toBe(true);
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
  expect(view.find("ElOption").find(option => option.props.value === "5座")?.props.disabled).toBe(false);
  const select = view.find("ElSelect")[0]!.props["onUpdate:modelValue"] as (value: string) => void;
  select("9-seat vehicle");
  select("商务车 ");
  expect(update).not.toHaveBeenCalled();
  select("19座");
  expect(update).toHaveBeenCalledExactlyOnceWith("19座");
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
