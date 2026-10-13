import { translate } from "@/lang/utils";
import type { IdentityRoleOption } from "@/types/user";

const ROLE_LABEL_KEYS: Record<string, string> = {
  ADMIN: "user.roles.systemAdministrator",
  COORDINATOR: "user.roles.coordinator",
  RESOURCE_MANAGER: "user.roles.resourceManager",
};

const ROLE_NAME_CODES: Record<string, string> = {
  coordinator: "COORDINATOR",
  resourcemanager: "RESOURCE_MANAGER",
  systemadministrator: "ADMIN",
  计调: "COORDINATOR",
  资源管理员: "RESOURCE_MANAGER",
  系统管理员: "ADMIN",
};

function roleCode(name: string, options: IdentityRoleOption[]): string {
  return (
    options.find((option) => option.label === name)?.code ??
    ROLE_NAME_CODES[name.replace(/[\s_-]+/g, "").toLowerCase()] ??
    name
  );
}

export function userRoleLabel(name: string, code?: string): string {
  const key = ROLE_LABEL_KEYS[code ?? roleCode(name, [])] ?? ROLE_LABEL_KEYS[name];
  return key ? translate(key) : name;
}

export function userRoleLabels(names: string | undefined, options: IdentityRoleOption[]): string[] {
  return (names?.split(",").map((name) => name.trim()).filter(Boolean) ?? [])
    .sort((a, b) => roleCode(a, options).localeCompare(roleCode(b, options)))
    .map((name) => userRoleLabel(name, roleCode(name, options)));
}

export function sortUserRoleIds(ids: string[], options: IdentityRoleOption[]): string[] {
  const codes = new Map(options.map((option) => [option.value, option.code]));
  return [...ids].sort((a, b) => (codes.get(a) ?? a).localeCompare(codes.get(b) ?? b));
}
