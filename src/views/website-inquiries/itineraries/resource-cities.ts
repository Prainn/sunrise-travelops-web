import { ref } from "vue";
import { isApiError } from "@/api/request";
import { websiteErrorMessage, websiteService, type WebsiteResourceKind } from "@/services/website.service";
import type { ResourceLookup, WebsiteTransferContext } from "./day-order";

/**
 * 跨天校验用的公共资源城市读取：只按明确关联的公共资源 ID 读取详情，不搜索名称、不遍历分页。
 *
 * 按 kind+id 缓存并合并并发请求；读取状态在计算属性中同步返回，完成后通过版本号触发重新校验。
 * 404 单独标记为缺失；其他失败保留错误并可重试，不当作手填或校验通过。停用资源照常返回城市。
 * 切换行程或配置时调用 reset，不沿用旧的城市对应关系。
 */
export function useResourceCityLookup(): Omit<WebsiteTransferContext, "config"> & { reset: () => void } {
  const version = ref(0);
  let entries = new Map<string, ResourceLookup<string | null>>();

  function lookup(kind: WebsiteResourceKind, id: string, pick: (detail: { name: string; city?: string | null }) => string | null | undefined) {
    void version.value;
    const key = `${kind}:${id}`;
    const existing = entries.get(key);
    if (existing) return existing;
    const owner = entries;
    const loading: ResourceLookup<string | null> = { status: "loading" };
    owner.set(key, loading);
    websiteService
      .resource(kind, id)
      .then((detail): ResourceLookup<string | null> => ({ status: "ready", value: pick(detail)?.trim() || null }))
      .catch((cause): ResourceLookup<string | null> =>
        isApiError(cause) && cause.status === 404
          ? { status: "missing" }
          : {
            status: "error",
            message: websiteErrorMessage(cause),
            retry: () => {
              if (owner.get(key)?.status !== "error") return;
              owner.delete(key);
              version.value++;
            },
          },
      )
      .then((result) => {
        // reset 后迟到的响应不写入新缓存。
        if (owner.get(key) !== loading) return;
        owner.set(key, result);
        version.value++;
      });
    return loading;
  }

  return {
    publicCityName: (resourceId) => lookup("city", resourceId, (detail) => detail.name),
    restaurantCity: (resourceId) => lookup("restaurant", resourceId, (detail) => detail.city),
    reset: () => {
      entries = new Map();
      version.value++;
    },
  };
}
