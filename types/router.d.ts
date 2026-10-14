import type { LocationQueryRaw } from "vue-router";
import type { LoginScope } from "../src/types/auth";

declare module "vue-router" {
  /**
   * 项目路由元信息扩展
   */
  interface RouteMeta {
    title?: string;
    type?: string;
    icon?: string;
    hidden?: boolean;
    alwaysShow?: boolean;
    affix?: boolean;
    keepAlive?: boolean;
    breadcrumb?: boolean;
    activeMenu?: string;
    /** 菜单导航使用的 query 参数。 */
    params?: LocationQueryRaw;
    externalUrl?: string;
    roles?: string[];
    perms?: string[];
    scopes?: LoginScope[];
  }
}
