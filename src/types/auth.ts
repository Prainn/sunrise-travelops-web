export type LoginScope = "headquarters" | "shengxu" | "linxi" | "website";
export type ResourceLibrary = "shengxu" | "shared";
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
  resourceLibrary: ResourceLibrary | null;
  id: string;
  username: string;
  permissions: string[];
}
