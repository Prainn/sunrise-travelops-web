/* eslint vue/one-component-per-file: off -- The renderer supplies explicit UI stubs. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRenderer, createSSRApp, defineComponent, h, nextTick, type ComponentPublicInstance } from "vue";
import { renderToString } from "vue/server-renderer";
import type * as ElementPlus from "element-plus";
import type { DirectLedgerItem } from "@/types/direct-ledger";
import type { LedgerTourDraft } from "@/views/tours/tour-form";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
  perms: ["ledger:direct:create", "tour:create"] as string[],
}));
vi.mock("@/services/direct-ledger.service", () => ({ directLedgerService: {
  create: mocks.create,
  update: mocks.update,
  collectors: vi.fn(),
  operators: vi.fn(),
  receivingGroups: vi.fn(),
} }));
vi.mock("element-plus", () => ({
  ElMessage: { error: mocks.error, success: mocks.success },
  ElMessageBox: { confirm: vi.fn() },
}));
vi.mock("vue-i18n", () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock("@/constants/identity", () => ({ businessUnitName: (unit: string) => unit }));
vi.mock("@/stores/user", () => ({ useUserStore: () => ({ userInfo: {
  scope: "linxi", roles: ["COORDINATOR"], userId: "collector-1", nickname: "收客", perms: mocks.perms,
} }) }));
vi.mock("@/utils/permission", () => ({
  hasUserPermission: (_user: unknown, permission: string) => mocks.perms.includes(permission),
}));
vi.mock("@/components/AppDialog/index.vue", () => ({ default: { render(this: ComponentPublicInstance) {
  return [this.$slots.default?.(), this.$slots.footer?.()];
} } }));
vi.mock("@/components/RemoteSelect/index.vue", () => ({ default: { render: () => null } }));
vi.mock("@/components/BusinessItemSelect/index.vue", () => ({ default: { render: () => null } }));
vi.mock("@/views/tours/components/TourEditorDialog.vue", () => ({ default: {
  inheritAttrs: false,
  render(this: ComponentPublicInstance) { tourDialog = this.$attrs; return null; },
} }));
import DirectLedgerDialog from "./DirectLedgerDialog.vue";

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

const ledger = {
  id: "ledger-1", businessUnit: "linxi", orderNo: "DL-1", receivedDate: "2026-10-19", source: "携程123",
  creatorId: "collector-1", creatorName: "收客", receivingGroupId: "group-1", receivingAccountName: "定制师组",
  operatorId: "operator-1", operatorName: "操作", countryItemId: null, orderStatus: "unconverted",
  effectiveContact: false, proposalSent: false, loss: false, priority: false, itinerary: "", notConvertedReason: "",
  lossNote: "", remark: "", feedbackReason: "", solution: "", dealDate: null, departureDate: null, complaint: null,
  satisfied: null, workflowStatus: "pending_operation", reviewedAt: null, reviewedBy: null, operated: false,
  operatedAt: null, version: 4, tours: [],
  capabilities: { canEdit: true, canDelete: true, canReview: false, canOperate: false, canConvert: true },
} as unknown as DirectLedgerItem;

const tourInput = { countryItemId: "country-1", days: 3 } as never;
let radios: Array<Record<string, unknown>>;
let radioOptions: Array<Record<string, unknown>>;
let form: { model: Record<string, unknown> };
let save: () => Promise<void>;
let primaryText: string;
let tourDialog: Record<string, unknown> | undefined;
let saved: ReturnType<typeof vi.fn>;
let visibility: ReturnType<typeof vi.fn>;
let unmount: () => void;

async function flush() { for (let i = 0; i < 4; i++) { await Promise.resolve(); await nextTick(); } }
function mount(current: DirectLedgerItem | null, extra: Record<string, unknown> = {}) {
  radios = [];
  radioOptions = [];
  saved = vi.fn();
  visibility = vi.fn();
  const app = renderer.createApp(DirectLedgerDialog, {
    modelValue: true, ledger: current, businessUnit: "linxi", readonly: false,
    onSaved: saved, "onUpdate:modelValue": visibility, ...extra,
  });
  app.config.globalProperties.$t = (key: string) => key;
  const passthrough = defineComponent({ render(this: ComponentPublicInstance) { return this.$slots.default?.(); } });
  for (const name of ["ElRow", "ElCol", "ElFormItem"]) app.component(name, passthrough);
  app.component("ElRadio", defineComponent({
    inheritAttrs: false,
    setup(_, { attrs, slots }) { return () => { radioOptions.push(attrs); return slots.default?.(); }; },
  }));
  for (const name of ["ElInput", "ElDatePicker", "ElAlert"]) app.component(name, { render: () => null });
  app.component("ElForm", defineComponent({
    props: { model: { type: Object, required: true } },
    setup(props, { slots, expose }) {
      expose({ validate: () => Promise.resolve(true) });
      return () => { form = props as never; return slots.default?.(); };
    },
  }));
  app.component("ElRadioGroup", defineComponent({
    inheritAttrs: false,
    setup(_, { attrs, slots }) { return () => { radios.push(attrs); return slots.default?.(); }; },
  }));
  app.component("ElButton", defineComponent({
    inheritAttrs: false,
    setup(_, { attrs, slots }) {
      return () => {
        if (attrs.type === "primary") {
          save = attrs.onClick as () => Promise<void>;
          primaryText = String(slots.default?.()[0]?.children ?? "");
        }
        return null;
      };
    },
  }));
  app.mount({ children: [] });
  unmount = () => app.unmount();
}
function draft() { return tourDialog?.["ledger-draft"] as LedgerTourDraft; }
async function renderOrderStatus() {
  const { ElRadio, ElRadioGroup } = await vi.importActual<typeof ElementPlus>("element-plus");
  const group = radios.find((attrs) => typeof attrs.modelValue === "string" && ["unconverted", "converted"].includes(attrs.modelValue));
  const app = createSSRApp({ render: () => h(ElRadioGroup, group, {
    default: () => ["unconverted", "converted"].map((value) => h(ElRadio, radioOptions.find((attrs) => attrs.value === value))),
  }) });
  return (await renderToString(app)).match(/<input\b[^>]*type="radio"[^>]*>/g) ?? [];
}
function fill(status: "unconverted" | "converted") {
  Object.assign(form.model, {
    receivedDate: "2026-11-01", source: "携程123", receivingGroupId: "group-1", operatorId: "operator-1", orderStatus: status,
  });
}

describe("DirectLedgerDialog order status", () => {
  beforeEach(() => { vi.clearAllMocks(); tourDialog = undefined; mocks.perms = ["ledger:direct:create", "tour:create"]; });
  afterEach(() => unmount());

  it.each(["unconverted", "converted"] as const)("keeps %s with an associated tour read-only on edit save", async (orderStatus) => {
    const current = { ...ledger, orderStatus, tours: [{ id: "tour-1", status: "active" }] } as DirectLedgerItem;
    mocks.update.mockResolvedValue(current);
    mount(current);
    await flush();
    expect(radios.find((attrs) => attrs.modelValue === orderStatus)?.disabled).toBe(true);
    const inputs = await renderOrderStatus();
    expect(inputs).toHaveLength(2);
    for (const input of inputs) expect(input).toMatch(/\sdisabled(?:[\s=>])/);
    await save();
    expect(mocks.update).toHaveBeenCalledWith(current.id, expect.objectContaining({ orderStatus, version: 4 }));
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("allows an unlinked converted ledger to be corrected without tour creation permission", async () => {
    mocks.perms = ["ledger:direct:update"];
    const current = { ...ledger, orderStatus: "converted" as const };
    mocks.update.mockResolvedValue({ ...current, orderStatus: "unconverted", version: 5 });
    mount(current);
    await flush();
    const inputs = await renderOrderStatus();
    expect(inputs).toHaveLength(2);
    for (const input of inputs) expect(input).not.toMatch(/\sdisabled(?:[\s=>])/);
    form.model.orderStatus = "unconverted";
    await save();
    expect(mocks.update).toHaveBeenCalledWith(current.id, expect.objectContaining({ orderStatus: "unconverted", version: 4 }));
    expect(mocks.create).not.toHaveBeenCalled();
    expect(tourDialog).toBeUndefined();
  });

  it.each([
    { orderStatus: "unconverted" as const },
    { tours: [{ id: "cancelled-tour", status: "cancelled" }] },
    { reviewedAt: "2026-11-01T00:00:00Z" },
    { operatedAt: "2026-11-01T00:00:00Z" },
    { capabilities: { ...ledger.capabilities, canEdit: false } },
  ])("keeps status locked for an ineligible existing ledger: %j", async (state) => {
    mount({ ...ledger, orderStatus: "converted", ...state } as DirectLedgerItem);
    await flush();
    const inputs = await renderOrderStatus();
    expect(inputs).toHaveLength(2);
    for (const input of inputs) expect(input).toMatch(/\sdisabled(?:[\s=>])/);
  });

  it("allows choosing order status when creating and starts without a country", async () => {
    mount(null);
    await flush();
    expect(radios.find((attrs) => attrs.modelValue === "unconverted")?.disabled).toBe(false);
    const inputs = await renderOrderStatus();
    expect(inputs).toHaveLength(2);
    for (const input of inputs) expect(input).not.toMatch(/\sdisabled(?:[\s=>])/);
    expect(form.model.countryItemId).toBe("");
  });

  it("saves an unconverted ledger through the plain create request", async () => {
    mocks.create.mockResolvedValue(ledger);
    mount(null);
    await flush();
    fill("unconverted");
    await save();
    await flush();
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(mocks.create.mock.calls[0]?.[0]).toMatchObject({ orderStatus: "unconverted", countryItemId: null });
    expect(mocks.create.mock.calls[0]?.[0]).not.toHaveProperty("tour");
    expect(tourDialog).toBeUndefined();
  });

  it("opens tour details without saving, and uses only the atomic request", async () => {
    const result = { ...ledger, orderStatus: "converted" };
    mocks.create.mockResolvedValue(result);
    mount(null);
    await flush();
    fill("converted");
    await nextTick();
    expect(primaryText).toBe("ledger.direct.fillTourData");
    await save();
    await flush();
    expect(tourDialog?.modelValue).toBe(true);
    expect(mocks.create).not.toHaveBeenCalled();
    expect(saved).not.toHaveBeenCalled();
    expect(draft()).toMatchObject({ mode: "convert", collectCoordinatorId: "collector-1", operatorId: "operator-1", contactName: "" });

    await draft().submit(tourInput);
    expect(mocks.create).toHaveBeenCalledTimes(1);
    const body = mocks.create.mock.calls[0]?.[0];
    expect(body.orderStatus).toBe("converted");
    expect(body.countryItemId).toBe("country-1");
    expect(body.tour).toBe(tourInput);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(saved).toHaveBeenCalledWith(result);
    expect(visibility).toHaveBeenCalledWith(false);
  });

  it("keeps the dialog and draft open when the atomic request fails", async () => {
    mocks.create.mockRejectedValue(new Error("VALIDATION_ERROR"));
    mount(null);
    await flush();
    fill("converted");
    await save();
    await flush();
    await expect(draft().submit(tourInput)).rejects.toThrow("VALIDATION_ERROR");
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(saved).not.toHaveBeenCalled();
    expect(visibility).not.toHaveBeenCalled();
    expect(form.model.source).toBe("携程123");
  });

  it("links a website inquiry only on create and never on edit", async () => {
    const inquiry = { id: "inquiry-1", code: "WI-1", ownerId: "collector-1", owner: "收客" };
    mocks.create.mockResolvedValue(ledger);
    mount(null, { businessUnit: "website", linkedInquiry: inquiry });
    await flush();
    expect(form.model.creatorId).toBe("collector-1");
    fill("unconverted");
    await save();
    await flush();
    expect(mocks.create.mock.calls[0]?.[0]).toMatchObject({ websiteInquiryId: "inquiry-1", businessUnit: "website" });
    unmount();

    const current = { ...ledger, businessUnit: "website", websiteInquiryId: "inquiry-1" } as DirectLedgerItem;
    mocks.update.mockResolvedValue(current);
    mount(current, { businessUnit: "website", linkedInquiry: inquiry });
    await flush();
    await save();
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.update.mock.calls[0]?.[1]).not.toHaveProperty("websiteInquiryId");
  });

  it("does not attach an inquiry to a plain create", async () => {
    mocks.create.mockResolvedValue(ledger);
    mount(null);
    await flush();
    fill("unconverted");
    await save();
    await flush();
    expect(mocks.create.mock.calls[0]?.[0]).not.toHaveProperty("websiteInquiryId");
  });
});
