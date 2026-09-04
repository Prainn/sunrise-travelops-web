import type { OptionItem, PageResult } from "@/types/common";
import { departmentDefinitions, users } from "@/data/data";
import { request } from "@/api/request";
import { translate } from "@/lang/utils";
import type {
  EmailUpdateForm,
  MobileUpdateForm,
  PasswordChangeForm,
  PasswordVerifyForm,
  UserForm,
  UserInfo,
  UserItem,
  UserProfileDetail,
  UserProfileForm,
  UserQueryParams,
} from "@/types/user";
import { authService } from "./auth.service";

let currentUsername = "";

type UserCreateResult = UserForm & { temporaryPassword?: string };
type RoleOption = OptionItem & {
  code?: string;
  name?: string;
};

const USER_BASE_URL = "/users";

const ROLE_LABEL_KEYS: Record<string, string> = {
  ADMIN: "user.roles.systemAdministrator",
  INQUIRY_COORDINATOR: "user.roles.inquiryCoordinator",
  OPERATIONS_COORDINATOR: "user.roles.operationsCoordinator",
  RESOURCE_MANAGER: "user.roles.resourceManager",
};

const ROLE_NAME_LABEL_KEYS: Record<string, string> = {
  inquirycoordinator: "user.roles.inquiryCoordinator",
  operationscoordinator: "user.roles.operationsCoordinator",
  resourcemanager: "user.roles.resourceManager",
  systemadministrator: "user.roles.systemAdministrator",
  收客计调: "user.roles.inquiryCoordinator",
  操作计调: "user.roles.operationsCoordinator",
  资源主管: "user.roles.resourceManager",
  系统管理员: "user.roles.systemAdministrator",
};

function requireCurrentUser() {
  const user = users.find((item) => item.username === currentUsername);
  if (!user) throw new Error(translate("service.user.notFound"));
  return user;
}

function rejectUnsupportedCredentialMutation(): never {
  throw new Error(translate("service.auth.credentialManagementUnavailable"));
}

function getRoleNames(roles: string[]): string {
  return roles
    .map((role) => translate(ROLE_LABEL_KEYS[role] ?? role))
    .filter(Boolean)
    .join(",");
}

function getDepartmentName(deptId: number): string {
  const department = departmentDefinitions.find((item) => item.value === deptId);
  return department ? translate(department.labelKey) : "";
}

function buildUserParams(query: UserQueryParams) {
  const keywords = query.keywords?.trim();
  return {
    page: query.page,
    pageSize: query.pageSize,
    keywords,
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
    deptId: data.deptId,
    roleIds: data.roleIds ?? [],
    status: data.status ?? 1,
  };
  if (options.includeUsername) input.username = data.username?.trim() ?? "";
  if (options.includePassword) input.password = data.password?.trim() || undefined;
  return input;
}

function normalizeRoleName(value: string): string {
  return value.replace(/[\s_-]+/g, "").toLowerCase();
}

function localizeRoleOption(option: RoleOption): OptionItem {
  const labelKey = ROLE_LABEL_KEYS[option.code ?? ""]
    ?? ROLE_NAME_LABEL_KEYS[normalizeRoleName(option.name ?? option.label)];
  return {
    ...option,
    label: labelKey ? translate(labelKey) : option.label,
  };
}

export const userService = {
  async getPage(query: UserQueryParams): Promise<PageResult<UserItem>> {
    return request.get<PageResult<UserItem>>(USER_BASE_URL, {
      params: buildUserParams(query),
    });
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
    currentUsername = currentUser.username;
    const prototypeUser = users.find((item) => item.username === currentUser.username);

    return {
      userId: currentUser.id,
      username: currentUser.username,
      nickname: prototypeUser?.nicknameKey
        ? translate(prototypeUser.nicknameKey)
        : prototypeUser?.nickname ?? currentUser.username,
      avatar: prototypeUser?.avatar ?? "/favicon.ico",
      roles: [],
      perms: [...currentUser.permissions],
    };
  },

  async getRoleOptions(): Promise<OptionItem[]> {
    const options = await request.get<RoleOption[]>(`${USER_BASE_URL}/options/roles`);
    return options.map(localizeRoleOption);
  },

  async getDepartmentOptions(): Promise<OptionItem[]> {
    return request.get<OptionItem[]>(`${USER_BASE_URL}/options/departments`);
  },

  async getProfile(): Promise<UserProfileDetail> {
    const user = requireCurrentUser();
    return {
      id: user.id,
      username: user.username,
      nickname: user.nicknameKey ? translate(user.nicknameKey) : user.nickname,
      avatar: user.avatar,
      gender: user.gender,
      mobile: user.mobile,
      email: user.email,
      deptName: getDepartmentName(user.deptId),
      roleNames: getRoleNames(user.roles),
      createTime: user.createTime,
    };
  },

  async updateProfile(data: UserProfileForm): Promise<void> {
    const user = requireCurrentUser();
    if (data.nickname !== undefined) {
      user.nickname = data.nickname.trim();
      delete user.nicknameKey;
    }
    if (data.avatar !== undefined) user.avatar = data.avatar;
    if (data.gender !== undefined) user.gender = data.gender;
  },

  async changePassword(_data: PasswordChangeForm): Promise<void> {
    rejectUnsupportedCredentialMutation();
  },

  async sendMobileCode(_mobile: string): Promise<void> {},

  async bindOrChangeMobile(_data: MobileUpdateForm): Promise<void> {
    rejectUnsupportedCredentialMutation();
  },

  async unbindMobile(_data: PasswordVerifyForm): Promise<void> {
    rejectUnsupportedCredentialMutation();
  },

  async sendEmailCode(_email: string): Promise<void> {},

  async bindOrChangeEmail(_data: EmailUpdateForm): Promise<void> {
    rejectUnsupportedCredentialMutation();
  },

  async unbindEmail(_data: PasswordVerifyForm): Promise<void> {
    rejectUnsupportedCredentialMutation();
  },
};
