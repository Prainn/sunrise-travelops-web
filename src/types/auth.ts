/** 登录表单数据。 */
export interface LoginRequest {
  username: string;
  password: string;
  rememberMe?: boolean;
}

/** 登录后保存的本地会话令牌。 */
export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: number;
}

/** 仅供本地原型认证使用的用户记录。 */
export interface AuthUserRecord {
  id: string;
  username: string;
  password: string;
  status: "enabled" | "disabled";
}

export interface PrototypeUserRecord extends AuthUserRecord {
  nickname: string;
  nicknameKey?: string;
  avatar: string;
  gender: number;
  mobile: string;
  email: string;
  deptId: number;
  roleIds: number[];
  roleNames: string;
  createTime: string;
  roles: string[];
  perms: string[];
}
