import type { OptionItem, PageResult } from "@/types/common";
import { departmentDefinitions, roleDefinitions, users } from "@/data/data";
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

function createId(): string {
  return String(Math.max(0, ...users.map((item) => Number(item.id) || 0)) + 1);
}

function requireUser(userId: string) {
  const user = users.find((item) => item.id === userId);
  if (!user) throw new Error(translate("service.user.notFound"));
  return user;
}

function requireCurrentUser() {
  const user = users.find((item) => item.username === currentUsername);
  if (!user) throw new Error(translate("service.user.notFound"));
  return user;
}

function rejectUnsupportedCredentialMutation(): never {
  throw new Error(translate("service.auth.credentialManagementUnavailable"));
}

function toUserItem(user: (typeof users)[number]): UserItem {
  return {
    id: user.id,
    username: user.username,
    nickname: user.nicknameKey ? translate(user.nicknameKey) : user.nickname,
    avatar: user.avatar,
    gender: user.gender,
    mobile: user.mobile,
    email: user.email,
    deptName: getDepartmentName(user.deptId),
    roleNames: getRoleNames(user.roleIds),
    status: user.status === "enabled" ? 1 : 0,
    createTime: user.createTime,
  };
}

function toUserForm(user: (typeof users)[number]): UserForm {
  return {
    id: user.id,
    username: user.username,
    nickname: user.nicknameKey ? translate(user.nicknameKey) : user.nickname,
    avatar: user.avatar,
    gender: user.gender,
    mobile: user.mobile,
    email: user.email,
    deptId: user.deptId,
    roleIds: [...user.roleIds],
    status: user.status === "enabled" ? 1 : 0,
  };
}

function getRoleNames(roleIds: number[]): string {
  const roleNameMap = new Map<number, string>(
    roleDefinitions.map((role) => [role.value, translate(role.labelKey)] as const)
  );
  return roleIds
    .map((id) => roleNameMap.get(id))
    .filter(Boolean)
    .join(",");
}

function getDepartmentName(deptId: number): string {
  const department = departmentDefinitions.find((item) => item.value === deptId);
  return department ? translate(department.labelKey) : "";
}

function getRoleAccess(roleIds: number[]) {
  const roles = new Set<string>();
  const perms = new Set<string>();
  roleDefinitions
    .filter((definition) => roleIds.includes(definition.value))
    .forEach((definition) => {
      definition.roles.forEach((role) => roles.add(role));
      definition.perms.forEach((perm) => perms.add(perm));
    });
  return { roles: [...roles], perms: [...perms] };
}

export const userService = {
  /** 从本地原型数据中获取用户分页列表。 */
  async getPage(query: UserQueryParams): Promise<PageResult<UserItem>> {
    const keywords = query.keywords?.trim().toLowerCase();
    const [startDate, endDate] = query.createTime ?? [];
    const filtered = users.filter((user) => {
      const matchesKeywords =
        !keywords ||
        user.username.toLowerCase().includes(keywords) ||
        (user.nicknameKey ? translate(user.nicknameKey) : user.nickname)
          .toLowerCase()
          .includes(keywords) ||
        user.mobile.includes(keywords);
      const status = user.status === "enabled" ? 1 : 0;
      const matchesStatus = query.status === undefined || query.status === status;
      const matchesDepartment = !query.deptId || user.deptId === query.deptId;
      const matchesRole = !query.roleId || user.roleIds.includes(query.roleId);
      const date = user.createTime.slice(0, 10);
      const matchesStartDate = !startDate || date >= startDate;
      const matchesEndDate = !endDate || date <= endDate;
      return matchesKeywords && matchesStatus && matchesDepartment && matchesRole
        && matchesStartDate && matchesEndDate;
    });
    const start = (query.pageNum - 1) * query.pageSize;

    return {
      list: filtered.slice(start, start + query.pageSize).map(toUserItem),
      total: filtered.length,
    };
  },

  /** 获取本地用户表单数据。 */
  async getFormData(userId: string): Promise<UserForm> {
    return toUserForm(requireUser(userId));
  },

  /** 创建本地原型用户。 */
  async create(data: UserForm): Promise<void> {
    const username = data.username?.trim();
    const nickname = data.nickname?.trim();
    if (!username || !nickname) throw new Error(translate("service.user.requiredIdentity"));
    if (users.some((user) => user.username === username)) {
      throw new Error(translate("service.user.usernameExists"));
    }

    const roleIds = (data.roleIds ?? []).map(Number);
    const { roles, perms } = getRoleAccess(roleIds);
    users.push({
      id: createId(),
      username,
      status: data.status === 0 ? "disabled" : "enabled",
      nickname,
      avatar: data.avatar ?? "",
      gender: data.gender ?? 0,
      mobile: data.mobile?.trim() ?? "",
      email: data.email?.trim() ?? "",
      deptId: Number(data.deptId),
      roleIds,
      roleNames: getRoleNames(roleIds),
      createTime: new Date().toISOString().slice(0, 19).replace("T", " "),
      roles,
      perms,
    });
  },

  /** 更新本地原型用户。 */
  async update(userId: string, data: UserForm): Promise<void> {
    const user = requireUser(userId);
    const nickname = data.nickname?.trim();
    if (!nickname) throw new Error(translate("service.user.nicknameRequired"));
    const roleIds = (data.roleIds ?? []).map(Number);
    const { roles, perms } = getRoleAccess(roleIds);

    Object.assign(user, {
      nickname,
      avatar: data.avatar ?? "",
      gender: data.gender ?? 0,
      mobile: data.mobile?.trim() ?? "",
      email: data.email?.trim() ?? "",
      deptId: Number(data.deptId),
      roleIds,
      roleNames: getRoleNames(roleIds),
      roles,
      perms,
      status: data.status === 0 ? "disabled" : "enabled",
    });
    delete user.nicknameKey;
  },

  /** 删除本地原型用户。 */
  async deleteByIds(ids: string): Promise<void> {
    const idSet = new Set(ids.split(",").filter(Boolean));
    for (let index = users.length - 1; index >= 0; index -= 1) {
      if (idSet.has(users[index].id)) users.splice(index, 1);
    }
  },

  /** 密码重置需等待后端提供对应接口。 */
  async resetPassword(_userId: string, _password: string): Promise<void> {
    rejectUnsupportedCredentialMutation();
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
    return roleDefinitions.map((role) => ({
      value: role.value,
      label: translate(role.labelKey),
    }));
  },

  async getDepartmentOptions(): Promise<OptionItem[]> {
    return departmentDefinitions.map((department) => ({
      value: department.value,
      label: translate(department.labelKey),
    }));
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
      roleNames: getRoleNames(user.roleIds),
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
