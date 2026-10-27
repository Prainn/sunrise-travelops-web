import type { LoginScope } from "./auth";
import type { BusinessGroupStatus } from "./business-group";
import type { BaseQueryParams } from "@/types/common";

/** 计调分工：reception 仅收客、operation 仅操作、both 两者兼任。 */
export type CoordinatorDuty = "reception" | "operation" | "both";

export interface UserInfo {
  identityId?: string;
  scope?: LoginScope;
  scopeName?: string;
  deptName?: string;
  userId?: string;
  username?: string;
  nickname?: string;
  avatar?: string;
  roles: string[];
  perms: string[];
  menuKeys?: string[];
  sessionId?: string;
  sessionVersion?: number;
}

export interface UserQueryParams extends BaseQueryParams {
  keyword?: string;
  deptId?: number;
  roleId?: string | number;
  status?: number;
  createTime?: [string, string];
  scope?: LoginScope;
  businessGroupId?: string;
}

export type FeishuTestTemplate = "review" | "operate";

export interface UserItem {
  feishuOpenId?: string;
  identities: UserIdentity[];
  id: string;
  avatar?: string;
  createTime?: string;
  deptName?: string;
  email?: string;
  gender?: number;
  mobile?: string;
  nickname?: string;
  englishName?: string;
  tourCode?: string | null;
  roleNames?: string;
  status?: number;
  username?: string;
  version: number;
}

export interface UserForm {
  feishuOpenId?: string;
  identities: UserIdentity[];
  id?: string;
  avatar?: string;
  email?: string;
  gender?: number;
  mobile?: string;
  nickname?: string;
  englishName?: string;
  tourCode?: string | null;
  status?: number;
  username?: string;
  version?: number;
  password?: string;
  temporaryPassword?: string;
}

export interface TourCodeSuggestionInput {
  englishName: string;
  nickname: string;
}

export interface TourCodeSuggestion {
  tourCode: string | null;
}

export interface UserProfileDetail {
  id?: string;
  username?: string;
  nickname?: string;
  avatar?: string;
  gender?: number;
  mobile?: string;
  email?: string;
  deptName?: string;
  createTime?: string;
}

export interface UserProfileForm {
  nickname?: string;
  avatar?: string;
  gender?: number;
}

export interface PasswordChangeForm {
  oldPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

export interface ProfileSecurity {
  roles: Array<{ code: string; name: string }>;
  permissions: Array<{ code: string; name: string }>;
  recentLogins: Array<{ id: string; time: string; ip: string; userAgent: string }>;
}

export interface UserIdentity {
  id?: string;
  scope: LoginScope;
  deptId?: number | null;
  deptName?: string;
  roleIds: string[];
  roleNames?: string;
  /** 仅霖熹/独立站 COORDINATOR 可设置；盛旭历史值不参与台账授权。 */
  coordinatorDuty?: CoordinatorDuty | null;
  /** 仅霖熹身份必填；其他范围为 null。 */
  businessGroupId?: string | null;
  businessGroupName?: string | null;
  businessGroupStatus?: BusinessGroupStatus | null;
}
export interface IdentityRoleOption {
  value: string;
  label: string;
  code: string;
  scopes: LoginScope[];
}
export interface DepartmentOption {
  value: number;
  label: string;
  scope: LoginScope;
}
