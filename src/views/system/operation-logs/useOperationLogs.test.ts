import { nextTick } from "vue";
import { describe, expect, it, vi } from "vitest";
import type { OperationLogPageResult, OperationLogQueryParams } from "@/types/operation-log";

vi.mock("@/services/operation-log.service", () => ({
  operationLogService: { getPage: vi.fn() },
}));

import { useOperationLogs } from "./useOperationLogs";

function makePage(snapshotAt: string, total = 45): OperationLogPageResult {
  return {
    list: [],
    total,
    page: 1,
    pageSize: 20,
    snapshotAt,
  };
}

describe("useOperationLogs snapshot pagination", () => {
  it("saves snapshotAt on first fetch and reuses it across page turns", async () => {
    const fetcher = vi.fn<(params: OperationLogQueryParams) => Promise<OperationLogPageResult>>()
      .mockResolvedValueOnce(makePage("2026-11-25T10:00:00.000Z"))
      .mockResolvedValueOnce(makePage("2026-11-25T10:00:05.000Z"));

    const state = useOperationLogs({ fetcher, debounceMs: 0 });
    await state.fetchData({ resetSnapshot: true });

    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ page: 1, pageSize: 20, snapshotAt: undefined }),
    );
    expect(state.snapshotAt.value).toBe("2026-11-25T10:00:00.000Z");

    state.handlePagination({ page: 2, limit: 20 });
    await Promise.resolve();

    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ page: 2, pageSize: 20, snapshotAt: "2026-11-25T10:00:00.000Z" }),
    );
    expect(state.snapshotAt.value).toBe("2026-11-25T10:00:00.000Z");
  });

  it("resets to page 1 and refreshes snapshotAt on filter change, pageSize change, and manual refresh", async () => {
    const fetcher = vi.fn<(params: OperationLogQueryParams) => Promise<OperationLogPageResult>>()
      .mockResolvedValueOnce(makePage("2026-11-25T10:00:00.000Z"))
      .mockResolvedValueOnce(makePage("2026-11-25T10:01:00.000Z"))
      .mockResolvedValueOnce(makePage("2026-11-25T10:02:00.000Z"))
      .mockResolvedValueOnce(makePage("2026-11-25T10:03:00.000Z"));

    const state = useOperationLogs({ fetcher, debounceMs: 0 });
    await state.fetchData({ resetSnapshot: true });
    state.page.value = 3;

    // Filter change
    state.scope.value = "website";
    await nextTick();
    await Promise.resolve();

    expect(state.page.value).toBe(1);
    expect(fetcher).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1, scope: "website", snapshotAt: undefined }),
    );
    expect(state.snapshotAt.value).toBe("2026-11-25T10:01:00.000Z");

    // Page size change
    state.page.value = 2;
    state.handlePagination({ page: 2, limit: 50 });
    await Promise.resolve();

    expect(state.page.value).toBe(1);
    expect(state.pageSize.value).toBe(50);
    expect(fetcher).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1, pageSize: 50, snapshotAt: undefined }),
    );
    expect(state.snapshotAt.value).toBe("2026-11-25T10:02:00.000Z");

    // Manual refresh
    state.page.value = 2;
    state.handleRefresh();
    await Promise.resolve();

    expect(state.page.value).toBe(1);
    expect(fetcher).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1, pageSize: 50, snapshotAt: undefined }),
    );
    expect(state.snapshotAt.value).toBe("2026-11-25T10:03:00.000Z");
  });
});
