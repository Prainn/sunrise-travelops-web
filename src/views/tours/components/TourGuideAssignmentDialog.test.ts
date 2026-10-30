/* eslint vue/one-component-per-file: off -- The renderer supplies explicit UI stubs. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRenderer, defineComponent, h, nextTick, type ComponentPublicInstance } from "vue";
import type { TourRecord } from "@/types/tour";
import type { GuideServiceRow } from "../tour-form";

const mocks = vi.hoisted(() => ({ update: vi.fn(), warning: vi.fn(), error: vi.fn(), success: vi.fn(), unavailable: vi.fn() }));
vi.mock("@/services/tour.service", () => ({ tourService: { update: mocks.update } }));
vi.mock("@/api/request", () => ({ isApiError: (value: { details?: unknown }) => Boolean(value.details) }));
vi.mock("element-plus", () => ({ ElMessage: { warning: mocks.warning, error: mocks.error, success: mocks.success } }));
vi.mock("vue-i18n", () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock("@/components/AppDialog/index.vue", () => ({ default: { render(this: ComponentPublicInstance) { return [this.$slots.default?.(), this.$slots.footer?.()]; } } }));
vi.mock("./GuideServicesEditor.vue", () => ({ default: {
  name: "TestGuideEditor",
  props: ["modelValue", "showIncomplete", "serverErrors"],
  inheritAttrs: false,
  methods: { hasUnavailable: () => mocks.unavailable() },
  render(this: ComponentPublicInstance) { editor = { ...this.$attrs, ...this.$props }; return null; },
} }));
import TourGuideAssignmentDialog from "./TourGuideAssignmentDialog.vue";

type HostNode = { parent?: HostNode; children: HostNode[] };
const renderer = createRenderer<HostNode, HostNode>({
  createElement: () => ({ children: [] }), createText: () => ({ children: [] }), createComment: () => ({ children: [] }),
  setText: () => {}, setElementText: () => {}, patchProp: () => {},
  parentNode: (node) => node.parent ?? null,
  nextSibling: (node) => node.parent?.children[node.parent.children.indexOf(node) + 1] ?? null,
  remove(node) { if (node.parent) node.parent.children.splice(node.parent.children.indexOf(node), 1); },
  insert(node, parent, anchor) {
    if (node.parent) node.parent.children.splice(node.parent.children.indexOf(node), 1);
    node.parent = parent;
    const index = anchor ? parent.children.indexOf(anchor) : -1;
    if (index < 0) parent.children.push(node); else parent.children.splice(index, 0, node);
  },
});
const tour = {
  id: "tour-1", tourNo: "TEST-1", status: "active", businessUnit: "website", sourceModule: "manual",
  version: 8, scheduleMode: "manual", pickupAt: "2026-11-01 10:00", dropAt: "2026-11-03 12:00",
  operatorId: "operator-1", adults: 3, children: 0, leaders: 0, language: "中文", shopping: false,
  remark: "保留", guideServices: [],
} as unknown as TourRecord;
let editor: Record<string, unknown>;
let save: () => Promise<void>;
let unmount: () => void;
let saved: ReturnType<typeof vi.fn>;
let visibility: ReturnType<typeof vi.fn>;
async function flush() { await Promise.resolve(); await nextTick(); await Promise.resolve(); await nextTick(); }
function mount() {
  saved = vi.fn();
  visibility = vi.fn();
  const app = renderer.createApp(TourGuideAssignmentDialog, { modelValue: true, tour, onSaved: saved, "onUpdate:modelValue": visibility });
  app.config.globalProperties.$t = (key: string) => key;
  for (const name of ["ElForm", "ElFormItem"])
    app.component(name, { render(this: ComponentPublicInstance) { return h("div", this.$slots.default?.()); } });
  app.component("ElButton", defineComponent({ inheritAttrs: false, setup(_, { attrs }) { return () => { if (attrs.type === "primary") save = attrs.onClick as () => Promise<void>; return null; }; } }));
  app.mount({ children: [] });
  unmount = () => app.unmount();
}
function setRows(rows: Partial<GuideServiceRow>[]) {
  (editor["onUpdate:modelValue"] as (value: Partial<GuideServiceRow>[]) => void)(rows);
}
function service(): Partial<GuideServiceRow> {
  return { key: "new-1", guideId: "guide-1", language: "中文", serviceStartAt: "2026-11-01 10:00", serviceEndAt: "2026-11-03 12:00", remark: "", existing: null, confirmTime: false };
}
beforeEach(() => { vi.resetAllMocks(); mocks.unavailable.mockReturnValue(false); });
afterEach(() => unmount?.());

describe("dedicated guide assignment", () => {
  it("blocks incomplete and unavailable assignments before requesting a save", async () => {
    mount(); setRows([{ ...service(), guideId: "" }]); await flush();
    await save(); await flush();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(editor.showIncomplete).toBe(true);
    setRows([service()]); await flush(); mocks.unavailable.mockReturnValue(true);
    await save();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.warning).toHaveBeenLastCalledWith("tour.guideUnavailable");
  });

  it("submits once while pending, preserves other tour fields and refreshes after success", async () => {
    let finish!: () => void;
    mocks.update.mockReturnValueOnce(new Promise<void>((resolve) => { finish = resolve; }));
    mount(); setRows([service()]); await flush();
    const pending = save(); await save();
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.update).toHaveBeenCalledWith("tour-1", expect.objectContaining({ version: 8, remark: "保留", adults: 3, pickupAt: tour.pickupAt, guideServices: [expect.objectContaining({ guideId: "guide-1" })] }));
    expect(mocks.update.mock.calls[0]![1]).not.toHaveProperty("manualSource");
    expect(saved).not.toHaveBeenCalled();
    finish(); await pending;
    expect(visibility).toHaveBeenCalledWith(false);
    expect(saved).toHaveBeenCalledTimes(1);
  });

  it("keeps the draft and places a server conflict on the matching service row", async () => {
    const error = Object.assign(new Error("排班冲突"), { details: { serviceIndex: 0 } });
    mocks.update.mockRejectedValueOnce(error);
    mount(); setRows([service()]); await flush();
    await save(); await flush();
    expect(visibility).not.toHaveBeenCalled();
    expect(saved).not.toHaveBeenCalled();
    expect(editor.serverErrors).toEqual({ "new-1": "排班冲突" });
    expect((editor.modelValue as GuideServiceRow[])[0]?.guideId).toBe("guide-1");
  });
});
