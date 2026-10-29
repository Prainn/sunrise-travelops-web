/* eslint vue/one-component-per-file: off -- Explicit renderer stubs exercise dialog state. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRenderer, defineComponent, h, nextTick, ref, type ComponentPublicInstance } from "vue";
import type { WebsiteItinerary } from "@/types/website";
import { emptyInquiry, emptyItinerary } from "../../options";
import { PRICE_CATEGORIES } from "../vehicle-price";
vi.mock("vue-i18n", () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock("@/components/AppDialog/index.vue", () => ({ default: {
  render(this: ComponentPublicInstance) { return h("dialog", [...(this.$slots.default?.() ?? []), ...(this.$slots.footer?.() ?? [])]); },
} }));
import WebsiteVehiclePrices from "./WebsiteVehiclePrices.vue";
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
afterEach(() => { unmount?.(); });
async function mount() {
  const visible = ref(false);
  const plan = ref<WebsiteItinerary>({ ...emptyItinerary(emptyInquiry(), 0, "Test"), businessUnit: "website", id: "plan", inquiryId: "inquiry", code: "WIT-1", status: "draft", version: 1, createdAt: "", updatedAt: "", pax: 2, days: [], vehiclePrices: [{ vehicleType: "7_seat", plan: "A", includesDriver: true, includesGuide: false, unitPrice: "10000.00", priceComponents: PRICE_CATEGORIES.map((category, index) => ({ category, unitPrice: ["2000", "1000", "3000", "2000", "2000"][index]!, showInPdf: index === 0 })) }] });
  const root = node("root");
  const app = renderer.createApp(defineComponent({ setup() { return () => h(WebsiteVehiclePrices, { modelValue: visible.value, "onUpdate:modelValue": (value: boolean) => visible.value = value, plan: plan.value, editable: true }); } }));
  app.config.globalProperties.$t = (key: string) => key;
  for (const name of ["ElForm", "ElFormItem", "ElCheckboxGroup", "ElCheckbox", "ElInput", "ElButton", "ElAlert", "ElSteps", "ElStep"]) app.component(name, defineComponent({ inheritAttrs: false, setup(_, { attrs, slots }) { return () => h(name, attrs, slots.default?.()); } }));
  app.mount(root);
  unmount = () => app.unmount();
  function find(type: string, current = root): HostNode[] { return [...(current.type === type ? [current] : []), ...current.children.flatMap(child => find(type, child))]; }
  const text = (current: HostNode): string => (current.text ?? "") + current.children.map(text).join("");
  const button = (key: string) => find("ElButton").find(item => text(item).includes(key));
  async function change(target: HostNode, value: unknown) { (target.props["onUpdate:modelValue"] as (value: unknown) => void)(value); await nextTick(); }
  async function press(key: string) { (button(key)!.props.onClick as () => void)(); await nextTick(); }
  async function open() { visible.value = true; await nextTick(); }
  await open();
  return { plan, find, change, open, button, press, inputs: () => find("ElInput") };
}
const row = (plan: WebsiteItinerary, vehicleType: string, key: "A" | "B") => plan.vehiclePrices.find(price => price.vehicleType === vehicleType && price.plan === key)!;

describe("staged component price editing", () => {
  it("keeps edits isolated until confirmation and keeps saved display flags", async () => {
    const view = await mount();
    // Step 1: plan A shared items only (hotel, guide, attraction, meal).
    expect(view.inputs()).toHaveLength(4);
    await view.change(view.inputs()[0]!, "3000");
    await view.press("common.cancel");
    expect(row(view.plan.value, "7_seat", "A").unitPrice).toBe("10000.00");
    await view.open();
    expect(view.inputs()[0]!.props["model-value"]).toBe("2000");
    await view.change(view.inputs()[0]!, "3000");
    for (let step = 0; step < 3; step++) await view.press("common.nextStep");
    await view.press("common.confirm");
    expect(row(view.plan.value, "7_seat", "A").unitPrice).toBe("11000.00");
    expect(row(view.plan.value, "7_seat", "A").priceComponents!.find(item => item.category === "hotel")).toMatchObject({ unitPrice: "3000", showInPdf: true });
  });
  it("blocks invalid input and clears a deselected vehicle's entire breakdown on confirmation", async () => {
    const view = await mount();
    await view.change(view.inputs()[0]!, "-1");
    expect(view.button("common.nextStep")!.props.disabled).toBe(true);
    await view.change(view.inputs()[0]!, "2000");
    await view.press("common.nextStep");
    await view.change(view.find("ElCheckboxGroup")[0]!, []);
    expect(view.inputs()).toHaveLength(0);
    await view.press("common.nextStep");
    await view.press("common.nextStep");
    await view.press("common.confirm");
    expect(row(view.plan.value, "7_seat", "A")).toMatchObject({ unitPrice: null, priceComponents: [], includesDriver: false, includesGuide: false });
  });
  it("shares non-vehicle items across vehicles and one vehicle price across plans", async () => {
    const view = await mount();
    await view.press("websiteItineraryUi.addPlanB");
    // Rows alternate plan A/B: hotel A, hotel B, ...
    expect(view.inputs()).toHaveLength(8);
    await view.change(view.inputs()[1]!, "1000");
    await view.press("common.nextStep");
    await view.change(view.find("ElCheckboxGroup")[0]!, ["7_seat", "9_seat"]);
    expect(view.inputs().map(input => input.props["model-value"])).toEqual(["3000", ""]);
    await view.change(view.inputs()[1]!, "5000");
    await view.press("common.nextStep");
    await view.press("common.nextStep");
    await view.press("common.confirm");
    const plan = view.plan.value;
    expect(row(plan, "7_seat", "A")).toMatchObject({ unitPrice: "10000.00", includesDriver: true });
    expect(row(plan, "9_seat", "A")).toMatchObject({ unitPrice: "12000.00", includesDriver: true });
    expect(row(plan, "9_seat", "A").priceComponents!.find(item => item.category === "hotel")).toMatchObject({ unitPrice: "2000", showInPdf: true });
    expect(row(plan, "7_seat", "B").unitPrice).toBe("4000.00");
    expect(row(plan, "9_seat", "B").unitPrice).toBe("6000.00");
  });
});
