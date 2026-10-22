export type LoginScope = "headquarters" | "shengxu" | "linxi" | "website";
/** 登录表单数据。 */
export interface LoginRequest {
  scope: LoginScope;
  username: string;
  password: string;
  rememberMe?: boolean;
}

/** 后端登录成功后返回的令牌。 */
export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: number;
}

/** 后端当前用户响应。 */
export interface CurrentUserResult {
  nickname: string;
  identityId: string;
  scope: LoginScope;
  scopeName: string;
  deptId: number | null;
  deptName: string;
  roles: string[];
  id: string;
  username: string;
  permissions: string[];
  menuKeys: string[];
  /** 服务端登录会话 ID；切换账号保持不变，用于同会话标签页协调。 */
  sessionId: string;
  /** 会话版本；切换账号后递增，旧令牌随之失效。 */
  sessionVersion: number;
}
