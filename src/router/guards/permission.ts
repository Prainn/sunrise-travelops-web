import NProgress from "@/plugins/nprogress";
import router from "@/router";
import { hasRouteAccess } from "@/router/access";
import { usePermissionStore, useUserStore } from "@/stores";

/**
 * 路由权限守卫
 *
 * 处理登录验证、静态菜单初始化、404 检测等
 */
export function setupPermissionGuard() {
  const whiteList = ["/login"];

  router.beforeEach(async (to, _from) => {
    NProgress.start();

    try {
      const isLoggedIn = useUserStore().isLoggedIn();

      // 未登录处理
      if (!isLoggedIn) {
        if (whiteList.includes(to.path)) {
          return;
        }
        NProgress.done();
        return `/login?redirect=${encodeURIComponent(to.fullPath)}`;
      }

      // 已登录访问登录页，重定向到首页
      if (to.path === "/login") {
        return { path: "/" };
      }

      const permissionStore = usePermissionStore();
      const userStore = useUserStore();

      if (!userStore.userInfo?.roles?.length) {
        await userStore.getUserInfo();
      }

      if (!permissionStore.isRouteGenerated) {
        await permissionStore.generateRoutes();
      }

      const canAccessRoute = to.matched.every((record) =>
        hasRouteAccess(record.meta, userStore.userInfo)
      );
      if (!canAccessRoute) {
        return { path: "/401", replace: true };
      }

      // 路由 404 检查
      if (to.matched.length === 0) {
        // 从登录页跳转且目标路径无效，回退首页（避免不同用户权限不同导致的 404）
        if (_from.path === "/login") {
          return { path: "/", replace: true };
        }
        return "/404";
      }

      // 动态标题
      const title = (to.params.title as string) || (to.query.title as string);
      if (title) {
        to.meta.title = title;
      }
    } catch (error) {
      console.error("Route guard error:", error);
      await useUserStore().resetAllState();
      NProgress.done();
      return "/login";
    }
  });

  router.afterEach(() => {
    NProgress.done();
  });
}
