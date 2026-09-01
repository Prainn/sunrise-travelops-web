import { translate } from "@/lang/utils";
import { ApiRequestError, request } from "@/api/request";
import type { CurrentUserResult, LoginRequest, LoginResult } from "@/types/auth";

export const authService = {
  /** 使用后端账号密码登录。 */
  async login({ username, password }: LoginRequest): Promise<LoginResult> {
    try {
      return await request<LoginResult>("/auth/login", {
        method: "POST",
        body: { username, password },
        requiresAuth: false,
      });
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) {
        throw new Error(translate("service.auth.invalidCredentials"), { cause: error });
      }
      throw error;
    }
  },

  /** 使用后端 Refresh Token 轮换一组新令牌。 */
  async refreshToken(refreshToken: string): Promise<LoginResult> {
    return request<LoginResult>("/auth/refresh", {
      method: "POST",
      body: { refreshToken },
      requiresAuth: false,
    });
  },

  /** 注销后端当前会话。 */
  async logout(): Promise<void> {
    await request<void>("/auth/logout", { method: "POST" });
  },

  /** 获取后端当前登录用户及权限。 */
  async getCurrentUser(): Promise<CurrentUserResult> {
    return request<CurrentUserResult>("/auth/me");
  },
};
