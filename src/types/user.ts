import type { LoginScope, ResourceLibrary } from "./auth";
import type { BaseQueryParams } from "@/types/common";

export interface UserInfo {
  identityId?: string;
  scope?: LoginScope;
  scopeName?: string;
  deptName?: string;
  resourceLibrary?: ResourceLibrary | null;
  userId?: string;
  username?: string;
  nickname?: string;
  avatar?: string;
  roles: string[];
  perms: string[];
}

export interface UserQueryParams extends BaseQueryParams {
  keyword?: string;
  deptId?: number;
  roleId?: string | number;
  status?: number;
  createTime?: [string, string];
}

export interface UserItem {
  identities: UserIdentity[];
  id: string;
  avatar?: string;
  createTime?: string;
  deptName?: string;
  email?: string;
  gender?: number;
  mobile?: string;
  nickname?: string;
  roleNames?: string;
  status?: number;
  username?: string;
}

export interface UserForm {
  identities: UserIdentity[];
  id?: string;
  avatar?: string;
  email?: string;
  gender?: number;
  mobile?: string;
  nickname?: string;
  status?: number;
  username?: string;
  password?: string;
  temporaryPassword?: string;
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
