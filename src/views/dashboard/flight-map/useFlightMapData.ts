import { onScopeDispose, readonly, ref, shallowRef } from "vue";
import { ApiErrorCode } from "@/api/error-code";
import { ApiError } from "@/api/request";
import type { FlightMapData, FlightMapQuery } from "@/types/dashboard";

interface FlightMapDataOptions {
  fetchMap: (query: FlightMapQuery) => Promise<FlightMapData>;
}

/**
 * 航班地图只保留最后一次筛选的结果；过期响应丢弃，加载中保留旧数据由调用方蒙版阻止交互。
 */
export function useFlightMapData(options: FlightMapDataOptions) {
  const data = shallowRef<FlightMapData>();
  const isLoading = ref(false);
  const loadError = ref("");
  /** 403 AUTH_FORBIDDEN 单独呈现无权限状态，不提供重试 */
  const isForbidden = ref(false);
  let version = 0;

  async function load(query: FlightMapQuery) {
    const current = ++version;
    loadError.value = "";
    isForbidden.value = false;
    isLoading.value = true;
    try {
      const result = await options.fetchMap(query);
      if (current === version) data.value = result;
    } catch (error) {
      if (current === version) {
        data.value = undefined;
        isForbidden.value = error instanceof ApiError && error.code === ApiErrorCode.AUTH_FORBIDDEN;
        loadError.value = error instanceof Error ? error.message : String(error);
      }
    } finally {
      if (current === version) isLoading.value = false;
    }
  }

  onScopeDispose(() => {
    version++;
  });

  return {
    data,
    isLoading: readonly(isLoading),
    loadError: readonly(loadError),
    isForbidden: readonly(isForbidden),
    load,
  };
}
