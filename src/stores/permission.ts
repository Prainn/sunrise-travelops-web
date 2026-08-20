import type { RouteRecordRaw } from "vue-router";
import { constantRoutes } from "@/router";
import { store } from "@/stores";
import { useUserStoreHook } from "@/stores/user";

export const usePermissionStore = defineStore("permission", () => {
  const routes = ref<RouteRecordRaw[]>([...constantRoutes]);
  const mixLayoutSideMenus = ref<RouteRecordRaw[]>([]);
  const isRouteGenerated = ref(false);

  /** 使用前端静态路由生成菜单。 */
  async function generateRoutes(): Promise<RouteRecordRaw[]> {
    routes.value = [...constantRoutes];
    isRouteGenerated.value = true;
    return [];
  }

  const setMixLayoutSideMenus = (parentPath: string) => {
    const parentMenu = routes.value.find((item) => item.path === parentPath);
    mixLayoutSideMenus.value = parentMenu?.children || [];
  };

  const resetRouter = () => {
    routes.value = [...constantRoutes];
    mixLayoutSideMenus.value = [];
    isRouteGenerated.value = false;
  };

  async function reloadRoutes(): Promise<RouteRecordRaw[]> {
    resetRouter();
    return generateRoutes();
  }

  async function refreshPermissions(): Promise<void> {
    await useUserStoreHook().getUserInfo();
    await reloadRoutes();
  }

  return {
    routes,
    mixLayoutSideMenus,
    isRouteGenerated,
    generateRoutes,
    setMixLayoutSideMenus,
    resetRouter,
    reloadRoutes,
    refreshPermissions,
  };
});

export function usePermissionStoreHook() {
  return usePermissionStore(store);
}
