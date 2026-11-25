import { ref, watch } from "vue";
import { useDebounceFn } from "@vueuse/core";
import { operationLogService } from "@/services/operation-log.service";
import type {
  OperationCategory,
  OperationLog,
  OperationLogPageResult,
  OperationLogQueryParams,
  OperationScope,
} from "@/types/operation-log";

export interface UseOperationLogsOptions {
  fetcher?: (params: OperationLogQueryParams) => Promise<OperationLogPageResult>;
  debounceMs?: number;
}

/**
 * 管理操作日志列表筛选与快照分页状态。
 * 首次查询记录响应 snapshotAt，同一查询翻页原样传回；
 * 筛选变化、页大小变化、重置或主动刷新时回到第一页并清空 snapshotAt 重新取得时间上界。
 */
export function useOperationLogs(options: UseOperationLogsOptions = {}) {
  const fetcher = options.fetcher ?? ((params: OperationLogQueryParams) => operationLogService.getPage(params));
  const debounceMs = options.debounceMs ?? 300;

  const scope = ref<OperationScope | "">("");
  const category = ref<OperationCategory | "">("");
  const dateRange = ref<[string, string] | null>(null);
  const actorName = ref("");
  const page = ref(1);
  const pageSize = ref(20);
  const total = ref(0);
  const loading = ref(false);
  const loadError = ref("");
  const list = ref<OperationLog[]>([]);
  const snapshotAt = ref<string | undefined>(undefined);

  let lastPageSize = pageSize.value;
  let requestSeq = 0;

  async function fetchData(fetchOptions: { resetSnapshot?: boolean } = {}) {
    if (fetchOptions.resetSnapshot) {
      snapshotAt.value = undefined;
    }

    const seq = ++requestSeq;
    const requestedSnapshotAt = snapshotAt.value;
    loading.value = true;

    try {
      const result = await fetcher({
        page: page.value,
        pageSize: pageSize.value,
        category: category.value || undefined,
        scope: scope.value || undefined,
        start: dateRange.value?.[0],
        end: dateRange.value?.[1],
        actorName: actorName.value.trim() || undefined,
        snapshotAt: requestedSnapshotAt,
      });

      if (seq !== requestSeq) return;
      list.value = result.list;
      total.value = result.total;
      if (!requestedSnapshotAt && result.snapshotAt) {
        snapshotAt.value = result.snapshotAt;
      }
      loadError.value = "";
    } catch (error) {
      if (seq !== requestSeq) return;
      loadError.value = error instanceof Error ? error.message : String(error);
    } finally {
      if (seq === requestSeq) {
        loading.value = false;
      }
    }
  }

  const requestFreshRows = debounceMs > 0
    ? useDebounceFn(() => void fetchData({ resetSnapshot: true }), debounceMs)
    : () => void fetchData({ resetSnapshot: true });

  watch([category, scope, dateRange, actorName], () => {
    page.value = 1;
    snapshotAt.value = undefined;
    requestFreshRows();
  });

  function handlePagination(query: { page: number; limit: number }) {
    if (query.limit !== lastPageSize) {
      lastPageSize = query.limit;
      page.value = 1;
      pageSize.value = query.limit;
      snapshotAt.value = undefined;
      void fetchData({ resetSnapshot: true });
      return;
    }
    page.value = query.page;
    pageSize.value = query.limit;
    void fetchData();
  }

  function handleRefresh() {
    page.value = 1;
    snapshotAt.value = undefined;
    void fetchData({ resetSnapshot: true });
  }

  function handleRetry() {
    void fetchData();
  }

  function reset() {
    const hadFilter = Boolean(scope.value || category.value || dateRange.value || actorName.value);
    scope.value = "";
    category.value = "";
    dateRange.value = null;
    actorName.value = "";
    page.value = 1;
    snapshotAt.value = undefined;
    if (!hadFilter) {
      void fetchData({ resetSnapshot: true });
    }
  }

  return {
    scope,
    category,
    dateRange,
    actorName,
    page,
    pageSize,
    total,
    loading,
    loadError,
    list,
    snapshotAt,
    fetchData,
    handlePagination,
    handleRefresh,
    handleRetry,
    reset,
  };
}
