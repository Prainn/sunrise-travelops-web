import { beforeEach, describe, expect, it, vi } from "vitest";

const { confirm, success, error } = vi.hoisted(() => ({
  confirm: vi.fn(() => Promise.resolve()),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/services/resource.service", () => ({ resourceService: { getTotal: () => 123 } }));

vi.mock("element-plus", () => ({
  ElMessage: { success, error },
  ElMessageBox: { confirm },
}));
vi.mock("vue-i18n", () => ({ useI18n: () => ({ t: (key: string) => key }) }));

import { useResourceMaintenance } from "./useResourceMaintenance";

interface TestResource {
  id: string;
  code: string;
  name: string;
  status: "enabled" | "disabled";
  children: string[];
}

function createEmpty(): TestResource {
  return { id: "", code: "", name: "", status: "enabled", children: [] };
}

beforeEach(() => {
  confirm.mockClear();
  success.mockClear();
});

describe("resource maintenance", () => {
  it("shares create, edit, status, and delete flow while preserving custom hooks", async () => {
    const records: TestResource[] = [
      { id: "resource-1", code: "TST-001", name: "原记录", status: "enabled", children: ["child-1"] },
    ];
    const api = {
      getPage: vi.fn(),
      getDetail: vi.fn(async (id: string) => ({ ...records.find((item) => item.id === id)! })),
      create: vi.fn(async (record: TestResource) => ({ ...record, id: "resource-2" })),
      update: vi.fn(async (_id: string, record: TestResource) => ({ ...record })),
      deleteByIds: vi.fn(async () => undefined),
    };
    const loadRecords = vi.fn(async () => records);
    const maintenance = useResourceMaintenance<TestResource>({
      paginated: false,
      records,
      api,
      loadRecords,

      createEmpty,
      cloneForEdit: (record) => ({ ...record, children: [...record.children] }),
      createRecord: (record, id) => ({ ...record, id, children: [] }),
      updateRecord: (current, record) => Object.assign(current, record, { children: current.children }),
    });

    await maintenance.loadRecords({ keyword: "筛选" });

    maintenance.openCreateDialog();
    expect(maintenance.record.value.code).toBe("");
    await maintenance.saveRecord({ ...maintenance.record.value, name: "新增记录", children: ["discarded"] });
    expect(records[1].name).toBe("新增记录");
    expect(records[1].children).toEqual([]);

    maintenance.openCreateDialog();
    expect(maintenance.record.value.code).toBe("");

    await maintenance.openEditDialog(records[0]);
    maintenance.record.value.children.push("form-only");
    expect(records[0].children).toEqual(["child-1"]);
    await maintenance.saveRecord({ ...maintenance.record.value, name: "已更新" });
    expect(records[0]).toMatchObject({ name: "已更新", children: ["child-1"] });

    await maintenance.toggleStatus(records[0]);
    expect(records[0].status).toBe("disabled");

    await maintenance.deleteRecord(records[0]);
    expect(confirm).toHaveBeenCalledOnce();
    expect(records.map((record) => record.name)).toEqual(["新增记录"]);
    expect(loadRecords).toHaveBeenLastCalledWith({ keyword: "筛选" });
  });
  it("updates the selected record even when a pending search removes it from the list", async () => {
    const original: TestResource = { id: "resource-1", code: "TST-001", name: "Original", status: "enabled", children: [] };
    const records = [original];
    const api = {
      getPage: vi.fn(), getDetail: vi.fn(async () => ({ ...original })),
      create: vi.fn(), update: vi.fn(async (_id: string, data: TestResource) => data), deleteByIds: vi.fn(),
    };
    const maintenance = useResourceMaintenance({ records, api, loadRecords: async () => records, createEmpty });
    await maintenance.openEditDialog(original);
    records.splice(0);
    await maintenance.saveRecord({ ...maintenance.record.value, name: "Updated" });
    expect(api.update).toHaveBeenCalledWith(original.id, expect.objectContaining({ name: "Updated" }));
    expect(api.create).not.toHaveBeenCalled();
  });

  it("defaults to API pages of twenty and isolates table rows from full catalogue loads", async () => {
    const records: TestResource[] = [{ ...createEmpty(), id: "resource-1", code: "TST-001" }];
    const loadRecords = vi.fn(async () => records);
    const api = { getPage: vi.fn(), getDetail: vi.fn(), create: vi.fn(), update: vi.fn(), deleteByIds: vi.fn() };
    const maintenance = useResourceMaintenance({ records, api, loadRecords, createEmpty });
    await maintenance.loadRecords();
    expect(loadRecords).toHaveBeenLastCalledWith({ page: 1, pageSize: 20 });
    expect(maintenance.total.value).toBe(123);
    records.push({ ...createEmpty(), id: "catalogue-only" });
    expect(maintenance.rows).toHaveLength(1);
    await maintenance.loadRecords({ page: 2, pageSize: 20, keyword: "search" });
    await maintenance.loadRecords();
    expect(loadRecords).toHaveBeenLastCalledWith({ page: 2, pageSize: 20, keyword: "search" });
  });

});
