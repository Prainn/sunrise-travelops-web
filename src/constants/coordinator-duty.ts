import type { CoordinatorDuty, IdentityRoleOption, UserIdentity } from "@/types/user";

export const COORDINATOR_DUTIES: CoordinatorDuty[] = ["reception", "operation", "both"];

/** 按角色 code 判定计调，不依赖角色中文名或职能部门名。 */
export function isCoordinatorIdentity(identity: UserIdentity, roles: IdentityRoleOption[]): boolean {
  const coordinatorIds = new Set(
    roles.filter((role) => role.code === "COORDINATOR").map((role) => role.value),
  );
  return identity.roleIds.some((id) => coordinatorIds.has(id));
}
