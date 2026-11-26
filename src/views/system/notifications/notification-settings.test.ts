/* eslint vue/one-component-per-file: off -- The custom renderer provides explicit UI stubs for page tests. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRenderer, h, nextTick, type ComponentPublicInstance } from "vue";
import { ApiError } from "@/api/request";
import zhCn from "@/lang/package/zh-cn.json";
import en from "@/lang/package/en.json";
import type { NotificationSetting } from "@/types/notification";

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  update: vi.fn(),
  hasPerm: vi.fn(),
  messageSuccess: vi.fn(),
  messageWarning: vi.fn(),
  messageError: vi.fn(),
  tableRows: [] as NotificationSetting[],
}));

vi.mock("@/services/notification.service", () => ({
  notificationService: { list: mocks.list, update: mocks.update },
}));
vi.mock("@/utils/auth", () => ({
  hasPerm: (perm: string) => mocks.hasPerm(perm),
}));
vi.mock("@/composables", () => ({
  useRefreshOnActivated: () => {},
}));
vi.mock("@/components/PageShell/index.vue", () => ({
  default: {
    render(this: ComponentPublicInstance) {
      return h("div", this.$slots.default?.());
    },
  },
}));
vi.mock("@/components/SectionCard/index.vue", () => ({
  default: {
    render(this: ComponentPublicInstance) {
      return h("div", this.$slots.default?.());
    },
  },
}));
vi.mock("@/components/TableToolbar/index.vue", () => ({
  default: { render: () => h("toolbar") },
}));
vi.mock("@/components/DataTable/index.vue", () => ({
  default: {
    props: { data: { type: Array, default: () => [] } },
    render(this: ComponentPublicInstance & { data: NotificationSetting[] }) {
      mocks.tableRows = this.data;
      return h("table", this.$slots.default?.());
    },
  },
}));
vi.mock("@/components/AppDialog/index.vue", () => ({
  default: {
    props: { modelValue: Boolean, title: { type: String, default: "" }, busy: Boolean },
    emits: ["update:modelValue", "closed"],
    render(this: ComponentPublicInstance & { modelValue: boolean; title: string; busy: boolean }) {
      if (!this.modelValue) return null;
      return h("dialog", { title: this.title, busy: this.busy }, [
        ...(this.$slots.default?.() ?? []),
        ...(this.$slots.footer?.() ?? []),
      ]);
    },
  },
}));
vi.mock("element-plus", () => ({
  ElMessage: {
    success: (...args: unknown[]) => mocks.messageSuccess(...args),
    warning: (...args: unknown[]) => mocks.messageWarning(...args),
    error: (...args: unknown[]) => mocks.messageError(...args),
  },
}));
vi.mock("@/lang/utils", () => ({ translate: (key: string) => key, translateIfExists: () => undefined }));

function resolveMessage(bundle: Record<string, unknown>, key: string, params?: Record<string, unknown>): string {
  const value = key.split(".").reduce<unknown>(
    (current, segment) => (current && typeof current === "object" ? (current as Record<string, unknown>)[segment] : undefined),
    bundle,
  );
  if (typeof value !== "string") return key;
  return value.replace(/\{(\w+)\}/g, (_, name: string) => String(params?.[name] ?? ""));
}

const zhT = (key: string, params?: Record<string, unknown>) => resolveMessage(zhCn as Record<string, unknown>, key, params);
const enT = (key: string, params?: Record<string, unknown>) => resolveMessage(en as Record<string, unknown>, key, params);

vi.mock("vue-i18n", () => ({ useI18n: () => ({ t: zhT }) }));

import {
  formatSendWindow,
  useNotificationSettings,
  validateSendWindow,
} from "./useNotificationSettings";
import NotificationManagement from "./index.vue";

function setting(patch: Partial<NotificationSetting> = {}): NotificationSetting {
  return {
    type: "whatsapp_message",
    name: "WhatsApp新消息",
    enabled: true,
    sendWindow: null,
    version: 1,
    updatedAt: "2026-11-11T07:00:00.000Z",
    ...patch,
  };
}

async function loaded(rows?: NotificationSetting[]) {
  mocks.list.mockResolvedValueOnce(
    rows ?? [setting(), setting({ type: "inquiry_follow_up", name: "询盘跟进提醒" })],
  );
  const state = useNotificationSettings();
  await state.fetchSettings();
  return state;
}

type HostNode = {
  type: string;
  props: Record<string, unknown>;
  children: HostNode[];
  parent?: HostNode;
  text?: string;
};

const createHostNode = (type: string): HostNode => ({ type, props: {}, children: [] });

const renderer = createRenderer<HostNode, HostNode>({
  createElement: createHostNode,
  createText: (text) => ({ ...createHostNode("text"), text }),
  createComment: () => createHostNode("comment"),
  patchProp: (target, key, _, value) => { target.props[key] = value; },
  setText: (target, text) => { target.text = text; },
  setElementText: (target, text) => { target.text = text; },
  parentNode: (target) => target.parent ?? null,
  nextSibling: (target) => target.parent?.children[target.parent.children.indexOf(target) + 1] ?? null,
  remove(target) {
    if (target.parent) target.parent.children.splice(target.parent.children.indexOf(target), 1);
  },
  insert(target, parent, anchor) {
    if (target.parent) target.parent.children.splice(target.parent.children.indexOf(target), 1);
    target.parent = parent;
    const index = anchor ? parent.children.indexOf(anchor) : -1;
    if (index < 0) parent.children.push(target);
    else parent.children.splice(index, 0, target);
  },
});

function textOf(target: HostNode): string {
  return [target.text ?? "", ...target.children.map(textOf)].filter(Boolean).join(" ");
}

function findAll(target: HostNode, type: string): HostNode[] {
  return [
    ...(target.type === type ? [target] : []),
    ...target.children.flatMap((child) => findAll(child, type)),
  ];
}

async function flush() {
  for (let i = 0; i < 4; i++) {
    await Promise.resolve();
    await nextTick();
  }
}

let unmountPage: (() => void) | null = null;

async function mountPage(rows: NotificationSetting[], canUpdate = true) {
  mocks.hasPerm.mockReturnValue(canUpdate);
  mocks.list.mockResolvedValueOnce(rows);
  mocks.tableRows = [];

  const app = renderer.createApp({ render: () => h(NotificationManagement) });
  app.config.globalProperties.$t = zhT as typeof app.config.globalProperties.$t;

  const passthrough = {
    render(this: ComponentPublicInstance) {
      return h("div", this.$slots.default?.());
    },
  };
  app.component("ElAlert", {
    props: { title: { type: String, default: "" } },
    render(this: { title: string }) {
      return h("alert", { title: this.title }, this.title);
    },
  });
  app.component("ElTableColumn", {
    props: { label: { type: String, default: "" } },
    render(this: ComponentPublicInstance & { label: string }) {
      return h(
        "column",
        { label: this.label },
        mocks.tableRows.map((row) => h("cell", { rowType: row.type }, this.$slots.default?.({ row }))),
      );
    },
  });
  app.component("ElSwitch", {
    props: {
      modelValue: Boolean,
      loading: Boolean,
      disabled: Boolean,
      ariaLabel: { type: String, default: "" },
    },
    emits: ["update:modelValue"],
    render(this: ComponentPublicInstance & { modelValue: boolean; loading: boolean; disabled: boolean; ariaLabel: string }) {
      return h("switch", {
        modelValue: this.modelValue,
        loading: this.loading,
        disabled: this.disabled,
        ariaLabel: this.ariaLabel,
        onToggle: (next: boolean) => this.$emit("update:modelValue", next),
      });
    },
  });
  app.component("ElButton", {
    props: { disabled: Boolean, loading: Boolean, ariaLabel: { type: String, default: "" }, type: { type: String, default: "" } },
    emits: ["click"],
    render(this: ComponentPublicInstance & { disabled: boolean; loading: boolean; ariaLabel: string; type: string }) {
      return h(
        "button",
        {
          disabled: this.disabled,
          loading: this.loading,
          ariaLabel: this.ariaLabel,
          type: this.type,
          onClick: () => { if (!this.disabled) this.$emit("click"); },
        },
        this.$slots.default?.(),
      );
    },
  });
  app.component("ElForm", passthrough);
  app.component("ElFormItem", {
    props: { label: { type: String, default: "" }, error: { type: String, default: "" } },
    render(this: ComponentPublicInstance & { label: string; error?: string }) {
      return h("form-item", { label: this.label, error: this.error }, [
        ...(this.$slots.default?.() ?? []),
        ...(this.error ? [h("form-error", this.error)] : []),
      ]);
    },
  });
  app.component("ElRadioGroup", {
    props: { modelValue: { type: String, default: "" } },
    emits: ["update:modelValue", "change"],
    render(this: ComponentPublicInstance & { modelValue: string }) {
      return h(
        "radio-group",
        {
          modelValue: this.modelValue,
          onSelect: (next: string) => {
            this.$emit("update:modelValue", next);
            this.$emit("change", next);
          },
        },
        this.$slots.default?.(),
      );
    },
  });
  app.component("ElRadio", {
    props: { value: { type: String, default: "" } },
    render(this: ComponentPublicInstance & { value: string }) {
      return h("radio", { value: this.value }, this.$slots.default?.());
    },
  });
  app.component("ElTimePicker", {
    props: { modelValue: { type: String, default: "" }, placeholder: { type: String, default: "" } },
    emits: ["update:modelValue"],
    render(this: ComponentPublicInstance & { modelValue: string; placeholder: string }) {
      return h("time-picker", {
        modelValue: this.modelValue,
        placeholder: this.placeholder,
        onChange: (next: string | null) => this.$emit("update:modelValue", next),
      });
    },
  });

  const root = createHostNode("root");
  app.mount(root);
  unmountPage = () => app.unmount();
  await flush();
  return root;
}

describe("sendWindow helpers", () => {
  it("formats all-day, same-day, and overnight windows in zh-CN and English", () => {
    expect(formatSendWindow(null, zhT)).toBe("全天");
    expect(formatSendWindow(null, enT)).toBe("All day");
    expect(formatSendWindow({ start: "09:00", end: "18:00" }, zhT)).toBe("09:00–18:00");
    expect(formatSendWindow({ start: "21:00", end: "08:00" }, zhT)).toBe("21:00–次日 08:00");
    expect(formatSendWindow({ start: "21:00", end: "08:00" }, enT)).toBe("21:00–next day 08:00");
  });

  it("validates incomplete, invalid, same, and valid HH:mm windows", () => {
    expect(validateSendWindow({ start: "", end: "18:00" })).toBe("incomplete");
    expect(validateSendWindow({ start: "09:00", end: "" })).toBe("incomplete");
    expect(validateSendWindow({ start: null, end: null })).toBe("incomplete");
    expect(validateSendWindow({ start: "24:00", end: "08:00" })).toBe("invalid");
    expect(validateSendWindow({ start: "9:00", end: "18:00" })).toBe("invalid");
    expect(validateSendWindow({ start: "09:00", end: "09:00" })).toBe("same");
    expect(validateSendWindow({ start: "09:00", end: "18:00" })).toBeNull();
    expect(validateSendWindow({ start: "21:00", end: "08:00" })).toBeNull();
  });
});

describe("useNotificationSettings", () => {
  beforeEach(() => vi.resetAllMocks());

  it("omits sendWindow when toggling enabled so the existing window is preserved", async () => {
    const window = { start: "09:00", end: "18:00" };
    const state = await loaded([setting({ enabled: true, sendWindow: window, version: 3 })]);
    mocks.update.mockResolvedValueOnce(setting({ enabled: false, sendWindow: window, version: 4 }));

    await expect(state.saveEnabled("whatsapp_message", false)).resolves.toMatchObject({ kind: "saved" });
    expect(mocks.update).toHaveBeenCalledWith("whatsapp_message", { enabled: false, version: 3 });
    expect("sendWindow" in mocks.update.mock.calls[0]![1]).toBe(false);
    expect(state.settings.value[0]).toMatchObject({ enabled: false, sendWindow: window, version: 4 });
    expect(state.isSaving("whatsapp_message")).toBe(false);
  });

  it("saves a custom window with current enabled and version, including when disabled", async () => {
    const state = await loaded([setting({ enabled: false, sendWindow: null, version: 3 })]);
    mocks.update.mockResolvedValueOnce(
      setting({ enabled: false, sendWindow: { start: "21:00", end: "08:00" }, version: 4 }),
    );

    await expect(
      state.saveSendWindow("whatsapp_message", { start: "21:00", end: "08:00" }),
    ).resolves.toMatchObject({ kind: "saved" });

    expect(mocks.update).toHaveBeenCalledWith("whatsapp_message", {
      enabled: false,
      version: 3,
      sendWindow: { start: "21:00", end: "08:00" },
    });
    expect(state.settings.value[0]).toMatchObject({
      enabled: false,
      sendWindow: { start: "21:00", end: "08:00" },
      version: 4,
    });
  });

  it("submits explicit null when clearing a send window back to all-day", async () => {
    const state = await loaded([
      setting({ enabled: true, sendWindow: { start: "09:00", end: "18:00" }, version: 3 }),
    ]);
    mocks.update.mockResolvedValueOnce(setting({ enabled: true, sendWindow: null, version: 4 }));

    await expect(state.saveSendWindow("whatsapp_message", null)).resolves.toMatchObject({ kind: "saved" });
    expect(mocks.update).toHaveBeenCalledWith("whatsapp_message", {
      enabled: true,
      version: 3,
      sendWindow: null,
    });
    expect(state.settings.value[0]).toMatchObject({ sendWindow: null, version: 4 });
  });

  it("rejects incomplete, invalid, or equal send windows without calling the API", async () => {
    const state = await loaded();

    await expect(state.saveSendWindow("whatsapp_message", { start: "09:00", end: "" })).resolves.toMatchObject({
      kind: "validation",
      reason: "incomplete",
    });
    await expect(state.saveSendWindow("whatsapp_message", { start: "09:00", end: "09:00" })).resolves.toMatchObject({
      kind: "validation",
      reason: "same",
    });
    await expect(state.saveSendWindow("whatsapp_message", { start: "25:00", end: "08:00" })).resolves.toMatchObject({
      kind: "validation",
      reason: "invalid",
    });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("prevents duplicate submits for the same row while saving", async () => {
    const state = await loaded();
    let resolve!: (value: NotificationSetting) => void;
    mocks.update.mockReturnValueOnce(new Promise((done) => (resolve = done)));
    const first = state.saveEnabled("whatsapp_message", false);
    expect(state.isSaving("whatsapp_message")).toBe(true);
    await expect(state.saveEnabled("whatsapp_message", false)).resolves.toEqual({ kind: "skipped" });
    await expect(state.saveSendWindow("whatsapp_message", { start: "09:00", end: "18:00" })).resolves.toEqual({
      kind: "skipped",
    });
    resolve(setting({ enabled: false, version: 2 }));
    await first;
    expect(mocks.update).toHaveBeenCalledTimes(1);
  });

  it("reloads latest settings on 409 without retrying PUT and returns validation/failed for 400 and 403", async () => {
    const state = await loaded([setting({ enabled: true, sendWindow: null, version: 1 })]);
    const freshRow = setting({ enabled: true, sendWindow: { start: "09:00", end: "18:00" }, version: 2 });
    mocks.update.mockRejectedValueOnce(new ApiError("conflict", { code: "CONFLICT", status: 409 }));
    mocks.list.mockResolvedValueOnce([freshRow]);

    await expect(
      state.saveSendWindow("whatsapp_message", { start: "10:00", end: "19:00" }),
    ).resolves.toMatchObject({ kind: "conflict" });
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.list).toHaveBeenCalledTimes(2);
    expect(state.settings.value[0]).toEqual(freshRow);

    mocks.update.mockRejectedValueOnce(new ApiError("起止时间不能相同", { code: "VALIDATION_ERROR", status: 400 }));
    await expect(
      state.saveSendWindow("whatsapp_message", { start: "10:00", end: "19:00" }),
    ).resolves.toMatchObject({ kind: "validation", message: "起止时间不能相同" });

    mocks.update.mockRejectedValueOnce(new ApiError("forbidden", { code: "AUTH_FORBIDDEN", status: 403 }));
    await expect(state.saveEnabled("whatsapp_message", false)).resolves.toMatchObject({
      kind: "failed",
      status: 403,
    });
    expect(state.settings.value[0]).toEqual(freshRow);
  });

  it("reports load failure instead of an empty success list", async () => {
    mocks.list.mockRejectedValueOnce(new Error("network"));
    const state = useNotificationSettings();
    await state.fetchSettings();
    expect(state.loadError.value).toBe("network");
    expect(state.settings.value).toEqual([]);
  });
});

describe("NotificationManagement page", () => {
  beforeEach(() => vi.resetAllMocks());
  afterEach(() => {
    unmountPage?.();
    unmountPage = null;
  });

  it("renders the sendWindow column between type and switch with all-day, same-day, and overnight text", async () => {
    const root = await mountPage([
      setting({ type: "whatsapp_unassigned", sendWindow: null }),
      setting({ type: "whatsapp_message", sendWindow: { start: "09:00", end: "18:00" } }),
      setting({ type: "inquiry_follow_up", sendWindow: { start: "21:00", end: "08:00" } }),
    ]);

    const columns = findAll(root, "column");
    expect(columns.map((col) => col.props.label)).toEqual([
      "通知类型",
      "通知时段（北京时间）",
      "飞书通知",
      "更新时间",
    ]);

    const windowCells = findAll(columns[1]!, "cell");
    expect(textOf(windowCells[0]!)).toContain("全天");
    expect(textOf(windowCells[1]!)).toContain("09:00–18:00");
    expect(textOf(windowCells[2]!)).toContain("21:00–次日 08:00");
  });

  it("hides window editing and disables toggles in read-only mode", async () => {
    const root = await mountPage([
      setting({ type: "whatsapp_message", sendWindow: { start: "09:00", end: "18:00" } }),
    ], false);

    const windowCol = findAll(root, "column")[1]!;
    expect(textOf(windowCol)).toContain("09:00–18:00");
    expect(findAll(windowCol, "button")).toHaveLength(0);
    expect(findAll(root, "switch")[0]!.props.disabled).toBe(true);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("saves custom window only on explicit save, validates incomplete input, and clears to null", async () => {
    const root = await mountPage([
      setting({ type: "whatsapp_message", enabled: true, sendWindow: null, version: 1 }),
    ]);

    const editButton = findAll(findAll(root, "column")[1]!, "button")[0]!;
    (editButton.props.onClick as () => void)();
    await flush();

    // Switch to custom mode and try saving incomplete range.
    const radioGroup = findAll(root, "radio-group")[0]!;
    (radioGroup.props.onSelect as (value: string) => void)("custom");
    await flush();

    const pickers = findAll(root, "time-picker");
    (pickers[0]!.props.onChange as (value: string | null) => void)("09:00");
    await flush();
    expect(mocks.update).not.toHaveBeenCalled();

    const saveButton = findAll(findAll(root, "dialog")[0]!, "button").find((btn) => btn.props.type === "primary")!;
    (saveButton.props.onClick as () => void)();
    await flush();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(textOf(findAll(root, "form-error")[0]!)).toBe("请同时填写开始和结束时间");

    // Fill end time and save.
    mocks.update.mockResolvedValueOnce(
      setting({ type: "whatsapp_message", enabled: true, sendWindow: { start: "09:00", end: "18:00" }, version: 2 }),
    );
    (pickers[1]!.props.onChange as (value: string | null) => void)("18:00");
    await flush();
    (saveButton.props.onClick as () => void)();
    await flush();

    expect(mocks.update).toHaveBeenCalledWith("whatsapp_message", {
      enabled: true,
      version: 1,
      sendWindow: { start: "09:00", end: "18:00" },
    });
    expect(mocks.messageSuccess).toHaveBeenCalledWith("已保存");
    expect(findAll(root, "dialog")).toHaveLength(0);
    expect(textOf(findAll(root, "column")[1]!)).toContain("09:00–18:00");

    // Re-open and restore all-day -> submits explicit null.
    mocks.update.mockResolvedValueOnce(
      setting({ type: "whatsapp_message", enabled: true, sendWindow: null, version: 3 }),
    );
    (findAll(findAll(root, "column")[1]!, "button")[0]!.props.onClick as () => void)();
    await flush();
    (findAll(root, "radio-group")[0]!.props.onSelect as (value: string) => void)("allDay");
    await flush();
    const saveAllDay = findAll(findAll(root, "dialog")[0]!, "button").find((btn) => btn.props.type === "primary")!;
    (saveAllDay.props.onClick as () => void)();
    await flush();

    expect(mocks.update).toHaveBeenLastCalledWith("whatsapp_message", {
      enabled: true,
      version: 2,
      sendWindow: null,
    });
    expect(textOf(findAll(root, "column")[1]!)).toContain("全天");
  });

  it("shows conflict warning, closes dialog, and displays refreshed server data on 409", async () => {
    const root = await mountPage([
      setting({ type: "whatsapp_message", enabled: true, sendWindow: null, version: 1 }),
    ]);

    mocks.update.mockRejectedValueOnce(new ApiError("conflict", { code: "CONFLICT", status: 409 }));
    mocks.list.mockResolvedValueOnce([
      setting({ type: "whatsapp_message", enabled: true, sendWindow: { start: "21:00", end: "08:00" }, version: 5 }),
    ]);

    (findAll(findAll(root, "column")[1]!, "button")[0]!.props.onClick as () => void)();
    await flush();
    (findAll(root, "radio-group")[0]!.props.onSelect as (value: string) => void)("custom");
    await flush();
    const pickers = findAll(root, "time-picker");
    (pickers[0]!.props.onChange as (value: string | null) => void)("09:00");
    (pickers[1]!.props.onChange as (value: string | null) => void)("18:00");
    await flush();
    const saveButton = findAll(findAll(root, "dialog")[0]!, "button").find((btn) => btn.props.type === "primary")!;
    (saveButton.props.onClick as () => void)();
    await flush();

    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.messageSuccess).not.toHaveBeenCalled();
    expect(mocks.messageWarning).toHaveBeenCalledWith("设置已被他人修改，请刷新后再操作");
    expect(findAll(root, "dialog")).toHaveLength(0);
    expect(textOf(findAll(root, "column")[1]!)).toContain("21:00–次日 08:00");
  });
});
