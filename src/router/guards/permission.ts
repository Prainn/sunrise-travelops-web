import NProgress from "@/plugins/nprogress";
import router from "@/router";
import { hasRouteChainAccess } from "@/router/access";
import { usePermissionStore } from "@/stores/permission";
import { useUserStore } from "@/stores/user";

/**
 * 路由权限守卫
 *
 * 处理登录验证和静态菜单初始化。
 */
export function setupPermissionGuard() {
  const whiteList = ["/login"];

  router.beforeEach(async (to) => {
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

      // 服务暂不可用时允许展示重试页，避免再次请求用户资料。
      if (to.path === "/unavailable") return;

      const permissionStore = usePermissionStore();
      const userStore = useUserStore();

      if (!userStore.userInfo?.username) {
        await userStore.getUserInfo();
      }

      if (!permissionStore.isRouteGenerated) {
        await permissionStore.generateRoutes();
      }

      const canAccessRoute = hasRouteChainAccess(
        to.matched.map((record) => record.meta),
        userStore.userInfo,
      );
      if (!canAccessRoute) {
        return { path: "/401", replace: true };
      }

      // 动态标题
      const title = (to.params.title as string) || (to.query.title as string);
      if (title) {
        to.meta.title = title;
      }
    } catch (error) {
      console.error("Route guard error:", error);
      NProgress.done();
      if (!useUserStore().isLoggedIn()) return "/login";
      return { path: "/unavailable", query: { redirect: to.fullPath }, replace: true };
    }
  });

  router.afterEach(() => {
    NProgress.done();
  });
}
