import { ROLE_ROOT } from "@/constants";
import type { UserInfo } from "@/types/user";

/** 判断当前用户是否拥有指定按钮权限。 */
export function hasUserPermission(user: UserInfo, permission: string): boolean {
  return Boolean(user.roles?.includes(ROLE_ROOT) || user.perms?.includes(permission));
}
