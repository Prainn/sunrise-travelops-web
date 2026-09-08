import { computed, onScopeDispose, ref, shallowRef } from "vue";
const REMOTE_PAGE_SIZE = 20;

export interface RemoteOptionsQuery { keyword: string; page: number; pageSize: number }
export interface RemoteOptionsPage<T> { list: T[]; total: number }

export function useRemoteOptions<T extends { id: string }>(
  fetchOptions: (query: RemoteOptionsQuery) => Promise<RemoteOptionsPage<T>>,
  onError: () => void,
) {
  const items = shallowRef<T[]>([]);
  const loading = ref(false);
  const keyword = ref("");
  const total = ref(0);
  const page = ref(0);
  const failed = ref(false);
  const hasMore = computed(() => !failed.value && page.value > 0 && items.value.length < total.value);
  let version = 0;

  function reset(value = "") {
    ++version;
    keyword.value = value.trim();
    items.value = []; total.value = 0; page.value = 0;
    loading.value = false; failed.value = false;
  }
  async function loadMore() {
    if (loading.value || failed.value || (page.value > 0 && !hasMore.value)) return;
    const current = version;
    const nextPage = page.value + 1;
    loading.value = true;
    try {
      const result = await fetchOptions({ keyword: keyword.value, page: nextPage, pageSize: REMOTE_PAGE_SIZE });
      if (current !== version) return;
      items.value = [...new Map([...items.value, ...result.list].map(item => [item.id, item])).values()];
      total.value = result.list.length ? result.total : items.value.length;
      page.value = nextPage;
    } catch {
      if (current === version) { failed.value = true; onError(); }
    } finally { if (current === version) loading.value = false; }
  }
  async function search(value: string) {
    const normalized = value.trim();
    if (normalized === keyword.value && (loading.value || (page.value > 0 && !failed.value))) return;
    reset(normalized);
    await loadMore();
  }
  onScopeDispose(() => { ++version; });
  return { items, loading, hasMore, search, loadMore, reset };
}
