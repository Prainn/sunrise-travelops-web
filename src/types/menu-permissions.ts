import type { LoginScope } from "./auth";

export interface MenuItem {
  key: string;
  menuKey: string;
  title: string;
  routeName: string;
  scopes: LoginScope[];
  permissions: string[];
}
export interface MenuGroup {
  key: string;
  title: string;
  routeName: string;
  children: MenuItem[];
}
export interface MenuNavigationResult {
  groups: MenuGroup[];
}
export interface RoleMenuConfig {
  code: string;
  name: string;
  version: number;
  menuKeys: string[];
  allowedMenuKeys: string[];
  locked: boolean;
}
export interface MenuPermissionsResult extends MenuNavigationResult {
  roles: RoleMenuConfig[];
}
