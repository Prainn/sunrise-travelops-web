import type { RouteMeta, RouteRecordRaw } from "vue-router";
import { ROLE_ROOT } from "@/constants";

interface RouteAccessContext {
  roles?: string[];
  perms?: string[];
}

/** 判断当前用户是否满足路由声明的角色与权限要求。 */
export function hasRouteAccess(meta: RouteMeta, context: RouteAccessContext): boolean {
  const roles = context.roles ?? [];
  const perms = context.perms ?? [];

  if (roles.includes(ROLE_ROOT)) return true;

  const matchesRoles = !meta.roles?.length || meta.roles.some((role) => roles.includes(role));
  const matchesPerms = !meta.perms?.length || meta.perms.some((perm) => perms.includes(perm));

  return matchesRoles && matchesPerms;
}

/** 递归生成当前用户可见的静态路由菜单。 */
export function filterRoutesByAccess(
  routes: RouteRecordRaw[],
  context: RouteAccessContext
): RouteRecordRaw[] {
  return routes.reduce<RouteRecordRaw[]>((accessibleRoutes, route) => {
    if (!hasRouteAccess(route.meta ?? {}, context)) return accessibleRoutes;

    const children = route.children
      ? filterRoutesByAccess(route.children, context)
      : route.children;
    const hasVisibleChildren = route.children?.some((child) => !child.meta?.hidden) ?? false;
    const hasAccessibleVisibleChildren = children?.some((child) => !child.meta?.hidden) ?? false;

    // 原本作为菜单分组的路由没有任何可见子菜单时，整个分组不显示。
    if (hasVisibleChildren && !hasAccessibleVisibleChildren) return accessibleRoutes;

    const accessibleRoute = {
      ...route,
      ...(children ? { children } : {}),
    } as RouteRecordRaw;
    accessibleRoutes.push(accessibleRoute);
    return accessibleRoutes;
  }, []);
}
