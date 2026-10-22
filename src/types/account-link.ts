import type { BaseQueryParams } from "@/types/common";

/** 关联成员仅限业务账号，不含总部。 */
export type LinkedAccountScope = "shengxu" | "linxi" | "website";
export type LinkedAccountStatus = "enabled" | "disabled";
/** keep 保留各自标识；unify 统一为同一 tourCode。 */
export type AccountLinkTourCodeMode = "keep" | "unify";

export interface LinkedAccount {
  userId: string;
  identityId: string;
  username: string;
  nickname: string;
  scope: LinkedAccountScope;
  scopeName: string;
  status: LinkedAccountStatus;
  tourCode: string | null;
  /** 仅切换列表标记当前账号，管理接口恒为 false。 */
  current: boolean;
}

export interface AccountLink {
  id: string;
  version: number;
  members: LinkedAccount[];
}

export interface AccountLinkQueryParams extends BaseQueryParams {
  keyword?: string;
}

export interface AccountLinkCandidateQuery extends AccountLinkQueryParams {
  /** 编辑时传入，候选包含该组现有成员。 */
  groupId?: string;
}

export interface AccountTourCodeOverride {
  userId: string;
  tourCode: string;
}

export interface AccountLinkSaveInput {
  userIds: string[];
  tourCodeMode: AccountLinkTourCodeMode;
  tourCode?: string;
  version?: number;
  tourCodes?: AccountTourCodeOverride[];
}

export interface AccountLinkDeleteInput {
  version: number;
  tourCodes?: AccountTourCodeOverride[];
}
