import { onActivated } from "vue";

/**
 * 缓存页面从其他页面切回时重新加载，避免多人协作或跨页修改后显示旧数据。
 *
 * 首次加载仍由页面在 onMounted 中执行：关闭标签栏时页面不进入 keep-alive，onActivated 不会触发。
 * 缓存页面挂载后紧接着的首次激活会被跳过，避免重复请求。
 *
 * @param refresh - 按当前筛选与页码重新加载的函数。
 */
export function useRefreshOnActivated(refresh: () => unknown) {
  let mounted = false;
  onActivated(() => {
    if (mounted) void refresh();
    mounted = true;
  });
}
