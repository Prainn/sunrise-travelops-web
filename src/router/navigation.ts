import type { RouteRecordRaw } from "vue-router";
import type { MenuGroup } from "@/types/menu-permissions";
import i18n from "@/lang";

/** 新后端的未知菜单等待客户端更新；已知菜单仍校验本地安全绑定。 */
export function mapNavigation(groups: MenuGroup[], localRoutes: RouteRecordRaw[]) {
  let hasUnknownRoutes = false;
  const routes: RouteRecordRaw[] = [];
  for (const group of groups) {
    const local = localRoutes.find((route) => route.name === group.routeName);
    if (!local) {
      hasUnknownRoutes = true;
      continue;
    }
    if (local.meta?.hidden || local.path === "/") {
      throw new Error(i18n.global.t("menuPermission.navigationConfigurationError", { route: group.routeName }));
    }
    const children: RouteRecordRaw[] = [];
    for (const item of group.children) {
      const child = local.children?.find((route) => route.name === item.routeName);
      if (!child) {
        if (localRoutes.some((route) => route.name === item.routeName || route.children?.some((entry) => entry.name === item.routeName))) {
          throw new Error(i18n.global.t("menuPermission.navigationConfigurationError", { route: `${group.routeName}/${item.routeName}` }));
        }
        hasUnknownRoutes = true;
        continue;
      }
      if (child.meta?.hidden || child.meta?.menuKey !== item.menuKey) {
        throw new Error(i18n.global.t("menuPermission.navigationConfigurationError", { route: `${group.routeName}/${item.routeName}` }));
      }
      children.push({ ...child, meta: { ...child.meta, title: item.title } } as RouteRecordRaw);
    }
    if (children.length) routes.push({
      ...local,
      meta: { ...local.meta, title: group.title },
      children: [...children, ...(local.children?.filter((child) => child.meta?.hidden) ?? [])],
    } as RouteRecordRaw);
  }
  return { routes, hasUnknownRoutes };
}
