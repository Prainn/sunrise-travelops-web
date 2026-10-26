/* eslint vue/one-component-per-file: off -- This renderer test supplies multiple component stubs. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRenderer, defineComponent, h, nextTick, type Component, type ComponentPublicInstance } from "vue";
import type { WebsiteConfigEditorProps, WebsiteConfigPage, WebsiteCity } from "@/types/website";

const mocks = vi.hoisted(() => ({
  list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(),
  success: vi.fn(), error: vi.fn(), confirm: vi.fn(),
  editor: undefined as (WebsiteConfigEditorProps & { rows: WebsiteCity[] }) | undefined,
}));
const editorComponent = vi.hoisted(() => ({
  props: ["rows", "version", "businessUnit", "references", "editable", "saving", "saveRecord", "deleteRecord"],
  render(this: { $props: WebsiteConfigEditorProps & { rows: WebsiteCity[] } }) { mocks.editor = this.$props; return null; },
}));
vi.mock("./components/WebsiteConfigCities.vue", () => ({ default: editorComponent }));
vi.mock("./components/WebsiteConfigHotels.vue", () => ({ default: editorComponent }));
vi.mock("./components/WebsiteConfigAttractions.vue", () => ({ default: editorComponent }));
vi.mock("./components/WebsiteConfigRoutes.vue", () => ({ default: editorComponent }));
vi.mock("./components/WebsiteConfigPatterns.vue", () => ({ default: editorComponent }));
vi.mock("./components/WebsiteConfigSkeletons.vue", () => ({ default: editorComponent }));
vi.mock("./components/WebsiteConfigTemplates.vue", () => ({ default: editorComponent }));
vi.mock("@/services/website.service", () => ({
  websiteService: { configRecords: mocks.list, createConfigRecord: mocks.create, updateConfigRecord: mocks.update, deleteConfigRecord: mocks.remove },
  websiteErrorMessage: (error: Error) => error.message,
}));
vi.mock("@/stores/user", () => ({ useUserStore: () => ({ userInfo: { scope: "website" } }) }));
vi.mock("@/utils/permission", () => ({ hasUserPermission: () => true }));
vi.mock("vue-router", () => ({ onBeforeRouteLeave: vi.fn() }));
vi.mock("vue-i18n", () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock("element-plus", () => ({ ElMessage: { success: mocks.success, error: mocks.error }, ElMessageBox: { confirm: mocks.confirm } }));
vi.mock("@/components/PageShell/index.vue", () => ({ default: { render(this: ComponentPublicInstance) { return this.$slots.default?.(); } } }));
vi.mock("@/components/SectionCard/index.vue", () => ({ default: { render(this: ComponentPublicInstance) { return this.$slots.default?.(); } } }));
vi.mock("@/components/TableToolbar/index.vue", () => ({ default: { render(this: ComponentPublicInstance) { return this.$slots.default?.(); } } }));
vi.mock("@/components/FilterBar/index.vue", () => ({ default: { render(this: ComponentPublicInstance) { return this.$slots.default?.(); } } }));
vi.mock("@/components/FeedbackState/index.vue", () => ({ default: { render: () => null } }));
vi.mock("@/components/Pagination/index.vue", () => ({ default: { name: "TestPagination", render: () => null } }));
import WebsiteResources from "./index.vue";

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
let tabs: Record<string, unknown>;
let pagination: Record<string, unknown>;
let unmount: (() => void) | undefined;
const city: WebsiteCity = { id: "city-1", nameZh: "城市", nameEn: "City", resourceId: null, status: "enabled" };
const data = (version = 7, page = 1, total = 21): WebsiteConfigPage => ({
  list: [city], total, page, pageSize: 20, version, references: {},
});
async function flush() { await Promise.resolve(); await nextTick(); await Promise.resolve(); await nextTick(); }
function mount() {
  const app = renderer.createApp(WebsiteResources as Component);
  app.config.globalProperties.$t = (key: string) => key;
  app.directive("loading", {});
  app.component("ElTabs", defineComponent({ inheritAttrs: false, setup(_, { attrs, slots }) { return () => { tabs = attrs; return h("div", slots.default?.()); }; } }));
  app.component("ElTabPane", { render: () => null });
  // The Pagination stub keeps model/event attributes available to the test.
  app.mixin({ beforeUpdate() { if (this.$options.name === "TestPagination") pagination = this.$attrs; }, mounted() { if (this.$options.name === "TestPagination") pagination = this.$attrs; } });
  app.mount({ children: [] });
  unmount = () => app.unmount();
}
function changeTab(value: string) { (tabs["onUpdate:modelValue"] as (value: string) => void)(value); }
function changePage(value: number) {
  (pagination["onUpdate:page"] as (value: number) => void)(value);
  (pagination.onPagination as () => void)();
}
beforeEach(() => { vi.resetAllMocks(); mocks.list.mockResolvedValue(data()); mocks.confirm.mockResolvedValue(undefined); });
afterEach(() => { unmount?.(); unmount = undefined; });

describe("website resource loading and writes", () => {
  it("loads only the active tab and ignores a slower previous tab response", async () => {
    let resolveCities!: (result: WebsiteConfigPage) => void;
    mocks.list.mockReturnValueOnce(new Promise<WebsiteConfigPage>((resolve) => { resolveCities = resolve; }));
    mount();
    expect(mocks.list).toHaveBeenCalledExactlyOnceWith("cities", { businessUnit: "website", page: 1, pageSize: 20 });
    changeTab("hotels");
    await flush();
    expect(mocks.list).toHaveBeenLastCalledWith("hotels", { businessUnit: "website", page: 1, pageSize: 20 });
    expect(mocks.editor?.version).toBe(7);
    resolveCities(data(2));
    await flush();
    expect(mocks.editor?.version).toBe(7);
    expect(mocks.list).toHaveBeenCalledTimes(2);
  });

  it("posts one record and keeps the loaded version and rows after a conflict", async () => {
    mount(); await flush();
    mocks.create.mockRejectedValueOnce(new Error("配置已更新"));
    const editor = mocks.editor!;
    expect(await editor.saveRecord(city, true)).toBe(false);
    expect(mocks.create).toHaveBeenCalledExactlyOnceWith("cities", 7, city, "website");
    expect(mocks.list).toHaveBeenCalledTimes(1);
    expect(editor.version).toBe(7);
    expect(editor.rows).toEqual([city]);
    expect(mocks.error).toHaveBeenCalledWith("配置已更新");
    mocks.update.mockResolvedValue({ version: 8 });
    mocks.list.mockResolvedValue(data(8));
    expect(await editor.saveRecord({ ...city, nameZh: "修改后" }, false)).toBe(true);
    await flush();
    expect(mocks.update).toHaveBeenCalledExactlyOnceWith("cities", 7, { ...city, nameZh: "修改后" }, "website");
    expect(mocks.editor?.version).toBe(8);
  });

  it("keeps the latest page when page requests finish out of order", async () => {
    mount(); await flush();
    let resolveSecondPage!: (result: WebsiteConfigPage) => void;
    mocks.list.mockReturnValueOnce(new Promise<WebsiteConfigPage>((resolve) => { resolveSecondPage = resolve; }));
    changePage(2);
    mocks.list.mockResolvedValueOnce(data(9, 3, 60));
    changePage(3); await flush();
    expect(mocks.list).toHaveBeenLastCalledWith("cities", { businessUnit: "website", page: 3, pageSize: 20 });
    expect(mocks.editor?.version).toBe(9);
    resolveSecondPage(data(8, 2, 60)); await flush();
    expect(mocks.editor?.version).toBe(9);
  });

  it("does not write on cancelled deletion and returns to the valid page after deleting the final row", async () => {
    mount(); await flush();
    mocks.confirm.mockRejectedValueOnce("cancel");
    expect(await mocks.editor!.deleteRecord(city.id)).toBe(false);
    expect(mocks.remove).not.toHaveBeenCalled();
    mocks.list.mockResolvedValueOnce(data(7, 2));
    changePage(2); await flush();
    mocks.remove.mockResolvedValue({ version: 8 });
    mocks.list.mockResolvedValueOnce({ ...data(8, 2, 20), list: [] }).mockResolvedValueOnce(data(8, 1, 20));
    expect(await mocks.editor!.deleteRecord(city.id)).toBe(true);
    await flush();
    expect(mocks.remove).toHaveBeenCalledExactlyOnceWith("cities", city.id, 7, "website");
    expect(mocks.list).toHaveBeenLastCalledWith("cities", { businessUnit: "website", page: 1, pageSize: 20 });
    expect(mocks.editor?.version).toBe(8);
  });
});
