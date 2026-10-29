/* eslint vue/one-component-per-file: off -- Explicit renderer stubs exercise dialog state. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRenderer, defineComponent, h, nextTick, ref, type ComponentPublicInstance } from "vue";
import type { WebsiteDay, WebsiteItinerary } from "@/types/website";
import { emptyDay, emptyInquiry, emptyItinerary } from "../../options";
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
const components = (values: (string | null)[]) => PRICE_CATEGORIES.map((category, index) => ({ category, unitPrice: values[index] ?? null, showInPdf: index === 0 }));
function day(): WebsiteDay {
  const value = emptyDay(1);
  value.overnightCityId = "city";
  value.legs = [{ id: "leg", routeId: null, fromCityId: "city", toCityId: "city", mode: "private_vehicle", vehicleType: "7_seat", nameZh: "", nameEn: "", feeState: "INCLUDED" }];
  value.hotels = (["A", "B"] as const).map(tier => ({ id: tier, tier, cityId: "city", configHotelId: null, resourceId: null, nameZh: tier, nameEn: tier, roomType: "", breakfastIncluded: true }));
  return value;
}
async function mount() {
  const visible = ref(false);
  const plan = ref<WebsiteItinerary>({ ...emptyItinerary(emptyInquiry(), 0, "Test"), businessUnit: "website", id: "plan", inquiryId: "inquiry", code: "WIT-1", status: "draft", version: 1, createdAt: "", updatedAt: "", pax: 2, days: [day()], vehiclePrices: [
    { vehicleType: "7_seat", hotelTier: "A", unitPrice: "10000.00", priceComponents: components(["2000", "1000", "3000", "2000", "2000"]) },
    // 档次 C 已不在当前日程中：保留为待调整组合。
    { vehicleType: "7_seat", hotelTier: "C", unitPrice: "8000.00", priceComponents: [] },
  ] });
  const root = node("root");
  const app = renderer.createApp(defineComponent({ setup() { return () => h(WebsiteVehiclePrices, { modelValue: visible.value, "onUpdate:modelValue": (value: boolean) => visible.value = value, plan: plan.value, editable: true }); } }));
  app.config.globalProperties.$t = (key: string) => key;
  for (const name of ["ElForm", "ElFormItem", "ElCheckbox", "ElInput", "ElButton", "ElAlert", "ElTag"]) app.component(name, defineComponent({ inheritAttrs: false, setup(_, { attrs, slots }) { return () => h(name, attrs, slots.default?.()); } }));
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
const row = (plan: WebsiteItinerary, hotelTier: "A" | "B" | "C") => plan.vehiclePrices.find(price => price.vehicleType === "7_seat" && price.hotelTier === hotelTier);

describe("vehicle × hotel tier price editing", () => {
  it("keeps edits isolated until confirmation and saves only priced combinations", async () => {
    const view = await mount();
    // 档次 A、B 为当前候选，C 为待调整组合；每行五个分项。
    expect(view.inputs()).toHaveLength(15);
    await view.change(view.inputs()[0]!, "3000");
    await view.press("common.cancel");
    expect(row(view.plan.value, "A")!.unitPrice).toBe("10000.00");
    await view.open();
    expect(view.inputs()[0]!.props["model-value"]).toBe("2000");
    await view.change(view.inputs()[0]!, "3000");
    await view.change(view.inputs()[7]!, "0");
    await view.press("common.confirm");
    const plan = view.plan.value;
    expect(plan.vehiclePrices).toHaveLength(3);
    expect(row(plan, "A")).toMatchObject({ unitPrice: "11000.00" });
    expect(row(plan, "A")!.priceComponents!.find(item => item.category === "hotel")).toMatchObject({ unitPrice: "3000", showInPdf: true });
    expect(row(plan, "B")).toMatchObject({ unitPrice: "0.00" });
    expect(row(plan, "B")!.priceComponents!.filter(item => item.unitPrice !== null)).toEqual([{ category: "vehicle", unitPrice: "0", showInPdf: false }]);
    expect(row(plan, "C")).toEqual({ vehicleType: "7_seat", hotelTier: "C", unitPrice: "8000.00", priceComponents: [] });
    expect(Object.keys(row(plan, "A")!).sort()).toEqual(["hotelTier", "priceComponents", "unitPrice", "vehicleType"]);
  });
  it("derives read-only services, blocks invalid input and drops stale combinations only on delete", async () => {
    const view = await mount();
    const [driver, guide] = view.find("ElCheckbox");
    // 司导只读：由日程派生（有专车段、无导游语种）。
    expect(driver!.props).toMatchObject({ "model-value": true, disabled: "" });
    expect(guide!.props).toMatchObject({ "model-value": false, disabled: "" });
    await view.change(view.inputs()[0]!, "-1");
    expect(view.button("common.confirm")!.props.disabled).toBe(true);
    await view.change(view.inputs()[0]!, "2000");
    expect(view.button("common.confirm")!.props.disabled).toBe(false);
    await view.press("common.delete");
    expect(view.inputs()).toHaveLength(10);
    await view.press("common.confirm");
    expect(view.plan.value.vehiclePrices.map(price => price.hotelTier)).toEqual(["A"]);
  });
});
