/* eslint vue/one-component-per-file: off -- The renderer uses explicit UI stubs. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRenderer, defineComponent, h, nextTick, reactive, ref, type Component, type ComponentPublicInstance } from "vue";
import type { WebsiteConfig, WebsiteDay } from "@/types/website";
import { ElMessageBox } from "element-plus";
import ItineraryReorderDialog from "@/views/inquiries/itineraries/components/ItineraryReorderDialog.vue";
import { emptyDay } from "../../options";

vi.mock("vue-i18n", () => ({ useI18n: () => ({ locale: ref("zh-cn"), t: (key: string) => key }) }));
vi.mock("@/services/business-dictionary.service", () => ({ businessDictionaryService: { getItems: async () => [{ id: "seat9", code: "seat9", name: "9座", englishName: "9-seat vehicle", status: "enabled" }] } }));
vi.mock("@/components/AppDialog/index.vue", () => ({ default: {
  props: ["modelValue"],
  render(this: ComponentPublicInstance<{ modelValue: boolean }>) {
    return this.modelValue ? h("dialog", [...(this.$slots.header?.() ?? []), ...(this.$slots.default?.() ?? []), ...(this.$slots.footer?.() ?? [])]) : null;
  },
} }));
vi.mock("@/components/FeedbackState/index.vue", () => ({ default: { render: () => null } }));
vi.mock("../../components/FeeStateSelect.vue", () => ({ default: { render: () => null } }));
import WebsiteDayAttractions from "./WebsiteDayAttractions.vue";
import WebsiteDayTransport from "./WebsiteDayTransport.vue";
import WebsiteDayMealsServices from "./WebsiteDayMealsServices.vue";
import WebsiteDayHotels from "./WebsiteDayHotels.vue";

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
  for (const name of ["ElFormItem", "ElSelect", "ElOption", "ElInput", "ElInputNumber", "ElSwitch", "ElTag", "ElButton", "ElAlert", "ElIcon", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Close", "Delete", "Edit", "CopyDocument"]) {
    app.component(name, defineComponent({ inheritAttrs: false, setup(_, { attrs, slots }) { return () => h(name, attrs, slots.default?.()); } }));
  }
  app.component("ElForm", defineComponent({ inheritAttrs: false, setup(_, { attrs, slots, expose }) { expose({ validate: async () => true }); return () => h("ElForm", attrs, slots.default?.()); } }));
  app.mount(root);
  unmount = () => app.unmount();
  function find(type: string, current = root): HostNode[] {
    return [...(current.type === type ? [current] : []), ...current.children.flatMap(child => find(type, child))];
  }
  function text(node: HostNode): string { return (node.text ?? "") + node.children.map(text).join(""); }
  return {
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
  return { ...render(component, { day, editable, config, onRemove: remove }), remove };
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

const cases = [
  { label: "attraction", component: WebsiteDayAttractions, collection: "items" as const, value: { id: "original", attractionId: null, nameZh: "景点", nameEn: "Attraction", descriptionZh: "正文", descriptionEn: "Copy", appears: true, feeState: "SELF_PAY" as const } },
  { label: "transport", component: WebsiteDayTransport, collection: "legs" as const, value: { id: "original", routeId: "route", fromCityId: "from", toCityId: "to", mode: "hsr" as const, vehicleType: null, nameZh: "交通", nameEn: "Transport", feeState: "SELF_PAY" as const } },
  { label: "service", component: WebsiteDayMealsServices, collection: "services" as const, value: { id: "original", nameZh: "服务", nameEn: "Service", appears: true, feeState: "SELF_PAY" as const } },
];
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

it("selects a dictionary vehicle using the route value and retains its configured duration", async () => {
  const day = reactive(emptyDay(1));
  const leg = { id: "leg", routeId: "route", fromCityId: "from", toCityId: "to", mode: "private_vehicle" as const, vehicleType: null, nameZh: "专车", nameEn: "Private vehicle", feeState: "INCLUDED" as const };
  day.legs = [leg];
  const config = { attractions: [], cities: [], routes: [{ id: "route", vehicleOptions: [{ vehicleType: "9_seat", durationMinutes: 180 }] }] } as unknown as WebsiteConfig;
  const view = mount(WebsiteDayTransport as Component, day, true, config);
  await view.click("common.edit");
  await nextTick();
  const choices = view.find("ElOption").filter(option => option.props.label === "9座");
  expect(choices).toHaveLength(1);
  expect(choices[0]!.props.value).toBe("9_seat");
  const selector = view.find("ElSelect").find(select => select.props.onVisibleChange)!;
  (selector.props["onUpdate:modelValue"] as (value: string) => void)("9_seat");
  await nextTick();
  await view.click("common.confirm");
  expect(day.legs[0]).toMatchObject({ vehicleType: "9_seat", durationMinutes: 180 });
});
