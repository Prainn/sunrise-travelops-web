import { request } from "@/api/request";
import type { LinkedAccount } from "@/types/account-link";
import type { CurrentUserResult, LoginRequest, LoginResult } from "@/types/auth";

export const authService = {
  /** 使用后端账号密码登录。 */
  async login({ scope, username, password }: LoginRequest): Promise<LoginResult> {
    return request.post<LoginResult>(
      "/auth/login",
      { scope, username, password },
      { requiresAuth: false },
    );
  },

  /** 使用后端 Refresh Token 轮换一组新令牌。 */
  async refreshToken(refreshToken: string): Promise<LoginResult> {
    return request.post<LoginResult>("/auth/refresh", { refreshToken }, { requiresAuth: false });
  },

  /** 注销后端当前会话。 */
  async logout(): Promise<void> {
    await request.post<void>("/auth/logout");
  },

  /**
   * 获取后端当前登录用户及权限。
   * @param bypassSessionGate 仅切换流程与会话确认使用，绕过本页切换冻结。
   */
  async getCurrentUser(bypassSessionGate = false): Promise<CurrentUserResult> {
    return request.get<CurrentUserResult>("/auth/me", { bypassSessionGate });
  },

  /** 当前账号所在关联组的可切换成员（含当前项）；未关联返回空数组。 */
  async getLinkedAccounts(): Promise<LinkedAccount[]> {
    return request.get<LinkedAccount[]>("/auth/linked-accounts");
  },

  /**
   * 切换到同组账号，返回与登录相同的令牌；401 由切换流程自行处理，不刷新、不重试。
   * 仅由账号切换协调流程在全部标签页就绪后调用一次。
   */
  async switchAccount(targetUserId: string, signal?: AbortSignal): Promise<LoginResult> {
    return request.post<LoginResult>(
      "/auth/switch-account",
      { targetUserId },
      { bypassSessionGate: true, handleUnauthorized: false, signal },
    );
  },
};
