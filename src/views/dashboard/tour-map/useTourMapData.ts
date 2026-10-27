import { onScopeDispose, readonly, ref, shallowRef } from "vue";
import type { TourMapData, TourMapQuery } from "@/types/dashboard";

interface TourMapDataOptions {
  fetchMap: (query: TourMapQuery) => Promise<TourMapData>;
}

/**
 * 地图数据只保留最后一次筛选的结果；加载中保留旧数据维持布局，由调用方蒙版阻止交互，失败时清空。
 */
export function useTourMapData(options: TourMapDataOptions) {
  const data = shallowRef<TourMapData>();
  const isLoading = ref(false);
  const loadError = ref("");
  let version = 0;

  async function load(query: TourMapQuery) {
    const current = ++version;
    loadError.value = "";
    isLoading.value = true;
    try {
      const result = await options.fetchMap(query);
      if (current === version) data.value = result;
    } catch (error) {
      if (current === version) {
        data.value = undefined;
        loadError.value = error instanceof Error ? error.message : String(error);
      }
    } finally {
      if (current === version) isLoading.value = false;
    }
  }

  // 卸载后返回的请求不再写入状态。
  onScopeDispose(() => {
    version++;
  });

  return {
    data,
    isLoading: readonly(isLoading),
    loadError: readonly(loadError),
    load,
  };
}
