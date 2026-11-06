import { onActivated, onDeactivated } from "vue";
import { useEventListener } from "@vueuse/core";

/**
 * 缓存页面从其他页面切回时重新加载，避免多人协作或跨页修改后显示旧数据。
 *
 * 首次加载仍由页面在 onMounted 中执行：关闭标签栏时页面不进入 keep-alive，onActivated 不会触发。
 * 缓存页面挂载后紧接着的首次激活会被跳过，避免重复请求。
 *
 * @param refresh - 按当前筛选与页码重新加载的函数。
 * @param options - 可选行为，默认只响应应用内页签切回。
 */
export function useRefreshOnActivated(
  refresh: () => unknown,
  options: UseRefreshOnActivatedOptions = {},
) {
  let mounted = false;
  let active = true;
  onActivated(() => {
    if (mounted) void refresh();
    mounted = true;
    active = true;
  });
  onDeactivated(() => {
    active = false;
  });
  const { refreshOnVisible } = options;
  // 仅显式启用的页面监听；失活的缓存页面不请求，组件卸载时自动移除监听。
  if (refreshOnVisible) {
    useEventListener(document, "visibilitychange", () => {
      if (active && document.visibilityState === "visible") void refreshOnVisible();
    });
  }
}

export interface UseRefreshOnActivatedOptions {
  /** 浏览器标签页切回可见时调用；不传则不监听，用于会在其他浏览器标签页修改关联数据的列表。 */
  refreshOnVisible?: () => unknown;
}
