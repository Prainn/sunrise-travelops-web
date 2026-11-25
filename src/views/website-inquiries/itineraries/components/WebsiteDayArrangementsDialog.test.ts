/* eslint vue/one-component-per-file: off -- The renderer uses explicit UI stubs. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRenderer, defineComponent, h, nextTick, reactive, ref, type Component, type ComponentPublicInstance } from "vue";
import type { WebsiteConfig, WebsiteDay, WebsiteHotelStay, WebsiteLeg } from "@/types/website";
import { emptyDay } from "../../options";
import { removeWebsiteEvent } from "../event-order";

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ locale: ref("zh-cn"), t: (key: string) => key }),
}));
vi.mock("@vueuse/core", () => ({
  useElementSize: () => ({ height: ref(0) }),
  useEventListener: vi.fn(),
  useMediaQuery: () => ref(false),
}));
vi.mock("@/views/inquiries/itineraries/useWorkspaceAccent", () => ({
  useWorkspaceAccent: vi.fn(),
}));
vi.mock("@/components/AppDialog/index.vue", () => ({
  default: {
    props: ["modelValue", "busy"],
    emits: ["update:modelValue", "closed"],
    render(this: ComponentPublicInstance<{ modelValue: boolean }>) {
      return this.modelValue
        ? h("dialog", [
          ...(this.$slots.header?.({ titleId: "dialog-title", titleClass: "el-dialog__title" }) ?? []),
          ...(this.$slots.default?.() ?? []),
          ...(this.$slots.footer?.() ?? []),
        ])
        : null;
    },
  },
}));
vi.mock("../../components/FeeStateSelect.vue", () => ({
  default: {
    inheritAttrs: false,
    render(this: ComponentPublicInstance) { return h("fee-state-select", this.$attrs); },
  },
}));
vi.mock("./WebsiteTransportFields.vue", () => ({
  default: {
    inheritAttrs: false,
    render(this: ComponentPublicInstance) { return h("transport-fields", this.$attrs); },
  },
}));

import ItineraryWorkspaceLayout from "@/views/inquiries/itineraries/components/ItineraryWorkspaceLayout.vue";
import WebsiteDayArrangementsDialog from "./WebsiteDayArrangementsDialog.vue";

type HostNode = { type: string; props: Record<string, unknown>; children: HostNode[]; parent?: HostNode; text?: string; focus?: () => void };
const createNode = (type: string): HostNode => ({ type, props: {}, children: [], ...(type === "button" ? { focus: vi.fn() } : {}) });
const renderer = createRenderer<HostNode, HostNode>({
  createElement: createNode,
  createText: text => ({ ...createNode("text"), text }),
  createComment: () => createNode("comment"),
  patchProp: (node, key, _, value) => { node.props[key] = value; },
  setText: (node, text) => { node.text = text; },
  setElementText: (node, text) => { node.text = text; },
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
  const root = createNode("root");
  const app = renderer.createApp(component, props);
  app.config.globalProperties.$t = (key: string) => key;
  for (const name of ["ElTooltip", "ElButton", "ElIcon", "ElTag", "ElAlert", "ElFormItem", "ElSelect", "ElOption", "ElInput", "ElRadioGroup", "ElRadioButton"]) {
    app.component(name, defineComponent({
      inheritAttrs: false,
      setup(_, { attrs, slots }) { return () => h(name, attrs, slots.default?.()); },
    }));
  }
  app.component("ElForm", defineComponent({
    inheritAttrs: false,
    setup(_, { attrs, slots, expose }) {
      expose({ validate: async () => true });
      return () => h("ElForm", attrs, slots.default?.());
    },
  }));
  const instance = app.mount(root);
  unmount = () => app.unmount();
  function find(type: string, current = root): HostNode[] {
    return [...(current.type === type ? [current] : []), ...current.children.flatMap(child => find(type, child))];
  }
  function walk(current = root): HostNode[] {
    return [current, ...current.children.flatMap(walk)];
  }
  function text(node: HostNode): string {
    return (node.text ?? "") + node.children.map(text).join("");
  }
  return { instance, root, find, walk, text };
}

function makeConfig(): WebsiteConfig {
  return {
    version: 1,
    cities: [
      { id: "km", nameZh: "昆明", nameEn: "Kunming", status: "enabled", resourceId: null },
      { id: "dl", nameZh: "大理", nameEn: "Dali", status: "enabled", resourceId: null },
      { id: "lj", nameZh: "丽江", nameEn: "Lijiang", status: "enabled", resourceId: null },
    ],
    attractions: [],
    hotels: [],
    routes: [],
    patterns: [],
    skeletons: [],
    templates: [],
  };
}

afterEach(() => {
  unmount?.();
  unmount = undefined;
  vi.unstubAllGlobals();
});

describe("ItineraryWorkspaceLayout day view button", () => {
  const days = [
    { id: "d1", label: "D1", summary: "2026-11-21 昆明 → 大理" },
    { id: "d2", label: "D2", summary: "2026-11-23 大理 → 丽江" },
    { id: "d3", label: "D3", summary: "2026-11-24 丽江" },
  ];

  it("hides the eye icon when dayViewLabel is omitted for non-website itineraries", () => {
    const view = render(ItineraryWorkspaceLayout, { days });
    expect(view.find("ElTooltip")).toHaveLength(0);
    expect(view.find("button")).toHaveLength(3);
  });

  it("renders separate nav and eye buttons and opens the clicked day without scrolling or changing active day", async () => {
    const scrollIntoView = vi.fn();
    vi.stubGlobal("document", { getElementById: vi.fn(() => ({ scrollIntoView })) });
    const expand = vi.fn();
    const viewDay = vi.fn();
    const view = render(ItineraryWorkspaceLayout, {
      days,
      dayViewLabel: "查看当天",
      onExpand: expand,
      onViewDay: viewDay,
    });
    const items = view.find("li");
    expect(items).toHaveLength(3);
    for (const item of items) {
      const buttons = view.find("button", item);
      expect(buttons).toHaveLength(2);
      expect(view.find("button", buttons[0]!)).toHaveLength(1);
    }
    const tooltips = view.find("ElTooltip");
    expect(tooltips).toHaveLength(3);
    expect(tooltips[2]!.props.content).toBe("查看当天");
    expect(tooltips[2]!.props.trigger).toEqual(["hover", "focus"]);

    const d1Nav = view.find("button", items[0]!)[0]!;
    const d3Nav = view.find("button", items[2]!)[0]!;
    const d3Eye = view.find("button", items[2]!)[1]!;
    expect(d1Nav.props["aria-current"]).toBe("step");
    expect(d3Eye.props["aria-label"]).toBe("查看当天");

    (d3Eye.props.onClick as () => void)();
    await nextTick();
    expect(viewDay).toHaveBeenCalledExactlyOnceWith("d3");
    expect(expand).not.toHaveBeenCalled();
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(d1Nav.props["aria-current"]).toBe("step");
    expect(d3Nav.props["aria-current"]).toBeUndefined();

    // 关闭弹窗后可将焦点恢复到触发该日弹窗的眼睛按钮
    (view.instance as InstanceType<typeof ItineraryWorkspaceLayout>).focusDayView("d3");
    expect(d3Eye.focus).toHaveBeenCalledOnce();

    await (d3Nav.props.onClick as () => Promise<void>)();
    await nextTick();
    expect(expand).toHaveBeenCalledExactlyOnceWith("d3");
    expect(scrollIntoView).toHaveBeenCalledOnce();
    expect(viewDay).toHaveBeenCalledOnce();
    expect(d3Nav.props["aria-current"]).toBe("step");
  });
});

describe("WebsiteDayArrangementsDialog", () => {
  it("shows day number, actual date, route, and three fixed non-draggable groups in order", () => {
    const day = reactive<WebsiteDay>({
      ...emptyDay(3),
      id: "day-3",
      departCityId: "dl",
      endCityId: "lj",
      overnightCityId: "lj",
      internalRemark: "优先安排早出发",
      guideLanguage: "English",
      items: [{
        id: "attr-1", attractionId: null, nameZh: "玉龙雪山", nameEn: "Jade Dragon",
        descriptionZh: "游览", descriptionEn: "Visit", appears: true, feeState: "INCLUDED",
      }],
      services: [{ id: "svc-1", nameZh: "旅拍服务", nameEn: "Photo", appears: true, feeState: "INCLUDED" }],
      meals: [
        { id: "m-dinner", slot: "dinner", resourceId: null, restaurantZh: "纳西晚餐", restaurantEn: "", feeState: "INCLUDED" },
        { id: "m-lunch", slot: "lunch", resourceId: null, restaurantZh: "", restaurantEn: "", feeState: "SELF_PAY" },
        { id: "m-breakfast", slot: "breakfast", resourceId: "pub-r", restaurantZh: "酒店外早餐", restaurantEn: "", feeState: "INCLUDED" },
      ],
      legs: [
        { id: "leg-1", routeId: null, fromCityId: "dl", toCityId: "lj", mode: "hsr", nameZh: "第一段高铁", nameEn: "", feeState: "INCLUDED" },
        { id: "leg-2", routeId: null, fromCityId: "lj", toCityId: "lj", mode: "private_vehicle", nameZh: "第二段接站", nameEn: "", feeState: "INCLUDED", isAirportDropoff: true },
      ],
      hotels: [
        { id: "h-a", tier: "A", cityId: "lj", configHotelId: null, resourceId: null, nameZh: "丽江五星", nameEn: "", roomType: "King", breakfastIncluded: true },
        { id: "h-night", tier: "A", cityId: "lj", configHotelId: null, resourceId: null, nameZh: "逐晚加选酒店", nameEn: "", roomType: "Twin", breakfastIncluded: false, nightlyOnly: true },
      ],
      eventOrder: ["attr-1", "leg-2", "m-dinner", "leg-1", "m-breakfast"],
    });

    const view = render(WebsiteDayArrangementsDialog, {
      modelValue: true,
      day,
      date: "2026-11-24",
      route: "大理 → 丽江",
      config: makeConfig(),
      selectableCityIds: new Set(["km", "dl", "lj"]),
      nightly: false,
      editable: true,
    });

    const title = view.text(view.find("h2")[0]!);
    expect(title).toContain("D3");
    expect(title).toContain("2026-11-24");
    expect(title).toContain("大理 → 丽江");
    const header = view.find("h2")[0]!.parent!;
    expect(view.find("p", header)).toHaveLength(1);
    expect(view.text(header)).toContain("优先安排早出发");

    const sections = view.find("section");
    expect(sections.map(section => view.text(view.find("h4", section)[0]!))).toEqual([
      "itineraryWorkspace.groups.meals",
      "websiteConfig.tabs.routes",
      "itinerary.hotelPlans",
    ]);

    const fullText = view.text(view.root);
    expect(fullText).not.toContain("玉龙雪山");
    expect(fullText).not.toContain("English");
    expect(fullText).not.toContain("旅拍服务");

    // 禁用拖拽
    for (const node of view.walk()) {
      expect(node.props.draggable).toBeUndefined();
      expect(node.props.onDragstart).toBeUndefined();
      expect(node.props.onDrop).toBeUndefined();
    }

    // 餐食固定按早、午、晚排列，未安排的午餐不显示
    const mealText = view.text(sections[0]!);
    expect(mealText.indexOf("itinerary.meals.breakfast")).toBeLessThan(mealText.indexOf("itinerary.meals.dinner"));
    expect(mealText).not.toContain("itinerary.meals.lunch");
    expect(mealText).toContain("websiteItineraryUi.sourcePublic");

    // 交通段按 websiteDayEventIds 顺序显示（leg-2 在 leg-1 之前）
    const transportText = view.text(sections[1]!);
    expect(transportText.indexOf("第二段接站")).toBeLessThan(transportText.indexOf("第一段高铁"));
    expect(transportText).toContain("websiteItineraryUi.airportDropoff");

    // 全程分档模式不展示 nightlyOnly 酒店
    const hotelText = view.text(sections[2]!);
    expect(hotelText).toContain("丽江五星");
    expect(hotelText).not.toContain("逐晚加选酒店");
  });

  it("handles empty groups, no overnight stay, undetermined date, readonly, and saving states", () => {
    const empty = reactive<WebsiteDay>({ ...emptyDay(2), id: "day-2", overnightCityId: null });
    const editableView = render(WebsiteDayArrangementsDialog, {
      modelValue: true,
      day: empty,
      date: null,
      route: "",
      config: makeConfig(),
      selectableCityIds: new Set(["km"]),
      editable: true,
    });
    const title = editableView.text(editableView.find("h2")[0]!);
    expect(title).toContain("D2");
    expect(title).toContain("itineraryWorkspace.notArranged");
    expect(editableView.find("p", editableView.find("h2")[0]!.parent!)).toHaveLength(0);
    const sections = editableView.find("section");
    expect(editableView.text(sections[0]!)).toContain("websiteItineraryUi.noMeals");
    expect(editableView.text(sections[1]!)).toContain("websiteItineraryUi.noTransportLegs");
    expect(editableView.text(sections[2]!)).toContain("websiteItineraryUi.noOvernightHotelHint");
    // 餐食与交通段可新增；不住宿时酒店不提供新增入口
    expect(editableView.find("ElButton", sections[0]!).map(editableView.text)).toEqual(["common.create"]);
    expect(editableView.find("ElButton", sections[1]!).map(editableView.text)).toEqual(["common.create"]);
    expect(editableView.find("ElButton", sections[2]!)).toHaveLength(0);
    unmount?.();

    const populated = reactive<WebsiteDay>({
      ...emptyDay(1),
      id: "day-1",
      overnightCityId: null,
      meals: [{ id: "m1", slot: "lunch", resourceId: null, restaurantZh: "午餐", restaurantEn: "", feeState: "INCLUDED" }],
      legs: [{ id: "l1", routeId: null, fromCityId: "km", toCityId: "dl", mode: "hsr", nameZh: "动车", nameEn: "", feeState: "INCLUDED" }],
    });
    const readonlyView = render(WebsiteDayArrangementsDialog, {
      modelValue: true,
      day: populated,
      date: "2026-11-21",
      route: "昆明 → 大理",
      config: makeConfig(),
      selectableCityIds: new Set(["km", "dl"]),
      editable: false,
    });
    expect(readonlyView.text(readonlyView.root)).toContain("午餐");
    expect(readonlyView.text(readonlyView.root)).toContain("动车");
    expect(readonlyView.text(readonlyView.find("section")[2]!)).toContain("itinerary.noOvernightStay");
    // 只读态除底部关闭外不渲染任何编辑/新增/删除按钮
    expect(readonlyView.find("ElButton").map(readonlyView.text)).toEqual(["common.close"]);
    unmount?.();

    const savingView = render(WebsiteDayArrangementsDialog, {
      modelValue: true,
      day: populated,
      date: "2026-11-21",
      route: "昆明 → 大理",
      config: makeConfig(),
      selectableCityIds: new Set(["km", "dl"]),
      editable: true,
      saving: true,
    });
    const savingButtons = savingView.find("ElButton");
    expect(savingButtons.map(savingView.text)).toEqual(["common.close"]);
    expect(savingButtons[0]!.props.disabled).toBe(true);
  });

  it("shares the unsaved draft for add, in-place transport edit, nightly hotel list, and delete confirmation", async () => {
    const leg: WebsiteLeg = {
      id: "leg-keep", routeId: null, fromCityId: "km", toCityId: "dl",
      mode: "private_vehicle", nameZh: "原交通说明", nameEn: "", feeState: "INCLUDED",
    };
    const hotelKeep: WebsiteHotelStay = {
      id: "hotel-keep", tier: "A", cityId: "dl", configHotelId: null, resourceId: null,
      nameZh: "保留酒店", nameEn: "", roomType: "King", breakfastIncluded: true,
      nightlySelected: true, nightlyRooms: 2, nightlyRate: "680.00",
    };
    const hotelDrop: WebsiteHotelStay = {
      id: "hotel-drop", tier: "A", cityId: "dl", configHotelId: null, resourceId: null,
      nameZh: "待删逐晚酒店", nameEn: "", roomType: "Twin", breakfastIncluded: false,
      nightlyOnly: true, nightlySelected: true, nightlyRooms: 1, nightlyRate: "420.00",
    };
    const day = reactive<WebsiteDay>({
      ...emptyDay(3),
      id: "day-3",
      departCityId: "km",
      endCityId: "dl",
      overnightCityId: "dl",
      items: [{
        id: "attr-1", attractionId: null, nameZh: "景点1", nameEn: "A1",
        descriptionZh: "描述", descriptionEn: "Desc", appears: true, feeState: "INCLUDED",
      }],
      meals: [
        { id: "m-b", slot: "breakfast", resourceId: null, restaurantZh: "早饭", restaurantEn: "", feeState: "INCLUDED" },
        { id: "m-l", slot: "lunch", resourceId: null, restaurantZh: "", restaurantEn: "", feeState: "SELF_PAY" },
        { id: "m-d", slot: "dinner", resourceId: null, restaurantZh: "晚饭", restaurantEn: "", feeState: "INCLUDED" },
      ],
      legs: [leg],
      hotels: [hotelKeep, hotelDrop],
      eventOrder: ["attr-1", "leg-keep", "m-b", "m-d"],
    });

    const openResource = vi.fn();
    const removeItem = vi.fn();
    const view = render(WebsiteDayArrangementsDialog, {
      modelValue: true,
      day,
      date: "2026-11-24",
      route: "昆明 → 大理",
      config: makeConfig(),
      selectableCityIds: new Set(["km", "dl"]),
      nightly: true,
      editable: true,
      onOpenResource: openResource,
      onRemoveItem: removeItem,
    });

    const sections = view.find("section");
    // 餐食新增自动选未安排的午餐
    const mealAdd = view.find("ElButton", sections[0]!).find(button => view.text(button) === "common.create")!;
    (mealAdd.props.onClick as () => void)();
    expect(openResource).toHaveBeenLastCalledWith({ kind: "meal", slot: "lunch" });

    // 三个餐次均已安排后禁用餐食新增
    day.meals[1]!.restaurantZh = "新午餐";
    await nextTick();
    expect(view.find("ElButton", sections[0]!).find(button => view.text(button) === "common.create")?.props.disabled).toBe(true);

    // 交通段就地编辑：取消不改草稿，确认保留 ID 与 eventOrder
    const transportEdit = view.find("ElButton", sections[1]!).find(button => view.text(button) === "common.edit")!;
    (transportEdit.props.onClick as () => void)();
    await nextTick();
    const dialogs = view.find("dialog");
    expect(dialogs).toHaveLength(2);
    const editInput = view.find("ElInput", dialogs[1]!)[0]!;
    (editInput.props["onUpdate:modelValue"] as (value: string) => void)("未确认修改");
    await nextTick();
    const cancelEdit = view.find("ElButton", dialogs[1]!).find(button => view.text(button) === "common.cancel")!;
    (cancelEdit.props.onClick as () => void)();
    await nextTick();
    expect(day.legs[0]!.nameZh).toBe("原交通说明");

    (transportEdit.props.onClick as () => void)();
    await nextTick();
    const reopenedDialog = view.find("dialog")[1]!;
    (view.find("ElInput", reopenedDialog)[0]!.props["onUpdate:modelValue"] as (value: string) => void)("已确认修改");
    await nextTick();
    const confirmEdit = view.find("ElButton", reopenedDialog).find(button => view.text(button) === "common.confirm")!;
    await (confirmEdit.props.onClick as () => Promise<void>)();
    await nextTick();
    expect(day.legs[0]).toMatchObject({ id: "leg-keep", nameZh: "已确认修改" });
    expect(day.eventOrder).toEqual(["attr-1", "leg-keep", "m-b", "m-d"]);
    // 确认单项编辑后仍留在查看当天弹窗
    expect(view.find("dialog")).toHaveLength(1);

    // 逐晚模式下展示同档 nightlyOnly 酒店，删除请求走 remove-item 且不提前改草稿
    expect(view.text(sections[2]!)).toContain("待删逐晚酒店");
    const hotelDeletes = view.find("ElButton", sections[2]!).filter(button => view.text(button) === "common.delete");
    expect(hotelDeletes).toHaveLength(2);
    (hotelDeletes[1]!.props.onClick as () => void)();
    expect(removeItem).toHaveBeenCalledExactlyOnceWith("hotel-drop", "待删逐晚酒店");
    expect(day.hotels).toHaveLength(2);

    // 确认删除后仅移除目标酒店，保留另一家酒店的逐晚价格与景点顺序
    removeWebsiteEvent(day, "hotel-drop");
    await nextTick();
    expect(day.hotels).toEqual([hotelKeep]);
    expect(day.eventOrder?.slice(0, 2)).toEqual(["attr-1", "leg-keep"]);
    expect(view.text(sections[2]!)).not.toContain("待删逐晚酒店");
  });
});
