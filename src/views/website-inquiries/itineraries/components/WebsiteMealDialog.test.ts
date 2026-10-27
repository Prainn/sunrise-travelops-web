/* eslint vue/one-component-per-file: off -- The renderer uses explicit UI stubs. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRenderer, defineComponent, h, nextTick, onMounted, type Component, type ComponentPublicInstance } from "vue";
import type { WebsiteConfig, WebsiteDay, WebsiteMeal } from "@/types/website";
import { emptyDay } from "../../options";

const mocks = vi.hoisted(() => ({ confirm: vi.fn(), pickerMount: vi.fn() }));
vi.mock("element-plus", () => ({ ElMessageBox: { confirm: mocks.confirm } }));
vi.mock("vue-i18n", () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock("@/components/AppDialog/index.vue", () => ({ default: {
  render(this: ComponentPublicInstance) { return h("dialog", [...(this.$slots.default?.() ?? []), ...(this.$slots.footer?.() ?? [])]); },
} }));
vi.mock("../../components/FeeStateSelect.vue", () => ({ default: { render: () => null } }));
vi.mock("../../components/WebsitePublicResourcePicker.vue", () => ({ default: {
  inheritAttrs: false,
  props: ["modelValue"],
  setup() { onMounted(mocks.pickerMount); },
  render(this: ComponentPublicInstance<{ modelValue: string | null }>) { return h("picker", { ...this.$attrs, modelValue: this.$props.modelValue }); },
} }));
import WebsiteMealDialog from "./WebsiteMealDialog.vue";

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
function mount(day: WebsiteDay) {
  const submitted = vi.fn();
  const closed = vi.fn();
  const root = node("root");
  const app = renderer.createApp(WebsiteMealDialog as Component, {
    modelValue: true, day, dayLabel: "D1", config: { cities: [] } as unknown as WebsiteConfig,
    initialSlot: "breakfast", onSubmit: submitted, "onUpdate:modelValue": closed,
  });
  app.config.globalProperties.$t = (key: string) => key;
  for (const name of ["ElForm", "ElFormItem", "ElSelect", "ElOption", "ElRadioGroup", "ElRadioButton", "ElInput", "ElButton"]) {
    app.component(name, defineComponent({ inheritAttrs: false, setup(_, { attrs, slots }) { return () => h(name, attrs, slots.default?.()); } }));
  }
  app.mount(root);
  unmount = () => app.unmount();
  function find(type: string, current = root): HostNode[] {
    return [...(current.type === type ? [current] : []), ...current.children.flatMap(child => find(type, child))];
  }
  return {
    submitted, closed, find,
    async changeSlot(value: WebsiteMeal["slot"]) {
      (find("ElSelect")[0]!.props["onUpdate:modelValue"] as (value: string) => void)(value);
      await nextTick();
    },
    async confirm() {
      await (find("ElButton")[1]!.props.onClick as () => Promise<void>)();
      await nextTick();
    },
  };
}
function breakfastDay() {
  const day = emptyDay(1);
  Object.assign(day.meals[0]!, { resourceId: "breakfast-resource", restaurantZh: "早餐餐厅", restaurantEn: "Breakfast restaurant", feeState: "INCLUDED" });
  return day;
}
beforeEach(() => { vi.clearAllMocks(); mocks.confirm.mockResolvedValue(undefined); });
afterEach(() => { unmount?.(); unmount = undefined; });

describe("meal slot editing", () => {
  it("keeps the resource picker, current resource and names when changing slots", async () => {
    const day = breakfastDay();
    const before = JSON.stringify(day);
    const view = mount(day);
    const picker = view.find("picker")[0];
    await view.changeSlot("lunch");
    expect(view.find("picker")[0]).toBe(picker);
    expect(mocks.pickerMount).toHaveBeenCalledOnce();
    expect(view.find("picker")[0]!.props.modelValue).toBe("breakfast-resource");
    expect(view.find("ElInput").map(input => input.props.modelValue)).toEqual(["早餐餐厅", "Breakfast restaurant"]);
    expect(JSON.stringify(day)).toBe(before);
    await view.confirm();
    expect(view.submitted).toHaveBeenCalledExactlyOnceWith({ ...day.meals[0], slot: "lunch" });
    expect(view.closed).toHaveBeenCalledWith(false);
    expect(mocks.confirm).not.toHaveBeenCalled();
  });

  it("saves a newly selected restaurant under the original meal ID after changing slots", async () => {
    const day = breakfastDay();
    const view = mount(day);
    await view.changeSlot("dinner");
    const picker = view.find("picker")[0]!;
    (picker.props["onUpdate:modelValue"] as (id: string) => void)("new-resource");
    (picker.props.onSelect as (option: { name: string }) => void)({ name: "新餐厅" });
    await view.confirm();
    expect(view.submitted).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: day.meals[0]!.id, slot: "dinner", resourceId: "new-resource", restaurantZh: "新餐厅" }));
  });

  it("keeps edits open when replacement is cancelled and submits only after confirmation", async () => {
    const day = breakfastDay();
    day.meals[1]!.restaurantZh = "已有午餐";
    const before = JSON.stringify(day);
    const view = mount(day);
    await view.changeSlot("lunch");
    mocks.confirm.mockRejectedValueOnce("cancel");
    await view.confirm();
    expect(view.submitted).not.toHaveBeenCalled();
    expect(view.closed).not.toHaveBeenCalled();
    expect(JSON.stringify(day)).toBe(before);
    expect(view.find("picker")[0]!.props.modelValue).toBe("breakfast-resource");
    await view.confirm();
    expect(view.submitted).toHaveBeenCalledExactlyOnceWith({ ...day.meals[0], slot: "lunch" });
    expect(view.closed).toHaveBeenCalledWith(false);
  });
});
