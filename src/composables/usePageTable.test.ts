import { describe, expect, it, vi } from "vitest";

import { usePageTable } from "./usePageTable";

describe("usePageTable", () => {
  it("uses the unified page result and synchronizes server pagination", async () => {
    const fetchPage = vi.fn().mockResolvedValue({
      list: [{ id: "inquiry-1" }],
      total: 25,
      page: 2,
      pageSize: 20,
    });
    const table = usePageTable({
      initialParams: { page: 1, pageSize: 10 },
      request: fetchPage,
    });

    await table.fetchData();

    expect(fetchPage).toHaveBeenCalledWith(table.params);
    expect(table.list.value).toEqual([{ id: "inquiry-1" }]);
    expect(table.total.value).toBe(25);
    expect(table.params.page).toBe(2);
    expect(table.params.pageSize).toBe(20);
    expect(table.loading.value).toBe(false);
  });
});
