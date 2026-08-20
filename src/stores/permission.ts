import type { RouteRecordRaw } from "vue-router";
import { constantRoutes } from "@/router";
import { filterRoutesByAccess } from "@/router/access";
import { store } from "./store";
import { useUserStoreHook } from "@/stores/user";

export const usePermissionStore = defineStore("permission", () => {
  const routes = ref<RouteRecordRaw[]>([...constantRoutes]);
  const mixLayoutSideMenus = ref<RouteRecordRaw[]>([]);
  const isRouteGenerated = ref(false);

  /** 根据当前用户权限过滤前端静态路由并生成菜单。 */
  async function generateRoutes(): Promise<RouteRecordRaw[]> {
    const { roles, perms } = useUserStoreHook().userInfo;
    routes.value = filterRoutesByAccess(constantRoutes, { roles, perms });
    isRouteGenerated.value = true;
    return routes.value;
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
