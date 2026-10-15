import type { LoginScope } from "./auth";

export interface MenuDefinition {
  key: string;
  title: string;
  group: string;
  scopes?: LoginScope[];
  permissions: string[];
}
export interface RoleMenuConfig {
  code: string;
  name: string;
  version: number;
  menuKeys: string[];
  allowedMenuKeys: string[];
  locked: boolean;
}
export interface MenuPermissionsResult {
  menus: MenuDefinition[];
  roles: RoleMenuConfig[];
}
