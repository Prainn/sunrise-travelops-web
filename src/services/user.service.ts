import type { PageResult } from "@/types/common";
import { request } from "@/api/request";
import { translate } from "@/lang/utils";
import type {
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
} from "@/types/user";
import { authService } from "./auth.service";

type UserCreateResult = UserForm & { temporaryPassword?: string };
const USER_BASE_URL = "/users";

const ROLE_LABEL_KEYS: Record<string, string> = {
  ADMIN: "user.roles.systemAdministrator",
  COORDINATOR: "user.roles.coordinator",
  RESOURCE_MANAGER: "user.roles.resourceManager",
};

const ROLE_NAME_LABEL_KEYS: Record<string, string> = {
  coordinator: "user.roles.coordinator",
  resourcemanager: "user.roles.resourceManager",
  systemadministrator: "user.roles.systemAdministrator",
  计调: "user.roles.coordinator",
  资源主管: "user.roles.resourceManager",
  系统管理员: "user.roles.systemAdministrator",
};

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
  };
}

function toUserInput(data: UserForm, options: { includeUsername?: boolean; includePassword?: boolean } = {}) {
  const input: Record<string, unknown> = {
    id: data.id,
    nickname: data.nickname?.trim() ?? "",
    avatar: data.avatar ?? "",
    gender: data.gender ?? 0,
    mobile: data.mobile?.trim() ?? "",
    email: data.email?.trim() ?? "",
    identities: data.identities.map(({ id, scope, deptId, roleIds }) => ({ id, scope, deptId, roleIds })),
    status: data.status ?? 1,
  };
  if (options.includeUsername) input.username = data.username?.trim() ?? "";
  if (options.includePassword) input.password = data.password?.trim() || undefined;
  return input;
}

function normalizeRoleName(value: string): string {
  return value.replace(/[\s_-]+/g, "").toLowerCase();
}

function localizeRoleName(value: string, code?: string): string {
  const labelKey = ROLE_LABEL_KEYS[code ?? ""]
    ?? ROLE_LABEL_KEYS[value]
    ?? ROLE_NAME_LABEL_KEYS[normalizeRoleName(value)];
  return labelKey ? translate(labelKey) : value;
}

function localizeRoleNames(value?: string): string | undefined {
  return value
    ?.split(",")
    .map((role) => localizeRoleName(role.trim()))
    .join(",");
}

export const userService = {
  getProfileSecurity(): Promise<ProfileSecurity> {
    return request.get<ProfileSecurity>("/auth/me/security");
  },

  async getPage(query: UserQueryParams): Promise<PageResult<UserItem>> {
    const result = await request.get<PageResult<UserItem>>(USER_BASE_URL, {
      params: buildUserParams(query),
    });
    return {
      ...result,
      list: result.list.map((user) => ({
        ...user,
        deptName: user.identities.map(i => i.deptName).join(" / "),
        roleNames: user.identities.map(i => localizeRoleNames(i.roleNames)).join(","),
      })),
    };
  },

  async getFormData(userId: string): Promise<UserForm> {
    return request.get<UserForm>(`${USER_BASE_URL}/${encodeURIComponent(userId)}`);
  },

  async create(data: UserForm): Promise<UserCreateResult> {
    return request.post<UserCreateResult>(
      USER_BASE_URL,
      toUserInput(data, { includeUsername: true, includePassword: true })
    );
  },

  async update(userId: string, data: UserForm): Promise<void> {
    await request.put<UserForm>(
      `${USER_BASE_URL}/${encodeURIComponent(userId)}`,
      toUserInput({ ...data, id: userId })
    );
  },

  async deleteByIds(ids: string): Promise<void> {
    await request.delete<void>(USER_BASE_URL, { params: { ids } });
  },

  async resetPassword(userId: string, password: string): Promise<void> {
    await request.post<void>(
      `${USER_BASE_URL}/${encodeURIComponent(userId)}/reset-password`,
      { password }
    );
  },

  /** 获取后端当前用户，并映射为页面使用的身份与权限结构。 */
  async getCurrentUser(): Promise<UserInfo> {
    const currentUser = await authService.getCurrentUser();
    return { userId: currentUser.id, username: currentUser.username, nickname: currentUser.nickname, avatar: "/favicon.ico", roles: currentUser.roles, perms: [...currentUser.permissions], identityId: currentUser.identityId, scope: currentUser.scope, scopeName: currentUser.scopeName, deptName: currentUser.deptName, resourceLibrary: currentUser.resourceLibrary };
  },
  async getRoleOptions(): Promise<IdentityRoleOption[]> {
    const options = await request.get<IdentityRoleOption[]>(`${USER_BASE_URL}/options/roles`);
    return options.map(option => ({...option, label: localizeRoleName(option.label, option.code)}));
  },
  async getDepartmentOptions(): Promise<DepartmentOption[]> { return request.get<DepartmentOption[]>(`${USER_BASE_URL}/options/departments`); },
  inquiryImpact(id: string) { return request.get<{total: number; unfinished: number}>(`${USER_BASE_URL}/${id}/inquiry-impact`); },

  getProfile(): Promise<UserProfileDetail> {
    return request.get<UserProfileDetail>("/auth/me/profile");
  },

  async updateProfile(data: UserProfileForm): Promise<void> {
    await request.patch<void>("/auth/me/profile",data);
  },

  async changePassword(data: PasswordChangeForm): Promise<void> {
    await request.post<void>("/auth/me/password", { oldPassword: data.oldPassword, newPassword: data.newPassword });
  },
};
