import type { BaseQueryParams } from "@/types/common";

export type BusinessGroupStatus = "enabled" | "disabled";

export interface BusinessGroupQueryParams extends BaseQueryParams {
  keyword?: string;
  status?: BusinessGroupStatus;
}

/** 霖熹业务组；name 为管理员录入的完整显示名称，如“定制师杨娟组”。 */
export interface BusinessGroup {
  id: string;
  name: string;
  status: BusinessGroupStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
}

/** 列表项额外返回成员数（含停用账号）。 */
export interface BusinessGroupItem extends BusinessGroup {
  memberCount: number;
}

export interface BusinessGroupCreateInput {
  name: string;
}

export interface BusinessGroupUpdateInput {
  name: string;
  status: BusinessGroupStatus;
  version: number;
}
