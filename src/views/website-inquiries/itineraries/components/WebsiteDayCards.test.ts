/* eslint vue/one-component-per-file: off -- The renderer uses explicit UI stubs. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRenderer, defineComponent, h, nextTick, reactive, ref, type Component, type ComponentPublicInstance } from "vue";
import type { WebsiteConfig, WebsiteDay } from "@/types/website";
import { emptyDay } from "../../options";

vi.mock("vue-i18n", () => ({ useI18n: () => ({ locale: ref("zh-cn"), t: (key: string) => key }) }));
vi.mock("@/services/business-dictionary.service", () => ({ businessDictionaryService: { getItems: async () => [{ id: "seat9", code: "seat9", name: "9座", englishName: "9-seat vehicle", status: "enabled" }] } }));
vi.mock("@/components/AppDialog/index.vue", () => ({ default: {
  props: ["modelValue"],
  render(this: ComponentPublicInstance<{ modelValue: boolean }>) {
    return this.modelValue ? h("dialog", [...(this.$slots.default?.() ?? []), ...(this.$slots.footer?.() ?? [])]) : null;
  },
} }));
vi.mock("@/components/FeedbackState/index.vue", () => ({ default: { render: () => null } }));
vi.mock("../../components/FeeStateSelect.vue", () => ({ default: { render: () => null } }));
import WebsiteDayAttractions from "./WebsiteDayAttractions.vue";
import WebsiteDayTransport from "./WebsiteDayTransport.vue";
import WebsiteDayMealsServices from "./WebsiteDayMealsServices.vue";

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
function mount(component: Component, day: WebsiteDay, editable = true, config = { attractions: [], cities: [], routes: [] } as unknown as WebsiteConfig) {
  const root = node("root");
  const app = renderer.createApp(component, { day, editable, config });
  app.config.globalProperties.$t = (key: string) => key;
  for (const name of ["ElFormItem", "ElSelect", "ElOption", "ElInput", "ElInputNumber", "ElSwitch", "ElTag", "ElButton"]) {
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
afterEach(() => { unmount?.(); unmount = undefined; });

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
