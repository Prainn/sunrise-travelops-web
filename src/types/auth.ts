/** 登录表单数据。 */
export interface LoginRequest {
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
  id: string;
  username: string;
  permissions: string[];
}
