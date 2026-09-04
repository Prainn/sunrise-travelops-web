import { request } from "@/api/request";
import type { CurrentUserResult, LoginRequest, LoginResult } from "@/types/auth";

export const authService = {
  /** 使用后端账号密码登录。 */
  async login({ username, password }: LoginRequest): Promise<LoginResult> {
    return request.post<LoginResult>(
      "/auth/login",
      { username, password },
      { requiresAuth: false }
    );
  },

  /** 使用后端 Refresh Token 轮换一组新令牌。 */
  async refreshToken(refreshToken: string): Promise<LoginResult> {
    return request.post<LoginResult>(
      "/auth/refresh",
      { refreshToken },
      { requiresAuth: false }
    );
  },

  /** 注销后端当前会话。 */
  async logout(): Promise<void> {
    await request.post<void>("/auth/logout");
  },

  /** 获取后端当前登录用户及权限。 */
  async getCurrentUser(): Promise<CurrentUserResult> {
    return request.get<CurrentUserResult>("/auth/me");
  },
};
