import type { UserInfo } from "@/types/user";

/** 判断当前用户是否拥有指定按钮权限；仅依据服务端下发的有效权限。 */
export function hasUserPermission(user: UserInfo, permission: string): boolean {
  return Boolean(user.perms?.includes(permission));
}
