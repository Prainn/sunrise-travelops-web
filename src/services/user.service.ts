import type { PageResult } from "@/types/common";
import { request } from "@/api/request";
import type {
  FeishuTestTemplate,
  ProfileSecurity,
  PasswordChangeForm,
  UserForm,
  IdentityRoleOption,
  DepartmentOption,
  UserInfo,
  UserItem,
  UserProfileDetail,
  UserProfileForm,
  UserQueryParams,
  CoordinatorDuty,
  TourCodeSuggestion,
  TourCodeSuggestionInput,
} from "@/types/user";
import { authService } from "./auth.service";

type UserCreateResult = UserForm & { temporaryPassword?: string };
const USER_BASE_URL = "/users";

function withUserSummary(user: UserItem): UserItem {
  return {
    ...user,
    deptName: user.identities.map((i) => i.deptName).join(" / "),
    roleNames: user.identities.map((i) => i.roleNames).join(","),
  };
}

function buildUserParams(query: UserQueryParams) {
  const keyword = query.keyword?.trim();
  return {
    page: query.page,
    pageSize: query.pageSize,
    keyword,
    status: query.status,
    deptId: query.deptId,
    roleId: query.roleId,
    createTime: query.createTime,
    scope: query.scope,
    businessGroupId: query.businessGroupId,
  };
}

function toUserInput(
  data: UserForm,
  options: { includeUsername?: boolean; includePassword?: boolean } = {},
) {
  const input: Record<string, unknown> = {
    nickname: data.nickname?.trim() ?? "",
    englishName: data.englishName?.trim() ?? "",
    avatar: data.avatar ?? "",
    gender: data.gender ?? 0,
    mobile: data.mobile?.trim() ?? "",
    email: data.email?.trim() ?? "",
    feishuOpenId: data.feishuOpenId?.trim() ?? "",
    identities: data.identities.map(
      ({ id, scope, deptId, roleIds, coordinatorDuty, businessGroupId }) => ({
        id,
        scope,
        deptId,
        roleIds,
        // 盛旭不提交分工；其他业务保留原有表单值。
        ...(scope === "shengxu" ? {} : { coordinatorDuty: coordinatorDuty ?? null }),
        businessGroupId: scope === "linxi" ? (businessGroupId ?? null) : null,
      }),
    ),
    status: data.status ?? 1,
  };
  if (data.identities[0]?.scope !== "headquarters")
    input.tourCode = data.tourCode?.trim().toUpperCase() ?? "";
  if (options.includeUsername) input.username = data.username?.trim() ?? "";
  if (options.includePassword) input.password = data.password?.trim() || undefined;
  return input;
}

export const userService = {
  testFeishu(userId: string, template: FeishuTestTemplate): Promise<{ messageId: string }> {
    return request.post(`${USER_BASE_URL}/${encodeURIComponent(userId)}/feishu-test`, { template });
  },
  suggestTourCode(input: TourCodeSuggestionInput): Promise<TourCodeSuggestion> {
    return request.get<TourCodeSuggestion>(`${USER_BASE_URL}/tour-code-suggestion`, {
      params: { ...input },
    });
  },
  getProfileSecurity(): Promise<ProfileSecurity> {
    return request.get<ProfileSecurity>("/auth/me/security");
  },

  async getPage(query: UserQueryParams): Promise<PageResult<UserItem>> {
    const result = await request.get<PageResult<UserItem>>(USER_BASE_URL, {
      params: buildUserParams(query),
    });
    return { ...result, list: result.list.map(withUserSummary) };
  },

  async getFormData(userId: string): Promise<UserForm> {
    return request.get<UserForm>(`${USER_BASE_URL}/${encodeURIComponent(userId)}`);
  },

  async create(data: UserForm): Promise<UserCreateResult> {
    return request.post<UserCreateResult>(
      USER_BASE_URL,
      toUserInput(data, { includeUsername: true, includePassword: true }),
    );
  },

  async update(userId: string, data: UserForm): Promise<void> {
    await request.put<UserForm>(
      `${USER_BASE_URL}/${encodeURIComponent(userId)}`,
      toUserInput(data),
    );
  },

  /** 仅更新计调分工，不提交整份用户表单；返回最新 User（含新 version）。 */
  async updateCoordinatorDuty(
    userId: string,
    body: { version: number; coordinatorDuty: CoordinatorDuty },
  ): Promise<UserItem> {
    const user = await request.put<UserItem>(
      `${USER_BASE_URL}/${encodeURIComponent(userId)}/coordinator-duty`,
      body,
    );
    return withUserSummary(user);
  },

  /** 仅调整霖熹成员所属业务组；返回最新 User。 */
  async updateBusinessGroup(
    userId: string,
    body: { version: number; businessGroupId: string },
  ): Promise<UserItem> {
    const user = await request.put<UserItem>(
      `${USER_BASE_URL}/${encodeURIComponent(userId)}/business-group`,
      body,
    );
    return withUserSummary(user);
  },

  async deleteByIds(ids: string): Promise<void> {
    await request.delete<void>(USER_BASE_URL, { params: { ids } });
  },

  async resetPassword(userId: string, password: string): Promise<void> {
    await request.post<void>(`${USER_BASE_URL}/${encodeURIComponent(userId)}/reset-password`, {
      password,
    });
  },

  /** 获取后端当前用户，并映射为页面使用的身份与权限结构。 */
  async getCurrentUser(bypassSessionGate = false): Promise<UserInfo> {
    const currentUser = await authService.getCurrentUser(bypassSessionGate);
    return {
      userId: currentUser.id,
      username: currentUser.username,
      nickname: currentUser.nickname,
      avatar: "/logo-emblem.png",
      roles: currentUser.roles,
      perms: [...currentUser.permissions],
      menuKeys: [...currentUser.menuKeys],
      identityId: currentUser.identityId,
      scope: currentUser.scope,
      scopeName: currentUser.scopeName,
      deptName: currentUser.deptName,
      sessionId: currentUser.sessionId,
      sessionVersion: currentUser.sessionVersion,
    };
  },
  async getRoleOptions(): Promise<IdentityRoleOption[]> {
    const options = await request.get<IdentityRoleOption[]>(`${USER_BASE_URL}/options/roles`);
    return options.sort((a, b) => a.code.localeCompare(b.code));
  },
  async getDepartmentOptions(): Promise<DepartmentOption[]> {
    return request.get<DepartmentOption[]>(`${USER_BASE_URL}/options/departments`);
  },
  inquiryImpact(id: string) {
    return request.get<{ total: number; unfinished: number }>(
      `${USER_BASE_URL}/${id}/inquiry-impact`,
    );
  },

  getProfile(): Promise<UserProfileDetail> {
    return request.get<UserProfileDetail>("/auth/me/profile");
  },

  async updateProfile(data: UserProfileForm): Promise<void> {
    await request.patch<void>("/auth/me/profile", data);
  },

  async changePassword(data: PasswordChangeForm): Promise<void> {
    await request.post<void>("/auth/me/password", {
      oldPassword: data.oldPassword,
      newPassword: data.newPassword,
    });
  },
};
