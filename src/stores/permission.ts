import type { RouteRecordRaw } from "vue-router";
import { constantRoutes } from "@/router";
import { filterRoutesByAccess } from "@/router/access";
import i18n from "@/lang";
import { menuPermissionsService } from "@/services/menu-permissions.service";
import type { MenuGroup } from "@/types/menu-permissions";
import { store } from "./store";
import { useUserStoreHook } from "@/stores/user";

const fixedRoutes = constantRoutes.filter((route) => route.path === "/" || route.meta?.hidden);

function mapNavigation(groups: MenuGroup[]): RouteRecordRaw[] {
  return groups.map((group) => {
    const local = constantRoutes.find((route) => route.name === group.routeName && !route.meta?.hidden && route.path !== "/");
    if (!local) {
      throw new Error(i18n.global.t("menuPermission.navigationConfigurationError", { route: group.routeName }));
    }
    const children = group.children.map((item) => {
      const child = local.children?.find((route) => route.name === item.routeName);
      if (!child || child.meta?.hidden || child.meta?.menuKey !== item.menuKey) {
        throw new Error(i18n.global.t("menuPermission.navigationConfigurationError", { route: `${group.routeName}/${item.routeName}` }));
      }
      return { ...child, meta: { ...child.meta, title: item.title } };
    });
    return {
      ...local,
      meta: { ...local.meta, title: group.title },
      children: [...children, ...(local.children?.filter((child) => child.meta?.hidden) ?? [])],
    } as RouteRecordRaw;
  });
}

export const usePermissionStore = defineStore("permission", () => {
  const routes = ref<RouteRecordRaw[]>([...fixedRoutes]);
  const mixLayoutSideMenus = ref<RouteRecordRaw[]>([]);
  const isRouteGenerated = ref(false);
  let generation = 0;
  let pending: Promise<RouteRecordRaw[] | null> | undefined;

  /** 按后端目录映射本地路由；重置会话后丢弃旧请求。 */
  function generateRoutes(): Promise<RouteRecordRaw[] | null> {
    if (pending) return pending;
    const current = generation;
    const user = useUserStoreHook();
    const context = { ...user.userInfo };
    const isCurrent = () => current === generation && user.isLoggedIn()
      && context.userId === user.userInfo.userId
      && context.identityId === user.userInfo.identityId
      && context.scope === user.userInfo.scope;
    pending = (async () => {
      try {
        const result = await menuPermissionsService.navigation();
        if (!isCurrent()) return null;
        routes.value = filterRoutesByAccess([...fixedRoutes, ...mapNavigation(result.groups)], context);
        isRouteGenerated.value = true;
        return routes.value;
      } catch (error) {
        if (!isCurrent()) return null;
        throw error;
      } finally {
        if (current === generation) pending = undefined;
      }
    })();
    return pending;
  }

  const setMixLayoutSideMenus = (parentPath: string) => {
    const parentMenu = routes.value.find((item) => item.path === parentPath);
    mixLayoutSideMenus.value = parentMenu?.children || [];
  };

  const resetRouter = () => {
    generation++;
    pending = undefined;
    routes.value = [...fixedRoutes];
    mixLayoutSideMenus.value = [];
    isRouteGenerated.value = false;
  };

  return {
    routes,
    mixLayoutSideMenus,
    isRouteGenerated,
    generateRoutes,
    setMixLayoutSideMenus,
    resetRouter,
  };
});

export function usePermissionStoreHook() {
  return usePermissionStore(store);
}
