import { users } from "@/data/data";
import { translate } from "@/lang/utils";
import type { LoginRequest, LoginResult } from "@/types/auth";

const ACCESS_TOKEN_PREFIX = "mock-access-token";
const REFRESH_TOKEN_PREFIX = "mock-refresh-token";
const TOKEN_EXPIRES_IN_SECONDS = 7200;

function createLoginResult(userId: string): LoginResult {
  const issuedAt = Date.now();

  return {
    accessToken: `${ACCESS_TOKEN_PREFIX}:${userId}:${issuedAt}`,
    refreshToken: `${REFRESH_TOKEN_PREFIX}:${userId}:${issuedAt}`,
    tokenType: "Bearer",
    expiresIn: TOKEN_EXPIRES_IN_SECONDS,
  };
}

function getUserIdFromRefreshToken(refreshToken: string): string | undefined {
  const [prefix, userId] = refreshToken.split(":");
  return prefix === REFRESH_TOKEN_PREFIX ? userId : undefined;
}

function getUserIdFromAccessToken(accessToken: string): string | undefined {
  const [prefix, userId] = accessToken.split(":");
  return prefix === ACCESS_TOKEN_PREFIX ? userId : undefined;
}

export const authService = {
  /** 使用 data.ts 中的本地账号完成原型登录。 */
  async login({ username, password }: LoginRequest): Promise<LoginResult> {
    const user = users.find(
      (item) =>
        item.username === username && item.password === password && item.status === "enabled"
    );

    if (!user) {
      throw new Error(translate("service.auth.invalidCredentials"));
    }

    return createLoginResult(user.id);
  },

  /** 为有效的本地刷新令牌生成一组新令牌。 */
  async refreshToken(refreshToken: string): Promise<LoginResult> {
    const userId = getUserIdFromRefreshToken(refreshToken);
    const user = users.find((item) => item.id === userId && item.status === "enabled");

    if (!user) {
      throw new Error(translate("service.auth.sessionExpired"));
    }

    return createLoginResult(user.id);
  },

  /** 本地原型没有服务端会话，登出由 Store 清理本地状态。 */
  async logout(): Promise<void> {},

  /** 从本地原型访问令牌中读取用户 ID。 */
  getUserId(accessToken: string): string | undefined {
    return getUserIdFromAccessToken(accessToken);
  },
};
