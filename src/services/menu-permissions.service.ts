import { request } from "@/api/request";
import type { MenuPermissionsResult, RoleMenuConfig } from "@/types/menu-permissions";

export const menuPermissionsService = {
  list() { return request.get<MenuPermissionsResult>("/system/menu-permissions"); },
  save(role: RoleMenuConfig, menuKeys: string[]) {
    return request.put<RoleMenuConfig>(`/system/menu-permissions/${encodeURIComponent(role.code)}`, { version: role.version, menuKeys });
  },
};
