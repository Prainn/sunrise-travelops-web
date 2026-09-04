import type { BaseQueryParams } from "@/types/common";

/** 尚未接入后端的员工目录和个人资料兜底记录。 */
export interface PrototypeUserRecord {
  id: string;
  username: string;
  status: "enabled" | "disabled";
  nickname: string;
  nicknameKey?: string;
  avatar: string;
  gender: number;
  mobile: string;
  email: string;
  deptId: number;
  createTime: string;
  roles: string[];
}

export interface UserInfo {
  userId?: string;
  username?: string;
  nickname?: string;
  avatar?: string;
  roles: string[];
  perms: string[];
}

export interface UserQueryParams extends BaseQueryParams {
  keywords?: string;
  deptId?: number;
  roleId?: string | number;
  status?: number;
  createTime?: [string, string];
}

export interface UserItem {
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
  id?: string;
  avatar?: string;
  deptId?: number;
  email?: string;
  gender?: number;
  mobile?: string;
  nickname?: string;
  roleIds?: Array<string | number>;
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
  roleNames?: string;
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

export interface PasswordVerifyForm {
  password?: string;
}

export interface MobileUpdateForm extends PasswordVerifyForm {
  mobile?: string;
  code?: string;
}

export interface EmailUpdateForm extends PasswordVerifyForm {
  email?: string;
  code?: string;
}
