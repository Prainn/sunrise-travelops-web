import { computed, ref, shallowRef } from "vue";
import { ApiError } from "@/api/request";
import { websiteErrorMessage } from "@/services/website.service";
import type { PageResult } from "@/types/common";

const PAGE_SIZE = 20;
const MAX_REFRESH_PAGE_SIZE = 100;

/** 两个收件箱共用的批量加载与当前列表刷新。 */
export function useInboxList<T extends { id: string }>(
  getPageReader: () => (page: number, pageSize: number) => Promise<PageResult<T>>,
  onAccessError?: () => void,
) {
  const items = shallowRef<T[]>([]);
  const total = ref(0);
  const loadedPages = ref(1);
  const busy = ref(false);
  const loadingMore = ref(false);
  const error = ref("");
  const loadMoreError = ref("");
  const loading = computed(() => busy.value && !items.value.length);
  const hasMore = computed(() => loadedPages.value * PAGE_SIZE < total.value);
  let generation = 0;
  let request: { append: boolean; done: Promise<void> } | undefined;

  function clearResults() {
    items.value = [];
    total.value = 0;
    loadedPages.value = 1;
    loadMoreError.value = "";
  }

  function reset() {
    generation++;
    request = undefined;
    busy.value = false;
    loadingMore.value = false;
    error.value = "";
    clearResults();
  }

  function read(append: boolean, background = false) {
    const current = generation;
    const fetchPage = getPageReader();
    busy.value = true;
    loadingMore.value = append;
    if (append) loadMoreError.value = "";

    async function fetchList() {
      try {
        if (append) {
          const result = await fetchPage(loadedPages.value + 1, PAGE_SIZE);
          if (current !== generation) return;
          items.value = [...new Map([...items.value, ...result.list].map((item) => [item.id, item])).values()];
          total.value = result.total;
          loadedPages.value++;
        } else {
          // 合并刷新已加载范围，避免为每 20 条重复查询总数。
          const limit = loadedPages.value * PAGE_SIZE;
          const pageSize = Math.min(limit, MAX_REFRESH_PAGE_SIZE);
          const rows = new Map<string, T>();
          let count = 0;
          for (let page = 1; (page - 1) * pageSize < limit; page++) {
            const result = await fetchPage(page, pageSize);
            if (current !== generation) return;
            result.list.forEach((item) => rows.set(item.id, item));
            count = result.total;
            if (page * pageSize >= count) break;
          }
          items.value = [...rows.values()].slice(0, limit);
          total.value = count;
          loadedPages.value = Math.max(1, Math.ceil(Math.min(count, limit) / PAGE_SIZE));
          error.value = "";
        }
      } catch (cause) {
        if (current !== generation) return;
        const accessRejected = cause instanceof ApiError && [401, 403, 404].includes(cause.status ?? 0);
        if (accessRejected) {
          clearResults();
          onAccessError?.();
        }
        if (append) {
          const message = websiteErrorMessage(cause);
          if (accessRejected) error.value = message;
          else loadMoreError.value = message;
          return;
        }
        if (!background || !items.value.length || accessRejected) error.value = websiteErrorMessage(cause);
        throw cause;
      }
    }

    const done = fetchList().finally(() => {
      if (current !== generation) return;
      request = undefined;
      busy.value = false;
      loadingMore.value = false;
    });
    request = { append, done };
    return done;
  }

  function refresh(background = false): Promise<void> {
    if (!request) return read(false, background);
    if (background && !request.append) return request.done;
    const current = generation;
    return request.done.catch(() => undefined).then(() => {
      if (current === generation) return request?.done ?? read(false, background);
    });
  }

  function loadMore() {
    if (!request && hasMore.value) return read(true);
  }

  return { items, total, busy, loading, loadingMore, error, loadMoreError, hasMore, refresh, loadMore, reset };
}
