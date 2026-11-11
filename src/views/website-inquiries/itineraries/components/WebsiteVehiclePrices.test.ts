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
async function mount(attractionPriceTotal: string | null = "0.00") {
  const visible = ref(false);
  const plan = ref<WebsiteItinerary>({ ...emptyItinerary(emptyInquiry(), 0, "Test"), businessUnit: "website", id: "plan", inquiryId: "inquiry", code: "WIT-1", status: "draft", version: 1, createdAt: "", updatedAt: "", pax: 2, days: [day()], vehiclePrices: [
    { vehicleType: "7_seat", hotelTier: "A", unitPrice: "10000.00", priceComponents: components(["2000", "1000", "3000", "2000", "2000"]) },
    // 档次 C 已不在当前日程中：保留为待调整组合。
    { vehicleType: "7_seat", hotelTier: "C", unitPrice: "8000.00", priceComponents: [] },
  ] });
  const root = node("root");
  const app = renderer.createApp(defineComponent({ setup() { return () => h(WebsiteVehiclePrices, { modelValue: visible.value, "onUpdate:modelValue": (value: boolean) => visible.value = value, plan: plan.value, editable: true, attractionPriceTotal }); } }));
  app.config.globalProperties.$t = ((key: string, values?: unknown) => values ? `${key}:${JSON.stringify(values)}` : key) as typeof app.config.globalProperties.$t;
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
  return { plan, find, text: () => text(root), change, open, button, press, inputs: () => find("ElInput") };
}
const row = (plan: WebsiteItinerary, hotelTier: "A" | "B" | "C") => plan.vehiclePrices.find(price => price.vehicleType === "7_seat" && price.hotelTier === hotelTier);

describe("vehicle × hotel tier price editing", () => {
  it("saves a price with a null hotel tier when overnight cities have no hotels", async () => {
    const view = await mount();
    await view.press("common.cancel");
    view.plan.value.days.forEach(day => day.hotels = []);
    view.plan.value.vehiclePrices = [];
    await nextTick();
    await view.open();
    expect(view.plan.value.days[0]!.overnightCityId).toBe("city");
    expect(view.inputs()).toHaveLength(5);
    expect(view.inputs()[0]!.props.disabled).toBe(true);
    expect(view.inputs()[2]!.props.disabled).toBe(false);
    expect(view.find("ElCheckbox")[0]!.props).toMatchObject({ disabled: true, "model-value": false });
    expect(view.find("ElCheckbox")[2]!.props.disabled).toBe(false);
    await view.change(view.inputs()[2]!, "500");
    await view.press("common.confirm");
    expect(view.plan.value.vehiclePrices).toEqual([
      expect.objectContaining({ vehicleType: "7_seat", hotelTier: null, unitPrice: "500.00" }),
    ]);
  });

  it("disables a stored hotel display choice without dropping existing prices", async () => {
    const view = await mount();
    await view.press("common.cancel");
    view.plan.value.days.forEach(day => day.hotels = []);
    view.plan.value.vehiclePrices = [{ vehicleType: "7_seat", hotelTier: null, unitPrice: "500.00", priceComponents: components(["100", null, "400", null, null]) }];
    await nextTick();
    await view.open();
    expect(view.inputs()[0]!.props).toMatchObject({ disabled: true, "model-value": "100" });
    expect(view.find("ElCheckbox")[0]!.props).toMatchObject({ disabled: true, "model-value": false });
    await view.press("common.confirm");
    expect(view.plan.value.vehiclePrices[0]).toMatchObject({ unitPrice: "500.00" });
    expect(view.plan.value.vehiclePrices[0]!.priceComponents![0]).toEqual({ category: "hotel", unitPrice: "100", showInPdf: false });
  });

  it("keeps edits isolated until confirmation and saves only priced combinations", async () => {
    const view = await mount();
    // 档次 A、B 为当前候选，C 为待调整组合；每行五个分项。
    expect(view.inputs()).toHaveLength(15);
    expect(view.inputs()[0]!.props.disabled).toBe(false);
    expect(view.find("ElCheckbox")[0]!.props.disabled).toBe(false);
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
  it("shows the attraction reference once per tier table without filling or totaling it", async () => {
    const view = await mount("1234.50");
    const footers = view.find("tfoot");
    // A、B 与待调整的 C 共三个分组表，每表一行参考价，位于景点列。
    expect(footers).toHaveLength(3);
    const attractionColumn = 1 + PRICE_CATEGORIES.indexOf("attraction");
    for (const footer of footers) {
      const cells = view.find("td", footer);
      expect(cells.map(cell => view.find("span", cell).length)).toEqual(cells.map((_, index) => Number(index === attractionColumn)));
    }
    expect(view.text().match(/websiteItineraryUi\.attractionPriceReference:\{"price":"1,234\.50"\}/g)).toHaveLength(3);
    expect(view.inputs()[3]!.props["model-value"]).toBe("2000");
    expect(view.inputs()[8]!.props["model-value"]).toBe("");
    await view.press("common.confirm");
    expect(row(view.plan.value, "A")).toMatchObject({ unitPrice: "10000.00" });
    expect(row(view.plan.value, "A")!.priceComponents!.find(item => item.category === "attraction")).toMatchObject({ unitPrice: "2000" });
    expect(row(view.plan.value, "B")).toBeUndefined();
  });
  it("hides the attraction reference when it is unavailable instead of showing an empty amount", async () => {
    const view = await mount(null);
    expect(view.find("tfoot")).toHaveLength(3);
    expect(view.text()).not.toContain("websiteItineraryUi.attractionPriceReference");
  });
  it("derives read-only services, blocks invalid input and drops stale combinations only on delete", async () => {
    const view = await mount();
    const [driver, guide] = view.find("ElTag");
    // 司导只读：由日程派生（有专车段、无导游语种）。
    expect(driver!.props).toMatchObject({ type: "success" });
    expect(guide!.props).toMatchObject({ type: "info" });
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
