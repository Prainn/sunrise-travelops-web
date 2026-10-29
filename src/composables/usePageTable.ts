import { reactive, ref, type Ref } from "vue";

import type { BaseQueryParams, PageResult } from "@/types/common";

/**
 * 分页列表页通用状态管理
 *
 * 只管理请求、分页数据和查询参数，不处理勾选、弹窗、表单
 */
export function usePageTable<T, Q extends BaseQueryParams = BaseQueryParams>(
  options: UsePageTableOptions<T, Q>,
): UsePageTableReturn<T, Q> {
  const { initialParams, request, onBeforeReset } = options;

  const loading = ref(false);
  const list = ref<T[]>([]) as Ref<T[]>;
  const total = ref(0);
  const error = ref("");
  const params = reactive({ ...initialParams }) as Q;
  let requestVersion = 0;

  /**
   * 拉取当前查询参数对应的分页数据
   *
   * 只负责请求和回填，不处理弹窗、路由或消息提示；失败写入 error 交给表格展示，不再抛出
   */
  async function fetchData(): Promise<void> {
    const version = ++requestVersion;
    loading.value = true;
    try {
      const data = await request(params);
      // 丢弃被后发请求取代的旧响应，避免覆盖最新查询结果
      if (version !== requestVersion) return;
      list.value = data.list;
      total.value = data.total;
      params.page = data.page;
      params.pageSize = data.pageSize;
      error.value = "";
    } catch (cause) {
      if (version === requestVersion) {
        error.value = cause instanceof Error ? cause.message : String(cause);
      }
    } finally {
      if (version === requestVersion) loading.value = false;
    }
  }

  /**
   * 回到第一页并查询
   */
  function handleQuery(): Promise<void> {
    params.page = 1;
    return fetchData();
  }

  /**
   * 恢复初始查询参数
   *
   * 保持响应式引用不变，不触发查询
   */
  function resetParams(): void {
    Object.assign(params, initialParams);
  }

  /**
   * 恢复初始查询参数并重新查询
   */
  function handleResetQuery(): Promise<void> {
    onBeforeReset?.();
    resetParams();
    return fetchData();
  }

  return {
    loading,
    list,
    total,
    error,
    params,
    fetchData,
    handleQuery,
    handleResetQuery,
    resetParams,
  };
}

export interface UsePageTableOptions<T, Q extends BaseQueryParams> {
  /** 初始查询参数，同时作为重置基准 */
  initialParams: Q;
  /**
   * 分页请求函数
   */
  request: (params: Q) => Promise<PageResult<T>>;
  /**
   * 重置查询前的回调
   *
   * 常用于同步重置搜索表单字段
   */
  onBeforeReset?: () => void;
}

export interface UsePageTableReturn<T, Q extends BaseQueryParams> {
  /** 加载状态 */
  loading: Ref<boolean>;
  /** 当前页数据列表 */
  list: Ref<T[]>;
  /** 数据总条数 */
  total: Ref<number>;
  /** 最近一次加载失败的信息，成功后清空 */
  error: Ref<string>;
  /** 当前查询参数 */
  params: Q;
  /**
   * 拉取分页数据；失败只写入 error，不会 reject
   */
  fetchData: () => Promise<void>;
  /**
   * 回到第一页并查询
   */
  handleQuery: () => Promise<void>;
  /**
   * 恢复初始参数并重新查询
   */
  handleResetQuery: () => Promise<void>;
  /**
   * 恢复初始参数但不触发查询
   */
  resetParams: () => void;
}
