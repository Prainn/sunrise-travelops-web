/* eslint vue/one-component-per-file: off -- The renderer supplies explicit UI stubs. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRenderer, h, nextTick, ref, type ComponentPublicInstance } from "vue";
import type { TourGuideAvailability } from "@/types/tour";
import { emptyGuideServiceRow, type GuideServiceRow } from "../tour-form";

const mocks = vi.hoisted(() => ({ availableGuides: vi.fn() }));
vi.mock("@/services/tour.service", () => ({ tourService: { availableGuides: mocks.availableGuides } }));
vi.mock("@/utils/version-conflict", () => ({ requestErrorMessage: (error: Error) => error.message }));
const translate = (key: string, params?: Record<string, unknown>) => (params ? `${key}${JSON.stringify(params)}` : key);
vi.mock("vue-i18n", () => ({ useI18n: () => ({ t: translate }) }));
vi.mock("@/components/RemoteSelect/index.vue", () => ({ default: { render: () => null } }));
import GuideServicesEditor from "./GuideServicesEditor.vue";

type HostNode = { type: string; props: Record<string, unknown>; children: HostNode[]; parent?: HostNode; text?: string };
const node = (type: string): HostNode => ({ type, props: {}, children: [] });
const renderer = createRenderer<HostNode, HostNode>({
  createElement: node,
  createText: (text) => ({ ...node("text"), text }),
  createComment: () => node("comment"),
  patchProp: (target, key, _, value) => { target.props[key] = value; },
  setText: (target, text) => { target.text = text; },
  setElementText: (target, text) => { target.text = text; },
  parentNode: (target) => target.parent ?? null,
  nextSibling: (target) => target.parent?.children[target.parent.children.indexOf(target) + 1] ?? null,
  remove(target) { if (target.parent) target.parent.children.splice(target.parent.children.indexOf(target), 1); },
  insert(target, parent, anchor) {
    if (target.parent) target.parent.children.splice(target.parent.children.indexOf(target), 1);
    target.parent = parent;
    const index = anchor ? parent.children.indexOf(anchor) : -1;
    if (index < 0) parent.children.push(target); else parent.children.splice(index, 0, target);
  },
});
function textOf(target: HostNode): string {
  return (target.text ?? "") + target.children.map(textOf).join(" ");
}
function findAll(target: HostNode, type: string): HostNode[] {
  return [...(target.type === type ? [target] : []), ...target.children.flatMap((child) => findAll(child, type))];
}

interface SelectProps { remoteMethod: (value: string) => void; disabled: boolean; placeholder: string }
let root: HostNode;
let editor: InstanceType<typeof GuideServicesEditor>;
let unmount: () => void;
const rows = ref<GuideServiceRow[]>([]);
const selects = () => findAll(root, "select").map((item) => item.props as unknown as SelectProps);
const options = () => findAll(root, "option").map((item) => item.props);

function slot(this: ComponentPublicInstance) { return h("div", this.$slots.default?.()); }
function mount(initial: Partial<GuideServiceRow>[]) {
  rows.value = initial.map((patch) => ({ ...emptyGuideServiceRow(), ...patch }));
  const app = renderer.createApp({
    render: () => h(GuideServicesEditor, {
      ref: (value) => { if (value) editor = value as InstanceType<typeof GuideServicesEditor>; },
      modelValue: rows.value,
      "onUpdate:modelValue": (value: GuideServiceRow[]) => { rows.value = value; },
      businessUnit: "website",
      excludeTourId: "tour-1",
      teamWindow: null,
    }),
  });
  app.config.globalProperties.$t = translate as typeof app.config.globalProperties.$t;
  for (const name of ["ElRow", "ElCol", "ElFormItem", "ElTag"]) app.component(name, { render: slot });
  for (const name of ["ElButton", "ElDatePicker", "ElInput"]) app.component(name, { render: () => null });
  app.component("ElAlert", { props: { title: { type: String, default: "" }, description: { type: String, default: "" } }, render(this: { title: string; description?: string }) { return h("div", [this.title, this.description]); } });
  app.component("ElSelect", {
    props: { remoteMethod: { type: Function, default: () => {} }, disabled: Boolean, placeholder: { type: String, default: "" } },
    render(this: ComponentPublicInstance & SelectProps) {
      return h("select", { remoteMethod: this.remoteMethod, disabled: this.disabled, placeholder: this.placeholder }, this.$slots.default?.());
    },
  });
  app.component("ElOption", {
    props: { value: { type: String, default: "" }, label: { type: String, default: "" }, disabled: Boolean },
    render(this: { value: string; label: string; disabled?: boolean }) {
      return h("option", { value: this.value, label: this.label, disabled: Boolean(this.disabled) });
    },
  });
  root = node("root");
  app.mount(root);
  unmount = () => app.unmount();
}
async function flush() { for (let i = 0; i < 4; i++) { await Promise.resolve(); await nextTick(); } }
async function search(index: number, keyword: string) {
  selects()[index]!.remoteMethod(keyword);
  await nextTick();
  await vi.advanceTimersByTimeAsync(300);
  await flush();
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
function result(patch: Partial<TourGuideAvailability>): TourGuideAvailability {
  return { status: "available", message: "已找到可用导游", matchedCount: 0, list: [], unavailable: [], ...patch };
}
const ready = { language: "英文", serviceStartAt: "2026-11-16 08:00", serviceEndAt: "2026-11-16 19:00" };
const zhang = { id: "guide-1", code: "G001", name: "张三", language: "英文" };
const zhangTwin = { id: "guide-2", code: "G002", name: "张三", language: "法语" };

beforeEach(() => { vi.useFakeTimers(); vi.resetAllMocks(); });
afterEach(() => { unmount?.(); vi.useRealTimers(); });

describe("guide name search", () => {
  it("waits for conditions and a name, then sends siblings and shows every unavailable reason", async () => {
    mount([
      { ...ready, guideId: "", serviceStartAt: "" },
      { ...ready, language: "" },
      { ...ready, guideId: "guide-x", serviceStartAt: "2026-11-17 08:00", serviceEndAt: "2026-11-17 18:00" },
    ]);
    expect(selects()[1]!.disabled).toBe(true);
    expect(selects()[1]!.placeholder).toBe("tour.guideService.fillFirst");
    rows.value[1]!.language = "英文";
    await flush();
    expect(selects()[1]!.disabled).toBe(false);
    expect(selects()[1]!.placeholder).toBe("tour.guideService.searchGuide");
    await search(1, "   ");
    expect(mocks.availableGuides).not.toHaveBeenCalled();

    mocks.availableGuides.mockResolvedValueOnce(result({
      matchedCount: 2,
      list: [zhang],
      unavailable: [{
        ...zhangTwin,
        reasons: [
          { code: "GUIDE_DISABLED", message: "该导游已停用" },
          { code: "LANGUAGE_MISMATCH", message: "", expectedLanguage: "英文", actualLanguage: "法语" },
          { code: "LEAVE_CONFLICT", message: "", leaves: [{ startDate: "2026-11-15", endDate: "2026-11-16" }] },
          { code: "SCHEDULE_CONFLICT", message: "", tours: [{ tourNo: "LX-001", businessUnit: "linxi", serviceStartAt: "2026-11-16 09:00", serviceEndAt: "2026-11-16 12:00" }] },
          { code: "FORM_CONFLICT", message: "", services: [{ otherServiceIndex: 0, serviceStartAt: "2026-11-17 08:00", serviceEndAt: "2026-11-17 18:00" }] },
        ],
      }],
    }));
    await search(1, " 张 ");
    expect(mocks.availableGuides).toHaveBeenCalledTimes(1);
    expect(mocks.availableGuides).toHaveBeenCalledWith({
      keyword: "张", businessUnit: "website", language: "英文",
      serviceStartAt: "2026-11-16 08:00", serviceEndAt: "2026-11-16 19:00", excludeTourId: "tour-1",
      otherServices: [{ guideId: "guide-x", serviceStartAt: "2026-11-17 08:00", serviceEndAt: "2026-11-17 18:00" }],
    });
    // 同名人员按 ID 区分并带编号，仅 list 中的人可选。
    expect(options()).toEqual(expect.arrayContaining([
      { value: "guide-1", label: "张三 (G001) · 英文", disabled: false },
      { value: "guide-2", label: "张三 (G002) · 法语", disabled: true },
    ]));
    const text = textOf(root);
    expect(text).toContain("已找到可用导游");
    expect(text).toContain("tour.guideService.reasons.GUIDE_DISABLED");
    expect(text).toContain('tour.guideService.reasons.LANGUAGE_MISMATCH{"expected":"英文","actual":"法语"}');
    expect(text).toContain("2026-11-15 ~ 2026-11-16");
    expect(text).toContain("LX-001 · 霖熹 · 2026-11-16 09:00 ~ 2026-11-16 12:00");
    // otherServices[0] 是完整表单第 3 段（第 1 段不完整未提交）。
    expect(text).toContain('tour.guideService.segment{"n":3} · 2026-11-17 08:00 ~ 2026-11-17 18:00');
  });

  it("distinguishes not found from a failed request", async () => {
    mount([ready]);
    mocks.availableGuides.mockResolvedValueOnce(result({ status: "not_found", message: "未找到该姓名的导游" }));
    await search(0, "李");
    expect(textOf(root)).toContain("未找到该姓名的导游");
    expect(options()).toEqual([]);

    mocks.availableGuides.mockRejectedValueOnce(new Error("网络异常"));
    await search(0, "李四");
    const text = textOf(root);
    expect(text).toContain("tour.guideService.searchFailed");
    expect(text).toContain("网络异常");
    expect(text).not.toContain("未找到该姓名的导游");
  });

  it("retries a failed query only when that segment searches again", async () => {
    mount([ready, { ...ready, serviceStartAt: "2026-11-17 08:00", serviceEndAt: "2026-11-17 18:00" }]);
    mocks.availableGuides.mockRejectedValueOnce(new Error("网络异常"));
    await search(0, "李四");
    expect(mocks.availableGuides).toHaveBeenCalledTimes(1);

    mocks.availableGuides.mockResolvedValue(result({}));
    await search(1, "王五");
    expect(mocks.availableGuides).toHaveBeenCalledTimes(2);
    expect(mocks.availableGuides).toHaveBeenLastCalledWith(expect.objectContaining({ keyword: "王五" }));
    expect(textOf(root)).toContain("网络异常");

    await search(0, "李四");
    expect(mocks.availableGuides).toHaveBeenCalledTimes(3);
    expect(mocks.availableGuides).toHaveBeenLastCalledWith(expect.objectContaining({ keyword: "李四" }));
    expect(textOf(root)).not.toContain("网络异常");
  });

  it("drops an outdated response and re-queries when the segment changes", async () => {
    mount([ready]);
    const first = deferred<TourGuideAvailability>();
    const second = deferred<TourGuideAvailability>();
    mocks.availableGuides.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    await search(0, "张");
    await search(0, "张三");
    second.resolve(result({ message: "最新结果", list: [zhang] }));
    await flush();
    first.resolve(result({ message: "过期结果", list: [zhangTwin] }));
    await flush();
    expect(textOf(root)).toContain("最新结果");
    expect(textOf(root)).not.toContain("过期结果");
    expect(options().map((item) => item.value)).toEqual(["guide-1"]);

    mocks.availableGuides.mockResolvedValueOnce(result({ message: "改时段后" }));
    rows.value[0]!.serviceEndAt = "2026-11-16 20:00";
    await flush();
    await vi.advanceTimersByTimeAsync(300);
    await flush();
    expect(mocks.availableGuides).toHaveBeenLastCalledWith(expect.objectContaining({ keyword: "张三", serviceEndAt: "2026-11-16 20:00" }));
    expect(textOf(root)).toContain("改时段后");
  });

  it("keeps a selected guide and its name when a new search no longer matches it", async () => {
    mount([ready]);
    mocks.availableGuides.mockResolvedValueOnce(result({ list: [zhang] }));
    await search(0, "张");
    rows.value[0]!.guideId = "guide-1";
    await flush();
    mocks.availableGuides.mockResolvedValueOnce(result({ status: "not_found", message: "未找到该姓名的导游" }));
    await search(0, "王");
    expect(rows.value[0]!.guideId).toBe("guide-1");
    expect(options()).toContainEqual({ value: "guide-1", label: "张三 (G001) · 英文", disabled: false });
    expect(editor.hasUnavailable()).toBe(false);
    expect(textOf(root)).not.toContain("tour.guideUnavailable");

    mocks.availableGuides.mockResolvedValueOnce(result({
      status: "unavailable",
      unavailable: [{ ...zhang, reasons: [{ code: "GUIDE_DISABLED", message: "" }] }],
    }));
    await search(0, "张三");
    expect(editor.hasUnavailable()).toBe(true);
    expect(textOf(root)).toContain("tour.guideUnavailable");
  });
});
