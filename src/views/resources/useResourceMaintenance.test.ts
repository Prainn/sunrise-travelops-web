import { beforeEach, describe, expect, it, vi } from "vitest";

const { confirm, success } = vi.hoisted(() => ({
  confirm: vi.fn(() => Promise.resolve()),
  success: vi.fn(),
}));

vi.mock("element-plus", () => ({
  ElMessage: { success },
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
    const maintenance = useResourceMaintenance<TestResource>({
      records,
      idPrefix: "resource",
      codePrefix: "TST",
      createEmpty,
      cloneForEdit: (record) => ({ ...record, children: [...record.children] }),
      createRecord: (record, id) => ({ ...record, id, children: [] }),
      updateRecord: (current, record) => Object.assign(current, record, { children: current.children }),
    });

    maintenance.openCreateDialog();
    expect(maintenance.record.value.code).toBe("TST-002");
    maintenance.saveRecord({ ...maintenance.record.value, name: "新增记录", children: ["discarded"] });
    expect(records[1].name).toBe("新增记录");
    expect(records[1].children).toEqual([]);

    maintenance.openEditDialog(records[0]);
    maintenance.record.value.children.push("form-only");
    expect(records[0].children).toEqual(["child-1"]);
    maintenance.saveRecord({ ...maintenance.record.value, name: "已更新" });
    expect(records[0]).toMatchObject({ name: "已更新", children: ["child-1"] });

    maintenance.toggleStatus(records[0]);
    expect(records[0].status).toBe("disabled");

    await maintenance.deleteRecord(records[0]);
    expect(confirm).toHaveBeenCalledOnce();
    expect(records.map((record) => record.name)).toEqual(["新增记录"]);
  });
});
