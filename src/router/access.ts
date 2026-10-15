import type { RouteMeta, RouteRecordRaw } from "vue-router";
import type { LoginScope } from "@/types/auth";
import { ROLE_ROOT } from "@/constants";

interface RouteAccessContext {
  scope?: LoginScope;
  roles?: string[];
  perms?: string[];
  menuKeys?: string[];
}

/** 判断当前用户是否满足路由声明的角色与权限要求。 */
export function hasRouteAccess(meta: RouteMeta, context: RouteAccessContext): boolean {
  const roles = context.roles ?? [];
  const perms = context.perms ?? [];

  if (meta.scopes?.length && (!context.scope || !meta.scopes.includes(context.scope))) return false;
  if (roles.includes(ROLE_ROOT)) return true;

  const matchesRoles = !meta.roles?.length || meta.roles.some((role) => roles.includes(role));
  const matchesPerms = !meta.perms?.length || meta.perms.some((perm) => perms.includes(perm));

  const matchesMenu = !meta.menuKey || Boolean(context.menuKeys?.includes(meta.menuKey));
  return matchesRoles && matchesPerms && matchesMenu;
}

/** 判断当前用户是否可以访问路由匹配链中的所有层级。 */
export function hasRouteChainAccess(routeMetas: RouteMeta[], context: RouteAccessContext): boolean {
  return routeMetas.every((meta) => hasRouteAccess(meta, context));
}

/** 递归生成当前用户可见的静态路由菜单。 */
export function filterRoutesByAccess(
  routes: RouteRecordRaw[],
  context: RouteAccessContext,
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
    if (children && typeof route.redirect === "string") {
      const visible = children.filter((child) => !child.meta?.hidden);
      const path = (child: RouteRecordRaw) => child.path.startsWith("/") ? child.path : `${route.path}/${child.path}`.replace(/\/+/g, "/");
      if (visible.length && !visible.some((child) => path(child) === route.redirect)) accessibleRoute.redirect = path(visible[0]!);
    }
    accessibleRoutes.push(accessibleRoute);
    return accessibleRoutes;
  }, []);
}

/** 共用行程 URL 以显式模块匹配范围和菜单入口。 */
export function hasWorkspaceAccess(context: RouteAccessContext, module: unknown): boolean {
  if (module !== undefined && module !== "website") return false;
  return hasRouteAccess({
    menuKey: "inquiries",
    scopes: module === "website" ? ["linxi", "website", "headquarters"] : ["shengxu", "headquarters"],
    perms: [module === "website" ? "website:itinerary:list" : "itinerary:list"],
  }, context);
}
