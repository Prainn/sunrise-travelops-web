import type { OptionItem, PageResult } from "@/types/common";
import { roleDefinitions, users } from "@/data/data";
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
import { AuthStorage } from "@/utils/auth";
import { authService } from "./auth.service";

function createId(): string {
  return String(Math.max(0, ...users.map((item) => Number(item.id) || 0)) + 1);
}

function requireUser(userId: string) {
  const user = users.find((item) => item.id === userId);
  if (!user) throw new Error(translate("service.user.notFound"));
  return user;
}

function requireCurrentUser() {
  const userId = authService.getUserId(AuthStorage.getAccessToken());
  return requireUser(userId ?? "");
}

function verifyPassword(data: PasswordVerifyForm) {
  const user = requireCurrentUser();
  if (user.password !== data.password) {
    throw new Error(translate("service.auth.invalidCredentials"));
  }
  return user;
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
      const date = user.createTime.slice(0, 10);
      const matchesStartDate = !startDate || date >= startDate;
      const matchesEndDate = !endDate || date <= endDate;
      return matchesKeywords && matchesStatus && matchesStartDate && matchesEndDate;
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
    users.push({
      id: createId(),
      username,
      password: "123456",
      status: data.status === 0 ? "disabled" : "enabled",
      nickname,
      avatar: data.avatar ?? "",
      gender: data.gender ?? 0,
      mobile: data.mobile?.trim() ?? "",
      email: data.email?.trim() ?? "",
      roleIds,
      roleNames: getRoleNames(roleIds),
      deptName: "",
      createTime: new Date().toISOString().slice(0, 19).replace("T", " "),
      roles: roleIds.includes(2) ? ["ADMIN"] : ["USER"],
      perms: [],
    });
  },

  /** 更新本地原型用户。 */
  async update(userId: string, data: UserForm): Promise<void> {
    const user = requireUser(userId);
    const nickname = data.nickname?.trim();
    if (!nickname) throw new Error(translate("service.user.nicknameRequired"));
    const roleIds = (data.roleIds ?? []).map(Number);

    Object.assign(user, {
      nickname,
      avatar: data.avatar ?? "",
      gender: data.gender ?? 0,
      mobile: data.mobile?.trim() ?? "",
      email: data.email?.trim() ?? "",
      roleIds,
      roleNames: getRoleNames(roleIds),
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

  /** 重置本地原型用户密码。 */
  async resetPassword(userId: string, password: string): Promise<void> {
    if (password.length < 6) throw new Error(translate("service.user.passwordMin"));
    requireUser(userId).password = password;
  },

  /** 获取当前本地原型会话对应的用户身份与权限。 */
  async getCurrentUser(accessToken: string): Promise<UserInfo> {
    const userId = authService.getUserId(accessToken);
    const user = users.find((item) => item.id === userId && item.status === "enabled");

    if (!user) {
      throw new Error(translate("service.auth.sessionExpired"));
    }

    return {
      userId: user.id,
      username: user.username,
      nickname: user.nicknameKey ? translate(user.nicknameKey) : user.nickname,
      avatar: user.avatar,
      roles: [...user.roles],
      perms: [...user.perms],
    };
  },

  async getRoleOptions(): Promise<OptionItem[]> {
    return roleDefinitions.map((role) => ({
      value: role.value,
      label: translate(role.labelKey),
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
      deptName: user.deptName,
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

  async changePassword(data: PasswordChangeForm): Promise<void> {
    const user = verifyPassword({ password: data.oldPassword });
    user.password = data.newPassword ?? user.password;
  },

  async sendMobileCode(_mobile: string): Promise<void> {},

  async bindOrChangeMobile(data: MobileUpdateForm): Promise<void> {
    const user = verifyPassword(data);
    user.mobile = data.mobile ?? "";
  },

  async unbindMobile(data: PasswordVerifyForm): Promise<void> {
    verifyPassword(data).mobile = "";
  },

  async sendEmailCode(_email: string): Promise<void> {},

  async bindOrChangeEmail(data: EmailUpdateForm): Promise<void> {
    const user = verifyPassword(data);
    user.email = data.email ?? "";
  },

  async unbindEmail(data: PasswordVerifyForm): Promise<void> {
    verifyPassword(data).email = "";
  },
};
